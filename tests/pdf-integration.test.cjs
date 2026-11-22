const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const pdfLib = require('pdf-lib');
const { harness, findAll } = require('./helpers/mobileHarness.cjs');

const jpegBytes = fs.readFileSync(path.join(__dirname, 'fixtures/pdf-page.jpg'));
const images = [
  { uri: 'file:///gallery/wide.png', width: 4200, height: 2100 },
  { uri: 'file:///gallery/tall.jpg', width: 1800, height: 4000 },
];
const settings = { name: 'Relatório de aula', pageSize: 'Legal', orientation: 'landscape', margin: 15 };
const findButton = (tree, title) => findAll(tree, 'Button').find(node => node.props.title === title);

function pdfHarness({ truncateWrite = false, failRead = false } = {}) {
  const files = new Map(images.map(image => [image.uri, jpegBytes]));
  const directories = new Set();
  const manipulations = [];
  let releases = 0;

  class Directory {
    constructor(base, name) { this.uri = `${base}/${name}`; }
    create() { directories.add(this.uri); }
  }

  class File {
    constructor(base, name) { this.uri = name ? `${base.uri}/${name}` : base; }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri)?.length; }
    async bytes() {
      if (failRead) throw new Error('unreadable file');
      return files.get(this.uri);
    }
    create() {
      assert.equal(this.exists, false, 'An existing file must never be overwritten');
      files.set(this.uri, Buffer.alloc(0));
    }
    async write(bytes) {
      assert.equal(this.exists, true, 'Create the output before writing');
      files.set(this.uri, truncateWrite ? bytes.subarray(0, 1) : bytes);
    }
    delete() { files.delete(this.uri); }
  }

  const ImageManipulator = {
    manipulate(source) {
      const index = manipulations.length;
      const operation = { source };
      manipulations.push(operation);
      return {
        resize(options) { operation.resize = { ...options }; },
        async renderAsync() {
          return {
            async saveAsync({ format }) {
              assert.equal(format, 'jpeg');
              const uri = `file:///cache/${index}.jpg`;
              files.set(uri, jpegBytes);
              return { uri };
            },
            release() { releases++; },
          };
        },
        release() { releases++; },
      };
    },
  };

  const { generatePdf } = harness('src/pdf/pdfGenerator.js', {
    moduleMocks: {
      'pdf-lib': pdfLib,
      'expo-file-system': { File, Directory, Paths: { document: 'file:///app/documents' } },
      'expo-image-manipulator': { ImageManipulator, SaveFormat: { JPEG: 'jpeg' } },
    },
  }).exports;
  return { files, directories, manipulations, generatePdf, get releases() { return releases; } };
}

test('PDF generation emits a readable two-page PDF, preserves original images and reports completion after the save', async () => {
  const job = pdfHarness();
  const updates = [];
  const result = await job.generatePdf({
    images,
    settings,
    onProgress({ progress }) {
      updates.push(progress);
      const saved = [...job.files.keys()].filter(uri => uri.endsWith('.pdf'));
      assert.equal(saved.length, progress === 1 ? 1 : 0);
    },
  });
  assert.deepEqual(updates, [0.45, 0.9, 1]);
  assert.deepEqual(job.manipulations, [
    { source: images[0].uri, resize: { width: 2200 } },
    { source: images[1].uri, resize: { height: 2200 } },
  ]);
  assert.deepEqual([...job.directories], ['file:///app/documents/PDFs']);
  assert.deepEqual([...job.files.keys()], [...images.map(image => image.uri), result.uri]);
  assert.equal(job.releases, 4);
  assert.match(result.name, /^Relatorio_de_aula_\d+\.pdf$/);
  const writtenBytes = job.files.get(result.uri);
  assert.equal(result.size, writtenBytes.length);
  const document = await pdfLib.PDFDocument.load(writtenBytes);
  assert.equal(document.getPageCount(), result.pageCount);
  assert.equal(result.pageCount, 2);
  for (const page of document.getPages()) {
    assert.deepEqual(page.getSize(), { width: 1008, height: 612 });
    assert.equal(page.node.Resources().lookup(pdfLib.PDFName.of('XObject'), pdfLib.PDFDict).keys().length, 1);
  }
});

test('PDF read and incomplete-write failures never report completion or leave partial files', async () => {
  for (const options of [{ truncateWrite: true }, { failRead: true }]) {
    const job = pdfHarness(options);
    const updates = [];
    await assert.rejects(job.generatePdf({ images, settings, onProgress: ({ progress }) => updates.push(progress) }),
      options.failRead ? /unreadable file/ : /gravado parcialmente/);
    assert.equal(updates.includes(1), false);
    assert.deepEqual([...job.files.keys()], images.map(image => image.uri));
    assert.equal(job.releases, options.failRead ? 2 : 4);
  }
});

test('PDF settings submit selected values only for a nonempty name, valid margins and available images', () => {
  const app = harness('src/screens/PdfSettingsScreen.js');
  const submissions = [];
  const props = { images, onGenerate: value => submissions.push({ ...value }) };
  let tree = app.render(props);
  findAll(tree, 'Input').find(node => node.props.label === 'Nome do arquivo').props.onChangeText('   ');
  assert.equal(findButton(app.render(props), 'Gerar PDF').props.disabled, true);
  tree = app.render(props);
  findAll(tree, 'Input').find(node => node.props.label === 'Nome do arquivo').props.onChangeText('  Relatório de aula  ');
  findAll(tree, 'Input').find(node => node.props.label === 'Margens (mm)').props.onChangeText('51');
  assert.equal(findButton(app.render(props), 'Gerar PDF').props.disabled, true);
  tree = app.render(props);
  findAll(tree, 'Input').find(node => node.props.label === 'Margens (mm)').props.onChangeText('15');
  findButton(tree, 'Legal').props.onPress();
  findButton(tree, 'Paisagem').props.onPress();
  assert.equal(findButton(app.render({ ...props, images: [] }), 'Gerar PDF').props.disabled, true);
  const generate = findButton(app.render(props), 'Gerar PDF');
  assert.equal(generate.props.disabled, false);
  generate.props.onPress();
  assert.deepEqual(submissions, [settings]);
});

test('PDF progress passes the real percentage and offers retry and return on failure', () => {
  const app = harness('src/screens/PdfProgressScreen.js');
  const active = app.render({ progress: 0.42 });
  assert.equal(findAll(active, 'ProgressBar')[0].props.progress, 42);
  assert.equal(findAll(active, 'LoadingIndicator').length, 1);
  assert.equal(findAll(active, 'Header')[0].props.onBack, undefined);
  let retries = 0;
  let backs = 0;
  const failed = app.render({ error: 'Falha de gravação', onRetry: () => retries++, onBack: () => backs++ });
  assert.equal(findAll(failed, 'ProgressBar').length, 0);
  assert.equal(findAll(failed, 'LoadingIndicator').length, 0);
  const error = findAll(failed, 'ErrorMessage')[0];
  assert.equal(error.props.message, 'Falha de gravação');
  error.props.onRetry();
  findButton(failed, 'Voltar às configurações').props.onPress();
  assert.equal(retries, 1);
  assert.equal(backs, 1);
});

test('PDF navigation guards repeated presses and Android back during work, then exposes retry and the saved result', async () => {
  const jobs = [];
  const result = { uri: 'file:///app/documents/PDFs/aula.pdf', name: 'aula.pdf', size: 1100, pageCount: 2 };
  const app = harness('src/navigation/AppNavigator.js', {
    mockScreens: true,
    moduleMocks: { '../pdf/pdfGenerator': {
      generatePdf(request) {
        return new Promise((resolve, reject) => jobs.push({ request, resolve, reject }));
      },
    } },
  });
  const render = () => app.render({}, 'MainTabs');
  const tab = id => findAll(render(), 'BottomNavigation')[0].props.onTabPress(id);
  const screen = name => findAll(render(), name)[0]?.props;
  tab('pdf');
  screen('SelectImagesScreen').onContinue(images);
  screen('OrganizeImagesScreen').onContinue(images);
  const generate = screen('PdfSettingsScreen').onGenerate;
  const first = generate(settings);
  await generate(settings);
  assert.equal(jobs.length, 1);
  jobs[0].request.onProgress({ progress: 0.45 });
  assert.equal(screen('PdfProgressScreen').progress, 0.45);
  assert.equal(app.back(), true);
  assert.equal(screen('PdfCompleteScreen'), undefined);
  jobs[0].reject(new Error('file write failed'));
  await first;
  assert.match(screen('PdfProgressScreen').error, /Não foi possível criar o PDF/);
  assert.equal(app.back(), true);
  assert.equal(screen('PdfSettingsScreen').initialSettings, settings);
  const second = screen('PdfSettingsScreen').onGenerate(settings);
  jobs[1].reject(new Error('file write failed'));
  await second;
  const retry = screen('PdfProgressScreen').onRetry();
  assert.equal(jobs[2].request.settings, settings);
  assert.deepEqual(Array.from(jobs[2].request.images, image => image.uri), images.map(image => image.uri));
  tab('history');
  jobs[2].resolve(result);
  await retry;
  assert.equal(screen('BottomNavigation').activeTab, 'history');
  tab('pdf');
  assert.equal(screen('PdfCompleteScreen').result, result);
  screen('PdfCompleteScreen').onNewPdf();
  assert.equal(screen('SelectImagesScreen').initialImages.length, 0);
});

test('PDF completion receives the real generator result once and retries only its library registration', async () => {
  const result = { uri: 'file:///app/documents/PDFs/aula.pdf', name: 'aula.pdf', size: 1100, pageCount: 2 };
  let generated = 0;
  const calls = [];
  const steps = [];
  const app = harness('src/navigation/AppNavigator.js', {
    mockScreens: true,
    mediaLibraryProps: {
      downloadProps: {}, historyProps: {},
      async onPrepareFiles() { steps.push('prepare'); },
      async onRegisterGeneratedFile(input) {
        steps.push('register');
        calls.push(input);
        return calls.length > 1;
      },
    },
    moduleMocks: { '../pdf/pdfGenerator': { async generatePdf() { steps.push('generate'); generated++; return result; } } },
  });
  const screen = name => findAll(app.render({}, 'MainTabs'), name)[0]?.props;
  screen('BottomNavigation').onTabPress('pdf');
  screen('SelectImagesScreen').onContinue(images);
  screen('OrganizeImagesScreen').onContinue(images);
  await screen('PdfSettingsScreen').onGenerate(settings);
  assert.equal(generated, 1);
  assert.equal(screen('PdfCompleteScreen').result, result);
  assert.match(screen('PdfCompleteScreen').libraryError, /PDF foi salvo/);
  assert.deepEqual(calls[0], { fileUri: result.uri, name: result.name, sizeBytes: result.size, pageCount: 2, format: 'PDF', activityType: 'pdf' });
  screen('BottomNavigation').onTabPress('history');
  screen('BottomNavigation').onTabPress('pdf');
  assert.equal(calls.length, 1);
  await screen('PdfCompleteScreen').onRetryLibrary();
  assert.equal(calls.length, 2);
  assert.equal(generated, 1);
  assert.equal(screen('PdfCompleteScreen').libraryError, '');
  assert.deepEqual(steps, ['prepare', 'generate', 'register', 'register']);
});

test('Completion opens, exports without overwriting and shares the same PDF, with cancellation and missing-file handling', async () => {
  const actions = [];
  const directory = { uri: 'content://documents' };
  let pickerCancellation;
  let missing = false;
  let finishPreview;
  const app = harness('src/screens/PdfCompleteScreen.js', {
    moduleMocks: {
      'expo-file-system': {
        File: class {
          constructor(uri) { this.uri = uri; }
          get exists() { return !missing; }
          preview(options) {
            actions.push(['preview', this.uri, { ...options }]);
            return new Promise(resolve => { finishPreview = resolve; });
          }
          async copy(target, options) { actions.push(['copy', this.uri, target, { ...options }]); }
        },
        Directory: { async pickDirectoryAsync() {
          if (pickerCancellation) throw { code: pickerCancellation };
          return directory;
        } },
      },
      'expo-sharing': {
        async isAvailableAsync() { return true; },
        async shareAsync(uri, options) { actions.push(['share', uri, { ...options }]); },
      },
    },
  });
  const result = { uri: 'file:///aula.pdf', name: 'aula.pdf', size: 1100, pageCount: 1 };
  const button = title => findButton(app.render({ result }), title);
  const preview = button('Visualizar PDF').props.onPress();
  assert.equal(button('Exportar PDF').props.disabled, true);
  await button('Compartilhar PDF').props.onPress();
  assert.equal(actions.length, 1);
  finishPreview();
  await preview;
  await button('Exportar PDF').props.onPress();
  await button('Compartilhar PDF').props.onPress();
  assert.deepEqual(actions, [
    ['preview', result.uri, { title: result.name, mimeType: 'application/pdf' }],
    ['copy', result.uri, directory, { overwrite: false }],
    ['share', result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Compartilhar PDF' }],
  ]);
  assert.deepEqual(app.alerts[0], ['PDF exportado', result.name]);
  for (const code of ['ERR_PICKER_CANCELLED', 'ERR_FILE_PICKING_CANCELLED']) {
    pickerCancellation = code;
    await button('Exportar PDF').props.onPress();
  }
  assert.equal(actions.length, 3);
  assert.equal(app.alerts.length, 1);
  missing = true;
  await button('Compartilhar PDF').props.onPress();
  assert.equal(app.alerts[1][0], 'PDF indisponível');
  assert.equal(actions.length, 3);
});
