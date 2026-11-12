const fileKinds = { MP4: 'video', WEBM: 'video', MOV: 'video', MP3: 'audio', WAV: 'audio', M4A: 'audio', PDF: 'pdf' };
const statusLabels = { queued: 'Na fila', downloading: 'Em andamento', paused: 'Pausado', completed: 'Concluído', failed: 'Falha', cancelled: 'Cancelado' };

export function getFileFormat(item) {
  return item.format ? String(item.format).toUpperCase() : '';
}

export function getFileKind(item) {
  return item.kind || fileKinds[getFileFormat(item)] || 'other';
}

export function getStatusLabel(status) {
  return statusLabels[status] || 'Status não informado';
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** Math.max(0, index);
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${units[Math.max(0, index)]}`;
}

function normalizeSearch(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function filterDownloads(items, query, kind) {
  const search = normalizeSearch(query.trim());
  return items.filter(item => (
    (kind === 'all' || getFileKind(item) === kind)
    && normalizeSearch(`${item.name} ${getFileFormat(item)}`).includes(search)
  ));
}

export function getRecordDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function getHistorySections(items, activityType, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const sections = [];
  const groups = new Map();
  const sorted = items.filter(item => activityType === 'all' || item.activityType === activityType)
    .map(item => ({ item, date: getRecordDate(item.completedAt) }))
    .sort((first, second) => (second.date?.getTime() ?? -Infinity) - (first.date?.getTime() ?? -Infinity));

  for (const { item, date } of sorted) {
    const key = date ? dayKey(date) : 'unknown';
    if (!groups.has(key)) {
      let title = 'Data não informada';
      if (date) {
        title = key === dayKey(today) ? 'Hoje' : key === dayKey(yesterday) ? 'Ontem'
          : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
      }
      const section = { key, title, data: [] };
      groups.set(key, section);
      sections.push(section);
    }
    groups.get(key).data.push(item);
  }
  return sections;
}

export function formatRecordTime(value) {
  const date = getRecordDate(value);
  return date ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date) : '';
}
