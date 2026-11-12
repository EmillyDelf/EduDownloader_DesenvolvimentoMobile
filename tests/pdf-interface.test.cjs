const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { harness, findAll, textContent, flattenStyle, root } = require('./helpers/mobileHarness.cjs');

const selectionFile = 'src/screens/SelectImagesScreen.js';
const organizationFile = 'src/screens/OrganizeImagesScreen.js';
const navigationFile = 'src/navigation/AppNavigator.js';
const uris = images => Array.from(images, image => image.uri);
const images = (count, offset = 0) => Array.from({ length: count }, (_, index) => ({ uri: `file:///selected-${index + offset}.jpg`, width: 600, height: 800 }));
const upload = tree => findAll(tree, 'Pressable').find(node => node.props.accessibilityLabel === 'Selecionar imagens da galeria');
const continueButton = tree => findAll(tree, 'Button').find(node => node.props.title === 'Continuar');

function pickerHarness({ initialImages = [], results = [], permission = { granted: true }, launch } = {}) {
  const requests = [];
  let permissionRequests = 0;
  let resultIndex = 0;
  const imagePicker = {
    async requestMediaLibraryPermissionsAsync() { permissionRequests += 1; return permission; },
    async launchImageLibraryAsync(options) {
      requests.push(options);
      if (launch) return launch(options);
      return results[resultIndex++] || { canceled: true, assets: null };
    },
  };
  const app = harness(selectionFile, { imagePicker });
  const updates = [];
  const continued = [];
  const props = { initialImages, onImagesChange: value => updates.push(value), onContinue: value => continued.push(value) };
  return { app, requests, updates, continued, render: () => app.render(props), get permissionRequests() { return permissionRequests; } };
}

test('PDF selection caps and deduplicates complete batches without mutating the supplied assets', () => {
  const helpers = harness('src/pdf/imageSelection.js').exports;
  const original = images(18);
  const incoming = [...images(5, 18), original[0], { uri: '' }, null];
  const before = JSON.stringify({ original, incoming });
  const result = helpers.mergeSelectedImages(original, incoming);
  assert.equal(helpers.MAX_PDF_IMAGES, 20);
  assert.equal(result.images.length, 20);
  assert.equal(result.limitExceeded, true);
  assert.equal(result.images[0], original[0]);
  assert.equal(new Set(uris(result.images)).size, 20);
  assert.equal(JSON.stringify({ original, incoming }), before);
  assert.equal(helpers.normalizeSelectedImages(images(25)).length, 20);
});

test('Empty selection preserves Emilly headings, upload area and counter, with Continue disabled', () => {
  const page = pickerHarness();
  const tree = page.render();
  assert.equal(findAll(tree, 'Header')[0].props.title, 'Imagens para PDF');
  assert.ok(textContent(tree).includes('Crie seu PDF'));
  assert.ok(textContent(tree).includes('Nenhuma imagem selecionada'));
  assert.match(textContent(tree), /0\s*\/\s*20/);
  assert.equal(upload(tree).props.accessibilityRole, 'button');
  assert.equal(continueButton(tree).props.disabled, true);
  assert.equal(flattenStyle(continueButton(tree).props.style).opacity, 0.4);
  assert.equal(page.permissionRequests, 0);
});

test('Repeated gallery rounds request remaining slots and enforce 20 even when the picker returns too many', async () => {
  const page = pickerHarness({ results: [{ canceled: false, assets: images(12) }, { canceled: false, assets: images(12, 12) }] });
  await upload(page.render()).props.onPress();
  assert.equal(page.updates.at(-1).length, 12);
  await upload(page.render()).props.onPress();
  assert.equal(page.requests[0].selectionLimit, 20);
  assert.equal(page.requests[1].selectionLimit, 8);
  assert.equal(Array.from(page.requests[0].mediaTypes).join(','), 'images');
  assert.equal(page.requests[0].allowsMultipleSelection, true);
  assert.equal(page.updates.at(-1).length, 20);
  assert.ok(page.app.alerts.some(alert => alert[0] === 'Limite de imagens'));
  continueButton(page.render()).props.onPress();
  assert.equal(page.continued[0].length, 20);
  await upload(page.render()).props.onPress();
  assert.equal(page.permissionRequests, 2, 'A full selection does not reopen the native picker');
});

test('Removing a selected thumbnail frees a slot and preserves order when adding another image', async () => {
  const page = pickerHarness({ initialImages: images(20), results: [{ canceled: false, assets: images(2, 20) }] });
  const remove = findAll(page.render(), 'Pressable').find(node => node.props.accessibilityLabel === 'Remover imagem 1');
  remove.props.onPress();
  assert.equal(page.updates.at(-1).length, 19);
  await upload(page.render()).props.onPress();
  assert.equal(page.requests[0].selectionLimit, 1);
  assert.equal(page.updates.at(-1).length, 20);
  assert.equal(page.updates.at(-1)[0].uri, 'file:///selected-1.jpg');
  assert.equal(page.updates.at(-1).at(-1).uri, 'file:///selected-20.jpg');
});

test('Denied permission and picker cancellation preserve existing selection without callbacks', async () => {
  const selected = images(2);
  const denied = pickerHarness({ initialImages: selected, permission: { granted: false } });
  await upload(denied.render()).props.onPress();
  assert.equal(denied.requests.length, 0);
  assert.equal(denied.updates.length, 0);
  assert.equal(denied.app.alerts[0][0], 'Permissão necessária');
  assert.equal(upload(denied.render()).props.disabled, false);
  const canceled = pickerHarness({ initialImages: selected });
  await upload(canceled.render()).props.onPress();
  assert.equal(canceled.updates.length, 0);
  continueButton(canceled.render()).props.onPress();
  assert.deepEqual(uris(canceled.continued[0]), uris(selected));
  assert.equal(canceled.app.alerts.length, 0);
});

test('Picker failures are handled safely and release the interface for another attempt', async () => {
  const page = pickerHarness({ launch: () => { throw new Error('native/private/path'); } });
  await upload(page.render()).props.onPress();
  assert.equal(upload(page.render()).props.disabled, false);
  assert.ok(page.app.alerts[0][0].includes('Não foi possível selecionar'));
  assert.equal(JSON.stringify(page.app.alerts).includes('native/private/path'), false);
  await upload(page.render()).props.onPress();
  assert.equal(page.requests.length, 2);
});

test('Rapid repeated presses open only one picker and keep Continue disabled during selection', async () => {
  let resolvePicker;
  const waiting = new Promise(resolve => { resolvePicker = resolve; });
  const page = pickerHarness({ initialImages: images(1), launch: () => waiting });
  const first = upload(page.render()).props.onPress();
  await Promise.resolve();
  const busy = page.render();
  assert.equal(upload(busy).props.accessibilityState.busy, true);
  assert.equal(continueButton(busy).props.disabled, true);
  await upload(busy).props.onPress();
  assert.equal(page.requests.length, 1);
  resolvePicker({ canceled: false, assets: images(1, 1) });
  await first;
  assert.equal(page.updates.at(-1).length, 2);
  assert.equal(continueButton(page.render()).props.disabled, false);
});

test('Organization reorders, removes, adds and continues with the same asset objects', () => {
  const selected = images(3);
  const before = JSON.stringify(selected);
  const updates = [];
  const continued = [];
  let additions = 0;
  const app = harness(organizationFile);
  const props = { images: selected, onImagesChange: value => updates.push(value), onAddImages: () => { additions += 1; }, onContinue: value => continued.push(value) };
  const render = () => app.render(props);
  assert.equal(findAll(render(), 'Header')[0].props.title, 'Organizar imagens');
  let actions = findAll(render(), 'Pressable');
  assert.equal(actions.find(node => node.props.accessibilityLabel === 'Mover página 1 para cima').props.disabled, true);
  assert.equal(actions.find(node => node.props.accessibilityLabel === 'Mover página 3 para baixo').props.disabled, true);
  actions.find(node => node.props.accessibilityLabel === 'Mover página 2 para cima').props.onPress();
  assert.deepEqual(uris(updates.at(-1)), [selected[1].uri, selected[0].uri, selected[2].uri]);
  actions = findAll(render(), 'Pressable');
  actions.find(node => node.props.accessibilityLabel === 'Remover página 2').props.onPress();
  assert.deepEqual(uris(updates.at(-1)), [selected[1].uri, selected[2].uri]);
  findAll(render(), 'Pressable').find(node => node.props.accessibilityLabel === 'Adicionar imagens').props.onPress();
  assert.equal(additions, 1);
  continueButton(render()).props.onPress();
  assert.equal(continued[0][0], selected[1]);
  assert.equal(JSON.stringify(selected), before);
});

test('Organization handles empty selection without enabling a fictitious next operation', () => {
  let finishes = 0;
  const app = harness(organizationFile);
  const tree = app.render({ onContinue: () => { finishes += 1; } });
  assert.equal(continueButton(tree).props.disabled, true);
  continueButton(tree).props.onPress();
  assert.equal(finishes, 0);
  assert.equal(app.alerts[0][0], 'Nenhuma imagem');
});

function pdfNavigation() {
  const app = harness(navigationFile, { mockScreens: true });
  const render = () => app.render({}, 'MainTabs');
  const select = tab => { findAll(render(), 'BottomNavigation')[0].props.onTabPress(tab); return render(); };
  return { app, render, select };
}

test('PDF tab enters selection and Continue opens organization while retaining edits across back/add', () => {
  const page = pdfNavigation();
  let tree = page.select('pdf');
  assert.equal(findAll(tree, 'BottomNavigation').length, 1);
  const selected = images(2);
  let selection = findAll(tree, 'SelectImagesScreen')[0];
  selection.props.onContinue([]);
  assert.equal(findAll(page.render(), 'OrganizeImagesScreen').length, 0);
  selection.props.onImagesChange(selected);
  selection.props.onContinue(selected);
  let organization = findAll(page.render(), 'OrganizeImagesScreen')[0];
  assert.deepEqual(uris(organization.props.images), uris(selected));
  organization.props.onImagesChange([selected[1], selected[0]]);
  organization.props.onBack();
  selection = findAll(page.render(), 'SelectImagesScreen')[0];
  assert.deepEqual(uris(selection.props.initialImages), [selected[1].uri, selected[0].uri]);
  selection.props.onContinue(selection.props.initialImages);
  organization = findAll(page.render(), 'OrganizeImagesScreen')[0];
  organization.props.onAddImages();
  assert.deepEqual(uris(findAll(page.render(), 'SelectImagesScreen')[0].props.initialImages), [selected[1].uri, selected[0].uri]);
});

test('Android back goes organization to selection to Home and the PDF tab preserves the selection', () => {
  const page = pdfNavigation();
  const selected = images(2);
  findAll(page.select('pdf'), 'SelectImagesScreen')[0].props.onContinue(selected);
  page.render();
  assert.equal(page.app.back(), true);
  assert.equal(findAll(page.render(), 'SelectImagesScreen').length, 1);
  assert.equal(page.app.back(), true);
  assert.equal(findAll(page.render(), 'BottomNavigation')[0].props.activeTab, 'home');
  assert.deepEqual(uris(findAll(page.select('pdf'), 'SelectImagesScreen')[0].props.initialImages), uris(selected));
  findAll(page.render(), 'SelectImagesScreen')[0].props.onContinue(selected);
  page.select('downloads');
  const returned = page.select('pdf');
  assert.equal(findAll(returned, 'SelectImagesScreen').length, 1);
  assert.equal(findAll(returned, 'OrganizeImagesScreen').length, 0);
  page.app.blur();
  assert.equal(page.app.listeners, 0);
});

test('Final PDF action is an imported Alert explaining future generation, without fake success or media writes', () => {
  const page = pdfNavigation();
  findAll(page.select('pdf'), 'SelectImagesScreen')[0].props.onContinue(images(2));
  findAll(page.render(), 'OrganizeImagesScreen')[0].props.onContinue(images(2));
  assert.equal(page.app.alerts.length, 1);
  const message = page.app.alerts[0].join(' ');
  assert.ok(message.includes('implementada futuramente'));
  assert.ok(message.includes('Nenhum arquivo foi criado'));
  assert.equal(/sucesso|gerado com sucesso/i.test(message), false);
  for (const file of [selectionFile, organizationFile, 'src/pdf/imageSelection.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal(/pdf-lib|expo-print|expo-sharing|expo-file-system|mediaLibrary|useMediaLibrary/.test(source), false, file);
  }
});

test('PDF screens use shared tokens, bounded responsive content, existing controls and no nested bottom menu', () => {
  for (const file of [selectionFile, organizationFile]) {
    const app = harness(file, { imagePicker: {} });
    for (const [width, padding, maxWidth] of [[320, 16, 480], [440, 24, 480], [800, 24, 560]]) {
      app.dimensions.width = width;
      const tree = app.render({ images: images(2), initialImages: images(2), onContinue() {} });
      const content = flattenStyle(findAll(tree, 'ScrollView')[0].props.contentContainerStyle);
      assert.equal(content.paddingHorizontal, padding);
      assert.equal(content.maxWidth, maxWidth);
      assert.equal(findAll(tree, 'BottomNavigation').length, 0);
      assert.equal(findAll(tree, 'Image').length, 2);
      assert.equal(Array.from(tree.props.edges).includes('bottom'), false);
    }
    assert.equal(/#[\da-f]{3,8}\b|rgba?\(/i.test(fs.readFileSync(path.join(root, file), 'utf8')), false);
  }
});

test('PDF interface leaves the GOAL 06 records and action callbacks under their existing owner', () => {
  const records = [{ id: 'real-download', name: 'Aula.mp4', status: 'completed', fileUri: 'file:///media/Aula.mp4' }];
  let opens = 0;
  const callback = () => { opens += 1; };
  const library = { downloadProps: { items: records, onOpenItem: callback }, historyProps: { items: records, onOpenItem: callback } };
  const app = harness(navigationFile, { mockScreens: true, mediaLibraryProps: library });
  const render = () => app.render({}, 'MainTabs');
  const select = tab => { findAll(render(), 'BottomNavigation')[0].props.onTabPress(tab); return render(); };
  findAll(select('pdf'), 'SelectImagesScreen')[0].props.onContinue(images(2));
  findAll(render(), 'OrganizeImagesScreen')[0].props.onContinue(images(2));
  const downloads = findAll(select('downloads'), 'DownloadsScreen')[0];
  const history = findAll(select('history'), 'HistoryScreen')[0];
  assert.equal(downloads.props.items, records);
  assert.equal(history.props.items, records);
  assert.equal(downloads.props.onOpenItem, callback);
  assert.equal(history.props.onOpenItem, callback);
  assert.equal(records.length, 1);
  assert.equal(opens, 0);
});
