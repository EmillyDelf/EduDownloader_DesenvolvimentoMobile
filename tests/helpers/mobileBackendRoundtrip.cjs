const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const test = require('node:test');
const { sha256 } = require('@noble/hashes/sha2.js');
const { loadMedia, tick } = require('./loadMedia.cjs');
const { nodeFileBridge } = require('./nodeFileBridge.cjs');

const [api, jobs, transfers, adapters, repositories, libraries, contracts] = loadMedia([
  'src/media/backendClient.js', 'src/media/remoteJobs.js', 'src/media/remoteTransfer.js', 'src/media/expoAdapters.js',
  'src/media/mediaRepository.js', 'src/media/mediaLibrary.js', 'src/media/mediaContracts.js',
]);
const address = process.env.EDU_MOBILE_TEST_API;
const external = process.env.EDU_TEST_EXTERNAL_MOBILE === '1';
const tokens = JSON.parse(process.env.EDU_MOBILE_TEST_SESSIONS);
delete process.env.EDU_MOBILE_TEST_SESSIONS;

test('Uvicorn, media engines, authenticated HTTP, local bytes and durable history', async t => {
  const bridge = await nodeFileBridge(t);
  const opens = [];
  const files = adapters.createExpoFileServices({
    ...bridge, documentDirectory: bridge.fs.documentDirectory, platform: 'android',
    intentLauncher: { async startActivityAsync(_action, args) { opens.push(args.type); } },
  });
  const storage = adapters.createExpoStorage(bridge.fs, bridge.fs.documentDirectory);
  const transfer = transfers.createRemoteTransfer({ disk: files.remoteDisk, createHash: () => sha256.create() });
  const actualRanges = [];
  const submitted = [];
  const conn = api.createBackendClient({
    address, allowLoopback: true, getToken: () => tokens.app,
    fetchImpl(url, init) {
      assert.equal(init.redirect, 'error');
      assert.equal(new URL(url).origin, address);
      if (url.endsWith('/jobs') && init.method === 'POST') submitted.push(init.headers['Idempotency-Key']);
      if (init.headers.Range) actualRanges.push(init.headers.Range);
      return fetch(url, init);
    },
  });
  assert.equal((await conn.health()).ready, true);
  const outsider = api.createBackendClient({ address, allowLoopback: true, getToken: () => tokens.other, fetchImpl: fetch });
  const wrong = api.createBackendClient({ address, allowLoopback: true, getToken: () => 'invalid', fetchImpl: fetch });
  await assert.rejects(wrong.health(), { code: 'UNAUTHORIZED' });
  let id = 0;
  const checkpoints = new Map();
  const manager = jobs.createRemoteJobs({ client: conn, transfer, delay: ms => new Promise(resolve => setTimeout(resolve, Math.min(ms, 100))) });
  const library = libraries.createMediaLibrary({
    identify: api.createMediaStrategy(async () => { throw new contracts.MediaError('HEAD_UNSUPPORTED', 'fixture'); },
      conn, external ? 'fixtures.test,developer.mozilla.org' : 'fixtures.test'),
    files, repository: repositories.createMediaRepository(storage),
    remote: { ...manager, prepare(option, localId, handlers) {
      return manager.prepare(option, localId, { ...handlers, onCheckpoint(checkpoint) {
        checkpoints.set(localId, checkpoint);
        return handlers.onCheckpoint(checkpoint);
      } });
    } },
    makeId: () => 'real-' + ++id,
  });
  assert.equal(await library.initialize(), true);
  const phases = [];
  const unsubscribe = library.subscribe(() => {
    const current = library.getSnapshot().flow;
    if (current.phase?.name) phases.push(current.phase.name);
    if (current.status === 'completed') assert.ok(current.record.fileUri && current.record.sha256);
  });
  t.after(unsubscribe);

  const cases = [
    ['combined.mp4', 'mp4-original', 'video/mp4'],
    ['original.mp3', 'mp3-original', 'audio/mpeg'],
    ['sources.mpd', 'mp4-360p', 'video/mp4'],
    ['sources.mpd', 'mp3-192', 'audio/mpeg'],
    ['longer.mp4', 'mp4-original', 'video/mp4'],
  ];
  if (external) cases.push(['https://developer.mozilla.org/shared-assets/videos/flower.mp4', 'mp4-original', 'video/mp4']);
  for (const [name, chosen, mime] of cases) {
    phases.length = 0;
    assert.equal(library.setUrl(name.startsWith('https://') ? name : 'http://fixtures.test/' + name), true);
    assert.equal(await library.analyze(), true, library.getSnapshot().flow.error);
    const media = library.getSnapshot().flow.media;
    assert.ok(media.options.every(option => !option.url));
    if (name === 'sources.mpd') assert.ok(media.options.some(option => option.id === 'mp4-180p' && option.quality === '180p'));
    assert.equal(library.selectOption(chosen), true);
    const running = library.start();
    assert.equal(await library.start(), false);
    assert.equal(await running, true, library.getSnapshot().flow.error);
    const { record } = library.getSnapshot().flow;
    const bytes = await fs.readFile(bridge.local(record.fileUri));
    const digest = createHash('sha256').update(bytes).digest('hex');
    assert.equal(mime, record.mimeType);
    assert.equal(bytes.length, record.sizeBytes);
    assert.equal(digest, record.sha256);
    assert.ok(contracts.matchesMediaSignature(bytes.subarray(0, 16), record.format));
    assert.ok(phases.includes('queued') && phases.includes('local') && phases.includes('verifyingLocal'));
    assert.equal(library.getSnapshot().history.filter(item => item.id === record.id).length, 1);
    assert.equal(await library.openItem(record), true);
    const checkpoint = checkpoints.get(record.id);
    assert.equal((await conn.create(checkpoint)).id, checkpoint.jobId);
    await assert.rejects(outsider.status(checkpoint.jobId), { code: 'NOT_FOUND' });
    assert.equal((await fetch(address + `/api/v1/jobs/${checkpoint.jobId}/file`)).status, 401);
    console.log(JSON.stringify({ source: name, option: chosen, mime, bytes: bytes.length, sha256: digest, phases: [...new Set(phases)] }));
  }
  assert.ok(actualRanges.length >= 2);
  assert.equal(actualRanges[0], 'bytes=0-4194303');
  assert.equal(new Set(submitted).size, cases.length);
  assert.equal(opens.length, cases.length);
  assert.equal((await repositories.createMediaRepository(storage).initialize()).history.length, cases.length);
  const directory = bridge.fs.documentDirectory + 'edudownloader/downloads/';
  assert.equal((await bridge.fs.readDirectoryAsync(directory)).length, cases.length);

  library.setUrl('http://fixtures.test/slow.mp4');
  assert.equal(await library.analyze(), true);
  const running = library.start();
  for (let attempt = 0; !library.getSnapshot().flow.canCancel && attempt < 600; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  const cancelled = library.cancel();
  assert.equal(library.cancel(), cancelled);
  assert.equal(await cancelled, true);
  assert.equal(await running, false);
  const state = library.getSnapshot();
  assert.equal(state.flow.status, 'cancelled');
  assert.equal(state.history.filter(item => item.id === state.flow.record.id).length, 1);
  const checkpoint = checkpoints.get(state.flow.record.id);
  assert.equal((await conn.status(checkpoint.jobId)).status, 'cancelled');
  await tick();
  assert.equal((await bridge.fs.readDirectoryAsync(directory)).length, cases.length);
});
