import { canTransition, cleanFilename, MediaError, normalizeMediaMetadata, publicError, transferProgress, validateMediaUrl } from './mediaContracts';

const initialFlow = () => ({ status: 'idle', url: '', media: null, selectedOptionId: null, progress: null, fieldError: '', error: '', actionError: '', canCancel: false, isCancelling: false, record: null });

export function createMediaLibrary({ identify, files, repository, clipboard, now = () => new Date(), makeId } = {}) {
  let serial = 0;
  let generation = 0;
  let identifyAbort;
  let active;
  let initializing;
  let snapshot = { flow: initialFlow(), downloads: [], history: [], isLoading: true, storageError: '', storageWarning: '', actionError: '', openingId: null, deletingIds: [] };
  const listeners = new Set();
  const deletes = new Map();
  const unsaved = new Map();
  function publish(patch) {
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  }
  function flow(patch) {
    if (patch.status && !canTransition(snapshot.flow.status, patch.status)) throw new MediaError('INVALID_STATE', 'A operação não é permitida neste estado.');
    publish({ flow: { ...snapshot.flow, ...patch } });
  }
  function sync(state) {
    const merge = (records, additions) => {
      const byId = new Map(records.map(record => [record.id, record]));
      for (const record of additions) byId.set(record.id, record);
      return [...byId.values()];
    };
    const live = active && !active.finished ? [active.record] : [];
    publish({ downloads: merge(state.downloads, [...unsaved.values(), ...live]), history: merge(state.history, [...unsaved.values()]) });
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
    delete record.canCancel;
    if (status === 'completed') record.progress = 100;
    else delete record.progress;
    updateDownload(record);
    flow({ status, record, progress: status === 'completed' ? 100 : null, canCancel: false, isCancelling: false, error: record.error || '' });
    unsaved.set(record.id, record);
    try {
      const state = await repository.recordTerminal(record);
      unsaved.delete(record.id);
      sync(state);
      publish({ storageError: unsaved.size ? 'Há operações ainda não salvas no histórico. Use Tentar salvar dados novamente.' : '' });
    } catch (error) {
      sync(repository.list());
      publish({ storageError: publicError(error, 'A operação terminou, mas não foi possível salvar o histórico. Use Tentar salvar dados novamente.') });
    } finally {
      if (active === operation) active = null;
    }
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
          for (const record of state.downloads.filter(item => ['queued', 'downloading'].includes(item.status))) {
            state = await repository.recordTerminal({ ...record, status: 'failed', completedAt: now().toISOString(), error: 'Download interrompido pelo encerramento do aplicativo. Analise o link novamente para tentar outra vez.' });
          }
          sync(state);
          publish({ isLoading: false, storageWarning: repository.getWarning?.() || '' });
          return true;
        } catch (error) {
          publish({ isLoading: false, storageError: publicError(error, 'Não foi possível carregar os dados locais. Tente novamente.') });
          initializing = undefined;
          return false;
        }
      })();
      return initializing;
    },
    setUrl(url) {
      if (active) return false;
      generation += 1;
      identifyAbort?.abort();
      flow({ ...initialFlow(), url: String(url) });
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
        const media = normalizeMediaMetadata(await identify(validation.url, { signal: identifyAbort.signal }));
        if (token !== generation || active) return false;
        flow({ status: 'ready', media, selectedOptionId: media.options[0].id });
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
      const id = makeId ? makeId() : `download-${now().getTime().toString(36)}-${++serial}-${Math.random().toString(36).slice(2, 10)}`;
      const base = cleanFilename(snapshot.flow.media.name, 'mídia').replace(/\.(mp4|mp3)$/i, '');
      const operation = {
        token: ++generation, record: {
          id, name: `${base}.${option.format.toLowerCase()}`, format: option.format, mimeType: option.mimeType,
          kind: option.format === 'MP4' ? 'video' : 'audio', quality: option.quality,
          sourceUrl: snapshot.flow.url, status: 'queued', activityType: 'download', createdAt: now().toISOString(),
        },
        finished: false, handle: null, cancellation: null,
      };
      active = operation; // Set synchronously, before storage or transport awaits.
      flow({ status: 'queued', error: '', actionError: '', progress: null, canCancel: false, record: operation.record });
      updateDownload(operation.record);
      operation.promise = (async () => {
        try {
          await repository.saveDownload(operation.record);
          const handle = await files.prepare(option, id, {
            onProgress(event) {
              if (!running(operation) || snapshot.flow.status !== 'downloading') return;
              const progress = transferProgress(event.totalBytesWritten, event.totalBytesExpectedToWrite);
              operation.record = { ...operation.record, progress: progress ?? undefined };
              updateDownload(operation.record);
              flow({ progress });
            },
            onTransferEnd() { if (running(operation)) flow({ canCancel: false }); },
          });
          if (!running(operation)) return false;
          operation.handle = handle;
          operation.record = { ...operation.record, status: 'downloading' };
          updateDownload(operation.record);
          // start() enters the native transferring state synchronously.
          const completion = handle.start();
          flow({ status: 'downloading', canCancel: Boolean(handle.canCancel?.()) });
          const result = await completion;
          if (operation.cancellation) await operation.cancellation;
          if (!running(operation)) return false;
          if (result?.verified !== true || !result.fileUri?.startsWith('file://') || !Number.isFinite(result.sizeBytes) || result.sizeBytes <= 0) {
            throw new MediaError('UNVERIFIED_FILE', 'O serviço não confirmou um arquivo local salvo.');
          }
          await finish(operation, 'completed', { fileUri: result.fileUri, sizeBytes: result.sizeBytes, mimeType: result.mimeType, error: '' });
          return true;
        } catch (error) {
          if (operation.cancellation) await operation.cancellation;
          if (!running(operation)) return false;
          await finish(operation, 'failed', { error: publicError(error, 'O download falhou. Verifique a rede e o espaço disponível.') });
          return false;
        }
      })();
      return operation.promise;
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
      if (active) return false;
      library.setUrl(item.sourceUrl || '');
      return await library.analyze() ? library.start() : false;
    },
    async retryPersistence() {
      if (snapshot.isLoading) return false;
      if (!await library.initialize()) return false;
      try {
        for (const [id, record] of unsaved) {
          await repository.recordTerminal(record);
          unsaved.delete(id);
        }
        sync(repository.list());
        publish({ storageError: '' });
        return true;
      } catch (error) {
        publish({ storageError: publicError(error, 'Não foi possível salvar os dados locais. Tente novamente.') });
        return false;
      }
    },
    removeHistory(item) {
      if (deletes.has(item.id)) return deletes.get(item.id);
      const pending = (async () => {
        publish({ deletingIds: [...snapshot.deletingIds, item.id], actionError: '' });
        try {
          // Never call files.remove/delete: removing history is metadata-only.
          sync(await repository.removeHistory(item.id));
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
    async openItem(item) {
      if (snapshot.openingId) return false;
      publish({ openingId: item.id, actionError: '' });
      try { await files.open(item); return true; }
      catch (error) { publish({ actionError: publicError(error, 'Não foi possível abrir o arquivo. Verifique se ele existe e se há um aplicativo compatível.') }); return false; }
      finally { publish({ openingId: null }); }
    },
    dismissActionError() { publish({ actionError: '' }); },
    // Exposed for diagnostics/tests and backend replacement; no filesystem UI work.
    capabilities: { download: Boolean(files?.supported), identify: typeof identify === 'function' },
  };
  return library;
}
