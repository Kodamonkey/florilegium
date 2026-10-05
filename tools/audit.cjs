/* Florilegio — qué sentimientos y temporadas cubre el catálogo: node tools/audit.cjs [--json]
   Usa el motor real (el mismo cargador vm de tests/run.cjs) y, para cada sentimiento × temporada × mascotas,
   propone un ramo desde ese sentimiento y muestra su protagonista, qué queda primero en su lectura, por cuánto,
   si hubo que apuntar a sentimientos cercanos y lo que costó la búsqueda; al final, unos pedidos de prueba cuyo texto
   no debe decir «amor declarado» sin romance ni quedar vacío. Solo informa: siempre termina con 0. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILES = [
  'js/core.js', 'js/gen/data.js', 'js/catalog.js', 'js/art-a.js', 'js/art-b.js', 'js/art-c.js', 'js/art-stems.js',
  'js/layout.js', 'js/bouquet-model.js', 'js/bouquet-art.js', 'js/meaning.js', 'js/intent.js', 'js/compose.js', 'js/care.js', 'js/recipe.js', 'js/plate.js'
];
const json = process.argv.includes('--json');

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

function load() {
  const sandbox = {
    console, TextEncoder, TextDecoder, CompressionStream, DecompressionStream, Response, Blob, btoa, atob, Intl, URL,
    setTimeout, clearTimeout, performance, localStorage: memoryStorage()
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext('this.window = this; this.self = this;', ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: path.join(ROOT, f) });
  return ctx.FL;
}

function audit(FL) {
  const R = FL.reading, T = FL.taxonomy;
  const toxic = (it) => ['cats', 'dogs'].some((k) => ['media', 'alta'].includes(it.care.toxicity[k]));
  const inSeason = (it, s) => !it.seasons.length || it.seasons.includes(s) || it.seasons.length >= 4;
  const name = (it) => it.name.toLowerCase();

  // Quién puede decir cada sentimiento: flores de florería con ese significado (sin contar el follaje).
  const carriers = FL.meanings.map((m) => {
    const all = FL.items.filter((it) => it.bouquet.florist && it.bouquet.role !== 'greenery' && it.meanings.includes(m));
    const safe = all.filter((it) => !toxic(it));
    return {
      meaning: m, all: all.map(name), petSafe: safe.map(name),
      season: Object.fromEntries(T.seasons.map((s) => [s, { all: all.filter((it) => inSeason(it, s)).length, petSafe: safe.filter((it) => inSeason(it, s)).length }]))
    };
  });

  const rows = [];
  FL.meanings.forEach((m) => T.seasons.forEach((season) => [false, true].forEach((petSafe) => {
    const r = R.compose({ feelings: [m], season, hemisphere: 'S', petSafe });
    const rd = R.interpret(r.bouquet).meanings;
    rows.push({
      meaning: m, season, petSafe,
      lead: r.bouquet.stems[0] ? r.bouquet.stems[0].item : null,
      top: rd[0] ? rd[0].id : null,
      gap: rd[0] ? +(rd[0].weight - (rd[1] ? rd[1].weight : 0)).toFixed(3) : 0,
      agree: !!rd[0] && rd[0].id === r.detected.top,
      fallback: r.detected.fallback ? r.detected.fallback.from + ' → ' + r.detected.fallback.to.join(', ') + ' (' + r.detected.fallback.reason + ')' : null,
      delta: r.search.delta, opened: r.search.opened, cores: r.search.cores, ms: r.search.ms
    });
  })));
  // Lo que el texto nunca debe decir: «amor declarado» sin romance, un ramo vacío, una ocasión de fiesta leída como perdón.
  const PROBES = ['te extraño mucho mamá', 'te echo de menos, hermano', 'te quiero mucho hermanita', 'una sola rosa roja para mi mamá',
    'para mi amiga: un girasol y cinco tulipanes', 'nada romántico, para mi colega', 'unas 46 flores en tonos morados', 'nos casamos',
    'flores blancas para el funeral de mi abuelo', 'mi mamá falleció, la amo mucho', 'mi abuela falleció, algo morado'];
  const textIssues = [];
  PROBES.forEach((text) => T.seasons.forEach((season) => [false, true].forEach((petSafe) => {
    const r = R.compose({ text, season, hemisphere: 'S', petSafe });
    const all = [r.rationale.lead, r.reading.summary].concat(r.rationale.items.map((x) => x.why)).join(' ');
    const tag = text + '|' + season + '|' + petSafe;
    if (!r.detected.romance && /amor declarado/.test(all)) textIssues.push('amor declarado: ' + tag);
    if (!r.bouquet.stems.length) textIssues.push('vacío: ' + tag);
    // (Si se nombró la flor que lo dice, como el tulipán, la lectura lo dice con razón.)
    if (/pedido de perdón/.test(r.reading.summary) && !(r.detected.target['Perdón'] > 0) && !r.detected.ask.include.length) textIssues.push('perdón: ' + tag);
    // Un duelo no se explica como comienzo, pasión ni declaración.
    if (r.detected.mourning && /nuevos comienzos|pasión|amor declarado|declaración/.test(r.rationale.lead + ' ' + r.reading.summary)) textIssues.push('duelo: ' + tag);
  })));
  // Qué puede encabezar un ramo de cada color (por el color que se ve): el sentimiento que cada flor dice primero, y en un
  // duelo (los colores del duelo: el blanco, recuerdo). Un sentimiento sin flor de ese color solo llega con otras flores.
  const lead = (it, mourn) => { const u = R.unit(it, mourn); let k = 0; u.forEach((x, i) => { if (x > u[k]) k = i; }); return FL.meanings[k]; };
  const colors = T.colors.filter((c) => c.id !== 'verde').map((c) => {
    const its = FL.items.filter((it) => it.bouquet.florist && it.bouquet.role !== 'greenery' && it.colors[0] === c.id);
    return { color: c.id, says: Array.from(new Set(its.map((it) => lead(it, false)))), mourning: Array.from(new Set(its.map((it) => lead(it, true)))) };
  });
  const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
  const at = (p) => ms[Math.min(ms.length - 1, Math.floor(p * ms.length))];
  const summary = {
    cells: rows.length,
    disagree: rows.filter((r) => !r.agree && !r.fallback).map((r) => r.meaning + '|' + r.season + '|' + r.petSafe),
    fallback: Array.from(new Set(rows.filter((r) => r.fallback).map((r) => r.meaning + '|' + r.petSafe))),
    noMargin: rows.filter((r) => r.delta === 0 && !r.fallback).map((r) => r.meaning + '|' + r.season + '|' + r.petSafe),
    ms: { p50: at(0.5), p95: at(0.95), max: ms[ms.length - 1] },
    maxOpened: Math.max(...rows.map((r) => r.opened)),
    maxCores: Math.max(...rows.map((r) => r.cores)),
    probes: PROBES.length * T.seasons.length * 2, textIssues,
    noRecuerdo: colors.filter((c) => !c.mourning.includes('Recuerdo')).map((c) => c.color)
  };
  return { carriers, rows, colors, summary };
}

function print(out) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log('Quién dice cada sentimiento (flores de florería, sin follaje)\n');
  out.carriers.forEach((c) => {
    console.log(pad(c.meaning, 17) + c.all.length + ' flores; seguras para mascotas: ' + (c.petSafe.length ? c.petSafe.join(', ') : 'ninguna'));
    console.log(pad('', 17) + 'de temporada (todas/seguras): ' + Object.entries(c.season).map(([s, n]) => s + ' ' + n.all + '/' + n.petSafe).join(' · '));
  });
  console.log('\nRamo propuesto desde cada sentimiento (hemisferio sur)\n');
  console.log(pad('sentimiento', 17) + pad('temporada', 10) + pad('masc.', 6) + pad('protagonista', 15) + pad('lectura', 17) + pad('ventaja', 8) + pad('δ', 5) + pad('núcleos', 8) + pad('ms', 7) + 'cercanos');
  out.rows.forEach((r) => {
    console.log(pad(r.meaning, 17) + pad(r.season, 10) + pad(r.petSafe ? 'sí' : 'no', 6) + pad(r.lead, 15) + pad((r.agree ? '' : '≠ ') + r.top, 17) +
      pad(r.gap.toFixed(3), 8) + pad(r.delta, 5) + pad(r.opened, 8) + pad(r.ms, 7) + (r.fallback || ''));
  });
  console.log('\nQué dice primero cada color (flores de ese color principal; en un duelo, tras «·»)\n');
  out.colors.forEach((c) => console.log(pad(c.color, 10) + (c.says.join(', ') || '—') + ' · ' + (c.mourning.join(', ') || '—')));
  const s = out.summary;
  console.log('\n' + s.cells + ' celdas · sin acuerdo: ' + (s.disagree.join(', ') || 'ninguna') + ' · sentimientos cercanos: ' + (s.fallback.join(', ') || 'ninguno') +
    ' · sin margen (δ = 0): ' + (s.noMargin.join(', ') || 'ninguna'));
  console.log('Duelo: colores sin una flor que diga primero recuerdo: ' + (s.noRecuerdo.join(', ') || 'ninguno'));
  console.log('Búsqueda: p50 ' + s.ms.p50 + ' ms · p95 ' + s.ms.p95 + ' ms · máx ' + s.ms.max + ' ms · máx núcleos abiertos ' + s.maxOpened + ' · máx núcleos ' + s.maxCores);
  console.log('Texto (' + s.probes + ' pedidos de prueba): ' + (s.textIssues.length ? s.textIssues.length + ' problemas\n  ' + s.textIssues.join('\n  ') : 'sin problemas'));
}

try {
  const out = audit(load());
  if (json) console.log(JSON.stringify(out, null, 2));
  else print(out);
} catch (e) {
  console.error('No se pudo auditar el catálogo:\n' + (e && e.stack));
}
process.exitCode = 0;
