const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '../..');
function loadMedia(name, overrides = {}) {
  const cache = new Map();
  function load(file) {
    const resolved = path.resolve(file);
    if (cache.has(resolved)) return cache.get(resolved).exports;
    const module = { exports: {} };
    cache.set(resolved, module);
    const code = babel.transformFileSync(resolved, {
      babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
    }).code;
    vm.runInNewContext(code, {
      module, exports: module.exports, URL, AbortController, setTimeout, clearTimeout,
      console, atob, fetch, ...overrides,
      require(request) {
        if (Object.prototype.hasOwnProperty.call(overrides, request)) return overrides[request];
        if (!request.startsWith('.')) throw new Error('Unexpected dependency: ' + request);
        const target = path.resolve(path.dirname(resolved), request);
        return load(target.endsWith('.js') ? target : target + '.js');
      },
    }, { filename: resolved });
    return module.exports;
  }
  return load(path.join(root, name));
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
module.exports = { loadMedia, deferred, tick, root };
