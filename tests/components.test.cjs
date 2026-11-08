const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const React = require('react');
const babel = require('@babel/core');
const { PNG } = require('pngjs');

// Checks component contracts with native elements mocked; Expo Go validates rendering.
function loadComponent(name) {
  let state;
  const react = {
    ...React,
    useState(initialValue) {
      if (state === undefined) state = initialValue;
      return [state, nextValue => { state = nextValue; }];
    },
  };
  const native = Object.fromEntries([
    'View', 'Text', 'TextInput', 'Pressable', 'ActivityIndicator', 'Modal', 'ScrollView', 'Image',
  ].map(name => [name, name]));
  native.StyleSheet = { create: styles => styles };
  const filename = path.join(__dirname, '../src/components', `${name}.js`);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react-native') return native;
      if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
      if (name === './Button') return { __esModule: true, default: 'Button' };
      if (name.startsWith('../../assets/navigation/') && name.endsWith('.png')) {
        const assetPath = path.resolve(path.dirname(filename), name);
        assert.equal(fs.existsSync(assetPath), true, `Missing asset: ${name}`);
        return assetPath;
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  }, { filename });
  return props => module.exports.default(props || {});
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
      assert.equal(label.color, index === selectedIndex ? '#24AF42' : '#64748B');
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
