const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const previewRoot = path.join(projectRoot, '.expo', 'downloads-history-preview');
const mainPackage = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

fs.mkdirSync(previewRoot, { recursive: true });
fs.writeFileSync(path.join(previewRoot, 'package.json'), JSON.stringify({
  name: 'edudownloader-screen-preview',
  version: '1.0.0',
  main: 'index.js',
  private: true,
  dependencies: mainPackage.dependencies,
}, null, 2) + '\n');
fs.writeFileSync(path.join(previewRoot, 'app.json'), JSON.stringify({
  expo: {
    name: 'EduDownloader - Previa de Telas',
    slug: 'edudownloader-screen-preview',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    plugins: ['expo-font'],
  },
}, null, 2) + '\n');
fs.writeFileSync(path.join(previewRoot, 'index.js'), [
  "import { registerRootComponent } from 'expo';",
  "import DownloadsHistoryPreview from '../../src/dev/DownloadsHistoryPreview';",
  '',
  'registerRootComponent(DownloadsHistoryPreview);',
  '',
].join('\n'));
fs.writeFileSync(path.join(previewRoot, 'metro.config.js'), [
  "const path = require('path');",
  "const { getDefaultConfig } = require('expo/metro-config');",
  "const mainProjectRoot = path.resolve(__dirname, '../..');",
  'const config = getDefaultConfig(__dirname);',
  'config.watchFolders = [...new Set([...config.watchFolders, mainProjectRoot])];',
  "config.resolver.nodeModulesPaths = [path.join(mainProjectRoot, 'node_modules'), ...config.resolver.nodeModulesPaths];",
  'module.exports = config;',
  '',
].join('\n'));

const args = process.argv.slice(2);
if (!args.includes('--port')) args.push('--port', '8082');
if (!args.includes('--go')) args.push('--go');
const expoCli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const metro = spawn(process.execPath, [expoCli, 'start', previewRoot, ...args], {
  cwd: projectRoot,
  stdio: 'inherit',
});
metro.on('error', error => {
  console.error('Não foi possível iniciar a prévia:', error.message);
  process.exitCode = 1;
});
metro.on('exit', code => { process.exitCode = code ?? 1; });
