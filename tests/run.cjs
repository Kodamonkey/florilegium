/* Florilegio — corre tests/specs.js en Node, sin dependencias: node tests/run.cjs
   Carga los scripts de js/ en un contexto vm que hace de «window», con un localStorage en memoria. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'js/core.js', 'js/gen/data.js', 'js/catalog.js', 'js/art-a.js', 'js/art-b.js', 'js/art-c.js', 'js/art-stems.js',
  'js/layout.js', 'js/bouquet-model.js', 'js/bouquet-art.js', 'js/meaning.js', 'js/intent.js', 'js/compose.js', 'js/care.js', 'js/recipe.js', 'js/plate.js', 'tests/specs.js'
];

function memoryStorage() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(String(k)) ? mem.get(String(k)) : null),
    setItem: (k, v) => { mem.set(String(k), String(v)); },
    removeItem: (k) => { mem.delete(String(k)); },
    clear: () => mem.clear(),
    key: (i) => Array.from(mem.keys())[i] ?? null,
    get length() { return mem.size; }
  };
}

const sandbox = {
  console, TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Response, Blob, btoa, atob, Intl, URL,
  setTimeout, clearTimeout, performance, localStorage: memoryStorage()
};
const ctx = vm.createContext(sandbox);
vm.runInContext('this.window = this; this.self = this;', ctx);

for (const f of FILES) {
  const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
  try {
    vm.runInContext(code, ctx, { filename: path.join(ROOT, f) });
  } catch (e) {
    console.error('No se pudo cargar ' + f + ':\n' + (e && e.stack));
    process.exit(1);
  }
}

(async () => {
  const t0 = Date.now();
  const out = await ctx.FLTest.run((r) => {
    if (r.status === 'ok') console.log('ok    ' + r.name + (r.ms > 500 ? '  (' + r.ms + ' ms)' : ''));
    else if (r.status === 'skip') console.log('skip  ' + r.name + ' — ' + r.message);
    else console.log('FAIL  ' + r.name + '\n      ' + r.message.replace(/\n/g, '\n      '));
  });
  console.log('\n' + out.passed + ' ok, ' + out.failed + ' fallidas, ' + out.skipped + ' omitidas · ' + (Date.now() - t0) + ' ms');
  process.exitCode = out.failed ? 1 : 0;
})().catch((e) => {
  console.error(e && e.stack);
  process.exitCode = 1;
});
