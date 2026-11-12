const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const args = process.argv.slice(2);
const argument = (name, fallback) => { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; };
const host = argument('--host', '127.0.0.1');
const port = Number(argument('--port', '8096'));
if (!Number.isInteger(port) || port < 1 || port > 65535 || !['127.0.0.1', '0.0.0.0'].includes(host)) throw new Error('Use --host 127.0.0.1 ou 0.0.0.0 e uma porta válida.');
const video = fs.readFileSync(path.join(__dirname, '../tests/fixtures/authorized.mp4'));
const audio = fs.readFileSync(path.join(__dirname, '../tests/fixtures/authorized.mp3'));

const server = http.createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  const route = request.url?.split('?')[0];
  if (!['/authorized.mp4', '/authorized.mp3', '/slow.mp4'].includes(route)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Somente fixtures próprias de teste.'); return;
  }
  const isAudio = route === '/authorized.mp3';
  const data = isAudio ? audio : video;
  response.writeHead(200, {
    'content-type': isAudio ? 'audio/mpeg' : 'video/mp4', 'content-length': data.length,
    'content-disposition': `attachment; filename="Fixture propria de teste.${isAudio ? 'mp3' : 'mp4'}"`,
    'cache-control': 'no-store',
  });
  if (request.method === 'HEAD') { response.end(); return; }
  if (route !== '/slow.mp4') { response.end(data); return; }
  // Intentionally throttle actual bytes to allow manual cancellation testing.
  let offset = 0;
  const timer = setInterval(() => {
    if (offset >= data.length) { clearInterval(timer); response.end(); return; }
    if (response.write(data.subarray(offset, ++offset))) return;
    // A tiny controlled fixture cannot build an unbounded output buffer.
  }, 50);
  response.on('close', () => clearInterval(timer));
});
server.listen(port, host, () => {
  console.log(`Fixtures próprias disponíveis em http://${host === '0.0.0.0' ? '<IP-DO-COMPUTADOR>' : host}:${port}`);
  console.log('Rotas: /authorized.mp4, /authorized.mp3 e /slow.mp4 (transferência lenta real).');
  console.log('Use Ctrl+C para encerrar. Nenhum diretório do projeto é exposto.');
});
