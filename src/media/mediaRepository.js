import { MediaError } from './mediaContracts';

const statuses = new Set(['queued', 'downloading', 'completed', 'failed', 'cancelled']);
function copy(value) { return JSON.parse(JSON.stringify(value)); }

export function validateLibrary(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.downloads) || !Array.isArray(value.history)) {
    throw new MediaError('STORAGE_SCHEMA', 'O histórico local possui uma versão ou estrutura incompatível. Os dados foram preservados.');
  }
  for (const list of [value.downloads, value.history]) {
    const ids = new Set();
    for (const record of list) {
      if (!record || typeof record.id !== 'string' || !record.id || typeof record.name !== 'string'
        || !statuses.has(record.status) || ids.has(record.id)) {
        throw new MediaError('STORAGE_SCHEMA', 'Há registros inválidos no armazenamento local. Os dados foram preservados.');
      }
      ids.add(record.id);
    }
  }
  return copy(value);
}

// Replaceable, serialized repository. Failed writes never change published data.
// Updating a download and its history record is a single durable transaction.
export function createMediaRepository(storage) {
  let state = { version: 1, downloads: [], history: [] };
  let ready;
  let queue = Promise.resolve();
  async function initialize() {
    if (!ready) {
      ready = Promise.resolve().then(() => storage.read()).then(value => {
        state = value === null ? state : validateLibrary(value);
        return copy(state);
      }).catch(error => { ready = undefined; throw error; });
    }
    await ready;
    return copy(state);
  }
  function transaction(change) {
    const operation = queue.then(async () => {
      await initialize();
      const next = copy(state);
      change(next);
      validateLibrary(next);
      await storage.write(next);
      state = next;
      return copy(state);
    });
    queue = operation.catch(() => {});
    return operation;
  }
  function upsert(list, record) {
    const index = list.findIndex(item => item.id === record.id);
    if (index < 0) list.unshift(copy(record));
    else list[index] = { ...list[index], ...copy(record) };
  }
  return {
    initialize,
    getWarning: () => storage.getWarning?.() || '',
    list: () => copy(state),
    saveDownload: record => transaction(next => upsert(next.downloads, record)),
    recordTerminal: record => transaction(next => {
      if (!['completed', 'failed', 'cancelled'].includes(record.status)) throw new MediaError('INVALID_STATE', 'A atividade ainda não terminou.');
      upsert(next.downloads, record);
      upsert(next.history, record);
    }),
    addHistory: record => transaction(next => upsert(next.history, record)),
    updateHistory: (id, patch) => transaction(next => {
      const record = next.history.find(item => item.id === id);
      if (!record) throw new MediaError('NOT_FOUND', 'O registro não está mais disponível.');
      Object.assign(record, copy(patch), { id });
    }),
    removeHistory: id => transaction(next => {
      if (!next.history.some(record => record.id === id)) throw new MediaError('NOT_FOUND', 'O registro não está mais disponível.');
      next.history = next.history.filter(record => record.id !== id);
    }),
  };
}

// Immutable generations are written to a temporary file, then renamed. Reading
// falls back to the preceding valid generation after an interrupted write.
export function createJournalStorage(io) {
  let revision = 0;
  let warning = '';
  const pattern = /^library-(\d{16})\.json$/;
  return {
    getWarning: () => warning,
    async read() {
      await io.mkdir();
      const names = (await io.list()).filter(name => pattern.test(name)).sort().reverse();
      if (!names.length) return null;
      for (const [index, name] of names.entries()) {
        try {
          const envelope = JSON.parse(await io.read(name));
          if (envelope.revision !== Number(pattern.exec(name)[1])) continue;
          if (envelope.data?.version !== 1) throw new MediaError('STORAGE_SCHEMA', 'O armazenamento usa uma versão incompatível. Os dados foram preservados.');
          const data = validateLibrary(envelope.data);
          // Advance past even a corrupt later generation, never overwrite it.
          revision = Number(pattern.exec(names[0])[1]);
          warning = index > 0 ? 'O histórico foi recuperado de uma gravação anterior. Confira os registros mais recentes.' : '';
          return data;
        } catch (error) {
          if (error instanceof MediaError && error.code === 'STORAGE_SCHEMA') throw error;
          // Try an older committed generation; never treat corrupt data as empty.
        }
      }
      throw new MediaError('STORAGE_CORRUPT', 'Não foi possível ler o histórico local. Nenhum dado foi apagado.');
    },
    async write(data) {
      validateLibrary(data);
      await io.mkdir();
      const next = revision + 1;
      const name = `library-${String(next).padStart(16, '0')}.json`;
      const temporary = `${name}.tmp`;
      try {
        await io.write(temporary, JSON.stringify({ revision: next, data }));
        await io.move(temporary, name);
        revision = next;
      } catch {
        throw new MediaError('STORAGE_WRITE', 'Não foi possível salvar os dados locais. Verifique o espaço disponível e tente novamente.');
      }
      // Only our own old journal generations; never downloaded physical files.
      try {
        const names = (await io.list()).filter(file => pattern.test(file)).sort().reverse();
        const valid = [];
        for (const file of names) {
          try { validateLibrary(JSON.parse(await io.read(file)).data); valid.push(file); }
          catch { /* Preserve damaged generations for inspection; retain two valid ones. */ }
        }
        const old = valid.slice(2);
        await Promise.all(old.map(file => io.remove(file).catch(() => {})));
      } catch { /* A cleanup failure must not turn an already committed write into a failure. */ }
    },
  };
}
