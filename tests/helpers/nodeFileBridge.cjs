const fs = require('node:fs/promises');
const sync = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const { fileURLToPath, pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

// Implements the small injected FileSystem contract over actual Node disk and
// HTTP, to test real bytes and persistence. It does not execute an Expo bridge.
async function nodeFileBridge(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'edudownloader-goal06-test-'));
  const counters = { cancellations: 0, transfers: 0, bytes: 0, deleted: [] };
  const local = uri => {
    const target = fileURLToPath(uri);
    assert.ok(target.startsWith(root + path.sep), 'Fixture I/O must stay in its own temp directory');
    return target;
  };
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + 'edudownloader-goal06-test-'));
    await fs.rm(root, { recursive: true, force: true });
  });
  const bridge = {
    documentDirectory: pathToFileURL(root).href + '/', EncodingType: { Base64: 'base64' }, FileSystemSessionType: { FOREGROUND: 1 },
    async makeDirectoryAsync(uri) { await fs.mkdir(local(uri), { recursive: true }); },
    async readDirectoryAsync(uri) { return fs.readdir(local(uri)); },
    async getInfoAsync(uri) {
      try { const stat = await fs.stat(local(uri)); return { exists: true, isDirectory: stat.isDirectory(), size: stat.size }; }
      catch (error) { if (error.code === 'ENOENT') return { exists: false }; throw error; }
    },
    async writeAsStringAsync(uri, data) { await fs.writeFile(local(uri), data, 'utf8'); },
    async readAsStringAsync(uri, options = {}) {
      const data = await fs.readFile(local(uri));
      return options.encoding === 'base64' ? data.subarray(options.position || 0, (options.position || 0) + options.length).toString('base64') : data.toString('utf8');
    },
    async moveAsync({ from, to }) { await fs.rename(local(from), local(to)); },
    async deleteAsync(uri) { counters.deleted.push(uri); await fs.rm(local(uri), { force: true }); },
    async getContentUriAsync(uri) { await fs.access(local(uri)); return 'content://test-file-provider/' + path.basename(local(uri)); },
    async getFreeDiskStorageAsync() { return Number.MAX_SAFE_INTEGER; },
    createDownloadResumable(url, uri, options, progress) {
      let request;
      let response;
      let cancelled = false;
      let completion;
      let output;
      return {
        downloadAsync() {
          counters.transfers++;
          completion = new Promise((resolve, reject) => {
            request = http.get(url, incoming => {
              response = incoming;
              const chunks = [];
              let written = 0;
              incoming.on('data', data => {
                chunks.push(data); written += data.length; counters.bytes += data.length;
                progress({ totalBytesWritten: written, totalBytesExpectedToWrite: Number(incoming.headers['content-length']) || -1 });
              });
              incoming.on('error', error => cancelled ? resolve(undefined) : reject(error));
              incoming.on('close', () => { if (cancelled) resolve(undefined); });
              incoming.on('end', () => {
                if (cancelled) return resolve(undefined);
                output = fs.writeFile(local(uri), Buffer.concat(chunks)).then(() => resolve({ status: incoming.statusCode, uri, headers: incoming.headers }));
                output.catch(reject);
              });
            });
            request.on('error', error => cancelled ? resolve(undefined) : reject(error));
          });
          return completion;
        },
        async cancelAsync() {
          counters.cancellations++; cancelled = true;
          response?.destroy(); request?.destroy();
          await completion; await output;
        },
      };
    },
  };
  class File {
    constructor(base, name) { this.uri = name ? base.uri.replace(/\/$/, '') + '/' + name : base; }
    get exists() { return sync.existsSync(local(this.uri)); }
    get size() { return sync.statSync(local(this.uri)).size; }
    create() { sync.closeSync(sync.openSync(local(this.uri), 'wx')); }
    bytes() { return fs.readFile(local(this.uri)); }
    write(bytes) { return fs.writeFile(local(this.uri), bytes); }
    delete() { sync.unlinkSync(local(this.uri)); }
    copy(directory, { overwrite } = {}) {
      const target = directory instanceof File ? local(directory.uri) : path.join(local(directory.uri), path.basename(local(this.uri)));
      return fs.copyFile(local(this.uri), target,
        overwrite ? 0 : sync.constants.COPYFILE_EXCL);
    }
    open(mode) {
      const opened = fs.open(local(this.uri), mode);
      return {
        offset: 0,
        async readBytes(length) {
          const bytes = Buffer.allocUnsafe(length);
          const { bytesRead } = await (await opened).read(bytes, 0, length, this.offset);
          this.offset += bytesRead;
          return bytes.subarray(0, bytesRead);
        },
        async writeBytes(bytes) { await (await opened).writeFile(bytes); },
        async close() { await (await opened).close(); },
      };
    }
    async move(destination) {
      await fs.link(local(this.uri), local(destination.uri));
      await fs.unlink(local(this.uri));
    }
  }
  class Directory {
    constructor(base, name) { this.uri = name ? base.replace(/\/$/, '') + '/' + name : base; }
    create() { sync.mkdirSync(local(this.uri), { recursive: true }); }
  }
  return { fs: bridge, root, counters, local, File, Directory, FileMode: { ReadOnly: 'r', WriteOnly: 'r+' } };
}

module.exports = { nodeFileBridge };
