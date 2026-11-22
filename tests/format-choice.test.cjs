const test = require('node:test');
const assert = require('node:assert/strict');
const { harness, findAll, textContent } = require('./helpers/mobileHarness.cjs');

test('FormatChoiceScreen renders header with title, back button and logo', () => {
  const app = harness('src/screens/FormatChoiceScreen.js');
  let backs = 0;
  const tree = app.render({ navigation: { goBack: () => { backs += 1; } } });

  const headers = findAll(tree, 'Header');
  assert.equal(headers.length, 1);
  assert.equal(headers[0].props.title, 'Escolha de formato');
  headers[0].props.onBack();
  assert.equal(backs, 1);
  assert.ok(headers[0].props.backIcon.endsWith('back-icon.png'));
  assert.ok(headers[0].props.logo.endsWith('logo-converter.png'));
});

test('FormatChoiceScreen uses real route metadata and informs that audio processing is pending', () => {
  const app = harness('src/screens/FormatChoiceScreen.js');
  const route = { params: { videoName: 'aula.mp4', videoDetails: '03:42 • 42,5 MB' } };
  const tree = app.render({ route });

  const text = textContent(tree);
  assert.ok(text.includes('ARQUIVO SELECIONADO'));
  assert.ok(text.includes('aula.mp4'));
  assert.ok(text.includes('03:42 • 42,5 MB'));
  assert.ok(text.includes('QUALIDADE DO ÁUDIO'));
  assert.ok(text.includes('128 kbps'));
  assert.ok(text.includes('192 kbps'));
  assert.ok(text.includes('320 kbps'));

  // Radios
  const radios = findAll(tree, 'Pressable').filter(p => p.props.accessibilityRole === 'radio');
  assert.equal(radios.length, 3);
  assert.equal(radios[1].props.accessibilityState.checked, true);
  assert.equal(radios[0].props.accessibilityState.checked, false);
  assert.equal(radios[2].props.accessibilityState.checked, false);

  // Convert button
  const convertBtn = findAll(tree, 'Pressable').find(p => p.props.accessibilityLabel === 'Converter para áudio');
  assert.ok(convertBtn);
  assert.equal(app.alerts.length, 0);
  convertBtn.props.onPress();
  assert.equal(app.alerts.length, 1);
  assert.ok(app.alerts[0][0].includes('Conversão para áudio'));
  assert.ok(app.alerts[0][1].includes('192 kbps'));
  assert.match(app.alerts[0][1], /ainda estão pendentes/);
  radios[2].props.onPress();
  const updated = findAll(app.render({ route }), 'Pressable');
  assert.deepEqual(updated.filter(node => node.props.accessibilityRole === 'radio')
    .map(node => node.props.accessibilityState.checked), [false, false, true]);
  updated.find(node => node.props.accessibilityLabel === 'Converter para áudio').props.onPress();
  assert.match(app.alerts[1][1], /320 kbps.*pendentes/);

  // No bottom navigation on stack screen
  assert.equal(findAll(tree, 'BottomNavigation').length, 0);
});

test('Direct format route without gallery data has no sample file or conversion action', () => {
  const app = harness('src/screens/FormatChoiceScreen.js');
  const tree = app.render();
  assert.match(textContent(tree), /Nenhum vídeo selecionado/);
  assert.doesNotMatch(textContent(tree), /\.mp4|42[.,]5 MB/);
  const action = findAll(tree, 'Pressable').find(node => node.props.accessibilityRole === 'button');
  assert.equal(action.props.disabled, true);
  action.props.onPress();
  assert.equal(app.alerts.length, 0);
});

test('Gallery sends the selected filename, duration and size, preserving the selection on cancel', async () => {
  const results = [
    { canceled: false, assets: [{ type: 'video', uri: 'file:///aula.mov', fileName: 'aula.mov', duration: 3723000, fileSize: 2048 }] },
    { canceled: true },
    new Error('permission denied'),
  ];
  const app = harness('src/screens/ConvertGalleryVideoScreen.js', {
    imagePicker: { async launchImageLibraryAsync() {
      const result = results.shift();
      if (result instanceof Error) throw result;
      return result;
    } },
  });
  const routes = [];
  const navigation = { navigate: (name, params) => routes.push([name, { ...params }]) };
  const findButton = title => findAll(app.render({ navigation }), 'Button').find(button => button.props.title === title);
  assert.equal(findButton('Continuar').props.disabled, true);
  await findButton('Abrir galeria').props.onPress();
  assert.equal(findButton('Continuar').props.disabled, false);
  findButton('Continuar').props.onPress();
  await findButton('Abrir galeria').props.onPress();
  assert.equal(findButton('Continuar').props.disabled, false);
  await findButton('Abrir galeria').props.onPress();
  assert.equal(app.alerts[0][0], 'Não foi possível abrir a galeria');
  assert.deepEqual(routes, [['FormatChoice', { videoName: 'aula.mov', videoDetails: '1:02:03 • 2 KB' }]]);
});
