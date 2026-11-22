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
const saved = item('file', { fileUri: 'file:///media/file.mp4', sizeBytes: 1024 });
const findButton = (tree, title) => findAll(tree, 'Button').find(node => node.props.title === title);

test('Downloads is a library with the original records, search and filters and no embedded URL form', () => {
  const app = harness('src/screens/DownloadsScreen.js');
  const flow = { url: 'https://host/a', status: 'ready' };
  const data = [item('original')];
  const tree = app.render({ items: data, downloadFlow: flow });
  const list = findAll(tree, 'FlatList')[0];
  assert.equal(findAll(list.props.ListHeaderComponent, 'MediaDownloadForm').length, 0);
  assert.equal(findAll(list.props.ListHeaderComponent, 'Input')[0].props.placeholder, 'Buscar arquivos');
  assert.equal(list.props.data[0], data[0]);
  assert.equal(findAll(list.props.ListHeaderComponent, 'FileFilters').length, 1);
});

test('Library context separates sharing, exporting, removing a record, and confirmed file deletion', async () => {
  const app = harness('src/screens/DownloadsScreen.js');
  const calls = [];
  const pdf = item('doc', { name: 'Material.pdf', format: 'PDF', pageCount: 2, sizeBytes: 2200 });
  const props = { items: [pdf], onOpenItem() {},
    onShareItem: value => calls.push(['share', value]),
    onExportItem: value => calls.push(['export', value]),
    onRemoveItem: value => { calls.push(['remove', value]); return true; },
    onDeleteFile: value => { calls.push(['delete', value]); return true; },
    canDeleteFile: () => true,
  };
  const tree = () => app.render(props);
  const card = (entry = pdf) => findAll(tree(), 'FlatList')[0].props.renderItem({ item: entry });
  const dialog = () => findAll(tree(), 'ConfirmationDialog')[0].props;
  findAll(card(), 'Pressable').find(node => node.props.accessibilityLabel === 'Ações de Material.pdf').props.onPress();
  findButton(card(), 'Compartilhar').props.onPress();
  findButton(card(), 'Exportar cópia').props.onPress();
  findButton(card(), 'Excluir arquivo').props.onPress();
  assert.equal(dialog().visible, true);
  assert.match(dialog().description, /apagado do dispositivo/);
  dialog().onCancel();
  assert.equal(dialog().visible, false);
  assert.deepEqual(calls, [['share', pdf], ['export', pdf]]);
  findButton(card(), 'Excluir arquivo').props.onPress();
  const confirm = dialog().onConfirm;
  await Promise.all([confirm(), confirm()]);
  assert.equal(calls.filter(([action]) => action === 'delete').length, 1);
  findAll(card(), 'Pressable').find(node => node.props.accessibilityLabel === 'Ações de Material.pdf').props.onPress();
  findButton(card(), 'Remover registro').props.onPress();
  assert.match(dialog().description, /serão preservados/);
  await dialog().onConfirm();
  assert.deepEqual(calls.at(-1), ['remove', pdf]);
  for (const availability of ['missing', 'unavailable', 'deleted']) {
    const missing = card({ ...pdf, availability });
    assert.equal(findAll(missing, 'Pressable').some(node => node.props.accessibilityLabel === 'Abrir Material.pdf'), false);
    assert.equal(findAll(missing, 'FileAvailability').length, 1);
  }
});

test('History retains the creation event for an unavailable PDF without offering to open it', () => {
  const app = harness('src/screens/HistoryScreen.js');
  const result = item('document', { format: 'PDF', pageCount: 1, activityType: 'pdf', availability: 'missing' });
  const screen = app.render({ items: [result], onOpenItem() {}, onDeleteItem() {} });
  const list = findAll(screen, 'SectionList')[0];
  const record = list.props.sections[0].data[0];
  const card = list.props.renderItem({ item: record });
  assert.equal(record, result);
  assert.equal(findAll(card, 'Pressable').length, 0);
  assert.match(textContent(card), /1 página/);
  assert.equal(findAll(card, 'FileAvailability').length, 1);
  assert.equal(findButton(card, 'Excluir').props.accessibilityLabel, 'Excluir registro de document.mp4');
});

test('Form uses the official controlled Input and exposes only server-confirmed formats and qualities', () => {
  const app = harness('src/screens/MediaDownloadForm.js');
  const selected = [];
  let pastes = 0;
  let analyzes = 0;
  const flow = {
    status: 'idle', url: 'https://host/a', media: { name: 'Aula', options },
    selectedOptionId: 'mp4-720', serviceAvailable: true,
    onPaste() { pastes++; }, onChangeUrl: value => selected.push(value),
    onAnalyze() { analyzes++; }, onSelectOption: id => selected.push(id),
  };
  const input = findAll(app.render({ flow }), 'Input')[0];
  assert.equal(input.props.keyboardType, 'url'); assert.equal(input.props.autoCorrect, false);
  input.props.onChangeText('https://host/new'); assert.equal(selected[0], 'https://host/new');
  input.props.onRightAction(); assert.equal(pastes, 1);
  findButton(app.render({ flow }), 'Continuar').props.onPress();
  assert.equal(analyzes, 1);
  const invalid = app.render({ flow: { ...flow, status: 'failed', fieldError: 'URL inválida', media: null } });
  assert.equal(findAll(invalid, 'Input')[0].props.error, 'URL inválida');
  assert.equal(findButton(invalid, 'Download do vídeo'), undefined);
  flow.status = 'ready';
  const tree = app.render({ flow });
  const cards = findAll(tree, 'Card');
  const mp3 = cards.find(node => node.props.accessibilityLabel?.startsWith('MP3,'));
  assert.equal(mp3, undefined);
  assert.match(textContent(tree), /origem disponibiliza apenas MP4/);
  const mp4 = cards.find(node => node.props.accessibilityLabel?.startsWith('MP4,'));
  assert.equal(mp4.props.selected, true);
  assert.equal(mp4.props.accessibilityRole, 'radio');
  assert.equal(findAll(tree, 'Input').length, 0);
  findButton(tree, 'Continuar').props.onPress();
  const quality = app.render({ flow });
  findAll(quality, 'Card').find(node => node.props.accessibilityLabel === 'Qualidade 1080p').props.onPress();
  assert.equal(selected.at(-1), 'mp4-1080');
  assert.equal(textContent(quality).includes('360p'), false);
  assert.equal(app.back(), true);
  const fromQuality = app.render({ flow });
  assert.equal(findAll(fromQuality, 'Card').find(node => node.props.accessibilityLabel?.startsWith('MP4,')).props.selected, true);
  assert.equal(app.back(), true);
  assert.equal(findAll(app.render({ flow }), 'Input')[0].props.value, flow.url);
  assert.equal(app.back(), false);
});

test('Unknown quality, missing service and unsupported cancellation never offer fictitious actions', () => {
  const app = harness('src/screens/MediaDownloadForm.js');
  const flow = { status: 'ready', media: { options: [{ ...options[0], quality: null }] }, selectedOptionId: 'mp4-720', serviceAvailable: false, onStart: () => assert.fail('unavailable') };
  const format = app.render({ flow });
  findButton(format, 'Continuar').props.onPress();
  const tree = app.render({ flow });
  assert.ok(textContent(tree).includes('Qualidade não informada'));
  assert.ok(textContent(tree).includes('Nenhuma transferência será simulada'));
  assert.equal(findButton(tree, 'Download do vídeo').props.disabled, true);
  assert.equal(findButton(tree, 'Download do vídeo').props.onPress, undefined);
  assert.equal(findAll(tree, 'Button').some(node => node.props.title === 'Cancelar download'), false);
  const transferring = app.render({ flow: { status: 'downloading', progress: 42, canCancel: false, serviceAvailable: true } });
  assert.equal(findAll(transferring, 'ProgressBar')[0].props.progress, 42);
  assert.equal(findAll(transferring, 'Button').some(node => node.props.title === 'Cancelar download'), false);
  const unknown = app.render({ flow: { status: 'downloading', progress: null, serviceAvailable: true } });
  assert.equal(findAll(unknown, 'ProgressBar').length, 0);
  assert.equal(findAll(unknown, 'LoadingIndicator').length, 1);
});

test('Completed and cancelled views are explicit and cancel/start callbacks stay controlled', async () => {
  const app = harness('src/screens/MediaDownloadForm.js'); let calls = 0;
  const active = app.render({ flow: { status: 'downloading', serviceAvailable: true, progress: 12, canCancel: true, onCancel: () => { calls++; } } });
  assert.equal(calls, 0); findAll(active, 'Button').find(node => node.props.title === 'Cancelar download').props.onPress(); assert.equal(calls, 1);
  const unsupported = app.render({ flow: { status: 'completed', serviceAvailable: true, record: item('file') } });
  assert.doesNotMatch(textContent(unsupported), /Download concluído!/);
  assert.equal(findButton(unsupported, 'Abrir arquivo'), undefined);
  for (const invalid of [{ ...saved, fileUri: 'https://host/a' }, { ...saved, sizeBytes: 0 }, { ...saved, status: 'failed' }]) {
    assert.equal(findButton(app.render({ flow: { status: 'completed', record: invalid } }), 'Abrir arquivo'), undefined);
  }
  const done = app.render({ flow: { status: 'completed', serviceAvailable: true, record: saved, onOpen: () => { calls++; } } });
  assert.match(textContent(done), /Download concluído!/);
  const pendingSave = app.render({ flow: { status: 'completed', record: saved, persistencePending: true, storageError: 'Diário indisponível', onRetryStorage() {} } });
  assert.match(textContent(pendingSave), /Arquivo salvo no dispositivo/);
  assert.doesNotMatch(textContent(pendingSave), /Download concluído!/);
  assert.equal(findAll(pendingSave, 'ErrorMessage')[0].props.retryLabel, 'Tentar salvar dados novamente');
  const fileSummary = findAll(done, 'FileSummary')[0];
  assert.equal(fileSummary.props.name, saved.name);
  assert.match(textContent(fileSummary.type(fileSummary.props)), /file\.mp4/);
  await findButton(done, 'Abrir arquivo').props.onPress();
  assert.equal(calls, 2);
  const pending = deferred();
  const waitForOpen = { status: 'completed', record: saved, onOpen() { calls++; return pending.promise; } };
  const openAction = findButton(app.render({ flow: waitForOpen }), 'Abrir arquivo').props.onPress;
  const firstOpen = openAction();
  await openAction();
  assert.equal(calls, 3);
  pending.resolve(true);
  await firstOpen;
  const badOpen = { status: 'completed', serviceAvailable: true, record: saved, onOpen: () => false };
  await findButton(app.render({ flow: badOpen }), 'Abrir arquivo').props.onPress();
  assert.ok(findAll(app.render({ flow: badOpen }), 'ErrorMessage').some(node => node.props.message?.includes('Não foi possível abrir')));
  const nextFile = { ...badOpen, record: { ...saved, fileUri: 'file:///media/next.mp4' } };
  assert.equal(findAll(app.render({ flow: nextFile }), 'ErrorMessage').some(node => node.props.message?.includes('Não foi possível abrir')), false);
  const cancelled = app.render({ flow: { status: 'cancelled', serviceAvailable: true } });
  assert.ok(textContent(cancelled).includes('transferência foi interrompida')); assert.equal(findAll(cancelled, 'ProgressBar').length, 0);
});

test('Remote UI labels the server track, device transfer, verification and continuation independently', () => {
  const app = harness('src/screens/MediaDownloadForm.js');
  const onResume = () => {};
  const server = app.render({ flow: { status: 'downloading', phase: { name: 'downloading', track: 2, trackCount: 2 }, progress: 33 } });
  assert.match(textContent(server), /Baixando no servidor/);
  assert.match(textContent(server), /Faixa 2 de 2/);
  const device = app.render({ flow: { status: 'downloading', phase: { name: 'local' }, progress: 17 } });
  assert.equal(findAll(device, 'ProgressBar')[0].props.accessibilityLabel, 'Transferindo para o dispositivo');
  const verification = app.render({ flow: { status: 'downloading', phase: { name: 'verifyingLocal' }, progress: null } });
  assert.match(textContent(verification), /SHA-256/);
  assert.doesNotMatch(textContent(verification), /Download concluído/);
  assert.equal(findButton(verification, 'Cancelar download'), undefined);
  const paused = app.render({ flow: { status: 'paused', error: 'A conexão caiu.', onResume } });
  assert.equal(findAll(paused, 'ErrorMessage')[0].props.onRetry, onResume);
});

test('A supported selection starts only from quality and offers a callback to retry a failed transfer', () => {
  const app = harness('src/screens/MediaDownloadForm.js');
  let starts = 0;
  let analyzes = 0;
  const audio = { id: 'mp3-original', format: 'MP3', quality: null };
  const flow = {
    status: 'ready', serviceAvailable: true, media: { name: 'Áudio', options: [audio] }, selectedOptionId: audio.id,
    onStart() { starts++; }, onAnalyze() { analyzes++; },
  };
  const format = app.render({ flow });
  assert.match(textContent(format), /Áudio\s+confirmado/);
  assert.equal(findButton(format, 'Download do áudio'), undefined);
  findButton(format, 'Continuar').props.onPress();
  const quality = app.render({ flow });
  assert.equal(findButton(quality, 'Download do áudio').props.disabled, false);
  findButton(quality, 'Download do áudio').props.onPress();
  assert.equal(starts, 1);
  const failed = app.render({ flow: { ...flow, status: 'failed', record: { ...saved, status: 'failed' }, error: 'Falha ao gravar' } });
  findAll(failed, 'ErrorMessage').find(node => node.props.message === 'Falha ao gravar').props.onRetry();
  assert.equal(analyzes, 1);
  assert.equal(findButton(failed, 'Abrir arquivo'), undefined);
});

test('History cancellation preserves the record; confirmed deletion updates the group and prevents repeated confirms', async () => {
  const app = harness('src/screens/HistoryScreen.js'); const wait = deferred();
  let records = [item('a'), item('b', { completedAt: '2026-11-11T12:00:00Z' })]; let calls = 0;
  const props = () => ({ items: records, onDeleteItem: async record => { calls++; await wait.promise; records = records.filter(candidate => candidate.id !== record.id); } });
  const render = () => app.render(props());
  const askDelete = tree => {
    const list = findAll(tree, 'SectionList')[0];
    const card = list.props.renderItem({ item: records[0] });
    const action = findAll(card, 'Button')[0];
    assert.equal(action.props.accessibilityLabel, `Excluir registro de ${records[0].name}`);
    assert.equal(card.props.onPress, undefined, 'Opening and deleting are siblings rather than nested interactive controls');
    action.props.onPress();
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
  await findAll(card, 'Pressable')[0].props.onPress(); tree = app.render(props);
  assert.ok(findAll(tree, 'ErrorMessage').some(node => node.props.message.includes('abrir')));
  findAll(card, 'Button')[0].props.onPress();
  await findAll(app.render(props), 'ConfirmationDialog')[0].props.onConfirm(); tree = app.render(props);
  assert.ok(findAll(tree, 'ErrorMessage').some(node => node.props.message.includes('excluir')));
  assert.equal(textContent(tree).includes('private'), false);
  list = findAll(tree, 'SectionList')[0]; assert.equal(list.props.sections[0].data[0], records[0]);
});

test('Main navigation connects the shared library while caller-supplied records keep their original action contracts', () => {
  const stored = { items: [item('stored')], onDeleteItem() {}, onOpenItem() {} };
  const downloadFlow = { status: 'idle' };
  const mediaLibraryProps = { downloadProps: stored, historyProps: stored, downloadFlow };
  const app = harness('src/navigation/AppNavigator.js', { mockScreens: true, mediaLibraryProps });
  let tree = app.render({}, 'MainTabs');
  findAll(tree, 'BottomNavigation')[0].props.onTabPress('downloads'); tree = app.render({}, 'MainTabs');
  assert.equal(findAll(tree, 'DownloadsScreen')[0].props.items, stored.items);
  assert.equal(findAll(tree, 'DownloadsScreen')[0].props.downloadFlow, undefined);
  assert.equal(app.render({ navigation: {} }, 'MediaDownloadRoute').props.flow, downloadFlow);
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
  assert.equal(props.downloadFlow.onCancel, library.cancel);
  assert.equal(props.downloadFlow.onPaste, library.paste);
  state = { ...state, history: [item('saved')], storageError: 'Falha ao salvar' };
  const next = useMediaLibrary(); assert.equal(next.historyProps.items[0].id, 'saved');
  assert.equal(next.historyProps.error, ''); assert.equal(next.historyProps.storageError, 'Falha ao salvar');
});

test('Original Figma assets retain their exact export geometry and local callsites in the flow', () => {
  const originals = { link: 20, video: 24, audio: 24, check: 20, cancel: 20, arrow: 18, success: 48, 'success-background': 96 };
  const additions = { 'flow-back': 20, 'header-link': 20, 'preview-play': 24, 'preview-background': 64, 'progress-ring': 128, 'progress-spinner': 16, 'open-circle': 40, 'open-arrow': 24 };
  const dimensions = { ...originals, ...additions, 'history-background': 52 };
  for (const [name, size] of Object.entries({ ...originals, ...additions })) {
    for (const density of [1, 2, 3]) {
      const suffix = density === 1 ? '' : `@${density}x`;
      const image = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/media', name + suffix + '.png')));
      assert.equal(image.width, size * density, name);
      assert.equal(image.height, size * density, name);
      assert.ok(image.data.some((value, index) => index % 4 === 3 && value > 0));
      assert.ok(image.data.some((value, index) => index % 4 === 3 && value === 0), `${name}${suffix} needs a transparent background`);
    }
  }
  const seen = new Set();
  for (const status of ['idle', 'ready', 'downloading', 'completed']) {
    const app = harness('src/screens/MediaDownloadForm.js');
    const flow = { status, serviceAvailable: true, media: { options }, selectedOptionId: 'mp4-720', canCancel: true, onCancel() {}, onOpen() {}, record: saved };
    const tree = app.render({ flow });
    const images = findAll(tree, 'Image');
    const summary = findAll(tree, 'FileSummary')[0];
    if (summary) images.push(...findAll(summary.type(summary.props), 'Image'));
    const input = findAll(tree, 'Input')[0];
    if (input) images.push(input.props.leftIcon);
    const header = findAll(tree, 'Header')[0];
    if (typeof header.props.backIcon === 'string') {
      assert.ok(header.props.backIcon.endsWith('flow-back.png'));
      seen.add('flow-back');
    } else images.push(...findAll(header.props.backIcon, 'Image'));
    if (header.props.logo) images.push(header.props.logo);
    if (status === 'ready') {
      findButton(tree, 'Continuar').props.onPress();
      const quality = app.render({ flow });
      images.push(findButton(quality, 'Download do vídeo').props.rightIcon);
    }
    for (const button of findAll(tree, 'Button')) for (const icon of [button.props.leftIcon, button.props.rightIcon]) if (icon) images.push(icon);
    for (const image of images) {
      assert.ok(fs.statSync(image.props.source).size > 0);
      const name = path.basename(image.props.source, '.png');
      seen.add(name);
      if (name === 'flow-logo') {
        assert.ok([55, 84].includes(flattenStyle(image.props.style).width));
        assert.equal(flattenStyle(image.props.style).width, flattenStyle(image.props.style).height);
        continue;
      }
      const size = dimensions[name];
      assert.equal(flattenStyle(image.props.style).width, size); assert.equal(flattenStyle(image.props.style).height, size);
    }
  }
  for (const name of Object.keys(additions)) assert.ok(seen.has(name), name);
});
