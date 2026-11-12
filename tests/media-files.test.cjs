const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const readFileSync = require('node:fs').readFileSync;
const test = require('node:test');
const { loadMedia, deferred } = require('./helpers/loadMedia.cjs');
const { nodeFileBridge } = require('./helpers/nodeFileBridge.cjs');
const { createExpoFileServices, createExpoStorage } = loadMedia('src/media/expoAdapters.js');
const { createMediaRepository } = loadMedia('src/media/mediaRepository.js');
const { createMediaLibrary } = loadMedia('src/media/mediaLibrary.js');
const { createDirectMediaIdentifier } = loadMedia('src/media/identifyMedia.js');

// Original, generated fixtures; no third-party media or remote platform access.
const mp4 = readFileSync(path.join(__dirname, 'fixtures/authorized.mp4'));
const mp3 = readFileSync(path.join(__dirname, 'fixtures/authorized.mp3'));

async function server(t) {
  const firstChunk = deferred();
  const timers = new Set();
  let retryAttempts = 0;
  const app = http.createServer((req, res) => {
    const url = req.url;
    const data = url.startsWith('/audio') ? mp3 : url.startsWith('/invalid') ? Buffer.from('<html>not a media file</html>') : mp4;
    const firstRetryFails = url === '/retry.mp4' && req.method === 'GET' && ++retryAttempts === 1;
    res.writeHead(url === '/error.mp4' || firstRetryFails ? 503 : 200, { 'content-type': url.startsWith('/audio') ? 'audio/mpeg' : 'video/mp4', 'content-length': data.length, 'content-disposition': 'attachment; filename="Aula autorizada"' });
    if (req.method === 'HEAD') return res.end();
    if (url.startsWith('/slow')) {
      let offset = 0;
      const timer = setInterval(() => {
        res.write(data.subarray(offset, offset + 128)); offset += 128; firstChunk.resolve();
        if (offset >= data.length) { clearInterval(timer); timers.delete(timer); res.end(); }
      }, 5);
      timers.add(timer);
      res.on('close', () => { clearInterval(timer); timers.delete(timer); });
    } else res.end(data);
  });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(async () => { timers.forEach(clearInterval); app.closeAllConnections(); await new Promise(resolve => app.close(resolve)); });
  return { url: `http://127.0.0.1:${app.address().port}`, firstChunk };
}

async function services(t, platform = 'android') {
  const bridge = await nodeFileBridge(t);
  const intents = [];
  const shares = [];
  const files = createExpoFileServices({ fs: bridge.fs, documentDirectory: bridge.fs.documentDirectory, platform,
    intentLauncher: { startActivityAsync: async (...args) => intents.push(args) },
    sharing: { isAvailableAsync: async () => true, shareAsync: async (...args) => shares.push(args) },
  });
  return { ...bridge, files, intents, shares };
}

test('Real local HTTP bytes are downloaded, checked, persisted and reopened through the Android intent contract', async t => {
  const fixture = await services(t); const remote = await server(t);
  const repository = createMediaRepository(createExpoStorage(fixture.fs, fixture.fs.documentDirectory));
  const library = createMediaLibrary({ identify: createDirectMediaIdentifier(), files: fixture.files, repository, makeId: () => 'authorized-operation' });
  await library.initialize(); library.setUrl(remote.url + '/video.mp4');
  assert.equal(await library.analyze(), true); assert.equal(await library.start(), true);
  const item = library.getSnapshot().history[0];
  assert.deepEqual(await fs.readFile(fixture.local(item.fileUri)), mp4);
  assert.equal(item.sizeBytes, mp4.length); assert.equal(fixture.counters.transfers, 1);
  const restarted = createMediaRepository(createExpoStorage(fixture.fs, fixture.fs.documentDirectory)); await restarted.initialize();
  assert.equal(restarted.list().history[0].fileUri, item.fileUri);
  assert.equal(await library.openItem(item), true);
  assert.equal(fixture.intents[0][0], 'android.intent.action.VIEW');
  assert.equal(fixture.intents[0][1].flags, 1); assert.equal(fixture.intents[0][1].type, 'video/mp4');
  assert.ok(fixture.intents[0][1].data.startsWith('content://'));
  await library.removeHistory(item);
  assert.equal(library.getSnapshot().history.length, 0);
  assert.deepEqual(await fs.readFile(fixture.local(item.fileUri)), mp4, 'Deleting history must preserve the physical media');
  const again = createMediaRepository(createExpoStorage(fixture.fs, fixture.fs.documentDirectory)); await again.initialize();
  assert.equal(again.list().history.length, 0, 'Deleted records must not reappear on restart');
});

test('Direct MP3 transfer stores the actual MP3 bytes and uses the iOS compatible-app action sheet', async t => {
  const fixture = await services(t, 'ios'); const remote = await server(t);
  const handle = await fixture.files.prepare({ format: 'MP3', mimeType: 'audio/mpeg', url: remote.url + '/audio.mp3' }, 'audio-test');
  const result = await handle.start();
  assert.deepEqual(await fs.readFile(fixture.local(result.fileUri)), mp3);
  await fixture.files.open({ ...result, status: 'completed', format: 'MP3' });
  assert.equal(fixture.shares[0][1].mimeType, 'audio/mpeg');
  assert.equal(fixture.intents.length, 0);
});

test('Actual slow network transfer is interrupted, acknowledged and cannot leave a final or partial file', { timeout: 5000 }, async t => {
  const fixture = await services(t); const remote = await server(t);
  const received = deferred();
  const handle = await fixture.files.prepare({ format: 'MP4', mimeType: 'video/mp4', url: remote.url + '/slow.mp4' }, 'cancel-test', { onProgress: () => received.resolve() });
  const outcome = handle.start().catch(error => error);
  await received.promise;
  assert.equal(handle.canCancel(), true);
  await handle.cancel();
  assert.equal((await outcome).code, 'CANCELLED');
  assert.equal(fixture.counters.cancellations, 1);
  assert.ok(fixture.counters.bytes > 0);
  assert.ok(fixture.counters.bytes < mp4.length);
  assert.equal((await fixture.fs.getInfoAsync(fixture.fs.documentDirectory + 'edudownloader/downloads/cancel-test.mp4')).exists, false);
  assert.equal((await fixture.fs.getInfoAsync(fixture.fs.documentDirectory + 'edudownloader/downloads/cancel-test.mp4.part')).exists, false);
});

test('A server returning HTML with an MP4 name/MIME is rejected and the partial file is cleaned', async t => {
  const fixture = await services(t); const remote = await server(t);
  const handle = await fixture.files.prepare({ format: 'MP4', mimeType: 'video/mp4', url: remote.url + '/invalid.mp4' }, 'invalid-test');
  await assert.rejects(handle.start(), error => error.code === 'INVALID_FILE');
  assert.ok(fixture.counters.deleted.every(uri => uri.endsWith('.part')));
  assert.equal((await fixture.fs.getInfoAsync(fixture.fs.documentDirectory + 'edudownloader/downloads/invalid-test.mp4')).exists, false);
});

test('HTTP download failure is not saved as complete, existing destinations are not overwritten', async t => {
  const fixture = await services(t); const remote = await server(t);
  const option = { format: 'MP4', mimeType: 'video/mp4', url: remote.url + '/error.mp4' };
  const failed = await fixture.files.prepare(option, 'error-test');
  await assert.rejects(failed.start(), error => error.code === 'HTTP_DOWNLOAD');
  const directory = fixture.fs.documentDirectory + 'edudownloader/downloads/';
  await fixture.fs.writeAsStringAsync(directory + 'existing.mp4', 'original');
  await assert.rejects(fixture.files.prepare(option, 'existing'), error => error.code === 'FILE_EXISTS');
  assert.equal(await fixture.fs.readAsStringAsync(directory + 'existing.mp4'), 'original');
});

test('Missing, remote and unowned local files cannot reach the platform opener', async t => {
  const fixture = await services(t);
  for (const fileUri of [undefined, 'https://host/a.mp4', 'file:///outside/private.mp4', fixture.fs.documentDirectory + 'edudownloader/downloads/missing.mp4']) {
    await assert.rejects(fixture.files.open({ status: 'completed', fileUri, format: 'MP4' }));
  }
  assert.equal(fixture.intents.length, 0);
});

test('Opening reports a missing compatible app and unsupported web transport without claiming success', async t => {
  const fixture = await services(t); const remote = await server(t);
  const handle = await fixture.files.prepare({ format: 'MP4', mimeType: 'video/mp4', url: remote.url + '/video.mp4' }, 'open-test');
  const result = await handle.start();
  const noApp = createExpoFileServices({ fs: fixture.fs, documentDirectory: fixture.fs.documentDirectory, platform: 'android', intentLauncher: { startActivityAsync: async () => { throw new Error('No activity'); } } });
  await assert.rejects(noApp.open({ ...result, status: 'completed', format: 'MP4' }), error => error.code === 'OPEN_FAILED');
  const web = createExpoFileServices({ fs: fixture.fs, documentDirectory: null, platform: 'web' });
  assert.equal(web.supported, false);
  await assert.rejects(web.prepare({}, 'id'), error => error.code === 'NO_DOWNLOAD');
});

test('A real failed HTTP attempt can be retried successfully and survives a full logical library restart', async t => {
  const fixture = await services(t); const remote = await server(t);
  let id = 0;
  const makeRepository = () => createMediaRepository(createExpoStorage(fixture.fs, fixture.fs.documentDirectory));
  const library = createMediaLibrary({ identify: createDirectMediaIdentifier(), files: fixture.files, repository: makeRepository(), makeId: () => `retry-${++id}` });
  await library.initialize(); library.setUrl(remote.url + '/retry.mp4'); await library.analyze();
  assert.equal(await library.start(), false);
  assert.equal(library.getSnapshot().history[0].status, 'failed');
  assert.equal(await library.retryItem(library.getSnapshot().history[0]), true);
  const completed = library.getSnapshot().history.find(item => item.status === 'completed');
  assert.ok(completed); assert.equal(fixture.counters.transfers, 2);
  assert.deepEqual(await fs.readFile(fixture.local(completed.fileUri)), mp4);
  const restarted = createMediaLibrary({ files: fixture.files, repository: makeRepository() });
  assert.equal(await restarted.initialize(), true);
  assert.equal(restarted.getSnapshot().history.length, 2);
  assert.equal(new Set(restarted.getSnapshot().history.map(item => item.id)).size, 2);
  assert.equal(await restarted.openItem(completed), true);
});
