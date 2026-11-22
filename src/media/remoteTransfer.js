import { matchesMediaSignature, MediaError } from './mediaContracts';
import { verifiedResult } from './backendClient';
import { waitForRetry } from './remoteJobs';

const blockSize = 64 * 1024;
const maxResponse = 4 * 1024 * 1024;
const mimeHeader = response => (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
const interrupted = () => new MediaError('INCOMPLETE_DOWNLOAD', 'A transferência foi interrompida ou chegou incompleta.');
const cancelled = () => new MediaError('ABORTED', 'Transferência interrompida.');

export function createRemoteTransfer({ disk, createHash, delay = waitForRetry, yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0)) }) {
  async function verify(uri, file) {
    if (await disk.size(uri) !== file.sizeBytes) throw interrupted();
    const handle = await disk.read(uri);
    const hash = createHash();
    let read = 0;
    try {
      while (read < file.sizeBytes) {
        const bytes = await handle.read(Math.min(blockSize, file.sizeBytes - read));
        if (!bytes.length || bytes.length > Math.min(blockSize, file.sizeBytes - read)) throw interrupted();
        if (read === 0 && !matchesMediaSignature(bytes.subarray(0, 16), file.format)) {
          throw new MediaError('INVALID_FILE', 'O arquivo recebido não corresponde ao formato esperado.');
        }
        hash.update(bytes);
        read += bytes.length;
        if (read % (blockSize * 16) === 0) await yieldToUI();
      }
    } finally {
      await handle.close();
    }
    const digest = Array.from(hash.digest(), byte => byte.toString(16).padStart(2, '0')).join('');
    if (read !== file.sizeBytes || digest !== file.sha256) {
      throw new MediaError('CHECKSUM_MISMATCH', 'O SHA-256 do arquivo recebido diverge. Nenhum arquivo foi publicado.');
    }
  }

  return async function transfer({ id, job, option, client, signal, onProgress, onVerifying }) {
    const file = verifiedResult(job, option);
    const { temporary, destination } = await disk.paths(id, option.format);
    let written = 0;
    let lastPercent = -1;
    async function readResponse(response, bodySignal, expectedLength, range, output) {
      const contentRange = response.headers.get('content-range');
      if (range ? (response.status !== 206 || contentRange !== `bytes ${range.start}-${range.end}/${file.sizeBytes}`)
        : (response.status !== 200 || contentRange)) throw interrupted();
      if (mimeHeader(response) !== file.mimeType) throw new MediaError('INVALID_FILE', 'O tipo do arquivo recebido não corresponde ao formato selecionado.');
      const declaredLength = response.headers.get('content-length');
      if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) !== expectedLength)) throw interrupted();
      if (response.headers.get('x-content-sha256') !== file.sha256) {
        throw new MediaError('CHECKSUM_MISMATCH', 'A API retornou hashes divergentes para o resultado.');
      }
      if (!response.body?.getReader) throw interrupted();
      const reader = response.body.getReader();
      let received = 0;
      try {
        for (;;) {
          const chunk = await reader.read();
          if (bodySignal.aborted) throw cancelled();
          if (chunk.done) break;
          received += chunk.value.byteLength;
          if (received > expectedLength) throw interrupted();
          await output.write(chunk.value);
          written += chunk.value.byteLength;
          const percent = Math.floor(written / file.sizeBytes * 100);
          if (percent !== lastPercent) {
            lastPercent = percent;
            onProgress?.(written, file.sizeBytes);
          }
        }
      } catch (error) {
        void reader.cancel().catch(() => {});
        throw error;
      } finally {
        reader.releaseLock();
      }
      if (received !== expectedLength) throw interrupted();
    }
    try {
      if (signal.aborted) throw cancelled();
      if (await disk.size(destination) !== null) {
        // The file may have been promoted just before a restart. Validate it against the authenticated job.
        if (signal.aborted) throw cancelled();
        onVerifying?.();
        await verify(destination, file);
      } else {
        await disk.remove(temporary);
        const free = await disk.freeBytes?.();
        if (Number.isFinite(free) && free < file.sizeBytes) throw new MediaError('NO_LOCAL_SPACE', 'Não há espaço suficiente no dispositivo para salvar o arquivo.');
        const output = await disk.write(temporary);
        try {
          // Native fetch can queue chunks faster than disk writes. Bound each HTTP response.
          for (let start = 0; start < file.sizeBytes; start += maxResponse) {
            const end = Math.min(start + maxResponse, file.sizeBytes) - 1;
            const range = file.sizeBytes > maxResponse ? { start, end } : undefined;
            for (let attempt = 0; ; attempt += 1) {
              try {
                await client.download(job, option, signal, range, (response, bodySignal) => readResponse(response, bodySignal, end - start + 1, range, output));
                break;
              } catch (error) {
                if (error.status !== 429 || attempt >= 2) throw error;
                await delay(Math.min(60000, error.retryAfterMs || 1500 * 2 ** attempt), signal);
              }
            }
          }
        } finally { await output.close(); }
        if (signal.aborted) throw cancelled();
        onVerifying?.();
        await verify(temporary, file);
        await disk.move(temporary, destination);
        if (await disk.size(destination) !== file.sizeBytes) throw new MediaError('LOCAL_STORAGE', 'Não foi possível confirmar o arquivo no destino.');
      }
      return { verified: true, fileUri: destination, mimeType: file.mimeType, sizeBytes: file.sizeBytes, sha256: file.sha256 };
    } finally {
      await disk.remove(temporary);
    }
  };
}
