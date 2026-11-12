const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PNG } = require('pngjs');
const { harness, findAll, textContent, flattenStyle, root } = require('./helpers/mobileHarness.cjs');
const { deferred, loadMedia } = require('./helpers/loadMedia.cjs');

const options = [
  { id: 'mp4-720', format: 'MP4', quality: '720p', mimeType: 'video/mp4', url: 'https://host/a', sizeBytes: 1024 },
  { id: 'mp4-1080', format: 'MP4', quality: '1080p', mimeType: 'video/mp4', url: 'https://host/b' },
];
const item = (id, extra = {}) => ({ id, name: `${id}.mp4`, status: 'completed', format: 'MP4', activityType: 'download', completedAt: '2026-11-12T12:00:00Z', ...extra });

test('Downloads includes the URL flow without losing the original list, search, filters or empty/error states', () => {
  const app = harness('src/screens/DownloadsScreen.js');
  const flow = { url: 'https://host/a', status: 'ready' };
  const data = [item('original')];
  const tree = app.render({ items: data, downloadFlow: flow });
  const list = findAll(tree, 'FlatList')[0];
  assert.equal(findAll(list.props.ListHeaderComponent, 'MediaDownloadForm')[0].props.flow, flow);
  assert.equal(findAll(list.props.ListHeaderComponent, 'Input')[0].props.placeholder, 'Buscar arquivos');
  assert.equal(list.props.data[0], data[0]);
  assert.equal(findAll(list.props.ListHeaderComponent, 'FileFilters').length, 1);
});

test('Form uses the official controlled Input and exposes only server-confirmed formats and qualities', () => {
  const app = harness('src/screens/MediaDownloadForm.js');
  const selected = [];
  const flow = { status: 'ready', url: 'https://host/a', media: { name: 'Aula', options }, selectedOptionId: 'mp4-720', serviceAvailable: true, onChangeUrl: value => selected.push(value), onAnalyze() {}, onSelectOption: id => selected.push(id) };
  const tree = app.render({ flow });
  const input = findAll(tree, 'Input')[0];
  assert.equal(input.props.keyboardType, 'url'); assert.equal(input.props.autoCorrect, false);
  input.props.onChangeText('https://host/new'); assert.equal(selected[0], 'https://host/new');
  const cards = findAll(tree, 'Card');
  const mp3 = cards.find(node => node.props.accessibilityLabel?.startsWith('MP3,'));
  assert.equal(mp3.props.disabled, true); assert.equal(mp3.props.selected, false);
  const mp4 = cards.find(node => node.props.accessibilityLabel?.startsWith('MP4,'));
  assert.equal(mp4.props.selected, true);
  cards.find(node => node.props.accessibilityLabel === 'Qualidade 1080p').props.onPress();
  assert.equal(selected.at(-1), 'mp4-1080');
  assert.equal(textContent(tree).includes('360p'), false);
});

test('Unknown quality, missing service and unsupported cancellation never offer fictitious actions', () => {
  const app = harness('src/screens/MediaDownloadForm.js');
  const tree = app.render({ flow: { status: 'ready', media: { options: [{ ...options[0], quality: null }] }, selectedOptionId: 'mp4-720', serviceAvailable: false } });
  assert.ok(textContent(tree).includes('Qualidade não informada'));
  assert.ok(textContent(tree).includes('Nenhuma transferência será simulada'));
  assert.equal(findAll(tree, 'Button').find(node => node.props.title.startsWith('Iniciar download')).props.disabled, true);
  assert.equal(findAll(tree, 'Button').some(node => node.props.title === 'Cancelar download'), false);
  const transferring = app.render({ flow: { status: 'downloading', progress: 42, canCancel: false, serviceAvailable: true } });
  assert.equal(findAll(transferring, 'ProgressBar')[0].props.progress, 42);
  assert.equal(findAll(transferring, 'Button').some(node => node.props.title === 'Cancelar download'), false);
  const unknown = app.render({ flow: { status: 'downloading', progress: null, serviceAvailable: true } });
  assert.equal(findAll(unknown, 'ProgressBar').length, 0);
  assert.equal(findAll(unknown, 'LoadingIndicator').length, 1);
});

test('Completed and cancelled views are explicit and cancel/start callbacks stay controlled', () => {
  const app = harness('src/screens/MediaDownloadForm.js'); let calls = 0;
  const active = app.render({ flow: { status: 'downloading', serviceAvailable: true, progress: 12, canCancel: true, onCancel: () => { calls++; } } });
  assert.equal(calls, 0); findAll(active, 'Button').find(node => node.props.title === 'Cancelar download').props.onPress(); assert.equal(calls, 1);
  const done = app.render({ flow: { status: 'completed', serviceAvailable: true, record: item('file'), onOpen() {} } });
  assert.ok(textContent(done).includes('Download concluído!')); assert.equal(findAll(done, 'ProgressBar')[0].props.progress, 100);
  const cancelled = app.render({ flow: { status: 'cancelled', serviceAvailable: true } });
  assert.ok(textContent(cancelled).includes('transferência foi interrompida')); assert.equal(findAll(cancelled, 'ProgressBar').length, 0);
});

test('History cancellation preserves the record; confirmed deletion updates the group and prevents repeated confirms', async () => {
  const app = harness('src/screens/HistoryScreen.js'); const wait = deferred();
  let records = [item('a'), item('b', { completedAt: '2026-11-11T12:00:00Z' })]; let calls = 0;
  const props = () => ({ items: records, onDeleteItem: async record => { calls++; await wait.promise; records = records.filter(candidate => candidate.id !== record.id); } });
  const render = () => app.render(props());
  const askDelete = tree => {
    const list = findAll(tree, 'SectionList')[0];
    const card = list.props.renderItem({ item: records[0] });
    let stopped = 0;
    findAll(card, 'Button')[0].props.onPress({ stopPropagation() { stopped++; } });
    assert.equal(stopped, 1);
  };
  askDelete(render());
  let dialog = findAll(render(), 'ConfirmationDialog')[0]; assert.equal(dialog.props.visible, true);
  assert.ok(dialog.props.description.includes('arquivo físico'));
  dialog.props.onCancel(); assert.equal(findAll(render(), 'ConfirmationDialog')[0].props.visible, false); assert.equal(calls, 0);
  askDelete(render()); dialog = findAll(render(), 'ConfirmationDialog')[0];
  const first = dialog.props.onConfirm(); const repeat = dialog.props.onConfirm();
  assert.equal(calls, 1); assert.equal(findAll(render(), 'ConfirmationDialog')[0].props.visible, false);
  wait.resolve(); await first; await repeat;
  const list = findAll(render(), 'SectionList')[0];
  assert.equal(list.props.sections.length, 1); assert.equal(list.props.sections[0].data[0].id, 'b');
});

test('Failed deletion and missing-file callback failures remain visible without removing records or leaking paths', async () => {
  const app = harness('src/screens/HistoryScreen.js'); const records = [item('a')];
  const props = { items: records, onDeleteItem: async () => { throw new Error('file:///private'); }, onOpenItem: async () => { throw new Error('private path'); } };
  let tree = app.render(props); let list = findAll(tree, 'SectionList')[0];
  const card = list.props.renderItem({ item: records[0] });
  await card.props.onPress(); tree = app.render(props);
  assert.ok(findAll(tree, 'ErrorMessage').some(node => node.props.message.includes('abrir')));
  findAll(card, 'Button')[0].props.onPress();
  await findAll(app.render(props), 'ConfirmationDialog')[0].props.onConfirm(); tree = app.render(props);
  assert.ok(findAll(tree, 'ErrorMessage').some(node => node.props.message.includes('excluir')));
  assert.equal(textContent(tree).includes('private'), false);
  list = findAll(tree, 'SectionList')[0]; assert.equal(list.props.sections[0].data[0], records[0]);
});

test('Main navigation connects the shared library while caller-supplied records keep their original action contracts', () => {
  const stored = { items: [item('stored')], onDeleteItem() {}, onOpenItem() {}, downloadFlow: { status: 'idle' } };
  const mediaLibraryProps = { downloadProps: stored, historyProps: stored };
  const app = harness('src/navigation/AppNavigator.js', { mockScreens: true, mediaLibraryProps });
  let tree = app.render({}, 'MainTabs');
  findAll(tree, 'BottomNavigation')[0].props.onTabPress('downloads'); tree = app.render({}, 'MainTabs');
  assert.equal(findAll(tree, 'DownloadsScreen')[0].props.items, stored.items);
  assert.equal(findAll(tree, 'DownloadsScreen')[0].props.downloadFlow, stored.downloadFlow);
  findAll(tree, 'BottomNavigation')[0].props.onTabPress('history'); tree = app.render({}, 'MainTabs');
  assert.equal(findAll(tree, 'HistoryScreen')[0].props.onDeleteItem, stored.onDeleteItem);
  const external = { items: [item('external')] };
  tree = app.render({ historyProps: external }, 'MainTabs');
  assert.equal(findAll(tree, 'HistoryScreen')[0].props.items, external.items);
  assert.equal(findAll(tree, 'HistoryScreen')[0].props.onDeleteItem, undefined);
  assert.equal(findAll(tree, 'HistoryScreen')[0].props.onOpenItem, undefined);
});

test('The library hook forwards live state and actions, with separate local-storage errors and no permanent fixtures', () => {
  let initialized = 0; let state = { flow: { status: 'idle' }, downloads: [], history: [], isLoading: false, storageError: '', actionError: '', deletingIds: [] };
  const library = { capabilities: { download: true }, getSnapshot: () => state, subscribe() {}, initialize() { initialized++; }, setUrl() {}, paste() {}, analyze() {}, selectOption() {}, start() {}, cancel() {}, retryPersistence() {}, openItem() {}, removeHistory() {}, retryItem() {} };
  const { default: useMediaLibrary } = loadMedia('src/hooks/useMediaLibrary.js', {
    react: { useEffect: action => action(), useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot() },
    '../media/expoRuntime': { getMediaLibrary: () => library },
  });
  const props = useMediaLibrary(); assert.equal(initialized, 1);
  assert.equal(props.downloadProps.items, state.downloads); assert.equal(props.historyProps.onDeleteItem, library.removeHistory);
  assert.equal(props.downloadProps.downloadFlow.onCancel, library.cancel);
  state = { ...state, history: [item('saved')], storageError: 'Falha ao salvar' };
  const next = useMediaLibrary(); assert.equal(next.historyProps.items[0].id, 'saved');
  assert.equal(next.historyProps.error, ''); assert.equal(next.historyProps.storageError, 'Falha ao salvar');
});

test('Original Figma assets retain their exact export geometry and local callsites in the flow', () => {
  const dimensions = { link: 20, video: 24, audio: 24, check: 20, cancel: 20, arrow: 18, success: 48, 'success-background': 96 };
  for (const [name, size] of Object.entries(dimensions)) {
    const image = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/media', name + '.png')));
    assert.equal(image.width, size, name); assert.equal(image.height, size, name);
    assert.ok(image.data.some((value, index) => index % 4 === 3 && value > 0));
  }
  const app = harness('src/screens/MediaDownloadForm.js');
  for (const status of ['idle', 'ready', 'downloading', 'completed']) {
    const tree = app.render({ flow: { status, serviceAvailable: true, media: { options }, selectedOptionId: 'mp4-720', canCancel: true } });
    const images = findAll(tree, 'Image');
    // Icons supplied as component props are also checked explicitly.
    const input = findAll(tree, 'Input')[0]; images.push(input.props.leftIcon);
    for (const button of findAll(tree, 'Button')) for (const icon of [button.props.leftIcon, button.props.rightIcon]) if (icon) images.push(icon);
    for (const image of images) {
      assert.ok(fs.statSync(image.props.source).size > 0);
      const size = dimensions[path.basename(image.props.source, '.png')];
      assert.equal(flattenStyle(image.props.style).width, size); assert.equal(flattenStyle(image.props.style).height, size);
    }
  }
});
