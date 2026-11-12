export class MediaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MediaError';
    this.code = code;
  }
}

export function publicError(error, fallback) {
  return error instanceof MediaError ? error.message : fallback;
}

export function validateMediaUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { valid: false, error: 'Insira o link do vídeo ou áudio.' };
  }
  const text = value.trim();
  if (text.length > 8192 || /[\u0000-\u001f\u007f]/.test(value) || /[\s\\]/.test(text)) {
    return { valid: false, error: 'Informe uma URL válida, sem espaços ou caracteres de controle.' };
  }
  try {
    // Reject URL parser repairs such as https:example.com and incomplete hosts.
    if (!/^https?:\/\/[^/]/i.test(text)) throw new Error();
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw new Error();
    url.hash = '';
    return { valid: true, url: url.href, error: '' };
  } catch {
    return { valid: false, error: 'Use um link HTTP ou HTTPS completo, sem usuário ou senha na URL.' };
  }
}

export const mediaMimeTypes = { MP4: 'video/mp4', MP3: 'audio/mpeg' };

export function cleanFilename(value, fallback = 'mídia') {
  const name = String(value || '').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/g, '').trim();
  return name.slice(0, 160) || fallback;
}

export function normalizeMediaMetadata(metadata) {
  if (!metadata || metadata.available !== true || !Array.isArray(metadata.options)) {
    throw new MediaError('UNIDENTIFIED', 'Não foi possível identificar uma mídia disponível nessa origem.');
  }
  const seen = new Set();
  const options = metadata.options.map(option => {
    if (!option || typeof option !== 'object') throw new MediaError('INVALID_METADATA', 'O serviço retornou opções de mídia inválidas.');
    const format = String(option.format || '').toUpperCase();
    const url = validateMediaUrl(option.url);
    const mimeType = String(option.mimeType || '').split(';')[0].trim().toLowerCase();
    if (typeof option.id !== 'string' || !option.id || seen.has(option.id) || !url.valid || mediaMimeTypes[format] !== mimeType) {
      throw new MediaError('INVALID_METADATA', 'O serviço retornou um formato ou endereço de mídia não suportado.');
    }
    seen.add(option.id);
    return {
      id: String(option.id), format, mimeType, url: url.url,
      quality: typeof option.quality === 'string' && option.quality.trim() ? option.quality.trim() : null,
      sizeBytes: Number.isFinite(option.sizeBytes) && option.sizeBytes >= 0 ? option.sizeBytes : undefined,
    };
  });
  if (!options.length) throw new MediaError('UNSUPPORTED', 'Nenhuma opção MP4 ou MP3 foi confirmada para essa origem.');
  return { name: metadata.name ? cleanFilename(metadata.name) : '', available: true, options };
}

export function transferProgress(written, expected) {
  if (!Number.isFinite(written) || written < 0 || !Number.isFinite(expected) || expected <= 0) return null;
  // Reserve completion for the verified terminal result, never just a byte event.
  return Math.min(99, Math.max(0, written / expected * 100));
}

export function matchesMediaSignature(binary, format) {
  const bytes = typeof binary === 'string' ? Array.from(binary, char => char.charCodeAt(0)) : Array.from(binary || []);
  if (format === 'MP4') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
  if (format === 'MP3') {
    if (String.fromCharCode(...bytes.slice(0, 3)) === 'ID3') return bytes.length >= 10;
    return bytes.length >= 4 && bytes[0] === 255 && (bytes[1] & 224) === 224
      && (bytes[1] & 6) === 2 && (bytes[1] & 24) !== 8;
  }
  return false;
}

export const downloadTransitions = {
  idle: ['validating'], validating: ['identifying', 'failed', 'idle'],
  identifying: ['ready', 'failed', 'idle'], ready: ['queued', 'validating', 'idle'],
  queued: ['downloading', 'failed'], downloading: ['completed', 'failed', 'cancelled'],
  completed: ['validating', 'idle'], failed: ['validating', 'idle'], cancelled: ['validating', 'idle'],
};

export function canTransition(from, to) {
  return from === to || Boolean(downloadTransitions[from]?.includes(to));
}
