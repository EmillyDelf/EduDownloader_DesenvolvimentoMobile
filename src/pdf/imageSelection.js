export const MAX_PDF_IMAGES = 20;

export function mergeSelectedImages(current = [], incoming = []) {
  const unique = [];
  const uris = new Set();
  for (const image of [...current, ...incoming]) {
    if (!image || typeof image.uri !== 'string' || !image.uri.trim() || uris.has(image.uri)) continue;
    uris.add(image.uri);
    unique.push(image);
  }
  return { images: unique.slice(0, MAX_PDF_IMAGES), limitExceeded: unique.length > MAX_PDF_IMAGES };
}

export function normalizeSelectedImages(images = []) {
  return mergeSelectedImages([], images).images;
}
