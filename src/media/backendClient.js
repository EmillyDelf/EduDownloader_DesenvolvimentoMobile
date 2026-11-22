import { cleanFilename, mediaMimeTypes, MediaError } from './mediaContracts';

const apiPrefix = '/api/v1';
const maxResultBytes = 1024 ** 3;
const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);
const jobStates = new Set(['queued', 'analyzing', 'downloading', 'processing', 'verifying', 'completed', 'failed', 'cancelled']);
const operations = new Set(['original', 'remux', 'merge', 'transcode']);
const messages = {
  UNAUTHORIZED: 'A credencial foi recusada. Atualize a credencial da sessão.',
  FORBIDDEN: 'O servidor negou acesso a esta operação.',
  ORIGIN_DENIED: 'Esta origem não é autorizada pelo servidor.',
  UNSUPPORTED_ORIGIN: 'O servidor não oferece suporte a esta origem.',
  UNSUPPORTED_MEDIA: 'A origem não disponibiliza uma mídia compatível.',
  NO_SUPPORTED_FORMAT: 'Nenhum formato disponível pôde ser confirmado.',
  NOT_FOUND: 'A análise ou o trabalho não está mais disponível no servidor.',
  UNKNOWN_OPTION: 'A opção selecionada não está mais disponível. Analise o link novamente.',
  RATE_LIMIT: 'Limite de requisições atingido. Aguarde e tente novamente.',
  ANALYSIS_RATE_LIMIT: 'Limite de análises atingido. Aguarde e tente novamente.',
  ANALYSIS_BUSY: 'O servidor está analisando outras mídias. Tente novamente em instantes.',
  QUEUE_FULL: 'A fila do servidor está cheia. Tente novamente em instantes.',
  ENGINE_UNAVAILABLE: 'O motor de mídia está indisponível.',
  PROCESSING_FAILED: 'O motor não conseguiu processar o formato selecionado.',
  TASK_TIMEOUT: 'O trabalho excedeu o tempo permitido no servidor.',
  NO_SPACE: 'O servidor não tem espaço suficiente para processar a mídia.',
  SIZE_LIMIT: 'A mídia ultrapassa o tamanho permitido pelo servidor.',
  DURATION_LIMIT: 'A mídia ultrapassa a duração permitida pelo servidor.',
  INCOMPLETE_DOWNLOAD: 'O servidor recebeu um arquivo incompleto da origem.',
  FILE_UNAVAILABLE: 'O resultado expirou ou foi removido do servidor.',
  FILE_NOT_READY: 'O resultado ainda não está disponível para transferência.',
  IDEMPOTENCY_CONFLICT: 'Esta tentativa não corresponde à opção do trabalho original.',
  UNVERIFIED_FILE: 'O servidor não confirmou a integridade do arquivo.',
};

export const isJobId = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
export const isOptionId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
export const positiveBytes = value => Number.isSafeInteger(value) && value > 0;
const invalidResponse = () => new MediaError('BACKEND_RESPONSE', 'O servidor retornou dados de mídia inválidos.');

export function backendOrigin(value, allowLoopback = false) {
  if (typeof value !== 'string' || !/^https?:\/\/[^/?#\\]+\/?$/i.test(value) || /\s/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/') return null;
    if (url.protocol === 'https:' || (allowLoopback && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) return url.origin;
  } catch { /* Invalid configuration. */ }
  return null;
}

export function createBackendSession() {
  let token = '';
  return {
    getToken: () => token,
    setToken(value) {
      const next = typeof value === 'string' ? value.trim() : '';
      if (next && !/^[a-zA-Z0-9._~+/-]{1,512}={0,2}$/.test(next)) return false;
      token = next;
      return true;
    },
  };
}

function serverError(payload, status) {
  const code = payload?.error?.code;
  const fallback = { 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 410: 'FILE_UNAVAILABLE', 429: 'RATE_LIMIT' }[status];
  const known = Object.hasOwn(messages, code) ? code : fallback;
  const error = new MediaError(known || 'BACKEND_FAILURE', messages[known] || 'O serviço não conseguiu concluir a operação.');
  error.status = status;
  return error;
}

function remoteOption(option) {
  if (!isOptionId(option?.id) || !Object.hasOwn(mediaMimeTypes, option.format) || mediaMimeTypes[option.format] !== option.mimeType
    || !operations.has(option.operation)) throw invalidResponse();
  return {
    id: option.id, format: option.format, mimeType: option.mimeType, operation: option.operation,
    quality: typeof option.quality === 'string' ? option.quality.slice(0, 64) : null,
    sizeBytes: positiveBytes(option.sizeBytes) ? option.sizeBytes : undefined,
    estimatedSizeBytes: positiveBytes(option.estimatedSizeBytes) ? option.estimatedSizeBytes : undefined,
  };
}

export function normalizeRemoteAnalysis(data) {
  const expiresAt = Date.parse(data?.expiresAt);
  if (data?.available !== true || !isJobId(data.analysisId) || !Number.isFinite(expiresAt)
    || !Array.isArray(data.options) || !data.options.length || data.options.length > 100) throw invalidResponse();
  const options = data.options.map(remoteOption);
  if (new Set(options.map(option => option.id)).size !== options.length) throw invalidResponse();
  return { strategy: 'remote', available: true, analysisId: data.analysisId, expiresAt, name: cleanFilename(data.name), options };
}

function normalizeJob(data, id) {
  if (!isJobId(data?.id) || (id && id !== data.id) || !jobStates.has(data.status)) throw invalidResponse();
  return {
    id: data.id, status: data.status, option: remoteOption(data.option),
    progress: data.progress || {}, canCancel: data.canCancel === true, cancelRequested: data.cancelRequested === true,
    error: data.error ? serverError({ error: data.error }) : null, file: data.file,
  };
}

export function verifiedResult(job, option) {
  const expectedPath = `${apiPrefix}/jobs/${job.id}/file`;
  const file = job.file;
  if (job.status !== 'completed' || !isJobId(job.id) || !file || file.downloadPath !== expectedPath || file.format !== option.format
    || file.mimeType !== option.mimeType || !positiveBytes(file.sizeBytes) || file.sizeBytes > maxResultBytes
    || typeof file.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(file.sha256)) throw invalidResponse();
  return { path: expectedPath, format: file.format, mimeType: file.mimeType, sizeBytes: file.sizeBytes, sha256: file.sha256 };
}

export function createBackendClient({ address, allowLoopback, getToken, fetchImpl, timeoutMs = 30000 }) {
  const origin = backendOrigin(address, allowLoopback);
  async function request(path, { signal, body, key, range, method = body ? 'POST' : 'GET', consume = response => response.json(), timeout = timeoutMs } = {}) {
    if (!origin) throw new MediaError('BACKEND_CONFIG', 'O endereço seguro do serviço de mídia não foi configurado.');
    const token = getToken();
    if (!token) throw new MediaError('BACKEND_SESSION', 'Informe a credencial da sessão para usar o serviço de mídia.');
    const controller = new AbortController();
    const abort = () => controller.abort();
    let timedOut = false;
    if (signal?.aborted) throw new MediaError('ABORTED', 'Operação interrompida.');
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; abort(); }, timeout);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (body) headers['Content-Type'] = 'application/json';
      if (key) headers['Idempotency-Key'] = key;
      if (range) headers.Range = `bytes=${range.start}-${range.end}`;
      const response = await fetchImpl(origin + path, {
        method, headers, signal: controller.signal, redirect: 'error', credentials: 'omit', cache: 'no-store',
        body: body ? JSON.stringify(body) : undefined,
      });
      if (response.redirected || (response.url && response.url !== origin + path)) throw invalidResponse();
      if (!response.ok) {
        const error = serverError(await response.json().catch(() => null), response.status);
        const retryAfter = Number(response.headers.get('retry-after'));
        if (response.status === 429 && retryAfter > 0) error.retryAfterMs = retryAfter * 1000;
        throw error;
      }
      return await consume(response, controller.signal);
    } catch (error) {
      if (timedOut) throw new MediaError('BACKEND_TIMEOUT', 'O serviço de mídia demorou para responder.');
      if (controller.signal.aborted) throw new MediaError('ABORTED', 'Operação interrompida.');
      if (error instanceof MediaError) throw error;
      if (error instanceof SyntaxError) throw invalidResponse();
      throw new MediaError('BACKEND_NETWORK', 'Não foi possível comunicar com o serviço de mídia.');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      abort();
    }
  }
  function jobPath(id) {
    if (!isJobId(id)) throw invalidResponse();
    return `${apiPrefix}/jobs/${id}`;
  }
  return {
    origin,
    health: signal => request(apiPrefix + '/health', { signal }),
    analyze: async (url, { signal } = {}) => normalizeRemoteAnalysis(await request(apiPrefix + '/media/analyze', { signal, body: { url } })),
    create: async (checkpoint, signal) => normalizeJob(await request(apiPrefix + '/jobs', {
      signal, key: checkpoint.key, body: { analysisId: checkpoint.analysisId, optionId: checkpoint.optionId },
    })),
    status: async (id, signal) => normalizeJob(await request(jobPath(id), { signal }), id),
    cancel: async (id, signal) => normalizeJob(await request(jobPath(id) + '/cancel', { signal, method: 'POST' }), id),
    download(job, option, signal, range, consume) {
      const file = verifiedResult(job, option);
      return request(file.path, { signal, range, consume, timeout: 90000 });
    },
  };
}

export function createMediaStrategy(direct, backend, allowedHosts = '') {
  const allowed = new Set(allowedHosts.split(',').map(host => host.trim().toLowerCase()).filter(Boolean));
  return async (url, options) => {
    const hostname = new URL(url).hostname.toLowerCase();
    if (youtubeHosts.has(hostname)) return backend.analyze(url, options);
    try {
      return await direct(url, options);
    } catch (error) {
      if (backend.origin && allowed.has(hostname) && ['UNSUPPORTED', 'HEAD_UNSUPPORTED'].includes(error.code)) return backend.analyze(url, options);
      throw error;
    }
  };
}
