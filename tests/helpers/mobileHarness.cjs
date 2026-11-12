const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const React = require('react');
const babel = require('@babel/core');

const compiled = new Map();
const root = path.resolve(__dirname, '../..');

// Contract tests use native controls as inert elements. This is not a device renderer.
function harness(filename, { mockScreens = false, fontState = [true, null], width = 440, height = 956, mediaLibraryProps = { downloadProps: {}, historyProps: {} }, imagePicker } = {}) {
  const states = [];
  const modules = new Map();
  const alerts = [];
  const backListeners = new Set();
  let index = 0;
  let focus;
  let cleanup;
  let loadedFonts;
  const dimensions = { width, height, fontScale: 1 };
  const react = {
    ...React,
    useState(initial) {
      const slot = index++;
      if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
      return [states[slot], next => { states[slot] = typeof next === 'function' ? next(states[slot]) : next; }];
    },
    useCallback: callback => callback,
    useRef(initial) {
      const slot = index++;
      if (!(slot in states)) states[slot] = { current: initial };
      return states[slot];
    },
    useEffect() {},
  };
  const native = Object.fromEntries([
    'View', 'Text', 'Image', 'Pressable', 'ScrollView', 'FlatList', 'SectionList',
    'TextInput', 'KeyboardAvoidingView', 'ActivityIndicator', 'Modal',
  ].map(name => [name, name]));
  native.StyleSheet = { create: value => value };
  native.Dimensions = { get: () => dimensions };
  native.useWindowDimensions = () => dimensions;
  native.PixelRatio = { getFontScale: () => dimensions.fontScale, roundToNearestPixel: Math.round };
  native.Platform = { OS: 'android' };
  native.Alert = { alert: (...args) => alerts.push(args) };
  native.BackHandler = {
    addEventListener(event, callback) {
      assert.equal(event, 'hardwareBackPress');
      backListeners.add(callback);
      return { remove: () => backListeners.delete(callback) };
    },
  };

  function load(file) {
    const resolved = path.resolve(file);
    if (modules.has(resolved)) return modules.get(resolved).exports;
    const module = { exports: {} };
    modules.set(resolved, module);
    if (!compiled.has(resolved)) {
      compiled.set(resolved, babel.transformFileSync(resolved, {
        babelrc: false, configFile: false,
        plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
      }).code);
    }
    vm.runInNewContext(compiled.get(resolved), {
      module, exports: module.exports, console,
      require(request) {
        if (request === 'react') return react;
        if (request === 'react-native') return native;
        if (request === 'react-native-safe-area-context') return { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' };
        if (request === '@react-navigation/native') return {
          NavigationContainer: 'NavigationContainer', useFocusEffect: callback => { focus = callback; },
        };
        if (request === '@react-navigation/native-stack') return {
          createNativeStackNavigator: () => ({ Navigator: 'Stack.Navigator', Screen: 'Stack.Screen' }),
        };
        if (request === 'expo-status-bar') return { StatusBar: 'StatusBar' };
        if (request === 'expo-image-picker' && imagePicker) return imagePicker;
        if (request.endsWith('/useMediaLibrary')) return { __esModule: true, default: () => mediaLibraryProps };
        if (request === 'expo-font') return { useFonts: fonts => { loadedFonts = fonts; return fontState; } };
        if (request.startsWith('@expo-google-fonts/')) return Object.fromEntries([
          'Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold', 'Inter_700Bold',
          'Montserrat_400Regular', 'Montserrat_600SemiBold', 'Montserrat_700Bold',
        ].map(name => [name, name]));
        if (request.includes('/components/')) return { __esModule: true, default: request.split('/').at(-1) };
        if (mockScreens && (request.includes('/screens/') || request.includes('/dev/'))) {
          return { __esModule: true, default: request.split('/').at(-1) };
        }
        if (!request.startsWith('.')) throw new Error('Unexpected import: ' + request);
        let target = path.resolve(path.dirname(resolved), request);
        if (target.endsWith('.png')) { assert.ok(fs.existsSync(target), target); return target; }
        if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.js');
        else if (!target.endsWith('.js')) target += '.js';
        return load(target);
      },
    }, { filename: resolved });
    return module.exports;
  }

  const exports = load(path.join(root, filename));
  return {
    exports, alerts, dimensions,
    render(props = {}, name = 'default') {
      index = 0;
      focus = undefined;
      const tree = exports[name](props);
      cleanup?.();
      cleanup = focus?.();
      return tree;
    },
    back() {
      for (const listener of [...backListeners].reverse()) if (listener()) return true;
      return false;
    },
    blur() { cleanup?.(); cleanup = undefined; },
    get listeners() { return backListeners.size; },
    get fonts() { return loadedFonts; },
  };
}

function findAll(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => findAll(child, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type || node.type?.name === type ? [node] : []), ...findAll(node.props?.children, type)];
}

function textContent(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(' ');
  return node && typeof node === 'object' ? textContent(node.props?.children) : '';
}

function flattenStyle(style) {
  return Array.isArray(style) ? Object.assign({}, ...style.map(flattenStyle)) : style || {};
}

module.exports = { harness, findAll, textContent, flattenStyle, root };
