const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { PNG } = require('pngjs');
const babel = require('@babel/core');
const { harness, findAll, textContent, flattenStyle, root } = require('./helpers/mobileHarness.cjs');

const navigationFile = 'src/navigation/AppNavigator.js';
const findPanel = (tree, id) => findAll(tree, 'View').find(node => node.props.testID === `tab-panel-${id}`);

test('Integrated entry waits for fonts, loads Inter and Montserrat, and exposes a fallback on failure', () => {
  const pending = harness('App.js', { mockScreens: true, fontState: [false, null] });
  assert.equal(findAll(pending.render(), 'LoadingIndicator').length, 1);
  assert.equal(findAll(pending.render(), 'AppNavigator').length, 0);
  const app = harness('App.js', { mockScreens: true });
  const downloads = { items: [{ id: 'real', name: 'Recebido do aplicativo' }], onRetry() {} };
  const history = { items: [] };
  const tree = app.render({ downloadProps: downloads, historyProps: history });
  const navigator = findAll(tree, 'AppNavigator')[0];
  assert.equal(navigator.props.downloadProps, downloads);
  assert.equal(navigator.props.historyProps, history);
  assert.equal(Object.keys(app.fonts).length, 7);
  assert.ok(Object.keys(app.fonts).some(name => name.startsWith('Montserrat_')));
  const failed = harness('App.js', { mockScreens: true, fontState: [false, new Error('offline')] }).render();
  assert.equal(findAll(failed, 'AppNavigator').length, 1);
  assert.ok(textContent(failed).includes('fonte alternativa'));
});

// Adapted from Paulo's route-registration test: retain both routes and extend
// the entry to the four-screen integration and the preserved demonstrations.
test('Native stack registers the main entry, converter and both previews without duplicating a bottom menu', () => {
  const app = harness(navigationFile, { mockScreens: true });
  const tree = app.render({ downloadProps: { isLoading: true } });
  assert.equal(findAll(tree, 'NavigationContainer').length, 1);
  assert.equal(findAll(tree, 'Stack.Navigator')[0].props.initialRouteName, 'Main');
  const screens = findAll(tree, 'Stack.Screen');
  assert.deepEqual(screens.map(node => node.props.name), ['Main', 'ConvertGalleryVideo', 'ComponentsPreview', 'FilesPreview']);
  const navigation = { goBack() {} };
  const main = screens[0].props.children({ navigation });
  assert.equal(main.props.navigation, navigation);
  assert.equal(main.props.downloadProps.isLoading, true);
  assert.equal(screens[1].props.component, 'ConvertGalleryVideoScreen');
  assert.equal(screens[2].props.component, 'ComponentsPreview');
  let backs = 0;
  const files = screens[3].props.component({ navigation: { goBack: () => { backs += 1; } } });
  files.props.onBack();
  assert.equal(backs, 1);
  assert.equal(findAll(tree, 'BottomNavigation').length, 0);
});

test('Official tab IDs select all five panels; visited file screens keep their keyed mounted positions', () => {
  const app = harness(navigationFile, { mockScreens: true });
  const render = () => app.render({}, 'MainTabs');
  let tree = render();
  assert.equal(findAll(tree, 'HomeScreen').length, 1);
  assert.equal(findAll(tree, 'DownloadsScreen').length, 0);
  assert.equal(findAll(tree, 'BottomNavigation').length, 1);
  const keys = new Map();
  for (const tab of ['downloads', 'history', 'pdf', 'profile', 'home', 'downloads']) {
    findAll(tree, 'BottomNavigation')[0].props.onTabPress(tab);
    tree = render();
    assert.equal(findAll(tree, 'BottomNavigation')[0].props.activeTab, tab);
    for (const id of ['home', 'downloads', 'pdf', 'history', 'profile']) {
      const panel = findPanel(tree, id);
      if (!panel) continue;
      if (keys.has(id)) assert.equal(panel.key, keys.get(id));
      keys.set(id, panel.key);
      assert.equal(flattenStyle(panel.props.style).display, id === tab ? 'flex' : 'none');
      assert.equal(panel.props.importantForAccessibility, id === tab ? 'auto' : 'no-hide-descendants');
    }
    assert.equal(findAll(tree, 'BottomNavigation').length, 1);
  }
  assert.equal(findAll(tree, 'DownloadsScreen').length, 1);
  assert.equal(findAll(tree, 'HistoryScreen').length, 1);
  findAll(tree, 'BottomNavigation')[0].props.onTabPress('conversion');
  assert.equal(findAll(render(), 'BottomNavigation')[0].props.activeTab, 'downloads');
});

test('Downloads and History receive original records and callbacks, safe-area edges, and no nested menus', () => {
  const app = harness(navigationFile, { mockScreens: true });
  const items = [{ id: 'service', name: 'Serviço real', status: 'completed' }];
  const onOpenItem = () => {};
  const onRetry = () => {};
  const props = { downloadProps: { items, onOpenItem, onRetry }, historyProps: { items, onOpenItem, onRetry } };
  const render = () => app.render(props, 'MainTabs');
  let tree = render();
  for (const [tab, screen] of [['downloads', 'DownloadsScreen'], ['history', 'HistoryScreen']]) {
    findAll(tree, 'BottomNavigation')[0].props.onTabPress(tab);
    tree = render();
    const child = findAll(tree, screen)[0];
    assert.equal(child.props.items, items);
    assert.equal(child.props.onOpenItem, onOpenItem);
    assert.equal(child.props.onRetry, onRetry);
    assert.equal(child.props.onTabPress, undefined);
    assert.equal(Array.from(child.props.safeAreaEdges).join(','), 'top,left,right');
    child.props.onBack();
    tree = render();
    assert.equal(findAll(tree, 'BottomNavigation')[0].props.activeTab, 'home');
  }
  const emptyApp = harness(navigationFile, { mockScreens: true });
  let empty = emptyApp.render({}, 'MainTabs');
  findAll(empty, 'BottomNavigation')[0].props.onTabPress('downloads');
  empty = emptyApp.render({}, 'MainTabs');
  assert.equal(findAll(empty, 'DownloadsScreen')[0].props.items, undefined, 'No permanent fixtures');
});

test('Focused Android back returns every secondary tab to Home, allows exit at Home, and removes its listener on blur', () => {
  const app = harness(navigationFile, { mockScreens: true });
  const render = () => app.render({}, 'MainTabs');
  let tree = render();
  assert.equal(app.back(), false);
  for (const tab of ['downloads', 'history', 'pdf', 'profile']) {
    findAll(tree, 'BottomNavigation')[0].props.onTabPress(tab);
    tree = render();
    assert.equal(app.listeners, 1);
    assert.equal(app.back(), true);
    tree = render();
    assert.equal(findAll(tree, 'BottomNavigation')[0].props.activeTab, 'home');
    assert.equal(app.back(), false);
  }
  app.blur();
  assert.equal(app.listeners, 0);
});

test('Paulo Home routes media, converter, PDF and demonstrations to their distinct destinations', () => {
  const app = harness('src/screens/HomeScreen.js');
  const routes = [];
  const tabs = [];
  const tree = app.render({ navigation: { navigate: route => routes.push(route) }, onTabPress: tab => tabs.push(tab) });
  const cards = findAll(tree, 'Card');
  assert.equal(cards.length, 3);
  cards.forEach(card => card.props.onPress());
  assert.deepEqual(tabs, ['downloads', 'pdf']);
  assert.deepEqual(routes, ['ConvertGalleryVideo']);
  findAll(tree, 'Button').forEach(button => button.props.onPress());
  assert.deepEqual(routes, ['ConvertGalleryVideo', 'ComponentsPreview', 'FilesPreview']);
  assert.equal(findAll(tree, 'BottomNavigation').length, 0);
});

test('Gallery screen labels pending services honestly, preserves gallery feedback and disables Continue', () => {
  const app = harness('src/screens/ConvertGalleryVideoScreen.js');
  let backs = 0;
  const tree = app.render({ navigation: { goBack: () => { backs += 1; } } });
  findAll(tree, 'Header')[0].props.onBack();
  assert.equal(backs, 1);
  assert.ok(findAll(tree, 'Header')[0].props.backIcon.endsWith('back-icon.png'));
  const buttons = findAll(tree, 'Button');
  assert.equal(buttons.find(button => button.props.title === 'Continuar').props.disabled, true);
  assert.equal(app.alerts.length, 0);
  buttons.find(button => button.props.title === 'Abrir galeria').props.onPress();
  assert.equal(app.alerts.length, 1);
  assert.ok(app.alerts[0][1].includes('ainda não implementadas'));
  assert.ok(textContent(tree).includes('serviço pendente'));
  assert.ok(textContent(tree).includes('Formatos previstos'));
  assert.equal(findAll(tree, 'BottomNavigation').length, 0);
  assert.equal(Array.from(tree.props.edges).includes('bottom'), true);
});

test('Header optional back icon retains the accessible callback and plain-text fallback', () => {
  const app = harness('src/components/Header.js');
  let backs = 0;
  const icon = app.render({ title: 'Conversão', onBack: () => { backs += 1; }, backIcon: 17 });
  const action = findAll(icon, 'Pressable')[0];
  assert.equal(action.props.accessibilityLabel, 'Voltar');
  assert.equal(findAll(action, 'Image')[0].props.source, 17);
  action.props.onPress();
  assert.equal(backs, 1);
  const plain = app.render({ title: 'Downloads', onBack() {} });
  assert.ok(textContent(plain).includes('Voltar'));
});

test('Preserved previews expose explicit return actions and keep fixture data restricted to the file preview', () => {
  const components = harness('src/dev/ComponentsPreview.js');
  let backs = 0;
  const tree = components.render({ navigation: { goBack: () => { backs += 1; } } });
  findAll(tree, 'Header')[0].props.onBack();
  assert.equal(backs, 1);
  const files = harness('src/dev/DownloadsHistoryPreview.js');
  const preview = files.render({ onBack: () => { backs += 1; } });
  findAll(preview, 'Header')[0].props.onBack();
  assert.equal(backs, 2);
  assert.ok(textContent(preview).includes('DADOS FICTÍCIOS'));
  assert.equal(findAll(preview, 'DownloadsScreen').length, 1);
  for (const file of ['App.js', navigationFile, 'src/screens/DownloadsScreen.js', 'src/screens/HistoryScreen.js']) {
    assert.equal(/downloadHistoryFixtures|downloadFixtures|historyFixtures/.test(fs.readFileSync(path.join(root, file), 'utf8')), false, file);
  }
});

test('Generic PendingScreen remains explicitly provisional without conversion or fictional controls', () => {
  const app = harness(navigationFile, { mockScreens: true });
  for (const title of ['PDF', 'Perfil']) {
    const tree = app.render({ title, onBack() {} }, 'PendingScreen');
    assert.ok(textContent(tree).includes('em desenvolvimento'));
    assert.ok(textContent(tree).includes('Tela provisória'));
    assert.equal(findAll(tree, 'Button').length, 0);
    assert.equal(findAll(tree, 'ConvertGalleryVideoScreen').length, 0);
  }
});

// Useful part of Paulo's responsiveness/style tests, adapted to the retained
// GOAL 05 palette and Inter/Montserrat contract instead of replacing them.
test('Home and conversion keep bounded responsive columns and resize from compact phones to tablets', () => {
  const home = harness('src/screens/HomeScreen.js', { width: 320 });
  const conversion = harness('src/screens/ConvertGalleryVideoScreen.js', { width: 320 });
  for (const [width, homeWidth, conversionWidth] of [[320, 340, 354], [440, 340, 354], [800, 560, 560]]) {
    home.dimensions.width = width;
    conversion.dimensions.width = width;
    const homeTree = home.render();
    assert.ok(findAll(homeTree, 'View').some(node => flattenStyle(node.props.style).maxWidth === homeWidth));
    const convertTree = conversion.render();
    assert.ok(findAll(convertTree, 'View').some(node => flattenStyle(node.props.style).maxWidth === conversionWidth));
    assert.equal(findAll(homeTree, 'ScrollView').length, 1);
    assert.equal(findAll(convertTree, 'ScrollView').length, 1);
    for (const tree of [homeTree, convertTree]) {
      for (const node of findAll(tree, 'Text')) {
        const style = flattenStyle(node.props.style);
        if (style.fontSize) assert.ok(style.fontSize >= 10 && style.fontSize <= 28);
        assert.notEqual(style.color, undefined, 'Screen text uses a shared palette token');
      }
    }
  }
});

test('All five Paulo assets decode as PNGs and screen styles use the central palette only', () => {
  for (const name of ['back-icon', 'check-icon', 'logo-converter', 'logo-home', 'upload-icon']) {
    const png = PNG.sync.read(fs.readFileSync(path.join(root, 'assets/screens', name + '.png')));
    assert.ok(png.width > 0 && png.height > 0);
    assert.ok(png.data.some((value, index) => index % 4 === 3 && value > 0));
  }
  for (const name of ['HomeScreen', 'ConvertGalleryVideoScreen']) {
    assert.equal(/#[\da-f]{3,8}\b|rgba?\(/i.test(fs.readFileSync(path.join(root, 'src/screens', name + '.js'), 'utf8')), false);
  }
});

test('Every application module parses and every static import and local asset resolves', () => {
  const files = [];
  function visit(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) visit(file);
      else if (file.endsWith('.js')) files.push(file);
    }
  }
  visit(path.join(root, 'src'));
  files.push(path.join(root, 'App.js'), path.join(root, 'index.js'));
  for (const file of files) {
    babel.transformFileSync(file, {
      configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-react-jsx', function () { return { visitor: {
        ImportDeclaration(node) { require.resolve(node.node.source.value, { paths: [path.dirname(file)] }); },
        CallExpression(node) {
          if (node.node.callee.name === 'require' && node.node.arguments[0]?.type === 'StringLiteral') {
            require.resolve(node.node.arguments[0].value, { paths: [path.dirname(file)] });
          }
        },
      } }; }],
    });
  }
  const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  for (const file of [config.icon, config.web.favicon, ...Object.values(config.android.adaptiveIcon).filter(value => value.startsWith('./'))]) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
});
