const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const test = require('node:test');
const pdfLib = require('pdf-lib');
const { loadMedia } = require('./helpers/loadMedia.cjs');
const { harness } = require('./helpers/mobileHarness.cjs');
const { nodeFileBridge } = require('./helpers/nodeFileBridge.cjs');

const [adapters, repos, service, views, contracts] = loadMedia([
  'src/media/expoAdapters.js', 'src/media/mediaRepository.js', 'src/media/mediaLibrary.js',
  'src/screens/fileScreenUtils.js', 'src/media/libraryFiles.js',
], { Uint8Array, 'pdf-lib': pdfLib });
const pdfInput = result => ({
  fileUri: result.uri, name: result.name, sizeBytes: result.size, pageCount: result.pageCount, format: 'PDF', activityType: 'pdf',
});
const knownMime = { MP3: 'audio/mpeg', MP4: 'video/mp4' };

async function fixture(t, platform = 'android') {
  const disk = await nodeFileBridge(t);
  const dir = disk.fs.documentDirectory;
  const previewed = [];
  const shared = [];
  const state = { deleteError: false, pickerCancelled: false, shareAvailable: true, shareCancelled: false, nativeError: false, journalError: false };
  const exportUri = dir + 'exported';
  await disk.fs.makeDirectoryAsync(exportUri);
  class File extends disk.File {
    async preview(options) {
      if (state.nativeError) throw new Error('Private URI path');
      previewed.push({ uri: this.uri, ...options });
    }
    delete() {
      if (state.deleteError) throw new Error('EACCES');
      super.delete();
    }
  }
  class Directory extends disk.Directory {
    static async pickDirectoryAsync() {
      if (state.pickerCancelled) throw { code: 'ERR_PICKER_CANCELLED' };
      return new Directory(exportUri);
    }
  }
  const sharing = {
    isAvailableAsync: async () => state.shareAvailable,
    async shareAsync(uri, options) {
      if (state.shareCancelled) throw { code: 'ERR_PICKER_CANCELLED' };
      shared.push({ uri, ...options });
    },
  };
  const fsAdapter = { ...disk.fs, async moveAsync(request) {
    if (state.journalError) throw new Error('write failed before rename');
    return disk.fs.moveAsync(request);
  } };
  const files = adapters.createExpoFileServices({
    ...disk, fs: fsAdapter, File, Directory, sharing, documentDirectory: dir, platform,
    intentLauncher: { async startActivityAsync(_action, value) { previewed.push(value); } },
  });
  const createStorage = () => adapters.createExpoStorage(fsAdapter, dir);
  const createRepo = () => repos.createMediaRepository(createStorage());
  const createLibrary = (repository = createRepo(), options = {}) => service.createMediaLibrary({ files, repository, ...options });
  const { generatePdf } = harness('src/pdf/pdfGenerator.js', { moduleMocks: {
    'pdf-lib': pdfLib,
    'expo-file-system': { File, Directory, Paths: { document: dir } },
    'expo-image-manipulator': {
      SaveFormat: { JPEG: 'jpeg' },
      ImageManipulator: { manipulate: uri => ({ resize() {}, async renderAsync() { return { saveAsync: async () => ({ uri }) }; } }) },
    },
  } }).exports;
  const jpg = dir + 'input.jpg';
  await fs.copyFile(path.join(__dirname, 'fixtures/pdf-page.jpg'), disk.local(jpg));
  const generate = (name = 'Relatório de aula', count = 2) => generatePdf({
    images: Array.from({ length: count }, () => ({ uri: jpg, width: 100, height: 100 })),
    settings: { name, pageSize: 'Legal', orientation: 'landscape', margin: 15 },
  });
  return { disk, dir, state, generate, files, createLibrary, createStorage, createRepo, previewed, shared, exportUri };
}

test('Emilly’s generator writes the original PDF on disk and the shared catalog restores its verified PDF and history', async t => {
  const f = await fixture(t);
  let library = f.createLibrary();
  await library.initialize();
  const result = await f.generate();
  assert.ok(result.uri.startsWith(f.dir + 'PDFs/'));
  const first = library.registerGeneratedFile(pdfInput(result));
  assert.equal(library.registerGeneratedFile(pdfInput(result)), first);
  assert.equal(await first, true, JSON.stringify(library.getSnapshot()));
  const [record] = views.filterDownloads(library.getSnapshot().downloads, 'relatorio', 'pdf');
  const history = views.getHistorySections(library.getSnapshot().history, 'pdf');
  assert.equal(history.flatMap(group => group.data).length, 1);
  assert.equal(history[0].data[0].id, record.id);
  assert.equal(record.fileUri, result.uri);
  assert.equal(record.mimeType, 'application/pdf');
  assert.equal(record.fileOwnership, 'managed');
  assert.equal(record.sizeBytes, result.size);
  assert.equal(record.pageCount, 2);
  assert.deepEqual(await fs.readdir(f.disk.local(f.dir + 'PDFs/')), [result.name]);
  const bytes = await fs.readFile(f.disk.local(result.uri));
  assert.equal(bytes.length, record.sizeBytes);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  const document = await pdfLib.PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), 2);
  assert.deepEqual(document.getPage(0).getSize(), { width: 1008, height: 612 });
  t.diagnostic(JSON.stringify({ pages: 2, format: 'Legal', width: 1008, height: 612, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }));
  library = f.createLibrary();
  await library.initialize();
  assert.equal(library.getSnapshot().downloads[0].fileUri, result.uri);
  assert.equal(library.getSnapshot().history.length, 1);
  assert.equal(await library.openItem(record), true);
  assert.deepEqual(f.previewed[0], { uri: result.uri, title: result.name, mimeType: 'application/pdf' });
  assert.equal(await library.shareItem(record), true);
  assert.equal(f.shared[0].uri, result.uri);
  assert.equal(await library.exportItem(record), true);
  assert.deepEqual(await fs.readFile(f.disk.local(f.exportUri + '/' + result.name)), bytes);
  assert.equal(await library.exportItem(record), false);
  assert.deepEqual(await fs.readFile(f.disk.local(f.exportUri + '/' + result.name)), bytes);
  f.state.pickerCancelled = true;
  assert.equal(await library.exportItem(record), false);
  assert.equal(library.getSnapshot().actionError, '');
  await library.removeHistory(record);
  assert.equal(await library.registerGeneratedFile(pdfInput(result)), true);
  assert.equal(library.getSnapshot().history.length, 0);
  assert.equal(await library.removeDownload(record), true);
  library = f.createLibrary();
  await library.initialize();
  assert.equal(library.getSnapshot().downloads.length, 0);
  assert.equal(library.getSnapshot().history.length, 0);
  assert.deepEqual(await fs.readFile(f.disk.local(result.uri)), bytes);
});

test('PDF write recovery uses the same URI after retry and after restart, preserving bytes and rejecting invalid documents', async t => {
  const f = await fixture(t);
  let lib = f.createLibrary();
  await lib.initialize();
  const a = await f.generate('Persistir após erro');
  f.state.journalError = true;
  assert.equal(await lib.registerGeneratedFile(pdfInput(a)), false);
  assert.equal(lib.getSnapshot().history.length, 0);
  assert.match(lib.getSnapshot().storageError, /registrados/);
  assert.ok((await fs.stat(f.disk.local(a.uri))).size > 0);
  const journal = f.dir + 'edudownloader/library/';
  assert.deepEqual(await f.disk.fs.readDirectoryAsync(journal), [], 'An interrupted rename leaves no active journal fragment');
  f.state.journalError = false;
  const retry = lib.retryPersistence();
  assert.equal(lib.retryPersistence(), retry);
  assert.equal(await retry, true);
  assert.equal(lib.getSnapshot().history.length, 1);
  const b = await f.generate('Recuperar após reinício');
  f.state.journalError = true;
  assert.equal(await lib.registerGeneratedFile(pdfInput(b)), false);
  const invalid = f.dir + 'PDFs/Corrompido_1795157429000.pdf';
  await fs.writeFile(f.disk.local(invalid), '%PDF-1.7\n1 0 obj<< /Type /XRef >>\nendobj\nstartxref\n9\n%%EOF\n');
  f.state.journalError = false;
  lib = f.createLibrary();
  await lib.initialize();
  assert.equal(lib.getSnapshot().downloads.length, 2);
  assert.ok(lib.getSnapshot().downloads.some(record => record.fileUri === b.uri && record.pageCount === 2));
  assert.ok(!lib.getSnapshot().downloads.some(record => record.fileUri === invalid));
  assert.equal(await lib.registerGeneratedFile({ ...pdfInput(a), pageCount: 8 }), false);
  assert.equal(await lib.registerGeneratedFile({ ...pdfInput(a), mimeType: 'video/mp4' }), false);
  assert.equal(await lib.registerGeneratedFile({ ...pdfInput(a), fileUri: 'https://example.test/report.pdf' }), false);
  assert.equal(await lib.registerGeneratedFile({ ...pdfInput(a), name: 'NaoExiste_1795157429000.pdf', fileUri: f.dir + 'PDFs/NaoExiste_1795157429000.pdf' }), false);
  assert.equal(lib.getSnapshot().history.length, 2);
});

test('Legacy real MP4/MP3, externally referenced files, filters, and the missing-file state survive refresh and rename', async t => {
  const f = await fixture(t, 'ios');
  await f.disk.fs.makeDirectoryAsync(f.dir + 'edudownloader/downloads/');
  const rows = [];
  for (const [id, format, bytes] of [['antigo-video', 'MP4', '0000ftyp0000'], ['antigo-audio', 'MP3', 'ID3legacyfile']]) {
    const fileUri = f.dir + 'edudownloader/downloads/' + id + '.' + format.toLowerCase();
    await fs.writeFile(f.disk.local(fileUri), bytes);
    rows.push({ fileUri, format, id, name: id + '.' + format.toLowerCase(), status: 'completed', activityType: 'download' });
  }
  await f.createStorage().write({ version: 1, downloads: rows, history: rows });
  const lib = f.createLibrary();
  await lib.initialize();
  assert.equal(views.filterDownloads(lib.getSnapshot().downloads, 'VIDEO', 'video').length, 1);
  assert.equal(views.filterDownloads(lib.getSnapshot().downloads, '', 'audio').length, 1);
  assert.equal(await lib.openItem(rows[1]), true);
  assert.equal(f.shared.at(-1).mimeType, knownMime.MP3);
  const external = f.dir + 'audio%20externo.mp3';
  await fs.copyFile(f.disk.local(rows[1].fileUri), f.disk.local(external));
  const descriptor = { fileUri: external.replace('%20', ' '), name: 'audio externo.mp3', format: 'MP3', activityType: 'conversion' };
  assert.equal(await lib.registerGeneratedFile(descriptor), false, 'External ownership must be declared by the producer');
  assert.equal(await lib.registerGeneratedFile({ ...descriptor, fileOwnership: 'external' }), true);
  const foreign = lib.getSnapshot().downloads.find(row => row.activityType === 'conversion');
  assert.equal(foreign.fileOwnership, 'external');
  assert.equal(lib.canDeleteFile(foreign), false);
  assert.equal(await lib.deleteFile({ ...foreign, fileOwnership: 'managed' }), false);
  assert.ok(await fs.stat(f.disk.local(external)));
  assert.equal(await lib.shareItem(foreign), true);
  f.state.shareCancelled = true;
  assert.equal(await lib.shareItem(foreign), false);
  assert.equal(lib.getSnapshot().actionError, '');
  f.state.shareAvailable = false;
  assert.equal(await lib.shareItem(foreign), false);
  assert.match(lib.getSnapshot().actionError, /indisponível/);
  await fs.rename(f.disk.local(rows[0].fileUri), f.disk.local(f.dir + 'moved.mp4'));
  assert.equal(await lib.openItem(rows[0]), false);
  assert.equal(lib.getSnapshot().downloads.find(row => row.id === rows[0].id).availability, 'missing');
  assert.equal(lib.getSnapshot().history.find(row => row.id === rows[0].id).availability, 'missing');
  await fs.rename(f.disk.local(f.dir + 'moved.mp4'), f.disk.local(rows[0].fileUri));
  await lib.refresh();
  assert.equal(lib.getSnapshot().downloads.find(row => row.id === rows[0].id).availability, 'available');
});

test('Physical deletion uses the catalog, respects aliases, handles denial, and recovers a crash after removal', async t => {
  const f = await fixture(t);
  const repo = f.createRepo();
  const lib = f.createLibrary(repo);
  await lib.initialize();
  const output = await f.generate('Excluir');
  await lib.registerGeneratedFile(pdfInput(output));
  const [record] = lib.getSnapshot().downloads;
  const crafted = { ...record, id: 'impostor', fileUri: f.dir + 'input.jpg' };
  assert.equal(await lib.deleteFile(crafted), false);
  assert.equal(f.files.canDelete({ ...record, fileUri: f.dir + 'PDFs/%2e%2e/' + output.name }), false);
  assert.equal(contracts.canonicalLocalUri(f.dir + 'PDFs/%252f' + output.name), null);
  await repo.addHistory({ ...repo.list().downloads[0], id: 'alias', fileUri: output.uri.replace('Excluir', '%45xcluir') });
  assert.equal(await lib.deleteFile(record), false, 'A separate reference protects the physical file');
  await repo.removeHistory('alias');
  f.state.deleteError = true;
  assert.equal(await lib.deleteFile(record), false);
  assert.equal(lib.getSnapshot().downloads[0].deletionPending, undefined);
  assert.ok((await fs.stat(f.disk.local(output.uri))).size > 0);
  f.state.deleteError = false;
  const pending = lib.deleteFile(record);
  assert.equal(lib.deleteFile(record), pending);
  assert.equal(await lib.shareItem(record), false);
  assert.equal(await pending, true);
  assert.equal(lib.getSnapshot().downloads[0].availability, 'deleted');
  assert.equal(lib.getSnapshot().history[0].availability, 'deleted');
  await assert.rejects(fs.stat(f.disk.local(output.uri)), { code: 'ENOENT' });
  const other = await f.generate('Interrupção');
  await lib.registerGeneratedFile(pdfInput(other));
  const second = lib.getSnapshot().downloads.find(row => row.fileUri === other.uri);
  await repo.beginFileDeletion(second.id, second.fileUri);
  await f.files.deleteOwned(second);
  const afterCrash = f.createLibrary();
  await afterCrash.initialize();
  assert.equal(afterCrash.getSnapshot().history.find(row => row.id === second.id).availability, 'deleted');
  assert.equal(afterCrash.getSnapshot().downloads.find(row => row.id === second.id).deletionPending, undefined);
  assert.ok(await fs.stat(f.disk.local(f.dir + 'input.jpg')));
});

test('A malformed committed generation falls back, and concurrent history/PDF/refresh operations preserve each other', async t => {
  const f = await fixture(t);
  const repo = f.createRepo();
  const lib = f.createLibrary(repo);
  await lib.initialize();
  const first = await f.generate('Primeiro');
  const second = await f.generate('Segundo');
  await lib.registerGeneratedFile(pdfInput(first));
  const existing = lib.getSnapshot().downloads[0];
  await Promise.all([lib.registerGeneratedFile(pdfInput(second)), lib.refresh(), lib.removeHistory(existing)]);
  assert.equal(lib.getSnapshot().downloads.length, 2);
  assert.equal(lib.getSnapshot().history.length, 1);
  const folder = f.dir + 'edudownloader/library/';
  const names = (await f.disk.fs.readDirectoryAsync(folder)).sort();
  const last = names.at(-1);
  const envelope = JSON.parse(await f.disk.fs.readAsStringAsync(folder + last));
  await f.disk.fs.writeAsStringAsync(folder + last, JSON.stringify({ revision: envelope.revision }));
  const interrupted = f.createLibrary();
  await interrupted.initialize();
  assert.match(interrupted.getSnapshot().storageWarning, /gravação anterior/);
  assert.ok(interrupted.getSnapshot().downloads.some(row => row.fileUri === first.uri));
  const committed = (await f.disk.fs.readDirectoryAsync(folder)).sort().at(-1);
  const invalid = JSON.parse(await f.disk.fs.readAsStringAsync(folder + committed));
  invalid.data.downloads[0].fileOwnership = 'unrecognized';
  await f.disk.fs.writeAsStringAsync(folder + committed, JSON.stringify(invalid));
  const restarted = f.createLibrary();
  await restarted.initialize();
  assert.match(restarted.getSnapshot().storageWarning, /gravação anterior/);
  assert.ok(restarted.getSnapshot().downloads.some(row => row.fileUri === first.uri));
});

test('A larger PDF is validated, its complete page tree is read, and recovery preserves the page count', async t => {
  const f = await fixture(t);
  const lib = f.createLibrary();
  await lib.initialize();
  const document = await pdfLib.PDFDocument.create();
  document.addPage();
  const bytes = Buffer.from(await document.save({ useObjectStreams: false }));
  const xref = bytes.indexOf('\nxref') + 1;
  const padding = 25 * 1024 ** 2;
  const trailer = bytes.subarray(xref).toString().replace(/(startxref\s+)\d+/, (_, prefix) => prefix + (xref + padding));
  const uri = f.dir + 'PDFs/Maior_1795157429000.pdf';
  await f.disk.fs.makeDirectoryAsync(f.dir + 'PDFs/');
  const output = await fs.open(f.disk.local(uri), 'w');
  try {
    await output.write(bytes.subarray(0, xref));
    const filler = Buffer.alloc(65536, 32);
    for (let i = 0; i < padding; i += filler.length) await output.write(filler);
    await output.write(trailer);
  } finally { await output.close(); }
  assert.equal(await lib.registerGeneratedFile({ fileUri: uri, name: 'Maior_1795157429000.pdf', activityType: 'pdf', format: 'PDF' }), true);
  assert.ok(lib.getSnapshot().downloads[0].sizeBytes > 24 * 1024 ** 2);
  assert.equal(lib.getSnapshot().downloads[0].pageCount, 1);
  const restored = f.createLibrary();
  await restored.initialize();
  assert.equal(restored.getSnapshot().downloads[0].pageCount, 1);
  t.diagnostic(JSON.stringify({ largerPdfBytes: lib.getSnapshot().downloads[0].sizeBytes }));
});
