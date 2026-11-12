export const previewReferenceDate = new Date(2026, 10, 12, 14);

export const downloadFixtures = [
  { id: 'demo-active', name: 'Aula de Matemática - Exercícios.mp4', format: 'MP4', kind: 'video', sizeBytes: 512 * 1024 ** 2, status: 'downloading', progress: 42 },
  { id: 'demo-completed', name: 'Sociologia - Conceitos principais.mp3', format: 'MP3', kind: 'audio', sizeBytes: 32 * 1024 ** 2, status: 'completed' },
  { id: 'demo-failed', name: 'Material_da_aula.pdf', format: 'PDF', kind: 'pdf', sizeBytes: 4 * 1024 ** 2, status: 'failed', progress: 20, error: 'Falha simulada para testar a nova tentativa.' },
];

export const historyFixtures = [
  { id: 'demo-history-1', name: 'Aula de Matemática - Exercícios.mp4', format: 'MP4', kind: 'video', activityType: 'download', completedAt: new Date(2026, 10, 12, 12, 40).toISOString(), status: 'completed' },
  { id: 'demo-history-2', name: 'IMG_4921_concert.mp3', format: 'MP3', kind: 'audio', activityType: 'conversion', completedAt: new Date(2026, 10, 12, 11, 5).toISOString(), status: 'completed' },
  { id: 'demo-history-3', name: 'Material_da_aula.pdf', format: 'PDF', kind: 'pdf', activityType: 'pdf', completedAt: new Date(2026, 10, 12, 9, 32).toISOString(), status: 'failed', error: 'Falha simulada no histórico.' },
  { id: 'demo-history-4', name: 'Revolução Industrial - Parte 1.mp4', format: 'MP4', kind: 'video', activityType: 'download', completedAt: new Date(2026, 10, 11, 18, 14).toISOString(), status: 'completed' },
];
