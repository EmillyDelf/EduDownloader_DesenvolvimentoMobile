import { canTransition, cleanFilename, MediaError, normalizeMediaMetadata, publicError, transferProgress, validateMediaUrl } from './mediaContracts';
import { canResumeRemote } from './remoteJobs';
import { canonicalLocalUri } from './libraryFiles';

const initialFlow = () => ({ status: 'idle', url: '', media: null, selectedOptionId: null, progress: null, phase: null, fieldError: '', error: '', actionError: '', canCancel: false, isCancelling: false, persistencePending: false, record: null, retryRecordId: null });

export function createMediaLibrary({ identify, files, remote, session, repository, clipboard, now = () => new Date(), makeId, makeRemoteKey } = {}) {
  let serial = 0;
  let generation = 0;
  let identifyAbort;
  let active;
  let initializing;
  let snapshot = {
    flow: initialFlow(), downloads: [], history: [], isLoading: true, refreshing: false, storageReady: false,
    storageError: '', storageWarning: '', actionError: '', actionMessage: '', openingId: null, deletingIds: [], managingIds: [],
  };
  const listeners = new Set();
  const deletes = new Map();
  const unsaved = new Map();
  const pendingCheckpoints = new Map();
  const generatedPending = new Map();
  const registrations = new Map();
  const fileActions = new Map();
  const availability = new Map();
  let refreshing;
  let retrying;
  let filesRecovered = false;
  const newId = () => `download-${now().getTime().toString(36)}-${++serial}-${Math.random().toString(36).slice(2, 10)}`;
  const pausedDownload = id => snapshot.downloads.find(record => record.id === id && record.status === 'paused');
  function newRemoteKey(previous) {
    const key = makeRemoteKey?.();
    return key && key !== previous ? key : newId();
  }
  function publish(patch) {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  }
  function flow(patch) {
    if (patch.status && !canTransition(snapshot.flow.status, patch.status, Boolean(active?.record.remote))) throw new MediaError('INVALID_STATE', 'A operação não é permitida neste estado.');
    publish({ flow: { ...snapshot.flow, ...patch } });
  }
  function sync() {
    const state = repository.list();
    const merge = (records, additions) => {
      const byId = new Map(records.map(record => [record.id, record]));
      for (const record of additions) byId.set(record.id, record);
      return [...byId.values()].map(record => {
        const checked = availability.get(record.id);
        return record.availability === 'deleted' || !checked || checked.uri !== record.fileUri
          ? record : { ...record, availability: checked.status };
      });
    };
    const live = active && !active.finished ? [active.record] : [];
    publish({ downloads: merge(state.downloads, [...pendingCheckpoints.values(), ...unsaved.values(), ...live]), history: merge(state.history, [...unsaved.values()]) });
  }
  function storageFeedback() {
    if (generatedPending.size) return 'Há arquivos que ainda precisam ser registrados. Tente salvar os dados novamente.';
    if (unsaved.size || pendingCheckpoints.size) return 'Há operações ainda não salvas. Use Tentar salvar dados novamente.';
    return '';
  }

  async function saveGenerated(input) {
    const verified = await files.verifyGenerated(input);
    const date = new Date(input.completedAt ?? now());
    const completedAt = Number.isFinite(date.getTime()) ? date.toISOString() : now().toISOString();
    const record = { ...verified, id: 'generated:' + verified.fileUri, status: 'completed', createdAt: completedAt, completedAt };
    await repository.registerGenerated(record);
    availability.set(record.id, { uri: record.fileUri, status: 'available' });
    return record;
  }

  async function updateAvailability(state, reconcile = false) {
    if (!files?.availability) return;
    const byId = new Map([...state.history, ...state.downloads]
      .filter(item => item.status === 'completed' && item.fileUri).map(item => [item.id, item]));
    for (const key of availability.keys()) if (!byId.has(key)) availability.delete(key);
    for (const item of byId.values()) {
      const status = await files.availability(item);
      if (reconcile && item.deletionPending && !fileActions.has(item.id)) {
        const outcome = await files.deletionOutcome(item);
        if (outcome !== 'unavailable') await repository.resolveFileDeletion(item.id, item.fileUri, outcome === 'missing');
      }
      availability.set(item.id, { uri: item.fileUri, status });
    }
  }

  async function recoverGenerated() {
    if (!files?.discoverPdfs || filesRecovered) return;
    const state = repository.list();
    const known = new Set([...(state.generatedUris || []), ...state.downloads.map(item => item.fileUri), ...state.history.map(item => item.fileUri)].map(canonicalLocalUri));
    let failure;
    for (const file of await files.discoverPdfs()) {
      if (known.has(file.fileUri) || registrations.has(file.fileUri)) continue;
      const input = { ...file, activityType: 'pdf', format: 'PDF' };
      try {
        await saveGenerated(input);
        generatedPending.delete(file.fileUri);
      } catch (error) {
        if (['INVALID_LIBRARY_FILE', 'FILE_MISSING', 'FILE_CHANGED'].includes(error?.code)) {
          generatedPending.delete(file.fileUri);
          continue;
        }
        generatedPending.set(file.fileUri, input);
        failure ??= error;
      }
    }
    if (failure) throw failure;
    filesRecovered = true;
  }

  function manage(item, action) {
    if (!item?.id) return Promise.resolve(false);
    const id = item.id;
    const previous = fileActions.get(id);
    if (previous) return previous.action === action ? previous.promise : Promise.resolve(false);
    if (['open', 'export', 'share'].includes(action) && [...fileActions.values()].some(request => ['open', 'export', 'share'].includes(request.action))) {
      return Promise.resolve(false);
    }
    const promise = Promise.resolve().then(async () => {
      publish({ managingIds: [...fileActions.keys()], actionError: '', actionMessage: '', ...(action === 'open' ? { openingId: id } : {}) });
      let current;
      try {
        const state = repository.list();
        current = state.downloads.find(record => record.id === id) || state.history.find(record => record.id === id);
        if (action === 'remove') {
          await repository.removeDownload(id);
          publish({ actionMessage: 'Registro removido de Downloads.' });
        } else if (action === 'delete') {
          if (!current || !files.canDelete(current)) throw new MediaError('NOT_OWNED', 'Este arquivo não pode ser excluído pelo aplicativo.');
          await repository.beginFileDeletion(id, current.fileUri);
          try { await files.deleteOwned(current); }
          catch (error) {
            await repository.resolveFileDeletion(id, current.fileUri, false);
            throw error;
          }
          availability.set(id, { uri: current.fileUri, status: 'missing' });
          await repository.resolveFileDeletion(id, current.fileUri, true);
          publish({ actionMessage: 'Arquivo excluído do dispositivo.' });
        } else {
          const target = unsaved.get(id) || current;
          if (!target && files?.available) throw new MediaError('NOT_FOUND', 'O registro não está mais na biblioteca.');
          const result = await files[action](target || item);
          if (result === false) return false;
          if (action === 'export') publish({ actionMessage: 'Cópia exportada para a pasta escolhida.' });
        }
        return true;
      } catch (error) {
        if (current?.fileUri && ['FILE_MISSING', 'NO_LOCAL_FILE', 'FILE_CHANGED', 'FILE_PERMISSION'].includes(error?.code)) {
          availability.set(id, { uri: current.fileUri, status: error.code === 'FILE_MISSING' ? 'missing' : 'unavailable' });
        }
        const messages = {
          open: 'Não foi possível abrir o arquivo. Verifique se ele existe e se há um aplicativo compatível.',
          share: 'Não foi possível compartilhar o arquivo.',
          export: 'Não foi possível exportar o arquivo.',
          remove: 'Não foi possível remover o registro. Ele foi preservado.',
          delete: 'Não foi possível concluir a exclusão. Atualize a biblioteca para conferir a disponibilidade.',
        };
        publish({ actionError: publicError(error, messages[action]) });
        return false;
      } finally {
        sync();
        fileActions.delete(id);
        publish({ managingIds: [...fileActions.keys()], ...(action === 'open' ? { openingId: null } : {}) });
      }
    });
    fileActions.set(id, { action, promise });
    return promise;
  }
  function running(operation) { return active === operation && !operation.finished; }
  function updateDownload(record) {
    const list = snapshot.downloads.some(item => item.id === record.id)
      ? snapshot.downloads.map(item => item.id === record.id ? record : item) : [record, ...snapshot.downloads];
    publish({ downloads: list });
  }
  async function finish(operation, status, data = {}) {
    if (!running(operation)) return;
    operation.finished = true;
    const record = { ...operation.record, ...data, status, completedAt: now().toISOString() };
    if (record.remote) record.remote = null;
    delete record.canCancel;
    if (status === 'completed') {
      record.progress = 100;
      record.fileOwnership = 'managed';
    }
    else delete record.progress;
    unsaved.set(record.id, record);
    let persistencePending = false;
    try {
      await repository.recordTerminal(record);
      unsaved.delete(record.id);
      sync();
      publish({ storageError: storageFeedback() });
    } catch (error) {
      persistencePending = true;
      sync();
      publish({ storageError: publicError(error, 'A operação terminou, mas não foi possível salvar o histórico. Use Tentar salvar dados novamente.') });
    } finally {
      flow({ status, record, persistencePending, progress: status === 'completed' ? 100 : null, canCancel: false, isCancelling: false, error: record.error || '' });
      if (active === operation) active = null;
    }
  }

  function launch(option, record, { replayIntent = false } = {}) {
    const operation = { record, finished: false, handle: null, cancellation: null };
    generation += 1;
    active = operation;
    flow({ status: 'queued', error: '', actionError: '', progress: null, phase: null, canCancel: false, persistencePending: false, record, retryRecordId: null });
    updateDownload(record);
    operation.promise = (async () => {
      try {
        await repository.saveDownload(operation.record);
        pendingCheckpoints.delete(record.id);
        const handlers = {
          onProgress(event) {
            if (!running(operation) || snapshot.flow.status !== 'downloading') return;
            const progress = transferProgress(event.totalBytesWritten, event.totalBytesExpectedToWrite);
            operation.record = { ...operation.record, progress: progress ?? undefined };
            updateDownload(operation.record);
            flow({ progress });
          },
          onTransferEnd() { if (running(operation)) flow({ canCancel: false }); },
          onPhase(phase) {
            if (!running(operation)) return;
            operation.record = { ...operation.record, phase: phase.name, progress: phase.progress };
            updateDownload(operation.record);
            flow({ phase, progress: phase.progress, canCancel: phase.canCancel || snapshot.flow.isCancelling });
          },
          async onCheckpoint(checkpoint) {
            operation.record = { ...operation.record, remote: checkpoint };
            await repository.saveDownload(operation.record);
          },
        };
        const handle = record.remote
          ? remote.prepare(option, record.id, { ...handlers, checkpoint: record.remote, replayIntent })
          : await files.prepare(option, record.id, handlers);
        operation.handle = handle;
        if (operation.suspended) handle.suspend?.();
        operation.record = { ...operation.record, status: 'downloading' };
        updateDownload(operation.record);
        const completion = handle.start();
        flow({ status: 'downloading', canCancel: Boolean(handle.canCancel?.()) });
        const result = await completion;
        if (operation.cancellation) await operation.cancellation;
        if (!running(operation)) return false;
        if (result?.verified !== true || !canonicalLocalUri(result.fileUri) || !Number.isSafeInteger(result.sizeBytes) || result.sizeBytes <= 0
          || result.mimeType !== option.mimeType || (files.confirmDownloadLocation && !files.confirmDownloadLocation(result, record))) {
          throw new MediaError('UNVERIFIED_FILE', 'O serviço não confirmou um arquivo local salvo.');
        }
        await finish(operation, 'completed', {
          fileUri: result.fileUri, sizeBytes: result.sizeBytes, mimeType: result.mimeType, error: '',
          ...(result.sha256 ? { sha256: result.sha256 } : {}),
        });
        return true;
      } catch (error) {
        if (operation.cancellation) await operation.cancellation;
        if (!running(operation)) return false;
        if (error?.code === 'CANCELLED') await finish(operation, 'cancelled', { error: '' });
        else {
          const message = publicError(error, 'O download falhou. Verifique a rede e o espaço disponível.');
          if (operation.record.remote && canResumeRemote(error)) {
            operation.finished = true;
            const checkpoint = operation.record.remote;
            const paused = { ...operation.record, status: 'paused', progress: null, error: message,
              remote: error?.retryRemote ? { ...checkpoint, retry: error.retryRemote } : checkpoint };
            updateDownload(paused);
            flow({ status: 'paused', record: paused, progress: null, canCancel: false, isCancelling: false, error: message });
            try { await repository.saveDownload(paused); sync(); }
            catch {
              pendingCheckpoints.set(paused.id, paused);
              publish({ storageError: 'Não foi possível salvar o acompanhamento. Tente salvar os dados novamente.' });
            } finally { if (active === operation) active = null; }
          } else await finish(operation, 'failed', { error: message });
        }
        return false;
      }
    })();
    return operation.promise;
  }

  const library = {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    initialize() {
      if (initializing) return initializing;
      publish({ isLoading: true, storageError: '' });
      initializing = (async () => {
        try {
          let state = await repository.initialize();
          for (const record of state.downloads.filter(item => ['queued', 'downloading', 'paused'].includes(item.status))) {
            if (active?.record.id === record.id) continue;
            let recovered;
            try { recovered = await files?.recoverDownload?.(record); }
            catch {
              publish({ storageWarning: 'Um download anterior ainda não pôde ser verificado. O arquivo e o registro foram preservados.' });
              continue;
            }
            if (recovered) {
              const finished = { ...record, ...recovered, status: 'completed', fileOwnership: 'managed', remote: null,
                progress: 100, error: '', completedAt: now().toISOString() };
              try { state = await repository.recordTerminal(finished); }
              catch { unsaved.set(record.id, finished); }
              continue;
            }
            if (record.remote) {
              await files?.discardRemotePartial?.(record.id, record.format);
              if (record.status !== 'paused') state = await repository.saveDownload({
                ...record, status: 'paused', progress: null, error: 'Acompanhamento interrompido. Retome com a credencial da sessão.',
              });
            } else if (record.status !== 'paused') {
              state = await repository.recordTerminal({ ...record, status: 'failed', completedAt: now().toISOString(), error: 'Download interrompido pelo encerramento do aplicativo. Analise o link novamente para tentar outra vez.' });
            }
          }
          await updateAvailability(state, true);
          let recoveryError = '';
          try { await recoverGenerated(); }
          catch (error) { recoveryError = publicError(error, 'Não foi possível recuperar todos os PDFs. Atualize a biblioteca para tentar novamente.'); }
          sync();
          publish({ isLoading: false, storageReady: true, storageError: storageFeedback(), storageWarning: repository.getWarning?.() || recoveryError || snapshot.storageWarning });
          return true;
        } catch (error) {
          publish({ isLoading: false, storageReady: false, storageError: publicError(error, 'Não foi possível carregar os dados locais. Tente novamente.') });
          initializing = undefined;
          return false;
        }
      })();
      return initializing;
    },
    setUrl(url, { resetRetry = false } = {}) {
      if (active) return false;
      generation += 1;
      identifyAbort?.abort();
      flow({ ...initialFlow(), url: String(url), retryRecordId: resetRetry ? null : snapshot.flow.retryRecordId });
      return true;
    },
    stopAnalysis() {
      if (['validating', 'identifying'].includes(snapshot.flow.status)) library.setUrl(snapshot.flow.url);
    },
    suspend() {
      library.stopAnalysis();
      if (active?.record.remote && !active.finished) {
        active.suspended = true;
        active.handle?.suspend();
      }
    },
    setBackendToken(token) {
      if (!session || active || !session.setToken(token)) return false;
      if ((snapshot.flow.status === 'ready' && snapshot.flow.media?.strategy === 'remote') || ['validating', 'identifying'].includes(snapshot.flow.status)) {
        library.setUrl(snapshot.flow.url);
      }
      publish({ hasBackendToken: Boolean(session.getToken()) });
      return true;
    },
    async paste() {
      if (active) return;
      const token = generation;
      try {
        if (!clipboard?.getStringAsync) throw new MediaError('NO_CLIPBOARD', 'Use a opção Colar do teclado neste ambiente.');
        const text = await clipboard.getStringAsync();
        if (generation !== token || active) return;
        if (!text.trim()) throw new MediaError('EMPTY_CLIPBOARD', 'A área de transferência está vazia.');
        library.setUrl(text);
      } catch (error) {
        if (generation === token) flow({ actionError: publicError(error, 'Não foi possível ler a área de transferência. Cole o link pelo teclado.') });
      }
    },
    async analyze() {
      if (active || ['validating', 'identifying'].includes(snapshot.flow.status)) return false;
      const token = ++generation;
      identifyAbort?.abort();
      identifyAbort = new AbortController();
      flow({ status: 'validating', fieldError: '', error: '', actionError: '', media: null, selectedOptionId: null, record: null, progress: null });
      const validation = validateMediaUrl(snapshot.flow.url);
      if (!validation.valid) { flow({ status: 'failed', fieldError: validation.error }); return false; }
      flow({ status: 'identifying' });
      try {
        if (typeof identify !== 'function') throw new MediaError('NO_IDENTIFIER', 'O serviço de identificação de mídia ainda não está disponível.');
        const result = await identify(validation.url, { signal: identifyAbort.signal });
        const media = result?.strategy === 'remote' ? result : normalizeMediaMetadata(result);
        if (token !== generation || active) return false;
        const retry = pausedDownload(snapshot.flow.retryRecordId);
        const selected = retry ? media.options.find(option => media.strategy === 'remote'
          && option.id === retry.remote.optionId && option.format === retry.format && option.mimeType === retry.mimeType) : media.options[0];
        if (!selected) throw new MediaError('UNKNOWN_OPTION', 'O link não oferece a opção anterior. Volte ao início para escolher outra opção.');
        flow({ status: 'ready', media, selectedOptionId: selected.id });
        return true;
      } catch (error) {
        if (token !== generation) return false;
        flow({ status: 'failed', error: publicError(error, 'Não foi possível identificar a mídia. Verifique a conexão e tente novamente.') });
        return false;
      }
    },
    selectOption(id) {
      if (active || snapshot.flow.status !== 'ready' || !snapshot.flow.media?.options.some(option => option.id === id)) return false;
      flow({ selectedOptionId: id });
      return true;
    },
    start() {
      if (active || snapshot.flow.status !== 'ready') return Promise.resolve(false);
      const option = snapshot.flow.media?.options.find(item => item.id === snapshot.flow.selectedOptionId);
      if (!option || !files?.supported || typeof files.prepare !== 'function') {
        flow({ actionError: 'O serviço de download não está disponível neste ambiente.' });
        return Promise.resolve(false);
      }
      const { media, url } = snapshot.flow;
      const useRemote = media.strategy === 'remote';
      if (useRemote && media.expiresAt <= now().getTime()) {
        flow({ status: 'failed', error: 'A análise expirou. Analise o link novamente antes de baixar.' });
        return Promise.resolve(false);
      }
      const retry = pausedDownload(snapshot.flow.retryRecordId);
      if (retry && (!useRemote || option.id !== retry.remote.optionId || option.format !== retry.format || option.mimeType !== retry.mimeType)) {
        flow({ actionError: 'Selecione a opção original para tentar novamente ou volte ao início para baixar outra.' });
        return Promise.resolve(false);
      }
      const id = retry?.id || (makeId ? makeId() : newId());
      const key = useRemote && (retry ? newRemoteKey(retry.remote.key) : makeRemoteKey?.() || id);
      const base = cleanFilename(media.name, 'mídia').replace(/\.(mp4|mp3)$/i, '');
      return launch(option, {
        id, name: `${base}.${option.format.toLowerCase()}`, format: option.format, mimeType: option.mimeType,
        kind: option.format === 'MP4' ? 'video' : 'audio', quality: option.quality,
        ...(useRemote ? { remote: remote.checkpoint(media, option, key), remoteStrategy: true } : { sourceUrl: url }),
        status: 'queued', activityType: 'download', createdAt: retry?.createdAt || now().toISOString(),
      });
    },
    cancel() {
      const operation = active;
      if (operation?.cancellation) return operation.cancellation;
      if (!operation || !running(operation) || !operation.handle?.canCancel?.()) return Promise.resolve(false);
      flow({ isCancelling: true, actionError: '' });
      operation.cancellation = (async () => {
        try {
          if (await operation.handle.cancel() !== true) throw new MediaError('CANCEL_FAILED', 'O serviço não confirmou a interrupção. A transferência continua em andamento.');
          await finish(operation, 'cancelled', { error: '' });
          return true;
        } catch (error) {
          if (running(operation)) flow({ isCancelling: false, canCancel: Boolean(operation.handle.canCancel?.()), actionError: publicError(error, 'Não foi possível cancelar. A transferência continua em andamento.') });
          return false;
        }
      })();
      const result = operation.cancellation;
      result.finally(() => { if (!operation.finished) operation.cancellation = null; });
      return result;
    },
    async retryItem(item) {
      if (!item || active || (item.activityType && item.activityType !== 'download')) return false;
      if (item.remoteStrategy) {
        const current = pausedDownload(item.id);
        if (!remote || !current?.remote || !files?.supported) return false;
        const url = snapshot.flow.record?.id === item.id || snapshot.flow.retryRecordId === item.id ? snapshot.flow.url : '';
        library.setUrl(url, { resetRetry: true });
        const { format, mimeType } = current;
        const previous = current.remote;
        const option = { id: previous.optionId, format, mimeType };
        if (previous.retry === 'analysis' || (previous.retry === 'job' && previous.expiresAt <= now().getTime())) {
          flow({ retryRecordId: current.id, actionError: url ? '' : 'Cole o link original em Baixar mídia por link para analisar novamente.' });
          if (!url) {
            publish({ actionError: snapshot.flow.actionError });
            return false;
          }
          return await library.analyze() ? library.start() : false;
        }
        const checkpoint = previous.retry === 'job'
          ? remote.checkpoint(previous, option, newRemoteKey(previous.key)) : previous;
        return launch(option, { ...current, remote: checkpoint, error: '', status: 'queued', progress: null },
          { replayIntent: !previous.retry });
      }
      library.setUrl(item.sourceUrl || '', { resetRetry: true });
      return await library.analyze() ? library.start() : false;
    },
    registerGeneratedFile(input) {
      const uri = canonicalLocalUri(input?.fileUri);
      if (!uri || !files?.verifyGenerated) {
        publish({ actionError: 'O arquivo informado não tem uma localização válida para o registro.' });
        return Promise.resolve(false);
      }
      if (registrations.has(uri)) return registrations.get(uri);
      const promise = Promise.resolve().then(async () => {
        const request = { ...input, fileUri: uri, completedAt: generatedPending.get(uri)?.completedAt ?? input.completedAt ?? now().toISOString() };
        generatedPending.set(uri, request);
        try {
          if (!await library.initialize()) return false;
          await saveGenerated(request);
          generatedPending.delete(uri);
          sync();
          publish({ storageError: storageFeedback() });
          return true;
        } catch (error) {
          if (['INVALID_LIBRARY_FILE', 'FILE_MISSING', 'FILE_CHANGED'].includes(error?.code)) {
            generatedPending.delete(uri);
            publish({ actionError: publicError(error, 'Não foi possível verificar o arquivo para a biblioteca.'), storageError: storageFeedback() });
          } else publish({ storageError: storageFeedback() });
          return false;
        } finally { registrations.delete(uri); }
      });
      registrations.set(uri, promise);
      return promise;
    },
    refresh() {
      if (refreshing) return refreshing;
      refreshing = (async () => {
        publish({ refreshing: true });
        try {
          if (!await library.initialize()) return false;
          await updateAvailability(repository.list(), true);
          await recoverGenerated();
          sync();
          publish({ storageError: storageFeedback(), storageWarning: repository.getWarning?.() || '' });
          return true;
        } catch (error) {
          sync();
          publish({ actionError: publicError(error, 'Não foi possível atualizar a biblioteca.'), storageError: storageFeedback() });
          return false;
        } finally {
          refreshing = undefined;
          publish({ refreshing: false });
        }
      })();
      return refreshing;
    },
    retryPersistence() {
      if (retrying) return retrying;
      retrying = (async () => {
        if (!await library.initialize()) return false;
        try {
          for (const [id, record] of pendingCheckpoints) {
            await repository.saveDownload(record);
            pendingCheckpoints.delete(id);
          }
          for (const [id, record] of unsaved) {
            await repository.recordTerminal(record);
            unsaved.delete(id);
            if (snapshot.flow.record?.id === id && snapshot.flow.persistencePending) flow({ persistencePending: false });
          }
          let ok = true;
          for (const request of [...generatedPending.values()]) {
            if (!await library.registerGeneratedFile(request)) ok = false;
          }
          await updateAvailability(repository.list(), true);
          await recoverGenerated();
          sync();
          publish({ storageError: storageFeedback() });
          return ok;
        } catch (error) {
          publish({ storageError: publicError(error, 'Não foi possível salvar os dados locais. Tente novamente.') });
          return false;
        }
      })();
      const locked = retrying;
      locked.finally(() => { retrying = undefined; });
      return locked;
    },
    removeHistory(item) {
      if (deletes.has(item.id)) return deletes.get(item.id);
      const pending = (async () => {
        publish({ deletingIds: [...snapshot.deletingIds, item.id], actionError: '' });
        try {
          // Never call files.remove/delete: removing history is metadata-only.
          await repository.removeHistory(item.id);
          sync();
          return true;
        } catch (error) {
          const message = publicError(error, 'Não foi possível excluir o registro. Ele foi preservado.');
          publish({ actionError: message });
          throw new MediaError('DELETE_FAILED', message);
        } finally {
          deletes.delete(item.id);
          publish({ deletingIds: snapshot.deletingIds.filter(id => id !== item.id) });
        }
      })();
      deletes.set(item.id, pending);
      return pending;
    },
    openItem: item => manage(item, 'open'),
    shareItem: item => manage(item, 'share'),
    exportItem: item => manage(item, 'export'),
    removeDownload: item => manage(item, 'remove'),
    deleteFile: item => manage(item, 'delete'),
    canDeleteFile: item => Boolean(files?.canDelete?.(item)),
    dismissActionError() { publish({ actionError: '', actionMessage: '' }); },
    // Exposed for diagnostics/tests and backend replacement; no filesystem UI work.
    capabilities: {
      download: Boolean(files?.supported), identify: typeof identify === 'function', backend: Boolean(session),
      fileManagement: Boolean(files?.available), export: Boolean(files?.canExport),
    },
  };
  return library;
}
