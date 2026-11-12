const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const React = require('react');
const babel = require('@babel/core');
const { PNG } = require('pngjs');

const compiled = new Map();

function createLoader(react = React, dimensions = { width: 440, height: 956, fontScale: 1 }) {
  const modules = new Map();
  const native = Object.fromEntries(['FlatList', 'SectionList', 'Image', 'Pressable', 'Text', 'View'].map(name => [name, name]));
  native.StyleSheet = { create: value => value };
  native.Dimensions = { get: () => dimensions };
  native.PixelRatio = { getFontScale: () => dimensions.fontScale, roundToNearestPixel: value => Math.round(value) };
  native.useWindowDimensions = () => dimensions;
  function load(filename) {
    const resolved = path.resolve(filename);
    if (modules.has(resolved)) return modules.get(resolved).exports;
    const module = { exports: {} };
    modules.set(resolved, module);
    if (!compiled.has(resolved)) {
      compiled.set(resolved, babel.transformFileSync(resolved, {
        babelrc: false,
        configFile: false,
        plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
      }).code);
    }
    vm.runInNewContext(compiled.get(resolved), {
      module,
      exports: module.exports,
      require(request) {
        if (request === 'react') return react;
        if (request === 'react-native') return native;
        if (request === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
        if (request.startsWith('../components/')) return { __esModule: true, default: request.split('/').at(-1) };
        let target = path.resolve(path.dirname(resolved), request);
        if (target.endsWith('.png')) {
          assert.ok(fs.existsSync(target), 'Missing image: ' + target);
          return target;
        }
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.js');
        else if (!target.endsWith('.js')) target += '.js';
        return load(target);
      },
    }, { filename: resolved });
    return module.exports;
  }
  return load;
}

function screenHarness(name, dimensions) {
  const states = [];
  let cursor = 0;
  const react = {
    ...React,
    useState(initial) {
      const slot = cursor++;
      if (!(slot in states)) states[slot] = initial;
      return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }];
    },
    useRef(initial) {
      const slot = cursor++;
      if (!(slot in states)) states[slot] = { current: initial };
      return states[slot];
    },
  };
  const Screen = createLoader(react, dimensions)(path.join(__dirname, '../src/screens', name + '.js')).default;
  return props => { cursor = 0; return Screen(props || {}); };
}

function findAll(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => findAll(child, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type || node.type?.name === type ? [node] : []), ...findAll(node.props.children, type)];
}

function textContent(node) {
  return findAll(node, 'Text').map(text => React.Children.toArray(text.props.children).join('')).join(' ');
}

function flattenStyle(style) {
  return Array.isArray(style) ? Object.assign({}, ...style.map(flattenStyle)) : style || {};
}

const utils = createLoader()(path.join(__dirname, '../src/screens/fileScreenUtils.js'));
const parts = createLoader()(path.join(__dirname, '../src/screens/FileScreenParts.js'));
const items = [
  { id: 'active', name: 'Aula de Matemática.mp4', format: 'MP4', sizeBytes: 1024 ** 2, status: 'downloading', progress: 42, activityType: 'download', completedAt: new Date(2026, 10, 12, 12, 40).toISOString() },
  { id: 'complete', name: 'Áudio de História.mp3', format: 'MP3', status: 'completed', activityType: 'conversion', completedAt: new Date(2026, 10, 12, 11, 5).toISOString() },
  { id: 'failed', name: 'Material.pdf', format: 'PDF', status: 'failed', error: 'Falha recebida do serviço', activityType: 'pdf', completedAt: new Date(2026, 10, 11, 9, 32).toISOString() },
];

test('Downloads renders supplied names, formats, optional sizes, statuses and progress without changing data', () => {
  const before = JSON.stringify(items);
  const tree = screenHarness('DownloadsScreen')({ items });
  const list = findAll(tree, 'FlatList')[0];
  assert.equal(list.props.data.length, 3);
  const active = list.props.renderItem({ item: items[0] });
  assert.ok(textContent(active).includes('Aula de Matemática.mp4'));
  assert.ok(textContent(active).includes('MP4 · 1 MB'));
  assert.equal(findAll(active, 'ProgressBar')[0].props.progress, 42);
  assert.equal(findAll(active, 'FileStatus')[0].props.status, 'downloading');
  const completed = list.props.renderItem({ item: items[1] });
  assert.equal(findAll(completed, 'ProgressBar')[0].props.progress, 100);
  assert.equal(findAll(completed, 'Pressable').length, 0, 'No open action without a real callback');
  assert.equal(textContent(completed).includes('0 B'), false);
  const unknown = list.props.renderItem({ item: { id: 'unknown', name: 'Arquivo', status: 'queued' } });
  assert.equal(findAll(unknown, 'ProgressBar').length, 0);
  assert.equal(JSON.stringify(items), before);
});

test('Download search ignores case and accents, combines filters and can clear no-result searches', () => {
  const render = screenHarness('DownloadsScreen');
  let list = findAll(render({ items }), 'FlatList')[0];
  findAll(list.props.ListHeaderComponent, 'Input')[0].props.onChangeText('AUDIO');
  list = findAll(render({ items }), 'FlatList')[0];
  assert.equal(list.props.data[0], items[1]);
  findAll(list.props.ListHeaderComponent, 'FileFilters')[0].props.onChange('pdf');
  list = findAll(render({ items }), 'FlatList')[0];
  assert.equal(list.props.data.length, 0);
  assert.ok(textContent(list.props.ListEmptyComponent).includes('Nenhum arquivo encontrado'));
  findAll(list.props.ListEmptyComponent, 'Button')[0].props.onPress();
  list = findAll(render({ items }), 'FlatList')[0];
  assert.equal(list.props.data.length, 3);
  assert.equal(findAll(list.props.ListHeaderComponent, 'Input')[0].props.value, '');
});

test('Download actions invoke only the supplied callback with the original record', () => {
  const opened = [];
  const retried = [];
  const tree = screenHarness('DownloadsScreen')({ items, onOpenItem: item => opened.push(item), onRetryItem: item => retried.push(item) });
  const list = findAll(tree, 'FlatList')[0];
  const active = list.props.renderItem({ item: items[0] });
  assert.equal(findAll(active, 'Pressable').length, 0);
  const completed = list.props.renderItem({ item: items[1] });
  const open = findAll(completed, 'Pressable')[0];
  assert.equal(open.props.accessibilityLabel, 'Abrir Áudio de História.mp3');
  assert.equal(opened.length, 0);
  open.props.onPress({ nativeEvent: {} });
  assert.equal(opened[0], items[1]);
  const failed = list.props.renderItem({ item: items[2] });
  const error = findAll(failed, 'ErrorMessage')[0];
  assert.equal(error.props.message, items[2].error);
  assert.equal(retried.length, 0);
  error.props.onRetry({ nativeEvent: {} });
  assert.equal(retried[0], items[2]);
});

test('Both screens separate loading, empty and global error states and expose retries only when provided', () => {
  for (const name of ['DownloadsScreen', 'HistoryScreen']) {
    const render = screenHarness(name);
    const listType = name === 'DownloadsScreen' ? 'FlatList' : 'SectionList';
    const empty = findAll(render(), listType)[0];
    assert.ok(findAll(empty.props.ListEmptyComponent, 'Card').length);
    const loading = findAll(render({ items, isLoading: true }), listType)[0];
    assert.equal(loading.props.ListEmptyComponent.type, 'LoadingIndicator');
    assert.equal((loading.props.data || loading.props.sections).length, 0);
    const error = findAll(render({ error: 'Falha de rede', items }), listType)[0];
    assert.equal(error.props.ListEmptyComponent.type, 'ErrorMessage');
    assert.equal(error.props.ListEmptyComponent.props.message, 'Falha de rede');
    assert.equal(error.props.ListEmptyComponent.props.onRetry, undefined);
    let retries = 0;
    const retry = () => { retries += 1; };
    const retryList = findAll(render({ error: 'Falha', onRetry: retry }), listType)[0];
    assert.equal(retries, 0);
    retryList.props.ListEmptyComponent.props.onRetry();
    assert.equal(retries, 1);
  }
});

test('Downloads without a known percentage show an honest pending-progress state', () => {
  const list = findAll(screenHarness('DownloadsScreen')({ items }), 'FlatList')[0];
  const row = list.props.renderItem({ item: { id: 'pending', name: 'Aula', status: 'downloading' } });
  assert.equal(findAll(row, 'ProgressBar').length, 0);
  assert.equal(findAll(row, 'LoadingIndicator')[0].props.size, 'small');
});

test('History groups today, yesterday, older and undated records in descending date order', () => {
  const undated = { id: 'undated', name: 'Sem data', status: 'failed' };
  const older = { id: 'old', name: 'Antigo', completedAt: new Date(2026, 9, 1, 12).toISOString(), status: 'completed' };
  const supplied = [undated, items[2], older, items[1], items[0]];
  const before = supplied.slice();
  const sections = utils.getHistorySections(supplied, 'all', new Date(2026, 10, 12, 14));
  assert.equal(sections[0].title, 'Hoje');
  assert.equal(sections[0].data[0], items[0]);
  assert.equal(sections[1].title, 'Ontem');
  assert.ok(sections[2].title.includes('2026'));
  assert.equal(sections[3].title, 'Data não informada');
  assert.equal(sections[3].data[0], undated);
  assert.deepEqual(supplied, before);
  const invalid = utils.getHistorySections([{ id: 'bad', completedAt: 'not-a-date' }], 'all');
  assert.equal(invalid[0].title, 'Data não informada');
});

test('History presents received metadata and completion/failure without inventing dates or formats', () => {
  const tree = screenHarness('HistoryScreen')({ items, referenceDate: new Date(2026, 10, 12, 14) });
  const list = findAll(tree, 'SectionList')[0];
  assert.equal(list.props.sections.length, 2);
  assert.equal(textContent(list.props.renderSectionHeader({ section: list.props.sections[0] })), 'Hoje');
  const completed = list.props.renderItem({ item: items[1] });
  assert.ok(textContent(completed).includes('Áudio de História.mp3'));
  assert.ok(textContent(completed).includes('Conversão · MP3'));
  assert.equal(findAll(completed, 'FileStatus')[0].props.status, 'completed');
  const failed = list.props.renderItem({ item: items[2] });
  assert.equal(findAll(failed, 'ErrorMessage')[0].props.message, items[2].error);
  const missing = list.props.renderItem({ item: { id: 'missing', name: 'Sem metadados', status: 'completed' } });
  assert.equal(textContent(missing), 'Sem metadados');
});

test('History filters each activity category and restores all records after an empty result', () => {
  const render = screenHarness('HistoryScreen');
  for (const activityType of ['download', 'conversion', 'pdf']) {
    const list = findAll(render({ items }), 'SectionList')[0];
    list.props.ListHeaderComponent.props.onChange(activityType);
    const filtered = findAll(render({ items }), 'SectionList')[0].props.sections.flatMap(section => section.data);
    assert.ok(filtered.length);
    assert.ok(filtered.every(item => item.activityType === activityType));
  }
  const list = findAll(render({ items: [items[0]] }), 'SectionList')[0];
  assert.ok(textContent(list.props.ListEmptyComponent).includes('Nenhuma atividade neste filtro'));
  findAll(list.props.ListEmptyComponent, 'Button')[0].props.onPress();
  assert.equal(findAll(render({ items: [items[0]] }), 'SectionList')[0].props.sections.length, 1);
});

test('History opens completed records only and forwards per-item retry callbacks without side effects', () => {
  let opened;
  let retried;
  const list = findAll(screenHarness('HistoryScreen')({ items, onOpenItem: item => { opened = item; }, onRetryItem: item => { retried = item; } }), 'SectionList')[0];
  const completed = list.props.renderItem({ item: items[1] });
  assert.equal(opened, undefined);
  completed.props.onPress();
  assert.equal(opened, items[1]);
  const failed = list.props.renderItem({ item: items[2] });
  assert.equal(failed.props.onPress, undefined);
  findAll(failed, 'ErrorMessage')[0].props.onRetry();
  assert.equal(retried, items[2]);
  const passive = findAll(screenHarness('HistoryScreen')({ items }), 'SectionList')[0].props.renderItem({ item: items[1] });
  assert.equal(passive.props.onPress, undefined);
});

test('List keys use stable ids, refresh stays controlled, and navigation remains optional', () => {
  for (const name of ['DownloadsScreen', 'HistoryScreen']) {
    const type = name === 'DownloadsScreen' ? 'FlatList' : 'SectionList';
    const render = screenHarness(name);
    let selected;
    const refresh = () => {};
    const back = () => {};
    const tree = render({ items, refreshing: true, onRefresh: refresh, onBack: back, onTabPress: id => { selected = id; } });
    const list = findAll(tree, type)[0];
    assert.equal(list.props.onRefresh, refresh);
    assert.equal(list.props.refreshing, true);
    assert.notEqual(list.props.keyExtractor({ id: 'a', name: 'Igual' }), list.props.keyExtractor({ id: 'b', name: 'Igual' }));
    assert.equal(findAll(tree, 'Header')[0].props.onBack, back);
    const navigation = findAll(tree, 'BottomNavigation')[0];
    assert.equal(navigation.props.activeTab, name === 'DownloadsScreen' ? 'downloads' : 'history');
    navigation.props.onTabPress('pdf');
    assert.equal(selected, 'pdf');
    assert.equal(findAll(render(), 'BottomNavigation').length, 0);
  }
});

test('Responsive content stays bounded on phones and tablets and long filenames are not truncated', () => {
  const dimensions = { width: 320, height: 568, fontScale: 2 };
  for (const name of ['DownloadsScreen', 'HistoryScreen']) {
    const render = screenHarness(name, dimensions);
    const type = name === 'DownloadsScreen' ? 'FlatList' : 'SectionList';
    for (const [width, padding, maxWidth] of [[320, 16, 480], [390, 20, 480], [440, 50, 440], [800, 24, 560]]) {
      dimensions.width = width;
      const list = findAll(render({ items }), type)[0];
      const style = flattenStyle(list.props.contentContainerStyle);
      assert.equal(style.paddingHorizontal, padding);
      assert.equal(style.maxWidth, maxWidth);
      const row = list.props.renderItem({ item: { ...items[0], name: 'Nome muito longo '.repeat(20) } });
      assert.equal(findAll(row, 'Text')[0].props.numberOfLines, undefined);
    }
  }
});

test('Status text, unknown sizes and invalid dates stay explicit instead of fabricating service data', () => {
  assert.equal(utils.formatFileSize(undefined), '');
  assert.equal(utils.formatFileSize(-1), '');
  assert.equal(utils.formatFileSize(NaN), '');
  assert.equal(utils.formatFileSize(0), '0 B');
  assert.equal(utils.formatFileSize(2.5 * 1024 ** 2), '2,5 MB');
  assert.equal(utils.getRecordDate(null), null);
  assert.equal(utils.formatRecordTime('invalid'), '');
  assert.equal(utils.getStatusLabel('unexpected'), 'Status não informado');
  assert.equal(textContent(parts.FileStatus({ status: 'completed' })), 'Concluído');
  assert.equal(textContent(parts.FileStatus({ status: 'failed' })), 'Falha');
});

test('Figma native assets retain their original geometry at 1x, 2x and 3x', () => {
  for (const [name, size] of [['logo', 55], ['search', 20], ['video', 22], ['audio', 22], ['pdf', 22], ['open', 18], ['action-background', 38], ['history-background', 52], ['download', 22]]) {
    for (const scale of [1, 2, 3]) {
      const filename = name + (scale === 1 ? '' : '@' + scale + 'x') + '.png';
      const image = PNG.sync.read(fs.readFileSync(path.join(__dirname, '../assets/files', filename)));
      assert.equal(image.width, size * scale);
      assert.equal(image.height, size * scale);
      assert.ok(image.data.some((value, index) => index % 4 === 3 && value > 0));
    }
  }
  const fileIcon = parts.FileIcon({ item: { kind: 'pdf' } });
  assert.equal(flattenStyle(findAll(fileIcon, 'Image')[0].props.style).width, 22);
  const historyIcon = parts.FileIcon({ item: { activityType: 'download' }, history: true });
  assert.equal(flattenStyle(historyIcon.props.style).width, 52);
});
