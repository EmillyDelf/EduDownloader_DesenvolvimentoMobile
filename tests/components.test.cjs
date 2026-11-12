const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const React = require('react');
const babel = require('@babel/core');
const { PNG } = require('pngjs');

const paletteModule = { exports: {} };
const paletteCode = babel.transformFileSync(path.join(__dirname, '../src/styles/colors.js'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
vm.runInNewContext(paletteCode, { module: paletteModule, exports: paletteModule.exports });

// Checks component contracts with native elements mocked; Expo Go validates rendering.
const compiledModules = new Map();

function createModuleLoader(options = {}, react = React, fontState = [true, null], alerts = []) {
  const cache = new Map();
  const native = Object.fromEntries([
    'View', 'Text', 'TextInput', 'Pressable', 'ActivityIndicator', 'Modal', 'ScrollView',
    'Image', 'KeyboardAvoidingView',
  ].map(name => [name, name]));
  native.StyleSheet = { create: styles => styles };
  native.Dimensions = { get: () => ({ width: options.width ?? 440, height: options.height ?? 956 }) };
  native.PixelRatio = {
    getFontScale: () => options.fontScale ?? 1,
    roundToNearestPixel: value => Math.round(value),
  };
  native.useWindowDimensions = () => ({
    ...native.Dimensions.get(),
    fontScale: options.fontScale ?? 1,
  });
  native.Platform = { OS: 'android' };
  native.Alert = { alert: (...args) => alerts.push(args) };

  function load(filename) {
    const resolved = path.resolve(filename);
    if (resolved === path.resolve(__dirname, '../src/styles/colors.js')) return paletteModule.exports;
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} };
    cache.set(resolved, module);
    if (!compiledModules.has(resolved)) {
      compiledModules.set(resolved, babel.transformFileSync(resolved, {
        babelrc: false,
        configFile: false,
        plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
      }).code);
    }
    vm.runInNewContext(compiledModules.get(resolved), {
      module,
      exports: module.exports,
      console,
      require(request) {
        if (request === 'react') return react;
        if (request === 'react-native') return native;
        if (request === 'react-native-safe-area-context') {
          return { SafeAreaView: 'SafeAreaView', SafeAreaProvider: 'SafeAreaProvider' };
        }
        if (request === 'expo-status-bar') return { StatusBar: 'StatusBar' };
        if (request === 'expo-font') return { useFonts: () => fontState };
        if (request.startsWith('@expo-google-fonts/')) {
          return Object.fromEntries([
            'Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold',
            'Montserrat_400Regular', 'Montserrat_600SemiBold', 'Montserrat_700Bold',
          ].map((name, index) => [name, index + 1]));
        }
        if (request === './Button') return { __esModule: true, default: 'Button' };
        if (request.startsWith('.')) {
          let target = path.resolve(path.dirname(resolved), request);
          if (target.endsWith('.png')) {
            assert.equal(fs.existsSync(target), true, 'Missing asset: ' + request);
            return target;
          }
          if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.js');
          else if (!target.endsWith('.js')) target += '.js';
          return load(target);
        }
        throw new Error('Unexpected import: ' + request);
      },
    }, { filename: resolved });
    return module.exports;
  }
  return load;
}

function loadComponent(name, options = {}) {
  let state;
  const react = {
    ...React,
    useState(initialValue) {
      if (state === undefined) state = initialValue;
      return [state, next => { state = typeof next === 'function' ? next(state) : next; }];
    },
  };
  const component = createModuleLoader(options, react)(path.join(__dirname, '../src/components', name + '.js')).default;
  return props => component(props || {});
}

function loadStyleModule(name, options = {}) {
  return createModuleLoader(options)(path.join(__dirname, '../src/styles', name + '.js'));
}

function findAll(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => findAll(child, type));
  if (!node || typeof node !== 'object') return [];
  return [
    ...(node.type === type ? [node] : []),
    ...findAll(node.props.children, type),
  ];
}

function flattenStyle(style) {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return style || {};
}

function assertTransparentIcon(buffer, size) {
  const image = PNG.sync.read(buffer);
  assert.equal(image.width, size);
  assert.equal(image.height, size);
  let transparentPixels = 0;
  let visiblePixels = 0;
  for (let offset = 3; offset < image.data.length; offset += 4) {
    transparentPixels += image.data[offset] === 0;
    visiblePixels += image.data[offset] > 0;
  }
  assert.ok(transparentPixels > image.width * image.height / 4, 'Icon background must be transparent');
  assert.ok(visiblePixels > 0, 'Icon must contain a visible drawing');
  for (const pixel of [0, size - 1, size * (size - 1), size * size - 1]) {
    assert.equal(image.data[pixel * 4 + 3], 0, 'Icon corners must be transparent');
  }
}

test('Button preserves its public props and forwards the disabled state to Pressable', () => {
  const render = loadComponent('Button');
  let presses = 0;
  const onPress = () => { presses += 1; };
  const button = render({ title: 'Baixar', onPress });
  assert.equal(findAll(button, 'Text')[0].props.children, 'Baixar');
  assert.equal(button.props.disabled, false);
  assert.equal(presses, 0);
  button.props.onPress();
  assert.equal(presses, 1);
  const disabled = render({ title: 'Baixar', onPress, disabled: true });
  assert.equal(disabled.props.disabled, true);
  assert.equal(disabled.props.accessibilityState.disabled, true);
  assert.equal(
    flattenStyle(disabled.props.style({ pressed: true })).opacity,
    flattenStyle(disabled.props.style({ pressed: false })).opacity,
  );
});

test('Input forwards controlled value, URL options, and text changes', () => {
  const render = loadComponent('Input');
  let value = '';
  const tree = render({
    value,
    onChangeText: text => { value = text; },
    placeholder: 'https://',
    keyboardType: 'url',
    autoCapitalize: 'none',
    autoCorrect: false,
  });
  const input = findAll(tree, 'TextInput')[0];
  assert.equal(input.props.value, '');
  assert.equal(input.props.placeholder, 'https://');
  assert.equal(input.props.keyboardType, 'url');
  assert.equal(input.props.autoCapitalize, 'none');
  assert.equal(input.props.autoCorrect, false);
  input.props.onChangeText('https://example.com/aula');
  assert.equal(value, 'https://example.com/aula');
  assert.equal(findAll(render({ value }), 'TextInput')[0].props.value, value);
});

test('Input exposes focus, blur, error, and disabled states', () => {
  const render = loadComponent('Input');
  const input = () => findAll(render({ label: 'Link' }), 'TextInput')[0];
  const initialBorder = flattenStyle(input().props.style).borderColor;
  input().props.onFocus();
  assert.notEqual(flattenStyle(input().props.style).borderColor, initialBorder);
  input().props.onBlur();
  assert.equal(flattenStyle(input().props.style).borderColor, initialBorder);
  const errorInput = findAll(render({ error: 'Link inválido' }), 'TextInput')[0];
  const errorBorder = flattenStyle(errorInput.props.style).borderColor;
  input().props.onFocus();
  assert.equal(
    flattenStyle(findAll(render({ error: 'Link inválido' }), 'TextInput')[0].props.style).borderColor,
    errorBorder,
  );
  const tree = render({ error: 'Link inválido', editable: false });
  const disabled = findAll(tree, 'TextInput')[0];
  assert.equal(disabled.props.editable, false);
  assert.equal(disabled.props.accessibilityState.disabled, true);
  assert.equal(disabled.props.accessibilityHint, 'Link inválido');
  assert.equal(findAll(tree, 'Text').some(node => node.props.accessibilityRole === 'alert'), true);
});

test('Header renders its title and only the configured actions', () => {
  const render = loadComponent('Header');
  const plain = render({ title: 'Downloads' });
  assert.equal(findAll(plain, 'Pressable').length, 0);
  assert.equal(findAll(plain, 'Text')[0].props.children, 'Downloads');
  let backCount = 0;
  let rightCount = 0;
  const tree = render({
    title: 'Downloads',
    onBack: () => { backCount += 1; },
    rightActionLabel: 'Ajuda',
    onRightAction: () => { rightCount += 1; },
  });
  assert.equal(backCount + rightCount, 0);
  const actions = findAll(tree, 'Pressable');
  assert.equal(actions.length, 2);
  actions[0].props.onPress();
  assert.equal(backCount, 1);
  assert.equal(rightCount, 0);
  actions[1].props.onPress();
  assert.equal(rightCount, 1);
  assert.equal(findAll(render({ rightActionLabel: 'Ajuda' }), 'Pressable').length, 0);
});

test('Card supports passive content, presses, and a disabled native control', () => {
  const render = loadComponent('Card');
  const child = React.createElement('Text', null, 'Aula.pdf');
  const plain = render({ children: child });
  assert.equal(plain.type, 'View');
  assert.equal(plain.props.children, child);
  assert.equal(render().props.children, undefined);
  let presses = 0;
  const onPress = () => { presses += 1; };
  const interactive = render({ children: child, onPress, accessibilityLabel: 'Abrir aula' });
  assert.equal(interactive.type, 'Pressable');
  assert.equal(interactive.props.accessibilityLabel, 'Abrir aula');
  assert.equal(presses, 0);
  interactive.props.onPress();
  assert.equal(presses, 1);
  const disabled = render({ onPress, disabled: true });
  assert.equal(disabled.props.disabled, true);
  assert.equal(disabled.props.accessibilityState.disabled, true);
  assert.equal(
    flattenStyle(disabled.props.style({ pressed: true })).opacity,
    flattenStyle(disabled.props.style({ pressed: false })).opacity,
  );
});

test('LoadingIndicator exposes busy state, size, and optional message', () => {
  const render = loadComponent('LoadingIndicator');
  const normal = render();
  assert.equal(normal.props.accessibilityState.busy, true);
  assert.equal(normal.props.accessibilityRole, 'progressbar');
  assert.equal(normal.props.accessibilityLabel, 'Carregando...');
  const custom = render({ size: 'small', message: 'Preparando arquivo' });
  assert.equal(findAll(custom, 'ActivityIndicator')[0].props.size, 'small');
  assert.equal(findAll(custom, 'Text')[0].props.children, 'Preparando arquivo');
  const empty = render({ message: '' });
  assert.equal(findAll(empty, 'Text').length, 0);
  assert.equal(empty.props.accessibilityLabel, 'Carregando');
});

test('ProgressBar clamps values and maps invalid input to zero', () => {
  const render = loadComponent('ProgressBar');
  const cases = [
    [undefined, 0], [null, 0], [NaN, 0], [Infinity, 0], [-Infinity, 0],
    ['50', 0], [{}, 0], [[], 0], [true, 0], [-20, 0], [0, 0],
    [25, 25], [50, 50], [75, 75], [100, 100], [180, 100], [12.5, 12.5],
  ];
  for (const [progress, expected] of cases) {
    const tree = render({ progress });
    assert.equal(tree.props.accessibilityValue.now, expected);
    const fill = findAll(tree, 'View').find(node => flattenStyle(node.props.style).width);
    assert.equal(flattenStyle(fill.props.style).width, `${expected}%`);
    assert.equal(findAll(tree, 'Text')[0].props.children, `${Math.round(expected)}%`);
  }
});

test('ProgressBar keeps accessible value when the percentage is hidden', () => {
  const render = loadComponent('ProgressBar');
  const tree = render({ progress: 75, showPercentage: false, accessibilityLabel: 'Conversão' });
  assert.equal(findAll(tree, 'Text').length, 0);
  assert.equal(tree.props.accessibilityLabel, 'Conversão');
  assert.equal(tree.props.accessibilityValue.now, 75);
});

test('ErrorMessage hides empty content and only retries after a press', () => {
  const render = loadComponent('ErrorMessage');
  assert.equal(render(), null);
  assert.equal(render({ message: '' }), null);
  const plain = render({ message: 'Falha de conexão' });
  assert.equal(findAll(plain, 'Button').length, 0);
  assert.equal(findAll(plain, 'Text')[0].props.accessibilityRole, 'alert');
  let retries = 0;
  const tree = render({
    message: 'Falha de conexão',
    onRetry: () => { retries += 1; },
    retryLabel: 'Repetir',
  });
  const retry = findAll(tree, 'Button')[0];
  assert.equal(retry.props.title, 'Repetir');
  assert.equal(retries, 0);
  retry.props.onPress();
  assert.equal(retries, 1);
});

test('ConfirmationDialog never invokes actions while rendering or hidden', () => {
  const render = loadComponent('ConfirmationDialog');
  let confirmed = 0;
  let cancelled = 0;
  const props = {
    title: 'Confirmar teste?',
    description: 'Somente uma simulação.',
    onConfirm: () => { confirmed += 1; },
    onCancel: () => { cancelled += 1; },
    confirmLabel: 'Continuar',
    cancelLabel: 'Voltar',
  };
  assert.equal(render(props), null);
  const tree = render({ ...props, visible: true });
  assert.equal(tree.type, 'Modal');
  assert.equal(confirmed + cancelled, 0);
  assert.equal(findAll(tree, 'Button')[0].props.title, 'Continuar');
  findAll(tree, 'Pressable')[0].props.onPress();
  assert.equal(cancelled, 1);
  assert.equal(confirmed, 0);
  tree.props.onRequestClose();
  assert.equal(cancelled, 2);
  const dialog = findAll(tree, 'View').find(node => node.props.accessibilityViewIsModal);
  dialog.props.onAccessibilityEscape();
  assert.equal(cancelled, 3);
  findAll(tree, 'Button')[0].props.onPress();
  assert.equal(confirmed, 1);
  assert.equal(render({ ...props, visible: false }), null);
  assert.equal(confirmed, 1);
});

test('BottomNavigation renders the five Figma tabs with local icons', () => {
  const render = loadComponent('BottomNavigation');
  const tree = render();
  assert.deepEqual(
    findAll(tree, 'Text').map(node => node.props.children),
    ['Início', 'Downloads', 'PDF', 'Histórico', 'Perfil'],
  );
  assert.equal(findAll(tree, 'Pressable').length, 5);
  const icons = findAll(tree, 'Image');
  assert.equal(icons.length, 5);
  assert.equal(new Set(icons.map(icon => icon.props.source)).size, 5);
  for (const icon of icons) {
    const png = fs.readFileSync(icon.props.source);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 22);
    assert.equal(png.readUInt32BE(20), 22);
    assert.equal(flattenStyle(icon.props.style).width, 22);
    assert.equal(flattenStyle(icon.props.style).height, 22);
  }
});

test('BottomNavigation identifies and highlights each controlled selection', () => {
  const render = loadComponent('BottomNavigation');
  const identifiers = ['home', 'downloads', 'pdf', 'history', 'profile'];
  for (const [selectedIndex, activeTab] of identifiers.entries()) {
    const tabs = findAll(render({ activeTab }), 'Pressable');
    assert.equal(tabs.filter(tab => tab.props.accessibilityState.selected).length, 1);
    for (const [index, tab] of tabs.entries()) {
      const label = flattenStyle(findAll(tab, 'Text')[0].props.style);
      const icon = findAll(tab, 'Image')[0];
      assert.equal(tab.props.accessibilityState.selected, index === selectedIndex);
      assert.equal(label.fontWeight, index === selectedIndex ? '600' : '400');
      assert.equal(label.color, index === selectedIndex ? '#B9FC01' : '#0131CD');
      assert.equal(icon.props.tintColor, label.color);
    }
  }
});

test('BottomNavigation reports stable identifiers without changing selection itself', () => {
  const render = loadComponent('BottomNavigation');
  const identifiers = ['home', 'downloads', 'pdf', 'history', 'profile'];
  const pressed = [];
  const props = { activeTab: 'home', onTabPress: id => pressed.push(id) };
  const tabs = findAll(render(props), 'Pressable');
  assert.equal(pressed.length, 0);
  for (const tab of tabs) tab.props.onPress();
  assert.deepEqual(pressed, identifiers);
  tabs[0].props.onPress();
  assert.equal(pressed.at(-1), 'home');
  assert.equal(findAll(render(props), 'Pressable')[0].props.accessibilityState.selected, true);
});

test('BottomNavigation exposes tab semantics and keeps decorative icons unfocused', () => {
  const render = loadComponent('BottomNavigation');
  const tree = render({ activeTab: 'pdf' });
  assert.equal(findAll(tree, 'View')[0].props.accessibilityRole, 'tablist');
  for (const tab of findAll(tree, 'Pressable')) {
    assert.equal(tab.props.accessibilityRole, 'tab');
    assert.equal(tab.props.accessibilityLabel, findAll(tab, 'Text')[0].props.children);
    assert.equal(findAll(tab, 'Image')[0].props.accessible, false);
  }
  assert.equal(tree.type, 'SafeAreaView');
  assert.equal(Array.from(tree.props.edges).join(','), 'bottom,left,right');
});

test('BottomNavigation provides press feedback and equally flexible touch areas', () => {
  const render = loadComponent('BottomNavigation');
  for (const tab of findAll(render(), 'Pressable')) {
    const resting = flattenStyle(tab.props.style({ pressed: false }));
    const pressing = flattenStyle(tab.props.style({ pressed: true }));
    assert.notEqual(resting.opacity, pressing.opacity);
    assert.equal(resting.flex, 1);
    assert.equal(resting.width, undefined);
    assert.ok(resting.minHeight >= 48);
  }
});

test('BottomNavigation defaults to home and safely handles missing callbacks or unknown tabs', () => {
  const render = loadComponent('BottomNavigation');
  assert.equal(findAll(render(), 'Pressable')[0].props.accessibilityState.selected, true);
  const tabs = findAll(render({ activeTab: 'unknown' }), 'Pressable');
  assert.equal(tabs.some(tab => tab.props.accessibilityState.selected), false);
  assert.doesNotThrow(() => tabs[0].props.onPress());
});

test('Navigation icon pixels have transparent backgrounds at 1x, 2x, and 3x', () => {
  for (const name of ['home', 'downloads', 'pdf', 'history', 'profile']) {
    for (const scale of [1, 2, 3]) {
      const suffix = scale === 1 ? '' : `@${scale}x`;
      const filename = path.join(__dirname, '../assets/navigation', `${name}${suffix}.png`);
      assertTransparentIcon(fs.readFileSync(filename), 22 * scale);
    }
  }
});

test('Icon validation rejects fully opaque PNGs even when they have an alpha channel', () => {
  const opaque = new PNG({ width: 22, height: 22 });
  opaque.data.fill(255);
  const flattened = PNG.sync.write(opaque, { colorType: 6 });
  assert.throws(() => assertTransparentIcon(flattened, 22), /background must be transparent/);
});

test('ConfirmationDialog requires a valid cancellation callback before opening', () => {
  const render = loadComponent('ConfirmationDialog');
  for (const onCancel of [undefined, null, false, 'cancel', {}]) {
    assert.throws(
      () => render({ visible: true, onCancel, onConfirm: () => {} }),
      /requires an onCancel function/,
    );
  }
});

test('ConfirmationDialog requires a valid confirmation callback before opening', () => {
  const render = loadComponent('ConfirmationDialog');
  for (const onConfirm of [undefined, null, false, 'confirm', {}]) {
    assert.throws(
      () => render({ visible: true, onCancel: () => {}, onConfirm }),
      /requires an onConfirm function/,
    );
  }
  assert.equal(render(), null);
  assert.equal(render({ visible: false, onCancel: null, onConfirm: null }), null);
});

test('ConfirmationDialog routes Android back, escape, and cancel to the same callback without events', () => {
  const render = loadComponent('ConfirmationDialog');
  let cancelled = 0;
  let confirmed = 0;
  const tree = render({
    visible: true,
    onCancel: (...args) => {
      assert.equal(args.length, 0);
      cancelled += 1;
    },
    onConfirm: (...args) => {
      assert.equal(args.length, 0);
      confirmed += 1;
    },
  });
  assert.equal(typeof tree.props.onRequestClose, 'function');
  assert.equal(cancelled + confirmed, 0);
  const dialog = findAll(tree, 'View').find(node => node.props.accessibilityViewIsModal);
  const cancelButton = findAll(tree, 'Pressable')[0];
  assert.equal(tree.props.onRequestClose, dialog.props.onAccessibilityEscape);
  assert.equal(tree.props.onRequestClose, cancelButton.props.onPress);
  tree.props.onRequestClose({ nativeEvent: {} });
  assert.equal(cancelled, 1);
  dialog.props.onAccessibilityEscape({ nativeEvent: {} });
  assert.equal(cancelled, 2);
  cancelButton.props.onPress({ nativeEvent: {} });
  assert.equal(cancelled, 3);
  assert.equal(confirmed, 0);
  findAll(tree, 'Button')[0].props.onPress({ nativeEvent: {} });
  assert.equal(confirmed, 1);
  assert.equal(tree.props.visible, true);
});

test('Component colors are centralized and restricted to the approved palette', () => {
  const colors = paletteModule.exports.default;
  assert.equal(colors.blue, '#0131CD');
  assert.equal(colors.white, '#FFFFFF');
  assert.equal(colors.lime, '#B9FC01');
  for (const value of Object.values(colors)) {
    assert.ok(
      ['#0131CD', '#FFFFFF', '#B9FC01', 'transparent'].includes(value) || /^rgba\((?:1, 49, 205|185, 252, 1), 0\.\d+\)$/.test(value),
      `Unexpected color: ${value}`,
    );
  }
  for (const name of fs.readdirSync(path.join(__dirname, '../src/components'))) {
    if (!name.endsWith('.js') || name === 'colors.js') continue;
    const source = fs.readFileSync(path.join(__dirname, '../src/components', name), 'utf8');
    assert.equal(/#[\da-f]{3,8}\b|rgba?\(/i.test(source), false, `Color outside colors.js: ${name}`);
  }
});

test('The new palette reaches all component surfaces and feedback states', () => {
  const button = loadComponent('Button')({ title: 'Continuar' });
  assert.equal(flattenStyle(button.props.style({ pressed: false })).backgroundColor, '#0131CD');
  assert.equal(flattenStyle(findAll(button, 'Text')[0].props.style).color, '#FFFFFF');

  const input = loadComponent('Input')({ error: 'Link inválido', editable: false });
  const field = findAll(input, 'TextInput')[0];
  assert.equal(flattenStyle(field.props.style).borderColor, '#0131CD');
  assert.equal(flattenStyle(field.props.style).borderWidth, 2);
  assert.equal(findAll(input, 'Text').some(node => String(node.props.children).includes('Erro:')), true);

  const header = loadComponent('Header')({ title: 'Cabeçalho' });
  assert.equal(flattenStyle(header.props.style).backgroundColor, '#FFFFFF');
  assert.equal(flattenStyle(findAll(header, 'Text')[0].props.style).color, '#0131CD');

  const card = loadComponent('Card')();
  assert.equal(flattenStyle(card.props.style).backgroundColor, '#FFFFFF');

  const loading = loadComponent('LoadingIndicator')();
  assert.equal(findAll(loading, 'ActivityIndicator')[0].props.color, '#0131CD');

  const progress = loadComponent('ProgressBar')({ progress: 100 });
  const fill = findAll(progress, 'View').find(node => flattenStyle(node.props.style).width);
  assert.equal(flattenStyle(fill.props.style).backgroundColor, '#B9FC01');
  assert.equal(progress.props.accessibilityValue.now, 100);

  const error = loadComponent('ErrorMessage')({ message: 'Falha no download' });
  assert.equal(flattenStyle(findAll(error, 'Text')[0].props.style).color, '#0131CD');
  assert.equal(findAll(error, 'Text')[0].props.accessibilityRole, 'alert');

  const dialog = loadComponent('ConfirmationDialog')({
    visible: true,
    onConfirm: () => {},
    onCancel: () => {},
  });
  const surface = findAll(dialog, 'View').find(node => node.props.accessibilityViewIsModal);
  assert.equal(flattenStyle(surface.props.style).backgroundColor, '#FFFFFF');

  const tabs = findAll(loadComponent('BottomNavigation')({ activeTab: 'downloads' }), 'Pressable');
  assert.equal(flattenStyle(tabs[1].props.style({ pressed: false })).backgroundColor, '#0131CD');
  assert.equal(findAll(tabs[1], 'Image')[0].props.tintColor, '#B9FC01');
  assert.equal(findAll(tabs[0], 'Image')[0].props.tintColor, '#0131CD');
});

test('Primary text and selected navigation keep sufficient color contrast', () => {
  function luminance(hex) {
    const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  function contrast(first, second) {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }
  const button = loadComponent('Button')({ title: 'Continuar' });
  const background = flattenStyle(button.props.style({ pressed: false })).backgroundColor;
  const text = flattenStyle(findAll(button, 'Text')[0].props.style).color;
  assert.ok(contrast(background, text) >= 4.5);

  const selected = findAll(loadComponent('BottomNavigation')(), 'Pressable')[0];
  const selectedBackground = flattenStyle(selected.props.style({ pressed: false })).backgroundColor;
  const selectedText = flattenStyle(findAll(selected, 'Text')[0].props.style).color;
  assert.ok(contrast(selectedBackground, selectedText) >= 4.5);
  assert.ok(contrast(selectedBackground, findAll(selected, 'Image')[0].props.tintColor) >= 3);
});

test('Legacy color imports share the canonical tokens and styles contain no independent palette', () => {
  const load = createModuleLoader();
  const canonical = load(path.join(__dirname, '../src/styles/colors.js')).default;
  const legacy = load(path.join(__dirname, '../src/components/colors.js')).default;
  const barrel = load(path.join(__dirname, '../src/styles/index.js'));
  assert.equal(legacy, canonical);
  assert.equal(barrel.colors, canonical);
  assert.equal(canonical.primary, '#0131CD');
  assert.equal(canonical.success, '#B9FC01');
  for (const name of fs.readdirSync(path.join(__dirname, '../src/styles'))) {
    if (name === 'colors.js') continue;
    const source = fs.readFileSync(path.join(__dirname, '../src/styles', name), 'utf8');
    assert.equal(/#[\da-f]{3,8}\b|rgba?\(/i.test(source), false, 'Color outside canonical tokens: ' + name);
  }
  assert.ok(barrel.buttonStyles && barrel.inputStyles && barrel.headerStyles && barrel.cardStyles);
  assert.ok(barrel.responsive && barrel.typography && barrel.globalStyles && barrel.feedbackStyles);
});

test('Typography keeps Inter body text, Montserrat headings, and native system font scaling', () => {
  const { default: typography, fontFamilies } = loadStyleModule('typography');
  assert.equal(typography.body.fontFamily, 'Inter_400Regular');
  assert.equal(typography.headerTitle.fontFamily, 'Montserrat_600SemiBold');
  assert.equal(typography.sectionTitle.fontFamily, 'Montserrat_600SemiBold');
  assert.equal(fontFamilies.brandRegular, 'Montserrat_400Regular');
  assert.equal(fontFamilies.brandBold, 'Montserrat_700Bold');
  const ordinary = loadStyleModule('responsive', { fontScale: 1 });
  const enlarged = loadStyleModule('responsive', { fontScale: 2 });
  assert.equal(enlarged.getFontScale(), 2);
  assert.equal(enlarged.scaleFont(16), ordinary.scaleFont(16), 'Native Text handles system scaling once');
  for (const name of fs.readdirSync(path.join(__dirname, '../src/components'))) {
    const source = fs.readFileSync(path.join(__dirname, '../src/components', name), 'utf8');
    assert.equal(/allowFontScaling=\{false\}/.test(source), false);
  }
});

test('Responsive helpers and content containers adapt to compact phones and tablets', () => {
  for (const [width, height, padding, tablet] of [[320, 568, 16, false], [390, 844, 20, false], [440, 956, 24, false], [800, 1280, 24, true]]) {
    const helpers = loadStyleModule('responsive', { width, height });
    const metrics = helpers.getScreenMetrics();
    const layout = loadStyleModule('globalStyles', { width, height });
    assert.equal(metrics.horizontalPadding, padding);
    assert.equal(metrics.isTablet, tablet);
    assert.equal(metrics.isCompact, width === 320);
    assert.equal(layout.getResponsiveContentStyle(width).paddingHorizontal, padding);
    assert.ok(helpers.scaleSize(56) >= 48 && helpers.scaleSize(56) <= 64);
  }
  const layout = loadStyleModule('globalStyles');
  assert.equal(layout.getResponsiveContentStyle(440, 'flow').paddingHorizontal, 43);
  assert.equal(layout.getResponsiveContentStyle(440, 'main').paddingHorizontal, 50);
  assert.equal(layout.getResponsiveContentStyle(800).maxWidth, 560);
});

test('Button variants retain callbacks, icons, overrides, disabled feedback, and usable touch sizes', () => {
  const render = loadComponent('Button');
  const colors = paletteModule.exports.default;
  const sizes = loadStyleModule('spacing').sizes;
  let presses = 0;
  for (const variant of ['primary', 'secondary', 'outline', 'link', 'unknown']) {
    const tree = render({ title: 'Testar', variant, onPress: () => { presses += 1; } });
    const style = flattenStyle(tree.props.style({ pressed: false }));
    assert.ok(style.minHeight >= sizes.minTouchTarget);
    assert.equal(findAll(tree, 'Text')[0].props.children, 'Testar');
    tree.props.onPress();
    const disabled = render({ title: 'Testar', variant, disabled: true });
    assert.equal(disabled.props.disabled, true);
    assert.deepEqual(disabled.props.style({ pressed: true }), disabled.props.style({ pressed: false }));
  }
  assert.equal(presses, 5);
  const icon = React.createElement('Image', { source: 'test-icon' });
  const compact = render({ title: 'Compacto', size: 'sm', fullWidth: false, leftIcon: icon, style: { marginTop: 7 }, textStyle: { letterSpacing: 1 } });
  assert.equal(findAll(compact, 'Image').length, 1);
  assert.equal(flattenStyle(compact.props.style({ pressed: false })).marginTop, 7);
  assert.equal(flattenStyle(compact.props.style({ pressed: false })).minHeight, 48);
  assert.equal(flattenStyle(findAll(compact, 'Text')[0].props.style).letterSpacing, 1);
  const styles = loadStyleModule('buttons').default;
  assert.ok(styles.chip.minHeight >= 48);
  assert.equal(styles.chipActive.backgroundColor, colors.blue);
  assert.equal(styles.chipTextActive.color, colors.lime);
});

test('Input addons support focus, error and disabled states without losing controlled input behavior', () => {
  const render = loadComponent('Input');
  let actions = 0;
  let value = '';
  const props = { variant: 'accent', value, onChangeText: text => { value = text; }, rightActionLabel: 'Exemplo', onRightAction: () => { actions += 1; } };
  const initial = render(props);
  const field = findAll(initial, 'TextInput')[0];
  field.props.onChangeText('https://exemplo.com/aula');
  assert.equal(value, 'https://exemplo.com/aula');
  field.props.onFocus();
  const focused = render(props);
  assert.ok(findAll(focused, 'View').some(node => flattenStyle(node.props.style).borderColor === '#0131CD'));
  const action = findAll(focused, 'Pressable')[0];
  assert.equal(action.props.disabled, false);
  action.props.onPress();
  assert.equal(actions, 1);
  const disabled = render({ ...props, editable: false, error: 'Link inválido' });
  assert.equal(findAll(disabled, 'TextInput')[0].props.editable, false);
  assert.equal(findAll(disabled, 'Pressable')[0].props.accessibilityState.disabled, true);
  assert.ok(findAll(disabled, 'View').some(node => flattenStyle(node.props.style).borderWidth === 2));
  assert.ok(findAll(disabled, 'Text').some(node => node.props.accessibilityRole === 'alert'));
  const missingCallback = render({ rightActionLabel: 'Exemplo' });
  assert.equal(findAll(missingCallback, 'Pressable')[0].props.disabled, true);
  const search = render({ variant: 'search', placeholder: 'Buscar' });
  assert.ok(flattenStyle(findAll(search, 'TextInput')[0].props.style).minHeight >= 48);
});

test('Hero header and compact accent preserve actions, labels, and update on window resize', () => {
  const options = { width: 320, height: 568 };
  const render = loadComponent('Header', options);
  let back = 0;
  const props = { variant: 'hero', title: 'Olá!', subtitle: 'Componentes', onBack: () => { back += 1; } };
  const compact = render(props);
  assert.equal(flattenStyle(compact.props.style).paddingHorizontal, 16);
  findAll(compact, 'Pressable')[0].props.onPress();
  assert.equal(back, 1);
  options.width = 800;
  options.height = 1280;
  const wide = render(props);
  assert.equal(flattenStyle(wide.props.style).paddingHorizontal, 50);
  assert.ok(flattenStyle(wide.props.style).minHeight > flattenStyle(compact.props.style).minHeight);
  assert.ok(findAll(wide, 'Text').some(node => node.props.children === 'Componentes'));
  const accented = render({ title: 'Cabeçalho', showAccentBar: true });
  assert.ok(findAll(accented, 'View').some(node => flattenStyle(node.props.style).backgroundColor === '#B9FC01'));
});

test('Card variants keep passive content, selectable semantics, feedback, and live responsive sizes', () => {
  const options = { width: 320, height: 568 };
  const render = loadComponent('Card', options);
  const compact = render({ variant: 'soft' });
  options.width = 800;
  const wide = render({ variant: 'soft' });
  assert.ok(flattenStyle(wide.props.style).minHeight > flattenStyle(compact.props.style).minHeight);
  for (const variant of ['default', 'soft', 'selectable', 'formatOption', 'summary', 'dashed', 'listAlt', 'historyItem', 'profileHighlight', 'infoBanner', 'mediaPreview']) {
    const passive = render({ variant, children: 'Conteúdo' });
    assert.equal(passive.type, 'View');
    assert.equal(passive.props.children, 'Conteúdo');
  }
  const selected = render({ variant: 'selectable', selected: true, onPress: () => {}, accessibilityLabel: 'Qualidade' });
  assert.equal(selected.props.accessibilityState.selected, true);
  assert.equal(selected.props.accessibilityLabel, 'Qualidade');
  assert.equal(flattenStyle(selected.props.style({ pressed: false })).borderWidth, 2);
  const dashed = render({ variant: 'dashed' });
  assert.equal(flattenStyle(dashed.props.style).borderStyle, 'dashed');
  const dialog = loadComponent('ConfirmationDialog', { width: 800, height: 1280 })({ visible: true, onConfirm: () => {}, onCancel: () => {} });
  const surface = findAll(dialog, 'View').find(node => node.props.accessibilityViewIsModal);
  assert.equal(flattenStyle(surface.props.style).maxWidth, 480);
});

function contrastRatio(foreground, background, opacity = 1) {
  function rgb(value) {
    if (value.startsWith('#')) return [1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16)).concat(1);
    if (value === 'transparent') return [0, 0, 0, 0];
    return value.match(/[\d.]+/g).map(Number);
  }
  function blend(front, back) {
    return front.slice(0, 3).map((channel, index) => channel * front[3] + back[index] * (1 - front[3]));
  }
  function luminance(channels) {
    const linear = channels.map(channel => channel / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  }
  const surface = blend(rgb(background), [255, 255, 255]);
  const text = blend(rgb(foreground), surface);
  const backgroundLuminance = luminance(blend([...surface, opacity], [255, 255, 255]));
  const textLuminance = luminance(blend([...text, opacity], [255, 255, 255]));
  return (Math.max(backgroundLuminance, textLuminance) + 0.05) / (Math.min(backgroundLuminance, textLuminance) + 0.05);
}

test('Enabled variants, pressed states, placeholders and lime highlights retain readable contrast', () => {
  const render = loadComponent('Button');
  for (const variant of ['primary', 'secondary', 'outline', 'link']) {
    const tree = render({ title: 'Texto', variant });
    const text = flattenStyle(findAll(tree, 'Text')[0].props.style).color;
    for (const pressed of [false, true]) {
      const style = flattenStyle(tree.props.style({ pressed }));
      assert.ok(contrastRatio(text, style.backgroundColor, style.opacity ?? 1) >= 4.5, variant + ' contrast');
    }
  }
  const colors = paletteModule.exports.default;
  const headers = loadStyleModule('headers');
  const buttons = loadStyleModule('buttons').default;
  assert.ok(contrastRatio(colors.lime, colors.blue, headers.bottomNavigationStyles.tabPressed.opacity) >= 4.5);
  assert.ok(contrastRatio(colors.lime, colors.blue, buttons.pressed.opacity) >= 4.5);
  assert.ok(contrastRatio(colors.textPlaceholder, colors.surfaceSoft) >= 4.5);
  assert.ok(contrastRatio(colors.blue, colors.surfaceSuccess) >= 4.5);
  assert.ok(contrastRatio(colors.blue, colors.errorSoft) >= 4.5);
  assert.ok(contrastRatio(colors.border, colors.white) >= 3);
  assert.ok(contrastRatio(colors.borderAccent, colors.surfaceSoft) >= 3);
});

function loadApp(fontState = [true, null]) {
  const states = [];
  const alerts = [];
  let index = 0;
  const react = {
    ...React,
    useEffect() {},
    useState(initial) {
      const current = index++;
      if (!(current in states)) states[current] = initial;
      return [states[current], next => { states[current] = typeof next === 'function' ? next(states[current]) : next; }];
    },
  };
  const App = createModuleLoader({}, react, fontState, alerts)(path.join(__dirname, '../src/dev/ComponentsPreview.js')).default;
  return { alerts, render() { index = 0; return App(); } };
}

test('Relocated component demonstration keeps nine components, scroll, all original interactions and the official palette', () => {
  const app = loadApp();
  const components = tree => findAll(tree, 'View').find(node => node.props.testID === 'componentes-demo-integrada');
  const instances = (tree, name) => {
    if (Array.isArray(tree)) return tree.flatMap(node => instances(node, name));
    if (!tree || typeof tree !== 'object') return [];
    return [...(typeof tree.type === 'function' && tree.type.name === name ? [tree] : []), ...instances(tree.props.children, name)];
  };
  const button = (title, tree = app.render()) => instances(tree, 'Button').find(node => node.props.title === title);
  const first = app.render();
  assert.ok(components(first));
  assert.equal(findAll(first, 'ScrollView').length, 1);
  for (const name of ['Button', 'Input', 'Header', 'BottomNavigation', 'Card', 'LoadingIndicator', 'ProgressBar', 'ErrorMessage', 'ConfirmationDialog']) {
    assert.ok(instances(first, name).length, 'Missing demo component: ' + name);
  }
  assert.equal(button('Botão desativado', first).props.disabled, true);
  button('Botão azul: testar ação', first).props.onPress();
  assert.equal(app.alerts.length, 1);
  instances(first, 'Input')[0].props.onChangeText('https://exemplo.com');
  assert.equal(instances(app.render(), 'Input')[0].props.value, 'https://exemplo.com');
  button('Desativar edição').props.onPress();
  assert.equal(instances(app.render(), 'Input')[0].props.editable, false);
  instances(app.render(), 'BottomNavigation')[0].props.onTabPress('pdf');
  assert.equal(instances(app.render(), 'BottomNavigation')[0].props.activeTab, 'pdf');
  const progressButton = findAll(app.render(), 'Pressable').find(node => node.props.accessibilityLabel === 'Definir progresso em 75%');
  progressButton.props.onPress();
  assert.equal(instances(app.render(), 'ProgressBar')[0].props.progress, 75);
  instances(app.render(), 'ErrorMessage')[0].props.onRetry();
  assert.equal(instances(app.render(), 'ErrorMessage')[0].props.message, '');
  button('Abrir confirmação').props.onPress();
  assert.equal(instances(app.render(), 'ConfirmationDialog')[0].props.visible, true);
  instances(app.render(), 'ConfirmationDialog')[0].props.onCancel();
  assert.equal(instances(app.render(), 'ConfirmationDialog')[0].props.visible, false);
  button('Abrir confirmação').props.onPress();
  instances(app.render(), 'ConfirmationDialog')[0].props.onConfirm();
  assert.equal(instances(app.render(), 'ConfirmationDialog')[0].props.visible, false);
  const source = fs.readFileSync(path.join(__dirname, '../src/dev/ComponentsPreview.js'), 'utf8');
  assert.equal(source.includes('Aplicativo iniciado com sucesso!'), false);
  assert.equal(source.includes('Demonstração integrada: nove componentes, nova paleta.'), true);
});

test('Font loading waits explicitly and an error keeps the demonstration available', () => {
  const pending = loadApp([false, null]).render();
  assert.equal(findAll(pending, 'ScrollView').length, 0);
  const failed = loadApp([false, new Error('Falha de fonte')]).render();
  assert.equal(findAll(failed, 'ScrollView').length, 1);
  const text = findAll(failed, 'Text').map(node => node.props.children).join(' ');
  assert.ok(text.includes('Demonstração disponível com fonte alternativa'));
});
