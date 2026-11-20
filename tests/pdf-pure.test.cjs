const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const generatorSource = fs.readFileSync(path.join(root, 'src/pdf/pdfGenerator.js'), 'utf8');
const selectionSource = fs.readFileSync(path.join(root, 'src/pdf/imageSelection.js'), 'utf8');

function extractTopLevel(source, expression) {
  const match = source.match(expression);
  assert.ok(match, `Could not find source section: ${expression}`);
  return match[0].replace(/^export\s+/, '');
}

const sizesSource = extractTopLevel(
  generatorSource,
  /^export const PDF_PAGE_SIZES = \{[\s\S]*?^\};/m,
);
const sanitizeSource = extractTopLevel(
  generatorSource,
  /^export function sanitizePdfName\([\s\S]*?^\}/m,
);
const placementSource = extractTopLevel(
  generatorSource,
  /^export function calculateImagePlacement\([\s\S]*?^\}/m,
);
const dimensionsSource = extractTopLevel(
  generatorSource,
  /^function getPageDimensions\([\s\S]*?^\}/m,
);

const pureContext = {};
vm.createContext(pureContext);
vm.runInContext(
  `${sizesSource}\n${sanitizeSource}\n${placementSource}\n${dimensionsSource}\n` +
    'this.api = { PDF_PAGE_SIZES, sanitizePdfName, calculateImagePlacement, getPageDimensions };',
  pureContext,
);
const pdf = pureContext.api;

const selectionContext = {};
vm.createContext(selectionContext);
vm.runInContext(
  `${selectionSource.replace(/^export\s+/gm, '')}\n` +
    'this.api = { MAX_PDF_IMAGES, mergeSelectedImages, normalizeSelectedImages };',
  selectionContext,
);
const selection = selectionContext.api;

test('PDF filename sanitization handles accents, unsafe paths, empty values and length limits', () => {
  assert.equal(pdf.sanitizePdfName('  ação / teste  '), 'acao_teste');
  assert.equal(pdf.sanitizePdfName('../../arquivo.pdf'), 'arquivo_pdf');
  assert.equal(pdf.sanitizePdfName('***'), 'documento');
  assert.equal(pdf.sanitizePdfName('x'.repeat(100)).length, 64);
  assert.match(pdf.sanitizePdfName('Relatório 2026'), /^[a-zA-Z0-9_-]+$/);
});

test('all page sizes and orientations produce correctly ordered dimensions', () => {
  for (const pageSize of Object.keys(pdf.PDF_PAGE_SIZES)) {
    const [portraitWidth, portraitHeight] = pdf.getPageDimensions({ pageSize, orientation: 'portrait' });
    const [landscapeWidth, landscapeHeight] = pdf.getPageDimensions({ pageSize, orientation: 'landscape' });
    assert.ok(portraitWidth > 0 && portraitHeight > 0);
    assert.ok(landscapeWidth > 0 && landscapeHeight > 0);
    assert.ok(portraitHeight >= portraitWidth);
    assert.ok(landscapeWidth >= landscapeHeight);
    assert.equal(portraitWidth, landscapeHeight);
    assert.equal(portraitHeight, landscapeWidth);
  }
});

test('portrait, landscape and square images fit within margins without distortion', () => {
  for (const pageSize of Object.keys(pdf.PDF_PAGE_SIZES)) {
    for (const orientation of ['portrait', 'landscape']) {
      const [pageWidth, pageHeight] = pdf.getPageDimensions({ pageSize, orientation });
      for (const [imageWidth, imageHeight] of [[4000, 1000], [1000, 4000], [1800, 1800]]) {
        const margin = 28;
        const placed = pdf.calculateImagePlacement(imageWidth, imageHeight, pageWidth, pageHeight, margin);
        assert.ok(placed.x >= margin - 1e-8);
        assert.ok(placed.y >= margin - 1e-8);
        assert.ok(placed.x + placed.width <= pageWidth - margin + 1e-8);
        assert.ok(placed.y + placed.height <= pageHeight - margin + 1e-8);
        assert.ok(Math.abs(placed.width / placed.height - imageWidth / imageHeight) < 1e-8);
      }
    }
  }
});

test('image selection caps at 20 and removes duplicates while preserving order', () => {
  assert.equal(selection.MAX_PDF_IMAGES, 20);
  const original = Array.from({ length: 18 }, (_, index) => ({ uri: `file://${index}` }));
  const incoming = [
    { uri: 'file://17' },
    { uri: 'file://18' },
    { uri: 'file://19' },
    { uri: 'file://20' },
    { uri: '' },
    null,
  ];
  const result = selection.mergeSelectedImages(original, incoming);
  assert.equal(result.images.length, 20);
  assert.equal(result.limitExceeded, true);
  assert.equal(result.images[0].uri, 'file://0');
  assert.equal(result.images.at(-1).uri, 'file://19');
  assert.equal(new Set(result.images.map(image => image.uri)).size, 20);
  assert.equal(selection.normalizeSelectedImages(Array.from({ length: 25 }, (_, i) => ({ uri: `u${i}` }))).length, 20);
});

test('PDF generator retains the SDK conversion, JPEG embedding, progress and persistent-save contract', () => {
  assert.match(generatorSource, /ImageManipulator\.manipulate\(source\.uri\)/);
  assert.match(generatorSource, /\.resize\(resizeTarget\)/);
  assert.match(generatorSource, /SaveFormat\.JPEG/);
  assert.match(generatorSource, /pdf\.embedJpg\(bytes\)/);
  assert.match(generatorSource, /onProgress\(/);
  assert.match(generatorSource, /new Directory\(Paths\.document, 'PDFs'\)/);
  assert.match(generatorSource, /await output\.write\(pdfBytes\)/);
  assert.match(generatorSource, /images\.length > 20/);
});
