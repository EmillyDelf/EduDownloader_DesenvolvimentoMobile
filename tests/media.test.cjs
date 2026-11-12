const assert = require('node:assert/strict');
const test = require('node:test');
const { loadMedia, deferred, tick } = require('./helpers/loadMedia.cjs');
const contracts = loadMedia('src/media/mediaContracts.js');
const { createDirectMediaIdentifier } = loadMedia('src/media/identifyMedia.js');
const { createMediaRepository, createJournalStorage } = loadMedia('src/media/mediaRepository.js');
const { createMediaLibrary } = loadMedia('src/media/mediaLibrary.js');

const metadata = { available: true, name: 'Aula.mp4', options: [
  { id: 'video-720', format: 'MP4', mimeType: 'video/mp4', url: 'https://media.example/aula.mp4', quality: '720p', sizeBytes: 4096 },
  { id: 'video-1080', format: 'MP4', mimeType: 'video/mp4', url: 'https://media.example/aula-hd.mp4', quality: '1080p' },
] };
const record = (id, extra = {}) => ({ id, name: `${id}.mp4`, format: 'MP4', status: 'completed', activityType: 'download', completedAt: '2026-11-12T12:00:00Z', fileUri: `file:///app/edudownloader/downloads/${id}.mp4`, ...extra });
const clone = value => JSON.parse(JSON.stringify(value));
function memoryStorage(value = null) {
  return {
    value: value && clone(value), fail: false, writes: 0,
    async read() { return this.value && clone(this.value); },
    async write(next) { if (this.fail) throw new Error('private-path-or-url'); this.writes++; this.value = clone(next); },
  };
}
function fixture(options = {}) {
  const storage = memoryStorage();
  const repository = createMediaRepository(storage);
  const completion = deferred();
  let prepared = 0, cancelled = 0, openCalls = 0, callbacks;
  let transferring = false;
  const handle = {
    canCancel: () => transferring,
    start() { transferring = true; return completion.promise; },
    async cancel() { cancelled++; transferring = false; completion.reject(new Error('cancelled')); return true; },
  };
  const files = {
    supported: true,
    async prepare(option, id, hooks) { prepared++; callbacks = hooks; return handle; },
    async open() { openCalls++; },
  };
  let count = 0;
  const library = createMediaLibrary({ identify: async () => metadata, files, repository, now: () => new Date('2026-11-12T15:00:00Z'), makeId: () => `op-${++count}`, ...options });
  return { library, storage, repository, completion, handle, files,
    get prepared() { return prepared; }, get cancelled() { return cancelled; }, get openCalls() { return openCalls; },
    progress(written, expected) { callbacks.onProgress({ totalBytesWritten: written, totalBytesExpectedToWrite: expected }); },
    complete() { transferring = false; callbacks.onTransferEnd(); completion.resolve({ fileUri: 'file:///app/edudownloader/downloads/op-1.mp4', sizeBytes: 4096, mimeType: 'video/mp4', verified: true }); },
  };
}

test('URL validation rejects empty, malformed, unsafe protocols, credentials and parser-repaired URLs', () => {
  for (const url of ['', '  ', 'abc', 'https:', 'https:example.com', 'https:///a.mp4', 'https://', 'file:///a.mp4', 'javascript:alert(1)', 'ftp://host/a', 'https://user:pass@host/a', 'https://a/b c', 'https://a/\n', 'https://a/\\b']) {
    assert.equal(contracts.validateMediaUrl(url).valid, false, JSON.stringify(url));
  }
  assert.equal(contracts.validateMediaUrl(' https://example.com/a.mp4?q=1#part ').url, 'https://example.com/a.mp4?q=1');
  assert.equal(contracts.validateMediaUrl('http://127.0.0.1:8080/a.mp3').valid, true);
});

test('Direct identification accepts server-confirmed MP4 and MP3 but never invents title, duration or resolutions', async () => {
  for (const [mime, format] of [['video/mp4', 'MP4'], ['audio/mpeg', 'MP3']]) {
    const calls = [];
    const identify = createDirectMediaIdentifier(async (url, options) => {
      calls.push(options.method);
      return new Response(null, { status: 200, headers: { 'content-type': mime, 'content-length': '1234', 'content-disposition': "attachment; filename*=UTF-8''Aula%20autorizada" } });
    });
    const media = await identify('https://files.example/media');
    assert.deepEqual(calls, ['HEAD']);
    assert.equal(media.name, 'Aula autorizada');
    assert.equal(media.options[0].format, format);
    assert.equal(media.options[0].sizeBytes, 1234);
    assert.equal(media.options[0].quality, null);
    assert.equal(media.duration, undefined);
    assert.equal(media.thumbnail, undefined);
  }
});

test('Direct identification rejects HTML, unknown MIME, inaccessible URLs and servers without HEAD support', async () => {
  for (const [status, type] of [[200, 'text/html'], [200, 'application/octet-stream'], [404, 'video/mp4'], [405, 'video/mp4'], [501, 'audio/mpeg']]) {
    const identify = createDirectMediaIdentifier(async () => new Response(null, { status, headers: { 'content-type': type } }));
    await assert.rejects(identify('https://example.com/fake.mp4'), error => Boolean(error.code));
  }
  const identify = createDirectMediaIdentifier(async () => new Response(null, { status: 200, headers: { 'content-type': 'video/mp4' } }));
  assert.equal((await identify('https://example.com/file')).options[0].sizeBytes, undefined);
});

test('Identification handles invalid responses, network failure, timeout and abort without exposing service details', async () => {
  for (const fetcher of [async () => { throw new Error('https://secret.example/?token=secret'); }, async () => ({ ok: true, headers: null })]) {
    await assert.rejects(createDirectMediaIdentifier(fetcher)('https://example.com/a'), error => !/secret|token=/.test(error.message));
  }
  const hanging = (_url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  await assert.rejects(createDirectMediaIdentifier(hanging, 5)('https://example.com/a'), error => error.code === 'TIMEOUT');
  const controller = new AbortController();
  const task = createDirectMediaIdentifier(hanging)('https://example.com/a', { signal: controller.signal });
  controller.abort();
  await assert.rejects(task, error => error.code === 'ABORTED');
});

test('Metadata validation rejects fabricated/invalid format contracts, duplicate choices and missing availability', () => {
  for (const value of [null, {}, { available: true, options: [] }, { ...metadata, available: false }, { ...metadata, options: [null] },
    { ...metadata, options: [{ ...metadata.options[0], mimeType: 'audio/mpeg' }] },
    { ...metadata, options: [{ ...metadata.options[0], url: 'file:///wrong' }] },
    { ...metadata, options: [metadata.options[0], metadata.options[0]] }]) {
    assert.throws(() => contracts.normalizeMediaMetadata(value));
  }
});

test('Real byte progress is clamped below completion; unknown or invalid totals remain indeterminate', () => {
  assert.equal(contracts.transferProgress(5, 10), 50);
  assert.equal(contracts.transferProgress(1000, 10), 99);
  for (const [written, expected] of [[NaN, 10], [-1, 10], [1, 0], [1, -1], [1, Infinity]]) assert.equal(contracts.transferProgress(written, expected), null);
  assert.equal(contracts.canTransition('cancelled', 'completed'), false);
  assert.equal(contracts.canTransition('queued', 'completed'), false);
  assert.equal(contracts.canTransition('downloading', 'completed'), true);
  assert.equal(contracts.canTransition('downloading', 'paused'), false);
});

test('Library validates before identifying, disables duplicate analysis and ignores stale identification after editing', async () => {
  let calls = 0;
  const result = deferred();
  const f = fixture({ identify: () => { calls++; return result.promise; } });
  await f.library.initialize();
  assert.equal(await f.library.analyze(), false);
  assert.equal(calls, 0);
  assert.ok(f.library.getSnapshot().flow.fieldError);
  f.library.setUrl('https://example.com/a');
  const analyzing = f.library.analyze();
  assert.equal(await f.library.analyze(), false);
  assert.equal(calls, 1);
  f.library.setUrl('https://example.com/b');
  result.resolve(metadata);
  await analyzing;
  assert.equal(f.library.getSnapshot().flow.status, 'idle');
  assert.equal(f.library.getSnapshot().flow.media, null);
});

test('Missing identification/download services show unavailability without starting or completing a fake transfer', async () => {
  const absent = fixture({ identify: undefined });
  absent.library.setUrl('https://example.com/a');
  assert.equal(await absent.library.analyze(), false);
  assert.match(absent.library.getSnapshot().flow.error, /indisponível|não está disponível/);
  const f = fixture({ files: { supported: false } });
  await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  assert.equal(await f.library.start(), false);
  assert.equal(f.library.getSnapshot().downloads.length, 0);
  assert.ok(f.library.getSnapshot().flow.actionError);
});

test('Format and quality selections accept only the identified options, with MP3 unavailable for MP4-only sources', async () => {
  const f = fixture(); await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  assert.equal(f.library.selectOption('mp3'), false);
  assert.equal(f.library.selectOption('video-1080'), true);
  assert.equal(f.library.getSnapshot().flow.selectedOptionId, 'video-1080');
  const operation = f.library.start();
  assert.equal(f.library.selectOption('video-720'), false);
  await tick(); f.complete(); await operation;
});

test('A supported operation starts once, updates real progress, verifies completion and persists one shared history record', async () => {
  const f = fixture(); await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  const operation = f.library.start();
  assert.equal(await f.library.start(), false);
  await tick(); assert.equal(f.prepared, 1);
  f.progress(42, 100); assert.equal(f.library.getSnapshot().flow.progress, 42);
  f.progress(100, 100); assert.equal(f.library.getSnapshot().flow.status, 'downloading');
  assert.equal(f.library.getSnapshot().flow.progress, 99);
  f.complete(); assert.equal(await operation, true);
  const state = f.library.getSnapshot();
  assert.equal(state.flow.status, 'completed'); assert.equal(state.flow.progress, 100);
  assert.equal(state.history.length, 1); assert.equal(state.history[0].fileUri, state.downloads[0].fileUri);
  assert.equal(state.history[0].status, 'completed');
  const restarted = createMediaRepository(f.storage); await restarted.initialize();
  assert.equal(restarted.list().history[0].fileUri, state.history[0].fileUri);
});

test('Cancellation interrupts the transport once and late successful callbacks cannot complete the cancelled operation', async () => {
  const f = fixture(); await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  const operation = f.library.start(); await tick();
  const cancel = f.library.cancel(); const again = f.library.cancel();
  assert.equal(await cancel, true); await again; await operation;
  assert.equal(f.cancelled, 1); assert.equal(f.library.getSnapshot().flow.status, 'cancelled');
  f.progress(100, 100); f.complete(); await tick();
  assert.equal(f.library.getSnapshot().flow.status, 'cancelled');
  assert.equal(f.library.getSnapshot().history[0].status, 'cancelled');
  assert.equal(f.library.getSnapshot().history[0].fileUri, undefined);
});

test('Cancellation failure keeps the operation downloading and still allows its actual verified completion', async () => {
  const f = fixture(); await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  f.handle.cancel = async () => { throw new Error('native failure'); };
  const operation = f.library.start(); await tick();
  assert.equal(await f.library.cancel(), false);
  assert.equal(f.library.getSnapshot().flow.status, 'downloading');
  assert.ok(f.library.getSnapshot().flow.actionError);
  f.complete(); assert.equal(await operation, true);
  assert.equal(f.library.getSnapshot().flow.status, 'completed');
});

test('Transfer errors and unverified results fail honestly; retry identifies the source again', async () => {
  for (const outcome of [null, { fileUri: 'file:///invalid', sizeBytes: 0, verified: true }]) {
    const f = fixture(); await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
    const operation = f.library.start(); await tick(); f.completion.resolve(outcome);
    assert.equal(await operation, false); assert.equal(f.library.getSnapshot().flow.status, 'failed');
    assert.equal(f.library.getSnapshot().history[0].status, 'failed');
  }
  let analyses = 0;
  const f = fixture({ identify: async () => { analyses++; return metadata; } });
  await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  const first = f.library.start(); await tick(); f.completion.reject(new Error('network private URL')); await first;
  assert.equal(f.library.getSnapshot().flow.status, 'failed');
  assert.equal(f.library.getSnapshot().flow.error.includes('private'), false);
  const retried = f.library.retryItem(f.library.getSnapshot().downloads[0]); await tick(); await retried;
  assert.equal(analyses, 2);
});

test('Terminal storage failure is visible and retry saves the actual result without repeating the transfer', async () => {
  const f = fixture(); await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  const operation = f.library.start(); await tick(); f.storage.fail = true; f.complete(); await operation;
  assert.equal(f.library.getSnapshot().flow.status, 'completed'); assert.ok(f.library.getSnapshot().storageError);
  f.storage.fail = false; assert.equal(await f.library.retryPersistence(), true);
  assert.equal(f.prepared, 1); assert.equal(f.storage.value.history.length, 1);
  assert.equal(f.library.getSnapshot().storageError, '');
});

test('History CRUD serializes changes, prevents duplicates and preserves unrelated records', async () => {
  const storage = memoryStorage(); const repo = createMediaRepository(storage); await repo.initialize();
  await Promise.all([repo.addHistory(record('a')), repo.addHistory(record('b')), repo.addHistory(record('a'))]);
  assert.equal(repo.list().history.length, 2);
  await repo.updateHistory('a', { name: 'Atualizado', id: 'cannot-replace-id' });
  assert.equal(repo.list().history.find(item => item.id === 'a').name, 'Atualizado');
  const before = clone(repo.list().history.find(item => item.id === 'b'));
  await repo.removeHistory('a'); assert.deepEqual(clone(repo.list().history), [before]);
  const restarted = createMediaRepository(storage); await restarted.initialize();
  assert.deepEqual(clone(restarted.list()), clone(repo.list()));
});

test('Failed history deletion leaves the record intact and deletion never removes the downloaded physical file', async () => {
  const f = fixture(); await f.library.initialize(); await f.repository.addHistory(record('a')); await f.repository.addHistory(record('b'));
  f.storage.fail = true;
  await assert.rejects(f.library.removeHistory(record('a')));
  assert.equal(f.repository.list().history.length, 2);
  f.storage.fail = false;
  const before = f.storage.writes;
  const first = f.library.removeHistory(record('a')); const second = f.library.removeHistory(record('a'));
  assert.equal(first, second); await first;
  assert.equal(f.storage.writes, before + 1); assert.equal(f.repository.list().history[0].id, 'b');
  assert.equal(f.cancelled, 0); assert.equal(f.prepared, 0);
});

test('Deleting another history record does not reset an active download or its progress', async () => {
  const f = fixture(); await f.library.initialize(); await f.repository.addHistory(record('old'));
  f.library.setUrl('https://example.com/a'); await f.library.analyze(); const operation = f.library.start(); await tick();
  f.progress(5, 10); await f.library.removeHistory(record('old'));
  assert.equal(f.library.getSnapshot().downloads[0].status, 'downloading');
  assert.equal(f.library.getSnapshot().downloads[0].progress, 50);
  f.complete(); await operation;
});

test('Opening invokes only the supplied mechanism and surfaces failures without leaking private paths', async () => {
  const f = fixture(); await f.library.initialize();
  assert.equal(await f.library.openItem(record('a')), true); assert.equal(f.openCalls, 1);
  f.files.open = async () => { throw new Error('file:///private/path'); };
  assert.equal(await f.library.openItem(record('a')), false);
  assert.equal(f.library.getSnapshot().actionError.includes('private'), false);
});

test('Restarted interrupted downloads become failed activities, never fabricated completed records', async () => {
  const storage = memoryStorage({ version: 1, downloads: [record('active', { status: 'downloading' })], history: [] });
  const repository = createMediaRepository(storage);
  const library = createMediaLibrary({ repository, files: { supported: false } });
  assert.equal(await library.initialize(), true);
  assert.equal(library.getSnapshot().downloads[0].status, 'failed');
  assert.match(library.getSnapshot().history[0].error, /interrompido/);
});

test('Journal recovers the last valid generation and failed writes do not publish partial state', async () => {
  const files = new Map(); let failMove = false;
  const io = {
    async mkdir() {}, async list() { return [...files.keys()]; }, async read(name) { return files.get(name); },
    async write(name, data) { files.set(name, data); },
    async move(from, to) { if (failMove) throw new Error('disk'); files.set(to, files.get(from)); files.delete(from); },
    async remove(name) { files.delete(name); },
  };
  const repo = createMediaRepository(createJournalStorage(io)); await repo.initialize();
  await repo.addHistory(record('a')); await repo.addHistory(record('b'));
  failMove = true; await assert.rejects(repo.addHistory(record('c'))); assert.equal(repo.list().history.length, 2);
  failMove = false;
  files.set('library-0000000000000002.json', 'corrupt');
  const recovered = createMediaRepository(createJournalStorage(io)); await recovered.initialize();
  assert.equal(recovered.list().history.length, 1); assert.equal(recovered.list().history[0].id, 'a');
  await recovered.addHistory(record('new')); assert.ok(files.has('library-0000000000000003.json'));
});

test('Corrupt storage fails visibly without resetting or overwriting existing bytes', async () => {
  const storage = memoryStorage({ version: 999, history: [], downloads: [] });
  const repository = createMediaRepository(storage); const library = createMediaLibrary({ repository });
  assert.equal(await library.initialize(), false); assert.ok(library.getSnapshot().storageError);
  await assert.rejects(repository.addHistory(record('a'))); assert.equal(storage.writes, 0);
});

test('Clipboard changes are explicit and an obsolete clipboard response cannot replace a newer typed URL', async () => {
  const pending = deferred(); const f = fixture({ clipboard: { getStringAsync: () => pending.promise } });
  const paste = f.library.paste(); f.library.setUrl('https://example.com/new'); pending.resolve('https://example.com/old'); await paste;
  assert.equal(f.library.getSnapshot().flow.url, 'https://example.com/new');
});

test('A cancellation request without an affirmative transport acknowledgement never becomes cancelled', async () => {
  const f = fixture(); await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  const operation = f.library.start(); await tick();
  f.handle.cancel = async () => false;
  assert.equal(await f.library.cancel(), false);
  assert.equal(f.library.getSnapshot().flow.status, 'downloading');
  f.complete(); await operation; assert.equal(f.library.getSnapshot().flow.status, 'completed');
});

test('Completion races wait for the effective cancellation result and cannot publish a completed history record', async () => {
  const f = fixture(); const cancelAck = deferred();
  await f.library.initialize(); f.library.setUrl('https://example.com/a'); await f.library.analyze();
  const operation = f.library.start(); await tick();
  f.handle.cancel = () => cancelAck.promise;
  const cancelling = f.library.cancel(); f.complete(); await tick();
  assert.equal(f.library.getSnapshot().flow.status, 'downloading');
  assert.equal(f.library.getSnapshot().history.length, 0);
  cancelAck.resolve(true); await cancelling; await operation;
  assert.equal(f.library.getSnapshot().flow.status, 'cancelled');
  assert.equal(f.library.getSnapshot().history[0].status, 'cancelled');
});

test('Journal retains two valid generations across corruption and announces fallback recovery', async () => {
  const files = new Map();
  const io = {
    async mkdir() {}, async list() { return [...files.keys()]; }, async read(name) { return files.get(name); },
    async write(name, data) { files.set(name, data); }, async move(from, to) { files.set(to, files.get(from)); files.delete(from); }, async remove(name) { files.delete(name); },
  };
  const first = createMediaRepository(createJournalStorage(io)); await first.initialize();
  await first.addHistory(record('a')); await first.addHistory(record('b'));
  files.set('library-0000000000000002.json', 'broken');
  const journal = createJournalStorage(io); const second = createMediaRepository(journal); await second.initialize();
  assert.ok(second.getWarning()); await second.addHistory(record('c'));
  assert.ok(files.has('library-0000000000000001.json'));
  files.set('library-0000000000000003.json', 'also broken');
  const recovered = createMediaRepository(createJournalStorage(io)); await recovered.initialize();
  assert.equal(recovered.list().history[0].id, 'a');
});

test('Journal never overwrites a newer incompatible schema with an older readable generation', async () => {
  const entries = new Map([
    ['library-0000000000000001.json', JSON.stringify({ revision: 1, data: { version: 1, downloads: [], history: [] } })],
    ['library-0000000000000002.json', JSON.stringify({ revision: 2, data: { version: 2, downloads: [], history: [] } })],
  ]);
  let writes = 0;
  const storage = createJournalStorage({ async mkdir() {}, async list() { return [...entries.keys()]; }, async read(name) { return entries.get(name); }, async write() { writes++; } });
  const repo = createMediaRepository(storage);
  await assert.rejects(repo.initialize(), error => error.code === 'STORAGE_SCHEMA');
  await assert.rejects(repo.addHistory(record('a')));
  assert.equal(writes, 0);
});
