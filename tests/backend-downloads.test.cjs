const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const http = require('node:http');
const { loadMedia, tick, deferred } = require('./helpers/loadMedia.cjs');
const { nodeFileBridge } = require('./helpers/nodeFileBridge.cjs');
const { sha256 } = require('@noble/hashes/sha2.js');
const [api, jobs, transfers, adapters, repository, libraryModule, contracts] = loadMedia([
  'src/media/backendClient.js', 'src/media/remoteJobs.js', 'src/media/remoteTransfer.js', 'src/media/expoAdapters.js',
  'src/media/mediaRepository.js', 'src/media/mediaLibrary.js', 'src/media/mediaContracts.js',
]);
const id = '12345678-1234-4234-8234-123456789abc';
const base = 'https://api.test';
const source = 'https://www.youtube.com/watch?v=example';
const option = { id: 'video-360p', operation: 'merge', format: 'MP4', mimeType: 'video/mp4', quality: '360p' };
const analysis = { analysisId: id, available: true, name: '  ../ Vídeo? ', expiresAt: new Date(Date.now() + 60000).toISOString(), options: [option] };
const payload = Buffer.from('1234ftypabcdmp4fixture');
const hash = Buffer.from(sha256(payload)).toString('hex');
const file = { format: 'MP4', mimeType: 'video/mp4', sizeBytes: payload.length, sha256: hash, downloadPath: `/api/v1/jobs/${id}/file` };
const job = { id, status: 'completed', option, file };
const token = () => 'isolated-test-credential';
const json = (data, status = 200, headers) => Response.json(data, { status, headers });
const download = (data = payload, headers = {}, status = 200) => new Response(data, { status, headers: {
  'content-type': file.mimeType, 'content-length': file.sizeBytes, 'x-content-sha256': hash, ...headers,
} });
function client(fetchImpl, settings = {}) {
  return api.createBackendClient({ address: base, getToken: token, fetchImpl, ...settings });
}

test('API accepts origins with TLS and development loopback only, and keeps session credentials private', async () => {
  for (const value of ['http://192.168.0.7:8765', 'http://127.0.0.1.evil.test', 'https://api.test/prefix',
    'https://foo@api.test', 'https://api.test?x=1', 'https://api.test#frag', 'https://api.test\\evil']) {
    assert.equal(api.backendOrigin(value, true), null, value);
  }
  assert.equal(api.backendOrigin('http://127.0.0.1:8765'), null);
  assert.equal(api.backendOrigin('http://127.0.0.1:8765', true), 'http://127.0.0.1:8765');
  assert.equal(api.backendOrigin(base + '/'), base);
  const session = api.createBackendSession();
  assert.equal(session.setToken('bad\nvalue'), false);
  const http = client(() => { throw new Error('unexpected request'); }, { getToken: session.getToken });
  await assert.rejects(http.health(), { code: 'BACKEND_SESSION' });
  assert.equal(session.setToken(token()), true);
  assert.ok(!JSON.stringify(session).includes(token()));
  assert.equal(session.setToken(''), true);
  assert.equal(session.getToken(), '');
});

test('Only allowlisted sources fall back, and options keep opaque IDs without a fake URL', async () => {
  const calls = [];
  let errorCode = 'UNSUPPORTED';
  const strategy = api.createMediaStrategy(async url => {
    calls.push(['direct', url]);
    if (url.endsWith('.mp4')) return 'direct';
    throw new contracts.MediaError(errorCode, 'test');
  }, client(async (url, init) => {
    calls.push(['remote', JSON.parse(init.body).url]);
    assert.equal(init.headers.Authorization, 'Bearer ' + token());
    assert.equal(init.redirect, 'error');
    return json(analysis);
  }), 'fixtures.test');
  assert.equal(await strategy('https://fixtures.test/exact.mp4'), 'direct');
  assert.equal((await strategy(source)).options[0].quality, '360p');
  assert.equal((await strategy('https://fixtures.test/manifest')).options[0].url, undefined);
  await assert.rejects(strategy('https://fixtures.test.evil.test/manifest'), { code: 'UNSUPPORTED' });
  errorCode = 'NETWORK';
  await assert.rejects(strategy('https://fixtures.test/offline'), { code: 'NETWORK' });
  assert.deepEqual(calls.filter(([mode]) => mode === 'remote').map(([, url]) => url), [source, 'https://fixtures.test/manifest']);
  for (const invalid of [{ ...analysis, analysisId: '../escape' }, { ...analysis, options: [option, option] },
    { ...analysis, options: [{ ...option, format: 'PDF' }] }]) assert.throws(() => api.normalizeRemoteAnalysis(invalid), { code: 'BACKEND_RESPONSE' });
});

test('HTTP client rejects unsafe result URLs and redirects, times out, and maps API authentication and rate limits', async () => {
  const remote = client(async (_url, init) => {
    assert.equal(init.redirect, 'error');
    return json({ error: { code: 'UNAUTHORIZED', message: 'internal traceback' } }, 401);
  });
  await assert.rejects(remote.health(), error => error.code === 'UNAUTHORIZED' && !error.message.includes('traceback'));
  await assert.rejects(client(async () => json({}, 429, { 'Retry-After': '60' })).status(id), { code: 'RATE_LIMIT', retryAfterMs: 60000 });
  await assert.rejects(client(async () => ({ redirected: true })).health(), { code: 'BACKEND_RESPONSE' });
  for (const path of ['//evil.test/collect', '/api/v1/jobs/../file', file.downloadPath + '?token=secret']) {
    assert.throws(() => remote.download({ ...job, file: { ...file, downloadPath: path } }, option), { code: 'BACKEND_RESPONSE' });
  }
  await assert.rejects(client(async (_url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }), { timeoutMs: 10 }).health(), { code: 'BACKEND_TIMEOUT' });
});

test('Real HTTP redirect is rejected before the secondary endpoint receives a request', async t => {
  let forwarded = 0;
  const server = http.createServer((request, response) => {
    if (request.url === '/api/v1/health') {
      response.writeHead(307, { Location: '/secondary' });
    } else forwarded++;
    response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const address = 'http://127.0.0.1:' + server.address().port;
  await assert.rejects(client(fetch, { address, allowLoopback: true }).health(), { code: 'BACKEND_NETWORK' });
  assert.equal(forwarded, 0);
});

test('Failed HTTP, MIME, length, signature, SHA and storage never publish files; retries verify bytes on disk', async t => {
  const bridge = await nodeFileBridge(t);
  const files = adapters.createExpoFileServices({ ...bridge, documentDirectory: bridge.fs.documentDirectory, platform: 'android' });
  const transfer = transfers.createRemoteTransfer({ disk: files.remoteDisk, createHash: () => sha256.create() });
  const signal = new AbortController().signal;
  const paths = await files.remoteDisk.paths('download', 'MP4');
  const check = (fetchImpl, detail = job, work = transfer) => work({ id: 'download', job: detail, option, client: client(fetchImpl), signal });
  const invalid = Buffer.alloc(payload.length);
  const invalidSha = Buffer.from(sha256(invalid)).toString('hex');
  for (const [response, expected, metadata] of [
    [() => download(payload, { 'content-range': `bytes 0-4/${payload.length}` }, 206), 'INCOMPLETE_DOWNLOAD'],
    [() => download(payload, { 'content-type': 'text/html' }), 'INVALID_FILE'],
    [() => download(payload.subarray(0, 8)), 'INCOMPLETE_DOWNLOAD'],
    [() => download(Buffer.concat([payload.subarray(0, -1), Buffer.from('x')])), 'CHECKSUM_MISMATCH'],
    [() => download(invalid, { 'x-content-sha256': invalidSha }), 'INVALID_FILE', { ...job, file: { ...file, sha256: invalidSha } }],
    [() => json({ error: { code: 'FILE_UNAVAILABLE' } }, 404), 'FILE_UNAVAILABLE'],
  ]) {
    await assert.rejects(check(response, metadata), { code: expected });
    assert.equal(await files.remoteDisk.size(paths.destination), null);
    assert.equal(await files.remoteDisk.size(paths.temporary), null);
  }
  for (const [extra, code] of [[{ freeBytes: () => 1 }, 'NO_LOCAL_SPACE'], [{
    write: () => { throw new contracts.MediaError('LOCAL_STORAGE', 'disk write failed'); },
  }, 'LOCAL_STORAGE']]) {
    await assert.rejects(check(() => download(), job, transfers.createRemoteTransfer({ disk: { ...files.remoteDisk, ...extra }, createHash: () => sha256.create() })), { code });
    assert.equal(await files.remoteDisk.size(paths.temporary), null);
  }
  const result = await check(() => download());
  assert.equal(result.sha256, hash);
  assert.deepEqual(await fs.readFile(bridge.local(result.fileUri)), payload);
  await fs.writeFile(bridge.local(result.fileUri), invalid);
  await assert.rejects(check(() => { throw new Error('already has a final file'); }), { code: 'INVALID_FILE' });
});

test('A lost reply resumes the same persisted intention and job after relaunch; no second history record', async () => {
  let state;
  const storage = { read: async () => state || null, write: async value => { state = value; } };
  const keys = [];
  let polls = 0;
  let mode = 'lost reply';
  const conn = client(async (url, init) => {
    if (url.endsWith('/analyze')) return json(analysis);
    if (init.method === 'POST') {
      keys.push(init.headers['Idempotency-Key']);
      if (mode === 'lost reply') throw new Error('connection closed after committing');
      return json({ ...job, status: 'queued', canCancel: true }, 202);
    }
    polls += 1;
    if (mode === 'missing network') throw new Error('offline');
    return json(job);
  });
  const make = () => libraryModule.createMediaLibrary({
    identify: conn.analyze, repository: repository.createMediaRepository(storage), files: { supported: true, prepare() {} },
    remote: jobs.createRemoteJobs({ client: conn, delay: async () => {},
      transfer: async ({ onVerifying }) => {
        onVerifying();
        return { verified: true, fileUri: 'file:///saved.mp4', sizeBytes: payload.length, mimeType: option.mimeType, sha256: hash };
      } }),
    makeId: () => 'persisted-operation',
  });
  let app = make();
  await app.initialize();
  app.setUrl(source);
  assert.equal(await app.analyze(), true);
  const first = app.start();
  assert.equal(await app.start(), false);
  assert.equal(await first, false);
  assert.equal(app.getSnapshot().flow.status, 'paused');
  assert.equal(app.getSnapshot().history.length, 0);
  assert.ok(!JSON.stringify(state).includes(token()));
  assert.ok(!JSON.stringify(state).includes(source));
  state.downloads[0].remote.expiresAt = Date.now() - 1000;
  mode = 'missing network';
  app = make();
  await app.initialize();
  assert.equal(await app.retryItem(app.getSnapshot().downloads[0]), false);
  assert.deepEqual(keys, ['persisted-operation', 'persisted-operation']);
  assert.equal(polls, 4);
  assert.equal(state.downloads[0].remote.jobId, id);
  mode = 'online';
  app = make();
  await app.initialize();
  assert.equal(await app.retryItem(app.getSnapshot().downloads[0]), true);
  assert.equal(keys.length, 2);
  assert.equal(app.getSnapshot().downloads.length, 1);
  assert.equal(app.getSnapshot().history.length, 1);
});

test('Retrying a terminal server failure creates one replacement job under the same history record', async () => {
  let state;
  const storage = { read: async () => state || null, write: async value => { state = value; } };
  const replacement = '23456789-1234-4234-8234-123456789abc';
  const keys = [];
  const failedPolls = [];
  let loseReply = true;
  const connection = client(async (url, init) => {
    if (url.endsWith('/analyze')) return json(analysis);
    if (init.method === 'POST') {
      keys.push(init.headers['Idempotency-Key']);
      if (keys.length === 1) return json({ ...job, status: 'queued' }, 202);
      if (loseReply) throw new Error('connection closed after committing replacement');
      return json({ ...job, id: replacement }, 202);
    }
    failedPolls.push(url);
    return json({ ...job, status: 'failed', error: { code: 'INCOMPLETE_DOWNLOAD' } });
  });
  const make = () => libraryModule.createMediaLibrary({
    identify: connection.analyze, repository: repository.createMediaRepository(storage), files: { supported: true, prepare() {} },
    remote: jobs.createRemoteJobs({ client: connection, delay: async () => {}, transfer: async ({ job }) => {
      assert.equal(job.id, replacement);
      return { verified: true, fileUri: 'file:///saved.mp4', sizeBytes: payload.length, mimeType: option.mimeType, sha256: hash };
    } }),
    makeId: () => 'single-history-id',
  });
  let app = make();
  await app.initialize();
  app.setUrl(source);
  assert.equal(await app.analyze(), true);
  assert.equal(await app.start(), false);
  assert.equal(app.getSnapshot().downloads[0].status, 'paused');
  assert.equal(await app.retryItem(app.getSnapshot().downloads[0]), false);
  assert.equal(failedPolls.length, 1);
  assert.notEqual(keys[0], keys[1]);
  assert.ok(!JSON.stringify(state).includes(source));
  loseReply = false;
  app = make();
  await app.initialize();
  assert.equal(await app.retryItem(app.getSnapshot().downloads[0]), true);
  assert.deepEqual(keys, [keys[0], keys[1], keys[1]]);
  assert.deepEqual(Array.from(app.getSnapshot().history, item => item.id), ['single-history-id']);
  assert.equal(app.getSnapshot().downloads.length, 1);
});

test('An expired failed attempt can be analyzed again after relaunch without storing the link or duplicating its record', async () => {
  let state;
  const storage = { read: async () => state || null, write: async value => { state = value; } };
  const newAnalysisId = '23456789-1234-4234-8234-123456789abc';
  const newJobId = '3456789a-1234-4234-8234-123456789abc';
  let analyses = 0;
  const creates = [];
  const connection = client(async (url, init) => {
    if (url.endsWith('/analyze')) {
      assert.equal(JSON.parse(init.body).url, source);
      return json({ ...analysis, analysisId: analyses++ ? newAnalysisId : id });
    }
    if (init.method === 'POST') {
      creates.push({ ...JSON.parse(init.body), key: init.headers['Idempotency-Key'] });
      return creates.length === 1
        ? json({ ...job, status: 'failed', error: { code: 'TASK_TIMEOUT' } }, 202)
        : json({ ...job, id: newJobId }, 202);
    }
    assert.fail('The confirmed terminal job must not be polled again');
  });
  const make = () => libraryModule.createMediaLibrary({
    identify: connection.analyze, repository: repository.createMediaRepository(storage), files: { supported: true, prepare() {} },
    remote: jobs.createRemoteJobs({ client: connection, transfer: async ({ job }) => {
      assert.equal(job.id, newJobId);
      return { verified: true, fileUri: 'file:///saved.mp4', sizeBytes: payload.length, mimeType: option.mimeType, sha256: hash };
    } }),
  });
  let app = make();
  await app.initialize();
  app.setUrl(source);
  assert.equal(await app.analyze(), true);
  assert.equal(await app.start(), false);
  const localId = state.downloads[0].id;
  state.downloads[0].remote.expiresAt = Date.now() - 1000;
  app = make();
  await app.initialize();
  assert.equal(await app.retryItem(app.getSnapshot().downloads[0]), false);
  assert.match(app.getSnapshot().flow.actionError, /Cole o link original/);
  assert.equal(creates.length, 1);
  app.setUrl(source);
  assert.equal(await app.analyze(), true);
  assert.equal(await app.start(), true);
  assert.equal(analyses, 2);
  assert.deepEqual(creates.map(create => create.analysisId), [id, newAnalysisId]);
  assert.notEqual(creates[0].key, creates[1].key);
  assert.deepEqual(Array.from(state.history, item => item.id), [localId]);
  assert.ok(!JSON.stringify(state).includes(source));
});

test('An interrupted local transfer reuses the completed remote result', async () => {
  let creates = 0;
  let transfersStarted = 0;
  const connection = client(async (url, init) => {
    if (url.endsWith('/analyze')) return json(analysis);
    if (init.method === 'POST') creates++;
    return json(job, init.method === 'POST' ? 202 : 200);
  });
  const app = libraryModule.createMediaLibrary({
    identify: connection.analyze, files: { supported: true, prepare() {} },
    repository: repository.createMediaRepository({ read: async () => null, write: async () => {} }),
    remote: jobs.createRemoteJobs({ client: connection, transfer: async ({ job }) => {
      assert.equal(job.id, id);
      if (++transfersStarted === 1) throw new contracts.MediaError('INCOMPLETE_DOWNLOAD', 'Transferência local interrompida.');
      return { verified: true, fileUri: 'file:///saved.mp4', sizeBytes: payload.length, mimeType: option.mimeType, sha256: hash };
    } }),
  });
  await app.initialize();
  app.setUrl(source);
  assert.equal(await app.analyze(), true);
  assert.equal(await app.start(), false);
  assert.equal(app.getSnapshot().flow.record.remote.retry, undefined);
  assert.equal(await app.retryItem(app.getSnapshot().downloads[0]), true);
  assert.equal(creates, 1);
  assert.equal(transfersStarted, 2);
  assert.equal(app.getSnapshot().history.length, 1);
});

test('Expired analyses do not create jobs, and remote cancellation waits for the actual terminal status', async () => {
  let createCount = 0;
  let cancelCount = 0;
  let status = 'processing';
  const wait = deferred();
  const conn = client(async (url, init) => {
    if (url.endsWith('/cancel')) {
      cancelCount++;
      return json({ ...job, status, cancelRequested: true });
    }
    if (init.method === 'POST') createCount++;
    return json({ ...job, status, canCancel: true });
  });
  const manager = jobs.createRemoteJobs({ client: conn, delay: () => wait.promise, transfer: () => assert.fail('cancelled job should not download') });
  const checkpoint = manager.checkpoint(api.normalizeRemoteAnalysis(analysis), option, 'one');
  const handlers = { onCheckpoint: async () => {}, onPhase() {} };
  await assert.rejects(manager.prepare(option, 'one', { ...handlers, checkpoint: { ...checkpoint, expiresAt: 1 } }).start(), { code: 'ANALYSIS_EXPIRED' });
  assert.equal(createCount, 0);
  const handle = manager.prepare(option, 'one', { ...handlers, checkpoint });
  const completion = handle.start();
  await tick();
  const cancelling = handle.cancel();
  assert.equal(handle.cancel(), cancelling);
  let confirmed = false;
  void cancelling.then(() => { confirmed = true; });
  await tick();
  assert.equal(confirmed, false);
  status = 'cancelled';
  wait.resolve();
  await assert.rejects(completion, { code: 'CANCELLED' });
  assert.equal(await cancelling, true);
  assert.equal(cancelCount, 1);
});

test('Cancellation during device transfer aborts the HTTP body, removes the part, and permits no success', async t => {
  const bridge = await nodeFileBridge(t);
  const files = adapters.createExpoFileServices({ ...bridge, documentDirectory: bridge.fs.documentDirectory, platform: 'android' });
  const reached = deferred();
  const conn = client(async (url, init) => {
    if (!url.endsWith('/file')) return json(job);
    return new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(payload.subarray(0, 12));
        init.signal.addEventListener('abort', () => {
          try { controller.error(new Error('aborted')); } catch {}
        }, { once: true });
      },
    }), { headers: { 'content-type': file.mimeType, 'x-content-sha256': hash } });
  });
  const manager = jobs.createRemoteJobs({ client: conn, transfer: transfers.createRemoteTransfer({ disk: files.remoteDisk, createHash: () => sha256.create() }) });
  const handle = manager.prepare(option, 'cancelled-local', {
    checkpoint: manager.checkpoint(api.normalizeRemoteAnalysis(analysis), option, 'local'), onCheckpoint() {},
    onPhase(phase) { if (phase.name === 'local' && phase.progress > 0) reached.resolve(); },
  });
  const completion = handle.start();
  await reached.promise;
  const cancellation = handle.cancel();
  await assert.rejects(completion, { code: 'ABORTED' });
  assert.equal(await cancellation, true);
  const paths = await files.remoteDisk.paths('cancelled-local', 'MP4');
  assert.equal(await files.remoteDisk.size(paths.temporary), null);
  assert.equal(await files.remoteDisk.size(paths.destination), null);
});

test('Suspension removes the foreground waiter and resumes the same job without sending POST again', async () => {
  let attached = 0;
  let sends = 0;
  const conn = client(async (_url, init) => {
    if (init.method === 'POST') sends++;
    return json(job);
  });
  const checkpoint = { ...jobs.remoteCheckpoint(conn, api.normalizeRemoteAnalysis(analysis), option, 'resume'), jobId: id };
  const reached = deferred();
  const manager = jobs.createRemoteJobs({ client: conn, waitForForeground: signal => new Promise((_, reject) => {
    attached++;
    signal.addEventListener('abort', () => {
      attached--;
      reject(new contracts.MediaError('ABORTED', 'interrupted'));
    }, { once: true });
    reached.resolve();
  }), transfer: () => assert.fail('No transfer during suspension') });
  const handlers = { checkpoint, onPhase() {}, onCheckpoint() { assert.fail('Existing job ID'); } };
  const handle = manager.prepare(option, 'record', handlers);
  const polling = handle.start();
  await reached.promise;
  assert.equal(attached, 1);
  handle.suspend();
  await assert.rejects(polling, { code: 'BACKEND_PAUSED' });
  assert.equal(attached, 0);
  const resumed = jobs.createRemoteJobs({ client: conn, transfer: () => 'resumed' });
  assert.equal(await resumed.prepare(option, 'record', handlers).start(), 'resumed');
  assert.equal(sends, 0);
});
