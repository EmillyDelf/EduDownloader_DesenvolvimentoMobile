const assert = require('node:assert/strict');
const test = require('node:test');
const { loadMedia, deferred } = require('./helpers/loadMedia.cjs');

const [adapters, repositories, libraries, paths] = loadMedia([
  'src/media/expoAdapters.js', 'src/media/mediaRepository.js', 'src/media/mediaLibrary.js', 'src/media/libraryFiles.js',
]);
const root = 'file:///data/user/0/host.exp.exponent/files/ExperienceData/%2540anonymous%252FEduDownloader-test/';
const directory = root + 'edudownloader/downloads/';
const mime = { MP4: 'video/mp4', MP3: 'audio/mpeg' };
const time = '2026-11-22T12:00:00Z';

function restored(format, id) {
  return {
    id, name: 'Aula.' + format.toLowerCase(), status: 'completed', activityType: 'download',
    format, fileUri: directory + id + '.' + format.toLowerCase(), mimeType: mime[format],
    sizeBytes: 80889084, fileOwnership: 'managed', completedAt: time,
  };
}

test('Expo Go scoped path remains a single literal directory for native access and journal validation', async () => {
  const record = restored('MP4', 'verified-video');
  const expected = record.fileUri;
  assert.equal(paths.canonicalLocalUri(expected), expected);
  assert.equal(paths.canonicalLocalUri(expected.replace('%252F', '%252f')), expected.replace('%252F', '%252f'));
  for (const uri of [
    expected.replace('%252F', '%2F'),
    expected.replace('anonymous%252FEduDownloader-test', 'anonymous%252F..'),
    expected.replace('ExperienceData', 'Downloads'),
    directory + '%252fattack.mp4',
    directory + '%252e%252e/attack.mp4',
    'file:///storage/emulated/0/%2540anonymous%252FEduDownloader-test/verified-video.mp4',
  ]) assert.equal(paths.canonicalLocalUri(uri), null, uri);
  const saved = { version: 1, downloads: [record], history: [record] };
  let written;
  const repo = repositories.createMediaRepository({ async read() { return saved; }, async write(data) { written = data; } });
  assert.equal((await repo.initialize()).downloads[0].fileUri, expected);
  await repo.recordTerminal(restored('MP3', 'verified-audio'));
  assert.equal(written.history.length, 2);
  assert.equal(written.history[1].fileUri, expected);
});

test('Android hands a verified scoped MP4 to the native SDK with its unchanged URI and MIME', async () => {
  const record = restored('MP4', 'verified-video');
  const previews = [];
  const fs = { async getInfoAsync(uri) { assert.equal(uri, record.fileUri); return { exists: true, size: record.sizeBytes }; } };
  const files = adapters.createExpoFileServices({
    fs, documentDirectory: root, platform: 'android',
    File: class {
      constructor(uri) { this.uri = uri; }
      async preview({ mimeType }) { previews.push([this.uri, mimeType]); }
    },
    intentLauncher: { startActivityAsync() { assert.fail('The SDK owns the provider and permission grant'); } },
  });
  assert.equal(await files.availability(record), 'available');
  await files.open(record);
  assert.deepEqual(previews, [[record.fileUri, 'video/mp4']]);
  await assert.rejects(files.open({ ...record, fileUri: record.fileUri.replace('anonymous', 'other') }), { code: 'NO_LOCAL_FILE' });
});

test('The scoped MP4 is published once and the next MP3 can complete without a storage error', async () => {
  let durable = null;
  let serial = 0;
  const options = Object.entries(mime).map(([format, mimeType]) => ({ id: format, format, mimeType, url: 'https://example.test/media' }));
  const files = {
    supported: true,
    async prepare(option, id) {
      const result = restored(option.format, id);
      return { async start() { return { ...result, verified: true }; } };
    },
  };
  const makeRepository = () => repositories.createMediaRepository({
    async read() { return durable; }, async write(data) { durable = data; },
  });
  const library = libraries.createMediaLibrary({
    files, repository: makeRepository(), identify: async () => ({ available: true, name: 'Aula', options }),
    makeId: () => 'test-' + ++serial,
  });
  assert.equal(await library.initialize(), true);
  for (const format of ['MP4', 'MP3']) {
    assert.equal(library.setUrl('https://example.test/media'), true);
    assert.equal(await library.analyze(), true);
    assert.equal(library.selectOption(format), true);
    assert.equal(await library.start(), true);
    assert.equal(library.getSnapshot().storageError, '');
  }
  assert.equal(durable.history.length, 2);
  const restarted = libraries.createMediaLibrary({ files, repository: makeRepository() });
  assert.equal(await restarted.initialize(), true);
  assert.equal(restarted.getSnapshot().history.length, 2);
});

test('A verified file reaches the success state only after the journal commits it', async () => {
  let durable = null;
  const writing = deferred();
  const saved = deferred();
  const file = restored('MP4', 'wait-for-index');
  const record = repositories.createMediaRepository({
    async read() { return durable; },
    async write(data) {
      if (data.history.length) {
        writing.resolve();
        await saved.promise;
      }
      durable = data;
    },
  });
  const library = libraries.createMediaLibrary({
    repository: record, makeId: () => file.id,
    files: { supported: true, async prepare() { return { async start() { return { ...file, verified: true }; } }; } },
    identify: async () => ({
      available: true, name: file.name,
      options: [{ id: 'video', format: file.format, mimeType: file.mimeType, url: 'https://example.test/fixture' }],
    }),
  });
  await library.initialize();
  library.setUrl('https://example.test/fixture');
  await library.analyze();
  const download = library.start();
  await writing.promise;
  assert.equal(library.getSnapshot().flow.status, 'downloading');
  assert.equal(library.getSnapshot().history.length, 0);
  saved.resolve();
  assert.equal(await download, true);
  assert.equal(library.getSnapshot().flow.status, 'completed');
  assert.equal(durable.history[0].fileUri, file.fileUri);
});

test('Restart recovers an already promoted MP4 from its interrupted checkpoint without retransferring it', async () => {
  const original = restored('MP4', 'verified-video');
  const { fileUri, sizeBytes, fileOwnership, ...before } = original;
  const record = { ...before, status: 'downloading', remoteStrategy: true, remote: { jobId: 'fixture-job' } };
  const invalid = { ...record, id: 'invalid-final' };
  const entries = new Map();
  const fs = {
    async getInfoAsync(uri) {
      return { exists: uri === fileUri || uri.endsWith('/invalid-final.mp4'), size: sizeBytes };
    },
    async readAsStringAsync(uri) {
      return Buffer.from(uri === fileUri ? '1234ftypabcd synthetic bytes' : 'not a media file').toString('base64');
    },
    async deleteAsync(uri) { assert.match(uri, /\.part$/); },
  };
  const files = adapters.createExpoFileServices({ fs, documentDirectory: root, platform: 'android' });
  const journal = () => repositories.createJournalStorage({
    async mkdir() {}, async list() { return [...entries.keys()]; },
    async read(name) { return entries.get(name); }, async write(name, data) { entries.set(name, data); },
    async move(from, to) { entries.set(to, entries.get(from)); entries.delete(from); },
    async remove(name) { entries.delete(name); },
  });
  await journal().write({ version: 1, downloads: [record, invalid], history: [] });
  const damaged = 'library-0000000000000002.json';
  const damagedContents = JSON.stringify({ revision: 2, data: { version: 1, downloads: [{ ...original, sizeBytes: -1 }], history: [] } });
  entries.set(damaged, damagedContents);
  const start = () => libraries.createMediaLibrary({ files, repository: repositories.createMediaRepository(journal()) });
  const library = start();
  assert.equal(await library.initialize(), true);
  const { downloads, history, storageWarning } = library.getSnapshot();
  assert.match(storageWarning, /gravação anterior/);
  assert.equal(downloads.find(item => item.id === invalid.id).status, 'paused');
  assert.equal(history.length, 1);
  assert.equal(history[0].fileUri, fileUri);
  assert.equal(history[0].sizeBytes, sizeBytes);
  assert.equal(history[0].status, 'completed');
  assert.equal(entries.get(damaged), damagedContents);
  const restarted = start();
  assert.equal(await restarted.initialize(), true);
  assert.equal(restarted.getSnapshot().history.length, 1);
  assert.equal(entries.get(damaged), damagedContents);
});
