const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const React = require('react');
const babel = require('@babel/core');

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
    'View', 'Text', 'TextInput', 'Pressable', 'ActivityIndicator', 'Modal', 'ScrollView',
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
      if (name === './Button') return { __esModule: true, default: 'Button' };
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
