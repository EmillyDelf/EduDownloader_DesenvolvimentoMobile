import { cleanFilename, MediaError, normalizeMediaMetadata, validateMediaUrl } from './mediaContracts';

function responseFilename(response, url) {
  const disposition = response.headers.get('content-disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="([^"]+)"|filename=([^;]+)/i);
  try {
    if (encoded) return cleanFilename(decodeURIComponent(encoded));
    if (plain) return cleanFilename(plain[1] || plain[2]);
    const last = new URL(url).pathname.split('/').filter(Boolean).at(-1);
    return last ? cleanFilename(decodeURIComponent(last)) : '';
  } catch {
    return '';
  }
}

// This adapter identifies directly served media only. It never scrapes a page,
// downloads a response body to guess metadata, or manufactures quality variants.
export function createDirectMediaIdentifier(fetchImpl = globalThis.fetch, timeoutMs = 15000) {
  return async function identify(source, { signal } = {}) {
    const validation = validateMediaUrl(source);
    if (!validation.valid) throw new MediaError('INVALID_URL', validation.error);
    if (typeof fetchImpl !== 'function') throw new MediaError('NO_IDENTIFIER', 'Identificação de mídia indisponível neste ambiente.');
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const response = await fetchImpl(validation.url, { method: 'HEAD', signal: controller.signal });
      if (controller.signal.aborted) throw new MediaError('ABORTED', 'Análise interrompida.');
      if ([405, 501].includes(response.status)) {
        throw new MediaError('HEAD_UNSUPPORTED', 'Esta origem não permite identificar o arquivo direto. Ela precisa de um serviço de identificação compatível.');
      }
      if (!response.ok) throw new MediaError('HTTP_ERROR', 'O arquivo está inacessível ou indisponível. Verifique o link e tente novamente.');
      const finalUrl = validateMediaUrl(response.url || validation.url);
      if (!finalUrl.valid) throw new MediaError('INVALID_RESPONSE', 'A origem redirecionou para um endereço não suportado.');
      const mime = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const format = mime === 'video/mp4' ? 'MP4' : mime === 'audio/mpeg' ? 'MP3' : null;
      if (!format) {
        throw new MediaError('UNSUPPORTED', 'A origem não confirmou um arquivo direto MP4 ou MP3. Links de páginas e plataformas dependem de um serviço externo.');
      }
      const size = response.headers.get('content-length');
      return normalizeMediaMetadata({
        available: true, name: responseFilename(response, finalUrl.url),
        options: [{
          id: `${format.toLowerCase()}-original`, format, mimeType: mime,
          url: finalUrl.url, quality: null,
          sizeBytes: size !== null && /^\d+$/.test(size) && Number(size) > 0 ? Number(size) : undefined,
        }],
      });
    } catch (error) {
      if (timedOut) throw new MediaError('TIMEOUT', 'A origem demorou para responder. Verifique sua conexão e tente novamente.');
      if (signal?.aborted) throw new MediaError('ABORTED', 'Análise interrompida.');
      if (error instanceof MediaError) throw error;
      throw new MediaError('NETWORK', 'Não foi possível acessar a mídia. Verifique a conexão e o endereço.');
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  };
}
