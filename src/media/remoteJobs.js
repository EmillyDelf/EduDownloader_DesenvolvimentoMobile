import { isJobId, isOptionId } from './backendClient';
import { MediaError, transferProgress } from './mediaContracts';

const abortError = () => new MediaError('ABORTED', 'Acompanhamento interrompido.');
const recoverableCodes = new Set([
  'BACKEND_NETWORK', 'BACKEND_TIMEOUT', 'BACKEND_SESSION', 'UNAUTHORIZED', 'RATE_LIMIT', 'QUEUE_FULL',
  'INCOMPLETE_DOWNLOAD', 'LOCAL_STORAGE', 'NO_LOCAL_SPACE', 'CHECKSUM_MISMATCH', 'INVALID_FILE', 'STORAGE_WRITE', 'BACKEND_PAUSED',
]);
const transient = error => ['BACKEND_NETWORK', 'BACKEND_TIMEOUT', 'RATE_LIMIT'].includes(error?.code)
  || (error?.status >= 500 && error.status <= 504);

function restartError(error, retry) {
  return Object.assign(new MediaError(error.code, error.message), { retryRemote: retry });
}

export function remoteCheckpoint(client, media, option, key) {
  return { origin: client.origin, analysisId: media.analysisId, optionId: option.id, expiresAt: media.expiresAt, key };
}

export function canResumeRemote(error) {
  return Boolean(error?.retryRemote) || recoverableCodes.has(error?.code) || transient(error);
}

export function waitForRetry(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(abortError()); return; }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    function abort() { clearTimeout(timer); reject(abortError()); }
    signal.addEventListener('abort', abort, { once: true });
  });
}

function remoteProgress(job) {
  const { progress, status } = job;
  if (status === 'downloading') return transferProgress(progress.downloadedBytes, progress.totalBytes);
  if (status === 'processing' && Number.isFinite(progress.durationSeconds) && progress.durationSeconds > 0) {
    return transferProgress(progress.processedSeconds, progress.durationSeconds);
  }
  if (status === 'processing' && Number.isFinite(progress.percent)) return transferProgress(progress.percent, 100);
  return null;
}

export function createRemoteJobs({ client, transfer, waitForForeground = () => {}, delay = waitForRetry, now = Date.now }) {
  return {
    checkpoint: (media, option, key) => remoteCheckpoint(client, media, option, key),
    prepare(option, id, { checkpoint, onCheckpoint, onPhase, replayIntent = false }) {
      const controller = new AbortController();
      const { signal } = controller;
      let phase = 'prepared';
      let job;
      let cancelRequest;
      let cancellation;
      let acknowledge;
      let localCancelled = false;
      let suspended = false;
      const canCancel = () => !cancelRequest && (phase === 'local' || (phase === 'remote' && job?.canCancel && !job.cancelRequested));
      function report(name, progress, details) {
        onPhase({ name, progress, canCancel: canCancel(), ...details });
      }
      async function poll(jobId) {
        for (let attempt = 0; ; attempt += 1) {
          await waitForForeground(signal);
          try {
            return await client.status(jobId, signal);
          } catch (error) {
            if (!transient(error) || attempt >= 3) throw error;
            await delay(Math.min(60000, Math.max(error.retryAfterMs || 0, 1500 * 2 ** attempt)), signal);
          }
        }
      }
      return {
        canCancel,
        suspend() {
          if (phase === 'verifyingLocal' || phase === 'finished') return;
          suspended = true;
          controller.abort();
        },
        cancel() {
          if (cancellation) return cancellation;
          if (!canCancel()) return Promise.resolve(false);
          if (phase === 'local') {
            localCancelled = true;
            controller.abort();
            cancellation = new Promise(resolve => { acknowledge = resolve; });
            return cancellation;
          }
          let confirm;
          const confirmed = new Promise(resolve => { confirm = resolve; });
          cancelRequest = client.cancel(job.id, signal).then(state => {
            if (state.status === 'cancelled') {
              job = state;
              acknowledge = confirm;
            }
            else if (state.cancelRequested && !['completed', 'failed'].includes(state.status)) acknowledge = confirm;
            else confirm(false);
          }).catch(() => { confirm(false); });
          cancellation = confirmed.finally(() => { cancellation = undefined; cancelRequest = undefined; });
          return cancellation;
        },
        async start() {
          const monitorUntil = now() + 31 * 60 * 1000;
          try {
            if (phase !== 'prepared' || !checkpoint || checkpoint.origin !== client.origin
              || !isJobId(checkpoint.analysisId) || !isOptionId(checkpoint.optionId) || checkpoint.optionId !== option.id
              || !isOptionId(checkpoint.key) || (checkpoint.jobId && !isJobId(checkpoint.jobId))) {
              throw new MediaError('BACKEND_CONFIG', 'O trabalho salvo não pertence ao servidor configurado.');
            }
            phase = 'remote';
            report('queued', null);
            if (checkpoint.jobId) job = await poll(checkpoint.jobId);
            else {
              if (!Number.isFinite(checkpoint.expiresAt) || (!replayIntent && checkpoint.expiresAt <= now())) {
                throw restartError(new MediaError('ANALYSIS_EXPIRED', 'A análise expirou. Analise o link novamente antes de baixar.'), 'analysis');
              }
              await waitForForeground(signal);
              try {
                job = await client.create(checkpoint, signal);
              } catch (error) {
                if (['NOT_FOUND', 'UNKNOWN_OPTION'].includes(error?.code)) throw restartError(error, 'analysis');
                throw error;
              }
              await onCheckpoint({ ...checkpoint, jobId: job.id });
            }
            for (;;) {
              if (job.option.id !== option.id || job.option.format !== option.format) {
                throw new MediaError('BACKEND_RESPONSE', 'O servidor devolveu um trabalho de outra opção.');
              }
              if (cancelRequest) await cancelRequest;
              if (job.status === 'cancelled') throw new MediaError('CANCELLED', 'O servidor confirmou o cancelamento.');
              if (job.status === 'failed') {
                throw restartError(job.error || new MediaError('PROCESSING_FAILED', 'O trabalho falhou no servidor.'), 'job');
              }
              if (job.status === 'completed') break;
              if (now() >= monitorUntil) throw new MediaError('BACKEND_TIMEOUT', 'O acompanhamento demorou mais que o previsto. Retome para consultar a mesma tarefa.');
              report(job.status, remoteProgress(job), {
                track: job.progress?.track, trackCount: job.progress?.trackCount, isCancelling: job.cancelRequested,
              });
              await delay(1500, signal);
              if (job.status !== 'cancelled') {
                const next = await poll(job.id);
                if (job.status !== 'cancelled') job = next;
              }
            }
            acknowledge?.(false);
            await waitForForeground(signal);
            phase = 'local';
            report('local', null);
            return await transfer({
              id, job, option, client, signal,
              onProgress: (written, total) => report('local', transferProgress(written, total)),
              onVerifying: () => { phase = 'verifyingLocal'; report(phase, null); },
            });
          } catch (error) {
            if (job?.status === 'cancelled' || error?.code === 'CANCELLED' || (localCancelled && error?.code === 'ABORTED')) acknowledge?.(true);
            else acknowledge?.(false);
            if (suspended && !localCancelled && job?.status !== 'cancelled') {
              throw new MediaError('BACKEND_PAUSED', 'O acompanhamento foi interrompido. Retome o trabalho salvo.');
            }
            if (['NOT_FOUND', 'FILE_UNAVAILABLE'].includes(error?.code) && !error.retryRemote) {
              throw restartError(error, 'job');
            }
            throw error;
          } finally {
            phase = 'finished';
            controller.abort();
          }
        },
      };
    },
  };
}
