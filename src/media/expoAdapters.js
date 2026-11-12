import { matchesMediaSignature, mediaMimeTypes, MediaError } from './mediaContracts';
import { createJournalStorage } from './mediaRepository';

function header(headers, name) {
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === name);
  return entry ? String(entry[1]) : '';
}

export function createExpoStorage(fs, documentDirectory) {
  if (!documentDirectory?.startsWith('file://')) throw new MediaError('NO_STORAGE', 'Armazenamento local indisponível nesta plataforma.');
  const directory = `${documentDirectory}edudownloader/library/`;
  return createJournalStorage({
    mkdir: () => fs.makeDirectoryAsync(directory, { intermediates: true }),
    list: () => fs.readDirectoryAsync(directory),
    read: name => fs.readAsStringAsync(directory + name),
    write: (name, contents) => fs.writeAsStringAsync(directory + name, contents),
    move: (from, to) => fs.moveAsync({ from: directory + from, to: directory + to }),
    remove: name => fs.deleteAsync(directory + name, { idempotent: true }),
  });
}

export function createExpoFileServices({ fs, documentDirectory, platform, intentLauncher, sharing }) {
  const directory = documentDirectory ? `${documentDirectory}edudownloader/downloads/` : null;
  const supported = ['android', 'ios'].includes(platform) && Boolean(directory?.startsWith('file://'));
  function owned(uri) {
    return typeof uri === 'string' && directory && uri.startsWith(directory)
      && /^[a-zA-Z0-9_-]+\.(mp4|mp3)(\.part)?$/.test(uri.slice(directory.length));
  }
  async function removePartial(uri) {
    if (owned(uri) && uri.endsWith('.part')) await fs.deleteAsync(uri, { idempotent: true });
  }

  return {
    supported,
    async prepare(option, id, { onProgress, onTransferEnd } = {}) {
      if (!supported) throw new MediaError('NO_DOWNLOAD', 'Download local disponível somente em Android e iOS com armazenamento compatível.');
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || mediaMimeTypes[option.format] !== option.mimeType) {
        throw new MediaError('INVALID_OPTION', 'A opção de download não é válida.');
      }
      await fs.makeDirectoryAsync(directory, { intermediates: true });
      const destination = `${directory}${id}.${option.format.toLowerCase()}`;
      const temporary = destination + '.part';
      if ((await fs.getInfoAsync(destination)).exists || (await fs.getInfoAsync(temporary)).exists) {
        throw new MediaError('FILE_EXISTS', 'Já existe um arquivo para esta operação. Analise o link novamente.');
      }
      let phase = 'prepared';
      let cancelled = false;
      let cancellation;
      const task = fs.createDownloadResumable(option.url, temporary, {
        sessionType: fs.FileSystemSessionType?.FOREGROUND ?? 1,
      }, progress => {
        if (phase === 'transferring' && !cancelled) onProgress?.(progress);
      });
      const handle = {
        canCancel: () => phase === 'transferring' && typeof task.cancelAsync === 'function' && !cancelled,
        async start() {
          if (phase !== 'prepared') throw new MediaError('INVALID_STATE', 'Esta transferência já foi iniciada.');
          phase = 'transferring';
          try {
            const response = await task.downloadAsync();
            if (cancellation) await cancellation.catch(() => {});
            if (cancelled) throw new MediaError('CANCELLED', 'Download cancelado.');
            phase = 'verifying';
            onTransferEnd?.();
            if (!response || !Number.isInteger(response.status) || response.status < 200 || response.status >= 300 || response.uri !== temporary) {
              throw new MediaError('HTTP_DOWNLOAD', 'A transferência não foi concluída pela origem. Tente analisar o link novamente.');
            }
            const mime = header(response.headers, 'content-type').split(';')[0].trim().toLowerCase();
            if (mime && mime !== option.mimeType) throw new MediaError('CHANGED_MEDIA', 'A origem retornou um tipo de arquivo diferente do selecionado.');
            const info = await fs.getInfoAsync(temporary);
            const encoded = header(response.headers, 'content-encoding');
            const expected = header(response.headers, 'content-length');
            if (!info.exists || info.isDirectory || !Number.isFinite(info.size) || info.size <= 0
              || ((!encoded || encoded === 'identity') && /^\d+$/.test(expected) && Number(expected) !== info.size)) {
              throw new MediaError('INCOMPLETE_FILE', 'O arquivo recebido está vazio ou incompleto. Tente novamente.');
            }
            const prefix = await fs.readAsStringAsync(temporary, { encoding: fs.EncodingType?.Base64 || 'base64', position: 0, length: 64 });
            if (!matchesMediaSignature(globalThis.atob(prefix), option.format)) {
              throw new MediaError('INVALID_FILE', 'O conteúdo recebido não corresponde ao formato MP4 ou MP3 selecionado.');
            }
            await fs.moveAsync({ from: temporary, to: destination });
            const saved = await fs.getInfoAsync(destination);
            if (!saved.exists || saved.size !== info.size) throw new MediaError('SAVE_FAILED', 'Não foi possível confirmar o arquivo salvo.');
            phase = 'completed';
            return { fileUri: destination, sizeBytes: saved.size, mimeType: option.mimeType, verified: true };
          } catch (error) {
            phase = cancelled ? 'cancelled' : 'failed';
            onTransferEnd?.();
            await removePartial(temporary).catch(() => {});
            if (cancelled) throw new MediaError('CANCELLED', 'Download cancelado.');
            if (error instanceof MediaError) throw error;
            throw new MediaError('TRANSFER', 'Falha na transferência ou no armazenamento. Verifique a rede e o espaço disponível.');
          }
        },
        async cancel() {
          if (cancellation) return cancellation;
          if (!handle.canCancel()) throw new MediaError('CANNOT_CANCEL', 'A transferência já terminou ou não permite cancelamento. Aguarde a verificação.');
          cancellation = (async () => {
            try {
              await task.cancelAsync();
              cancelled = true;
              phase = 'cancelled';
              onTransferEnd?.();
              await removePartial(temporary).catch(() => {});
              return true;
            } catch {
              cancellation = undefined;
              throw new MediaError('CANCEL_FAILED', 'Não foi possível interromper a transferência. O download continua em andamento.');
            }
          })();
          return cancellation;
        },
      };
      return handle;
    },
    async open(item) {
      if (!supported || item?.status !== 'completed' || !owned(item.fileUri) || item.fileUri.endsWith('.part')) {
        throw new MediaError('NO_LOCAL_FILE', 'Este registro não possui um arquivo local válido disponível para abertura.');
      }
      const info = await fs.getInfoAsync(item.fileUri);
      if (!info.exists || info.isDirectory || !info.size) throw new MediaError('FILE_MISSING', 'O arquivo não está mais disponível no dispositivo.');
      const mimeType = mediaMimeTypes[item.format];
      if (!mimeType) throw new MediaError('UNSUPPORTED_FILE', 'Não há um mecanismo de abertura configurado para esse formato.');
      try {
        if (platform === 'android') {
          const uri = await fs.getContentUriAsync(item.fileUri);
          await intentLauncher.startActivityAsync('android.intent.action.VIEW', { data: uri, flags: 1, type: mimeType });
        } else {
          if (!await sharing.isAvailableAsync()) throw new MediaError('NO_APP', 'A abertura por aplicativos compatíveis não está disponível.');
          await sharing.shareAsync(item.fileUri, { mimeType, UTI: item.format === 'MP4' ? 'public.mpeg-4' : 'public.mp3', dialogTitle: 'Abrir arquivo com aplicativo compatível' });
        }
      } catch (error) {
        if (error instanceof MediaError) throw error;
        throw new MediaError('OPEN_FAILED', 'Não foi possível abrir o arquivo. Verifique se há um aplicativo compatível instalado.');
      }
    },
  };
}
