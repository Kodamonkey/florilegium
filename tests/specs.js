/* Florilegio — pruebas de la lógica del sitio, sin dependencias.
   Corren en Node (node tests/run.cjs) y en el navegador (tests/index.html) sobre los mismos scripts de js/. */
(function (root) {
  'use strict';
  const T = (root.FLTest = { specs: [] });

  /* ---------- Mínimo marco de pruebas ---------- */
  T.test = (name, fn) => { T.specs.push({ name, fn }); };

  const show = (v) => {
    let s;
    try { s = JSON.stringify(v); } catch (e) { s = String(v); }
    if (s === undefined) s = String(v);
    return s.length > 160 ? s.slice(0, 157) + '…' : s;
  };
  const fail = (msg, extra) => { throw new Error((msg ? msg + ': ' : '') + extra); };

  // Igualdad estructural sin depender de prototipos (en Node los objetos vienen de otro contexto).
  const same = (a, b) => {
    if (a === b || (a !== a && b !== b)) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) return false;
    return ka.every((k) => same(a[k], b[k]));
  };

  T.ok = (cond, msg) => { if (!cond) fail(msg, 'se esperaba verdadero'); };
  T.eq = (a, b, msg) => { if (a !== b) fail(msg, show(a) + ' !== ' + show(b)); };
  T.deepEq = (a, b, msg) => { if (!same(a, b)) fail(msg, show(a) + ' ≠ ' + show(b)); };
  T.approx = (a, b, eps, msg) => {
    const e = eps != null ? eps : 1e-6;
    if (!(Math.abs(a - b) <= e)) fail(msg, show(a) + ' ≉ ' + show(b) + ' (±' + e + ')');
  };
  T.skip = (msg) => { const e = new Error(msg || 'omitida'); e.skip = true; throw e; };

  // Corre todas las pruebas en orden; report(r) recibe cada resultado apenas termina.
  T.run = async function (report, o = {}) {
    const limit = o.timeout || 20000;
    const out = { passed: 0, failed: 0, skipped: 0, results: [] };
    for (const s of T.specs) {
      const t0 = Date.now();
      const r = { name: s.name, status: 'ok', message: '' };
      let timer;
      try {
        await Promise.race([
          Promise.resolve().then(() => s.fn()),
          new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('tiempo agotado (' + limit + ' ms)')), limit); })
        ]);
      } catch (e) {
        if (e && e.skip) { r.status = 'skip'; r.message = e.message; }
        else { r.status = 'fail'; r.message = (e && e.message) || String(e); r.stack = e && e.stack; }
      } finally { clearTimeout(timer); }
      r.ms = Date.now() - t0;
      out[r.status === 'ok' ? 'passed' : r.status === 'skip' ? 'skipped' : 'failed']++;
      out.results.push(r);
      if (report) report(r);
    }
    return out;
  };

  /* ---------- Ayudas ---------- */
  const { test, ok, eq, deepEq, approx, skip } = T;
  const FL = root.FL;
  const B = () => FL.bouquet;
  const mk = (stems, extra) => B().create(Object.assign({ stems: stems.map(([item, n]) => ({ item, n })) }, extra || {}));
  const pop = (id) => FL.popular.find((p) => p.id === id);
  const fromPopular = (id) => B().create(pop(id));
  const ids = (b) => b.stems.map((s) => s.item);
  const octets = (s) => {
    let n = 0;
    for (const ch of s) { const c = ch.codePointAt(0); n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
    return n;
  };

  // Reemplaza localStorage por uno en memoria durante la prueba; si el entorno no lo permite, repone la clave real al terminar.
  async function withStorage(fn) {
    const KEY = 'fl.bouquets', mem = new Map();
    const mock = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); }, clear: () => mem.clear(), key: (i) => Array.from(mem.keys())[i] || null,
      get length() { return mem.size; }
    };
    const desc = Object.getOwnPropertyDescriptor(root, 'localStorage');
    let swapped = false;
    try {
      Object.defineProperty(root, 'localStorage', { value: mock, configurable: true, writable: true });
      swapped = root.localStorage === mock;
    } catch (e) { /* no reemplazable */ }
    const prev = swapped ? null : root.localStorage.getItem(KEY);
    if (!swapped) root.localStorage.removeItem(KEY);
    try {
      return await fn(root.localStorage);
    } finally {
      if (swapped) { if (desc) Object.defineProperty(root, 'localStorage', desc); else delete root.localStorage; }
      else if (prev == null) root.localStorage.removeItem(KEY);
      else root.localStorage.setItem(KEY, prev);
    }
  }

  /* ---------- 1. Catálogo ---------- */
  test('catálogo: 31 flores y 5 rellenos, ids únicos', () => {
    eq(FL.flowers.length, 31, 'flores');
    eq(FL.fillers.length, 5, 'rellenos');
    eq(FL.items.length, 36, 'ítems');
    eq(new Set(FL.items.map((x) => x.id)).size, 36, 'ids repetidos');
    ok(FL.flowers.every((x) => x.type === 'flower'), 'type flower');
    ok(FL.fillers.every((x) => x.type === 'filler'), 'type filler');
  });

  test('catálogo: cada ítem tiene dibujo y cada flor su tallo', () => {
    FL.items.forEach((it) => eq(typeof FL.art[it.art], 'function', 'FL.art.' + it.art + ' (' + it.id + ')'));
    FL.flowers.forEach((it) => ok(FL.stemCfg[it.art], 'FL.stemCfg.' + it.art + ' (' + it.id + ')'));
  });

  test('catálogo: drawHead de cada ítem devuelve un SVG con proporción válida', () => {
    FL.items.forEach((it) => {
      const d = FL.drawHead(it);
      ok(/^<svg class="fh sp-/.test(d.svg), 'svg de ' + it.id);
      ok(d.aspect > 0 && isFinite(d.aspect), 'aspect de ' + it.id);
    });
  });

  test('catálogo: significados, colores y temporadas existen en la taxonomía', () => {
    const colors = FL.taxonomy.colors.map((c) => c.id);
    FL.items.forEach((it) => {
      it.meanings.forEach((m) => ok(FL.meanings.includes(m), it.id + ': significado ' + m));
      it.colors.forEach((c) => ok(colors.includes(c), it.id + ': color ' + c));
      it.seasons.forEach((s) => ok(FL.seasons.includes(s), it.id + ': temporada ' + s));
      ok(FL.role(it.bouquet.role), it.id + ': papel ' + it.bouquet.role);
    });
  });

  test('catálogo: FL.item y FL.byId', () => {
    eq(FL.item('rosa-roja').name, 'Rosa roja');
    eq(FL.item('eucalipto').type, 'filler');
    eq(FL.item('no-existe'), undefined);
    eq(FL.byId('girasol'), FL.item('girasol'));
    eq(FL.byId('eucalipto'), undefined, 'byId solo busca flores');
  });

  test('catálogo: countWords en femenino', () => {
    eq(FL.countWords(1), 'una');
    eq(FL.countWords(21), 'veintiuna');
    eq(FL.countWords(25), 'veinticinco');
    eq(FL.countWords(31), 'treinta y una');
    eq(FL.countWords(40), 'cuarenta');
    eq(FL.countWords(99), 'noventa y nueve');
    eq(FL.countWords(120), '120');
  });

  test('catálogo: seasonOf según hemisferio', () => {
    eq(FL.seasonOf(new Date(2026, 8, 28), 'S'), 'primavera');
    eq(FL.seasonOf(new Date(2026, 8, 28), 'N'), 'otoño');
    eq(FL.seasonOf(new Date(2026, 0, 15), 'S'), 'verano');
    eq(FL.seasonOf(new Date(2026, 11, 1), 'N'), 'invierno');
  });

  test('catálogo: occasionDate (día fijo y n-ésimo domingo)', () => {
    const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    eq(iso(FL.occasionDate(FL.occasion('dia-madre'), new Date(2026, 0, 1))), '2026-05-10', 'día de la madre');
    eq(iso(FL.occasionDate(FL.occasion('dia-padre'), new Date(2026, 0, 1))), '2026-06-21', 'día del padre');
    eq(iso(FL.occasionDate(FL.occasion('san-valentin'), new Date(2026, 1, 15))), '2027-02-14', 'san valentín pasado');
    eq(iso(FL.occasionDate(FL.occasion('san-valentin'), new Date(2026, 1, 14, 18))), '2026-02-14', 'el mismo día cuenta');
    eq(FL.occasionDate(FL.occasion('cumpleanos'), new Date(2026, 0, 1)), null, 'sin fecha');
  });

  /* ---------- 2. Composición sin solapes ---------- */
  // Tres filas de diez círculos en 1200 px que se pisan entre vecinos, como el jardín antes de separarse.
  // packed: todos amontonados en el centro (el caso difícil: necesita más iteraciones que las 120 por defecto).
  function scene(seed, packed) {
    const r = FL.u.rng(seed), nodes = [];
    for (let band = 0; band < 3; band++) {
      const y0 = 200 + band * 80;
      for (let i = 0; i < 10; i++) {
        const rad = 40 + r() * 12;
        nodes.push({
          x: packed ? 150 + r() * 900 : 60 + (i + 0.5) * 108 + (r() - 0.5) * 90, y: y0 + (r() - 0.5) * 30, rx: rad, ry: rad,
          z: band * 10 + i * 0.01, band, minX: rad + 4, maxX: 1200 - rad - 4, minY: y0 - 90, maxY: y0 + 90
        });
      }
    }
    return nodes;
  }
  const overlaps = (nodes, gap) => {
    const bad = [];
    nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => {
      if (a.band !== b.band) return;
      const d = Math.hypot((b.x - a.x) / (a.rx + b.rx + gap), (b.y - a.y) / (a.ry + b.ry + gap));
      if (d < 1 - 1e-3) bad.push(d.toFixed(4));
    }));
    return bad;
  };

  test('layout: sin solapes en la misma fila y visibilidad ≥ 0,85', () => {
    [1, 7, 42, 2026].forEach((seed) => {
      ok(overlaps(scene(seed), 10).length > 5, 'semilla ' + seed + ': la escena de partida debe estar apretada');
      const nodes = FL.layout.relax(scene(seed), { gap: 10, allow: 0.1 });
      const bad = overlaps(nodes, 10);
      eq(bad.length, 0, 'semilla ' + seed + ': solapes ' + bad.join(' '));
      const vis = FL.layout.visibility(nodes);
      ok(Math.min(...vis) >= 0.85, 'semilla ' + seed + ': visibilidad mínima ' + Math.min(...vis).toFixed(3));
    });
  });

  test('layout: amontonados al centro también se separan (con más iteraciones)', () => {
    [1, 7, 42, 2026].forEach((seed) => {
      const nodes = FL.layout.relax(scene(seed, true), { gap: 10, allow: 0.1, iterations: 400 });
      const bad = overlaps(nodes, 10);
      eq(bad.length, 0, 'semilla ' + seed + ': solapes ' + bad.join(' '));
      ok(Math.min(...FL.layout.visibility(nodes)) >= 0.85, 'semilla ' + seed + ': visibilidad');
    });
  });

  test('layout: respeta límites y no mueve las fijas', () => {
    [99, 7].forEach((seed) => {
      const nodes = scene(seed);
      const pins = [nodes[4], nodes[15], nodes[26]];
      pins.forEach((n) => { n.pin = true; });
      const before = pins.map((n) => [n.x, n.y]);
      // Una cadena que empuja contra una fija se asienta más lento: se dan más iteraciones.
      FL.layout.relax(nodes, { gap: 10, iterations: 300 });
      pins.forEach((n, i) => deepEq([n.x, n.y], before[i], 'semilla ' + seed + ': fija ' + i));
      nodes.forEach((n, i) => {
        ok(n.x >= n.minX - 1e-9 && n.x <= n.maxX + 1e-9, 'x fuera de límites en ' + i);
        ok(n.y >= n.minY - 1e-9 && n.y <= n.maxY + 1e-9, 'y fuera de límites en ' + i);
      });
      eq(overlaps(nodes, 10).length, 0, 'semilla ' + seed + ': solapes con fijas');
    });
  });

  test('layout: zonas reservadas y visibilidad de casos simples', () => {
    const nodes = [{ x: 600, y: 100, rx: 40, ry: 40, z: 1, band: 0 }, { x: 900, y: 300, rx: 40, ry: 40, z: 1, band: 0 }];
    FL.layout.relax(nodes, { avoid: [{ x0: 500, y0: 50, x1: 700, y1: 160 }] });
    const a = nodes[0];
    ok(a.x + a.rx <= 500 + 0.5 || a.x - a.rx >= 700 - 0.5 || a.y - a.ry >= 160 - 0.5, 'sigue dentro de la zona reservada');
    deepEq(FL.layout.visibility([{ x: 0, y: 0, rx: 10, ry: 10, z: 1 }]), [1], 'sola');
    const v = FL.layout.visibility([{ x: 0, y: 0, rx: 10, ry: 10, z: 1 }, { x: 0, y: 0, rx: 20, ry: 20, z: 2 }]);
    deepEq(v, [0, 1], 'tapada por completo');
  });

  /* ---------- 3. Modelo de ramo ---------- */
  test('ramo: create() por defecto es válido', () => {
    const b = B().create();
    eq(b.v, 1);
    ok(/^b_[a-z0-9]{4,24}$/.test(b.id), 'id ' + b.id);
    deepEq(b.stems, []);
    deepEq(b.wrap, { style: 'kraft', color: FL.taxonomy.wraps[0].colors[0] });
    deepEq(b.ribbon, { color: FL.taxonomy.ribbons[0] });
    deepEq(b.card, { to: '', message: '', from: '' });
    ok(Number.isInteger(b.layoutSeed) && b.layoutSeed >= 0 && b.layoutSeed <= 4294967295, 'layoutSeed');
    ok(typeof b.createdAt === 'string' && b.updatedAt === b.createdAt, 'fechas');
    deepEq(B().normalize(b).issues, [], 'normalize de un ramo recién creado');
    deepEq(B().normalize(b).bouquet, b, 'normalize es idempotente');
  });

  test('ramo: normalize descarta desconocidos y junta repetidos', () => {
    const { bouquet, issues } = B().normalize({ stems: [{ item: 'no-existe', n: 3 }, { item: 'rosa-roja', n: 3 }, { item: 'rosa-roja', n: 4 }, null, { item: 'clavel', n: 0 }, { item: 'lirio', n: 'x' }] });
    deepEq(bouquet.stems, [{ item: 'rosa-roja', n: 7 }]);
    ok(issues.some((s) => /desconocido: no-existe/.test(s)), 'aviso de desconocido');
    ok(issues.some((s) => /inválida: clavel/.test(s)), 'aviso de cantidad');
    eq(issues.length, 4, 'avisos: ' + issues.join(' | '));
    deepEq(B().normalize({ stems: [{ item: 'tulipan', n: 2.6 }] }).bouquet.stems, [{ item: 'tulipan', n: 3 }], 'redondea');
  });

  test('ramo: normalize aplica los límites (24 por ítem, 48 en total, 12 ítems)', () => {
    const L = FL.limits;
    let r = B().normalize({ stems: [{ item: 'rosa-roja', n: 30 }] });
    deepEq(r.bouquet.stems, [{ item: 'rosa-roja', n: L.stemsPerItem }]);
    ok(r.issues.length === 1, 'aviso por ítem');
    r = B().normalize({ stems: [{ item: 'rosa-roja', n: 20 }, { item: 'clavel', n: 20 }, { item: 'tulipan', n: 20 }, { item: 'lirio', n: 2 }] });
    deepEq(r.bouquet.stems.map((s) => s.n), [20, 20, 8]);
    eq(B().total(r.bouquet), L.stems);
    r = B().normalize({ stems: FL.items.slice(0, 13).map((it) => ({ item: it.id, n: 1 })) });
    eq(r.bouquet.stems.length, L.items);
    ok(r.issues.some((s) => /12 ítems/.test(s)), 'aviso de ítems');
  });

  test('ramo: normalize recorta textos y corrige envoltorio y colores', () => {
    const { bouquet } = B().normalize({
      stems: [{ item: 'girasol', n: 3 }], name: 'n'.repeat(120),
      card: { to: 'A'.repeat(90), message: 'm'.repeat(400), from: 'Yo\u0000' },
      wrap: { style: 'plastico', color: '#ABCDEF' }, ribbon: { color: 'red' },
      intent: { text: 't'.repeat(600), feelings: ['Amor', 'Odio'] }, occasion: 'no-existe', layoutSeed: -4
    });
    eq(bouquet.name.length, 80, 'nombre');
    eq(bouquet.card.message.length, FL.limits.message, 'mensaje');
    eq(bouquet.card.to.length, 60, 'para');
    eq(bouquet.card.from, 'Yo', 'caracteres de control');
    eq(bouquet.wrap.style, 'kraft', 'estilo inválido');
    eq(bouquet.wrap.color, '#abcdef', 'hex en minúsculas');
    eq(bouquet.ribbon.color, FL.taxonomy.ribbons[0], 'cinta inválida');
    eq(bouquet.intent.text.length, FL.limits.intent, 'intención');
    deepEq(bouquet.intent.feelings, ['Amor'], 'sentimientos conocidos');
    eq(bouquet.occasion, undefined, 'ocasión desconocida');
    ok(bouquet.layoutSeed >= 0, 'semilla');
    const seda = B().normalize({ stems: [{ item: 'girasol', n: 1 }], wrap: { style: 'seda', color: '#12345' } }).bouquet;
    deepEq(seda.wrap, { style: 'seda', color: FL.taxonomy.wraps.find((w) => w.id === 'seda').colors[0] }, 'hex inválido → color por defecto');
    deepEq(B().normalize({ stems: [{ item: 'girasol', n: 1 }], wrap: { style: 'ninguno' } }).bouquet.wrap, { style: 'ninguno' }, 'sin envoltorio');
  });

  test('ramo: validate y migrate', () => {
    const issues = B().validate({ v: 1, stems: [] });
    ok(issues.some((s) => /no tiene tallos/.test(s)), 'ramo vacío');
    deepEq(B().validate(fromPopular('docena-roja')), [], 'ramo popular');
    deepEq(B().migrate(null), {});
    const old = { stems: [{ item: 'clavel', n: 3 }] };
    eq(B().migrate(old), old, 'sin versión se trata como v1');
    eq(B().create(old).v, 1);
    eq(B().migrate({ v: 7, stems: [] }).v, 1, 'versión futura');
    deepEq(B().normalize('texto').bouquet.stems, [], 'entrada no objeto');
  });

  test('ramo: add respeta límites, borra en 0 y limpia la lectura', () => {
    const L = FL.limits;
    const b = mk([['rosa-roja', 22]]);
    b.reading = { source: 'local', summary: 'x' };
    ok(B().add(b, 'rosa-roja', 5), 'sube hasta 24');
    eq(B().count(b, 'rosa-roja'), L.stemsPerItem);
    eq(b.reading, undefined, 'lectura borrada');
    ok(!B().add(b, 'rosa-roja', 1), 'no pasa de 24');
    ok(B().add(b, 'clavel', 24));
    eq(B().total(b), L.stems);
    ok(!B().add(b, 'tulipan', 1), 'no pasa de 48 en total');
    ok(B().add(b, 'rosa-roja', -24), 'resta');
    eq(B().count(b, 'rosa-roja'), 0);
    deepEq(ids(b), ['clavel'], 'se quita al llegar a 0');
    ok(!B().add(b, 'lirio', -1), 'restar lo que no está');
    const full = mk(FL.items.slice(0, 12).map((it) => [it.id, 1]));
    ok(!B().add(full, FL.items[12].id, 1), 'no pasa de 12 ítems');
    ok(B().add(full, FL.items[0].id, 1), 'sí suma a uno existente');
    eq(B().flowerCount(mk([['rosa-roja', 3], ['eucalipto', 2]])), 3, 'flowerCount no cuenta follaje');
  });

  test('ramo: encode/decode conserva el ramo', async () => {
    const b = mk([['rosa-roja', 5], ['gypsophila', 3], ['eucalipto', 2]], {
      name: 'Para ti, «ñandú» 🌷', occasion: 'aniversario', wrap: { style: 'tela', color: '#384454' }, ribbon: { color: '#e7c25c' },
      card: { to: 'Ana', message: 'Feliz día — con cariño, ¿sí?', from: 'Seba' }, layoutSeed: 123456789
    });
    const code = await B().encode(b);
    ok(/^[zj][A-Za-z0-9_-]+$/.test(code), 'formato ' + code.slice(0, 20));
    if (typeof CompressionStream === 'function' && typeof DecompressionStream === 'function') eq(code[0], 'z', 'comprimido');
    const d = await B().decode(code);
    ok(d, 'decodifica');
    ['stems', 'wrap', 'ribbon', 'card', 'name', 'occasion', 'layoutSeed'].forEach((k) => deepEq(d[k], b[k], k));
    eq(d.reading, undefined, 'sin lectura local en el enlace');
    const ai = B().clone(b);
    ai.reading = { source: 'ai', summary: 'Un ramo que declara amor.' };
    // La lectura de la IA no viaja en el enlace (puede parafrasear la intención privada).
    eq((await B().decode(await B().encode(ai))).reading, undefined, 'sin lectura de IA en el enlace');
    const forged = 'j' + btoa(JSON.stringify({ s: [['rosa-roja', 3]], a: 'Texto inventado por quien arma el enlace' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    eq((await B().decode(forged)).reading, undefined, 'un campo «a» antiguo o forjado se ignora');
    const plain = B().create({ stems: [{ item: 'girasol', n: 3 }], layoutSeed: 5 });
    const c2 = await B().decode(await B().encode(plain));
    eq(c2.card.message, '', 'sin tarjeta');
    eq(c2.name, undefined, 'sin nombre');
  });

  test('ramo: decode acepta el formato j (JSON sin comprimir)', async () => {
    const json = JSON.stringify({ s: [['clavel', 3]], w: ['seda', '#f3e6ea'], r: '#b54470', k: 9 });
    const bytes = new TextEncoder().encode(json);
    let s = '';
    bytes.forEach((x) => { s += String.fromCharCode(x); });
    const code = 'j' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const d = await B().decode(code);
    deepEq(d.stems, [{ item: 'clavel', n: 3 }]);
    deepEq(d.wrap, { style: 'seda', color: '#f3e6ea' });
    eq(d.layoutSeed, 9);
  });

  test('ramo: decode de códigos rotos devuelve null', async () => {
    const good = await B().encode(fromPopular('cumple-color'));
    const bad = ['', 'z', 'j', 'x' + good.slice(1), 'zzzzzzzz', 'j!!!!', 'jeyJ4IjoxfQ', good.slice(0, Math.floor(good.length / 2)), good.slice(0, -3),
      'z' + good.slice(2), 'j' + 'A'.repeat(9000), null, undefined];
    for (const c of bad) eq(await B().decode(c), null, 'código ' + show(c).slice(0, 40));
    // Un código válido pero sin tallos conocidos tampoco es un ramo.
    const ghost = B().create({ stems: [{ item: 'rosa-roja', n: 1 }] });
    ghost.stems = [{ item: 'no-existe', n: 2 }];
    eq(await B().decode(await B().encode(ghost)), null, 'sin tallos válidos');
  });

  test('ramo: guardar, listar, obtener y borrar (localStorage en memoria)', () => withStorage((ls) => {
    deepEq(B().list(), [], 'vacío');
    const a = fromPopular('docena-roja'), b = fromPopular('girasoles');
    ok(B().save(a) && B().save(b), 'guarda');
    eq(B().list().length, 2);
    deepEq(B().get(a.id).stems, a.stems, 'get');
    a.name = 'Cambiado';
    B().save(a);
    eq(B().list().length, 2, 'guardar dos veces no duplica');
    eq(B().get(a.id).name, 'Cambiado');
    ok(B().remove(a.id), 'borra');
    eq(B().get(a.id), null);
    deepEq(B().list().map((x) => x.id), [b.id]);
    ls.setItem('fl.bouquets', '{roto');
    deepEq(B().list(), [], 'datos corruptos');
    ls.setItem('fl.bouquets', JSON.stringify([{ v: 1, id: 'b_vacio1', stems: [] }, { id: 'b_viejo1', stems: [{ item: 'clavel', n: 2 }] }]));
    deepEq(B().list().map((x) => x.id), ['b_viejo1'], 'filtra vacíos y migra sin versión');
  }));

  /* ---------- 4. Ramos populares ---------- */
  test('populares: 20 ramos válidos, con ocasiones y temporadas conocidas', () => {
    eq(FL.popular.length, 20);
    FL.popular.forEach((p) => {
      const { bouquet, issues } = B().normalize(p);
      deepEq(issues, [], p.id + ': avisos');
      eq(bouquet.stems.length, p.stems.length, p.id + ': ítems');
      ok(B().total(bouquet) <= FL.limits.stems, p.id + ': total');
      ok(p.occasions.length > 0, p.id + ': sin ocasiones');
      p.occasions.forEach((o) => ok(FL.occasion(o), p.id + ': ocasión ' + o));
      p.seasons.forEach((s) => ok(FL.seasons.includes(s), p.id + ': temporada ' + s));
    });
  });

  test('populares: filtro del mostrador (solo navegador)', () => {
    if (!FL.showcase || !FL.showcase.filter) skip('FL.showcase no está cargado');
    const S = FL.showcase, date = new Date(2026, 8, 28);
    ok(S.filter({ season: 'todo', date, hemisphere: 'S' }).every((p) => !p.seasons.length), 'todo el año');
    ok(S.filter({ theme: 'boda', date, hemisphere: 'S' }).every((p) => p.occasions.includes('boda')), 'temática');
    const now = S.filter({ season: 'ahora', date, hemisphere: 'S' });
    ok(now.every((p) => !p.seasons.length || p.seasons.includes('primavera')), 'ahora = primavera en el sur');
    ok(now[0].seasons.includes('primavera'), 'los de temporada primero');
    eq(S.filter({ season: '', date, hemisphere: 'N' }).length, 20, 'todas');
  });

  /* ---------- 5. Qué dice un ramo ---------- */
  test('lectura: la docena roja habla de amor y nombra la docena', () => {
    const r = FL.reading.interpret(fromPopular('docena-roja'));
    eq(r.source, 'local');
    eq(r.meanings[0].id, 'Amor');
    ok(/docena/i.test(r.summary), r.summary);
    eq(r.tone, 'romántico');
    eq(r.perItem.length, 3);
  });

  test('lectura: avisos de gatos, números pares y sugerencia de follaje', () => {
    const lily = FL.reading.interpret(mk([['lirio', 3], ['rosa-blanca', 2], ['helecho', 2]]));
    ok(lily.warnings.some((w) => /gatos/.test(w)), 'aviso de gatos: ' + lily.warnings.join(' | '));
    const even = FL.reading.interpret(mk([['rosa-roja', 4], ['eucalipto', 3]]));
    ok(even.warnings.some((w) => /pares/.test(w)), 'aviso de pares');
    const odd = FL.reading.interpret(mk([['rosa-roja', 5], ['eucalipto', 3]]));
    ok(!odd.warnings.some((w) => /pares/.test(w)), 'impar sin aviso');
    ok(!odd.suggestions.some((s) => s.item === 'eucalipto'), 'con follaje no sugiere eucalipto');
    const bare = FL.reading.interpret(mk([['gerbera', 3]]));
    ok(bare.suggestions.some((s) => s.action === 'add' && s.item === 'eucalipto'), 'sugiere eucalipto');
    const one = FL.reading.interpret(mk([['rosa-roja', 1]]));
    ok(!one.warnings.some((w) => /pares/.test(w)), 'una sola flor');
    ok(one.summary.includes(FL.taxonomy.numbers.single), 'una sola flor en el resumen');
  });

  test('lectura: pesos normalizados en todos los populares', () => {
    FL.popular.forEach((p) => {
      const r = FL.reading.interpret(fromPopular(p.id));
      approx(r.meanings.reduce((a, m) => a + m.weight, 0), 1, 0.01, p.id);
      ok(r.meanings.every((m, i) => i === 0 || m.weight <= r.meanings[i - 1].weight), p.id + ': orden');
      ok(r.summary.length > 20, p.id + ': resumen');
      r.suggestions.forEach((s) => ok(FL.item(s.item), p.id + ': sugiere ' + s.item));
    });
  });

  test('lectura: la ocasión propone una flor cuando el ramo no encaja', () => {
    const r = FL.reading.interpret(mk([['lavanda', 5], ['eucalipto', 3]], { occasion: 'san-valentin' }));
    const s = r.suggestions.find((x) => /ocasión/.test(x.why));
    ok(s, 'sugerencia por ocasión');
    ok(FL.item(s.item).meanings.includes('Amor'), 'propone algo de amor: ' + s.item);
  });

  /* ---------- 6. Qué ramo dice lo que sientes ---------- */
  const base = { hemisphere: 'S', season: 'primavera' };
  const compose = (req) => FL.reading.compose(Object.assign({}, base, req));
  const isMourning = (res) => res.detected.meanings[0].id === 'Recuerdo' || ['condolencias', 'todos-santos'].includes(res.detected.occasion);
  const isDozen = (res) => res.bouquet.stems.some((s) => s.item === 'rosa-roja' && s.n === 12);
  const INTENTS = [
    { text: 'quiero pedirle perdón a mi hermana, discutimos feo' },
    { text: 'para el cumpleaños de mi mejor amiga' },
    { text: 'mi abuela falleció' },
    { text: 'te amo, feliz aniversario' },
    { text: 'gracias por todo, profesora' },
    { text: 'mejórate pronto, te espero en casa' },
    { text: 'nos casamos en primavera', hemisphere: 'N', season: 'verano' },
    { text: 'una sola flor para mi novia' },
    { text: 'estoy muy estresada, necesito calma', season: 'invierno' },
    { text: 'felicitaciones por tu graduación', petSafe: true },
    { text: 'para mi mamá en su día', petSafe: true },
    { text: 'mi mejor amigo se mudó lejos y lo echo de menos', petSafe: true, season: 'otoño' },
    { text: 'san valentín', exclude: ['rosa-roja'] },
    { text: '' },
    { feelings: ['Esperanza', 'Calma'] },
    { text: 'condolencias a la familia', occasion: 'condolencias' }
  ];

  test('propuesta: perdón → jacinto o tulipán', () => {
    const r = compose({ text: 'quiero pedirle perdón a mi hermana, discutimos feo' });
    eq(r.detected.meanings[0].id, 'Perdón');
    ok(ids(r.bouquet).some((id) => id === 'jacinto' || id === 'tulipan'), 'tallos: ' + ids(r.bouquet).join(', '));
    ok(r.rationale.lead.length > 0 && r.rationale.items.length === r.bouquet.stems.length, 'razones');
  });

  test('propuesta: cumpleaños de una amiga', () => {
    const r = compose({ text: 'para el cumpleaños de mi mejor amiga' });
    eq(r.detected.occasion, 'cumpleanos');
    eq(r.bouquet.occasion, 'cumpleanos');
    ok(['Alegría', 'Amistad'].includes(r.detected.meanings[0].id), 'sentimiento ' + r.detected.meanings[0].id);
  });

  test('propuesta: petSafe deja fuera lo tóxico para gatos y perros', () => {
    INTENTS.forEach((q) => {
      const r = compose(Object.assign({}, q, { petSafe: true }));
      r.bouquet.stems.forEach((s) => {
        const t = FL.item(s.item).care.toxicity;
        ok(!['media', 'alta'].includes(t.cats) && !['media', 'alta'].includes(t.dogs), show(q.text) + ': ' + s.item + ' es tóxico');
      });
    });
  });

  test('propuesta: duelo → recuerdo, sin envoltorio y crisantemo permitido', () => {
    const r = compose({ text: 'mi abuela falleció' });
    eq(r.detected.meanings[0].id, 'Recuerdo');
    eq(r.bouquet.wrap.style, 'ninguno');
    deepEq(B().validate(r.bouquet), [], 'válido');
    // Sin las demás flores de recuerdo, el crisantemo no se castiga en un duelo y queda como líder.
    const others = FL.items.filter((it) => it.id !== 'crisantemo' && it.meanings.includes('Recuerdo') && ['focal', 'secondary', 'spike'].includes(it.bouquet.role)).map((it) => it.id);
    const c = compose({ text: 'mi abuela falleció', exclude: others });
    eq(c.bouquet.stems[0].item, 'crisantemo', 'líder: ' + ids(c.bouquet).join(', '));
    const joy = compose({ text: 'feliz cumpleaños', exclude: FL.items.filter((it) => it.id !== 'crisantemo' && it.meanings.includes('Admiración')).map((it) => it.id) });
    ok(!ids(joy.bouquet).includes('crisantemo') || joy.bouquet.stems[0].item !== 'crisantemo', 'fuera del duelo el crisantemo no lidera');
  });

  test('propuesta: te amo + aniversario → docena de rosas rojas', () => {
    const r = compose({ text: 'te amo, feliz aniversario' });
    eq(r.detected.meanings[0].id, 'Amor');
    eq(r.detected.occasion, 'aniversario');
    deepEq(r.bouquet.stems[0], { item: 'rosa-roja', n: 12 });
    eq(r.bouquet.wrap.style, 'seda');
  });

  test('propuesta: una sola flor', () => {
    const r = compose({ text: 'una sola flor para mi novia' });
    eq(B().flowerCount(r.bouquet), 1);
  });

  test('propuesta: sin sentimientos claros propone alegría', () => {
    const r = compose({ text: 'hola' });
    ok(r.detected.guessed, 'guessed');
    ok(/No encontré/.test(r.rationale.lead), r.rationale.lead);
    ok(r.bouquet.stems.length > 0, 'igual propone un ramo');
  });

  test('propuesta: todas respetan catálogo, límites e impares', () => {
    const L = FL.limits;
    INTENTS.forEach((q) => {
      const r = compose(q), b = r.bouquet, tag = show(q.text || q.feelings);
      deepEq(B().validate(b), [], tag + ': válido');
      ok(b.stems.every((s) => FL.item(s.item)), tag + ': ítems');
      ok(b.stems.length <= L.items && b.stems.every((s) => s.n >= 1 && s.n <= L.stemsPerItem) && B().total(b) <= L.stems, tag + ': límites');
      (q.exclude || []).forEach((id) => ok(!ids(b).includes(id), tag + ': excluido ' + id));
      ok(ids(b).every((id) => FL.item(id).bouquet.florist), tag + ': solo flores de florería');
      const n = B().flowerCount(b);
      if (!isMourning(r) && !isDozen(r)) ok(n % 2 === 1, tag + ': ' + n + ' flores (par)');
      eq(r.reading.source, 'local', tag + ': lectura');
    });
  });

  test('propuesta: determinista para la misma entrada', () => {
    INTENTS.forEach((q) => {
      const a = compose(q), b = compose(q), tag = show(q.text || q.feelings);
      ['stems', 'wrap', 'ribbon', 'layoutSeed', 'occasion', 'intent'].forEach((k) => deepEq(a.bouquet[k], b.bouquet[k], tag + ': ' + k));
      deepEq(a.rationale, b.rationale, tag + ': razones');
      eq(a.reading.summary, b.reading.summary, tag + ': lectura');
    });
    ok(FL.reading.compose({ text: 'gracias' }).bouquet.stems.length > 0, 'sin hemisferio ni temporada');
  });

  /* ---------- 6b. Lo que pide el texto: tamaño, cantidad, flores, colores ---------- */
  const parse = (t) => FL.reading.parse(t);
  const ROSES = ['rosa-roja', 'rosa-blanca', 'rosa-rosada', 'rosa-amarilla'];
  const inc = (a) => a.include.map((w) => w.ids.join('/'));

  test('pedido: tamaño y cantidad', () => {
    eq(parse('un ramo grande para mi novia').size, 'grande');
    eq(parse('algo pequeño y sobrio').size, 'pequeño');
    eq(parse('solo una rosa roja').size, 'una');
    eq(parse('una sola flor').size, 'una');
    eq(parse('para mi hermana grande').size, null, 'la hermana grande es la mayor, no el tamaño');
    eq(parse('unas 15 flores').count, 15);
    eq(parse('una docena de rosas rojas').include[0].n, 12);
    deepEq(parse('tres rosas blancas').include.map((w) => [w.ids.join(), w.n]), [['rosa-blanca', 3]]);
  });

  test('pedido: flores que sí y flores que no', () => {
    deepEq(parse('sin rosas porfa').exclude, ROSES);
    deepEq(parse('sin rosas, lirios ni claveles').exclude, ROSES.concat(['lirio', 'clavel']));
    const b = parse('nada de lirios, pero sí girasoles');
    deepEq(b.exclude, ['lirio']);
    deepEq(inc(b), ['girasol']);
    deepEq(inc(parse('rosas no, girasoles sí')), ['girasol']);
    deepEq(inc(parse('mi mamá no está bien y le gustan los girasoles')), ['girasol'], 'la negación no cruza la «y»');
    deepEq(inc(parse('sin rosas con tulipanes')), ['tulipan']);
    deepEq(inc(parse('nada más que rosas blancas')), ['rosa-blanca']);
    ok(parse('puras rosas amarillas').only, 'solo esas');
    const n = parse('para mi amiga Margarita');
    eq(n.include.length + n.exclude.length, 0, 'Margarita es un nombre');
  });

  test('pedido: colores y ocasión', () => {
    deepEq(parse('algo alegre y amarillo').colors, ['amarillo']);
    const c = parse('algo color lavanda, nada rojo');
    deepEq(c.colors, ['morado']);
    deepEq(c.avoidColors, ['rojo']);
    deepEq(parse('algo rosa pastel').colors, ['rosa']);
    eq(parse('mi amiga se gradúa').occasion, 'graduacion');
    const m = parse('falleció el papá de mi mejor amigo');
    eq(m.occasion, 'condolencias');
    ok(m.mourning, 'duelo');
  });

  test('propuesta: respeta tamaño, cantidad y flores pedidas', () => {
    const r = compose({ text: 'para mi profe que me ayudó un montón, sin rosas porfa' });
    ok(!ids(r.bouquet).some((id) => ROSES.includes(id)), 'sin rosas: ' + ids(r.bouquet).join(', '));
    eq(r.detected.meanings[0].id, 'Gratitud');
    const big = compose({ text: 'un ramo grande para pedirle perdón a mi novia, le encantan los tulipanes' });
    ok(ids(big.bouquet).includes('tulipan'), 'con tulipanes');
    const t = B().total(big.bouquet);
    ok(t >= 19 && t <= 30, 'grande: ' + t);
    const small = compose({ text: 'falleció el papá de mi mejor amigo, algo pequeño y sobrio' });
    eq(small.detected.meanings[0].id, 'Recuerdo', 'el duelo manda sobre la amistad');
    eq(small.bouquet.wrap.style, 'ninguno');
    ok(B().total(small.bouquet) <= 9, 'pequeño: ' + B().total(small.bouquet));
    eq(B().flowerCount(compose({ text: 'mi amiga se gradúa, unas 15 flores' }).bouquet), 15);
    const one = compose({ text: 'solo una rosa roja para mi esposa' });
    eq(B().flowerCount(one.bouquet), 1);
    eq(one.bouquet.stems[0].item, 'rosa-roja');
    deepEq(compose({ text: 'tres rosas blancas' }).bouquet.stems[0], { item: 'rosa-blanca', n: 3 });
    ok(/Tomé en cuenta/.test(big.rationale.lead), big.rationale.lead);
  });

  test('propuesta: colores pedidos y flores tóxicas con mascotas', () => {
    const y = compose({ text: 'algo alegre y amarillo para mi amiga' });
    y.bouquet.stems.filter((s) => FL.item(s.item).type === 'flower')
      .forEach((s) => ok(FL.item(s.item).colors.includes('amarillo'), 'amarilla: ' + s.item));
    const p = compose({ text: 'le encantan los lirios', petSafe: true });
    ok(!ids(p.bouquet).includes('lirio'), 'sin lirio');
    ok(/lirio/.test(p.rationale.lead) && /tóxico/.test(p.rationale.lead), p.rationale.lead);
  });

  /* ---------- 7. Cuidados ---------- */
  test('cuidados: plan de cada ramo popular', () => {
    FL.popular.forEach((p) => {
      const plan = FL.care.plan(fromPopular(p.id));
      ok(plan.first <= plan.last, p.id + ': ' + plan.first + ' > ' + plan.last);
      ok(plan.first > 0, p.id + ': duración');
      deepEq(plan.general, FL.taxonomy.careGeneral, p.id + ': pasos generales');
      ok(plan.general.length > 0, 'pasos generales');
      ok(['mucha', 'media', 'poca'].includes(plan.water), p.id + ': agua');
      ok(/care-plan/.test(FL.care.planHTML(fromPopular(p.id))), p.id + ': HTML');
    });
    const lily = FL.care.plan(fromPopular('condolencias'));
    ok(lily.cats.includes('Lirio'), 'lirio tóxico para gatos');
  });

  test('cuidados: calendario .ics válido', () => {
    const cases = [fromPopular('docena-roja'), mk([['lirio', 3], ['rosa-blanca', 4], ['crisantemo', 2], ['anemona', 2], ['helecho', 2]], {
      name: 'Para la señora Ñuñoa — gracias por todo, de corazón; ¡con cariño! «siempre»'
    })];
    cases.forEach((b, k) => {
      const ics = FL.care.ics(b, new Date(2026, 8, 28));
      ok(ics.startsWith('BEGIN:VCALENDAR\r\n'), 'comienzo');
      ok(!/(^|[^\r])\n/.test(ics), 'solo CRLF');
      ok(ics.includes('\r\nRRULE:FREQ=DAILY;INTERVAL=2'), 'RRULE');
      ok(ics.includes('\r\nDTSTART;VALUE=DATE:20260930\r\n'), 'DTSTART');
      ok(ics.trim().endsWith('END:VCALENDAR'), 'final');
      ics.split('\r\n').forEach((line) => ok(octets(line) <= 75, 'caso ' + k + ': línea de ' + octets(line) + ' octetos: ' + line.slice(0, 40)));
      const flat = ics.replace(/\r\n /g, '');
      ok(flat.includes('SUMMARY:Cambiar el agua de las flores' + (b.name ? ' · ' + b.name.replace(/[,;]/g, (m) => '\\' + m) : '') + '\r\n'), 'caso ' + k + ': SUMMARY íntegro');
    });
  });

  test('cuidados: ficha de una flor', () => {
    ok(/Gatos: grave/.test(FL.care.section(FL.item('lirio'))), 'lirio');
    ok(/En florero dura de \d+ a \d+ días/.test(FL.care.lifeText(FL.item('rosa-roja').care)), 'duración');
  });

  /* ---------- 8. Dibujo del ramo ---------- */
  test('dibujo: un nodo por tallo en cada ramo popular', () => {
    FL.popular.forEach((p) => {
      const b = fromPopular(p.id), lay = FL.bouquetArt.arrange(b);
      eq(lay.nodes.length, B().total(b), p.id);
      eq(lay.count, B().total(b), p.id + ': count');
      lay.nodes.forEach((n) => ok(isFinite(n.x) && isFinite(n.y), p.id + ': coordenadas'));
    });
  });

  test('dibujo: las protagonistas se ven (visibilidad ≥ 0,7)', () => {
    const low = [];
    FL.popular.forEach((p) => {
      const nodes = FL.bouquetArt.arrange(fromPopular(p.id)).nodes;
      const vis = FL.layout.visibility(nodes);
      nodes.forEach((n, i) => { if (n.role === 'focal' && vis[i] < 0.7) low.push(p.id + '/' + n.it.id + ' ' + vis[i].toFixed(2)); });
    });
    eq(low.length, 0, low.join(', '));
  });

  test('dibujo: la misma semilla da la misma composición', () => {
    const b = fromPopular('novia-primavera');
    const a1 = FL.bouquetArt.arrange(b).nodes.map((n) => [n.x, n.y]);
    const a2 = FL.bouquetArt.arrange(b).nodes.map((n) => [n.x, n.y]);
    deepEq(a1, a2);
  });

  test('dibujo: ids de degradado únicos y ramo vacío', () => {
    const b = fromPopular('girasoles');
    const g1 = (FL.bouquetArt.render(b).svg.match(/id="(bq\d+)w"/) || [])[1];
    const g2 = (FL.bouquetArt.render(b).svg.match(/id="(bq\d+)w"/) || [])[1];
    ok(g1 && g2 && g1 !== g2, 'ids ' + g1 + ' / ' + g2);
    const r = FL.bouquetArt.render(b, { label: 'Un "ramo"', cls: 'mini' });
    ok(/^<svg class="bq mini"/.test(r.svg) && r.svg.includes('aria-label="Un &quot;ramo&quot;"'), 'etiqueta y clases');
    eq(r.nodes.length, B().total(b));
    const empty = FL.bouquetArt.render(B().create());
    ok(/class="bq bq-empty/.test(empty.svg), 'vacío');
    deepEq(empty.nodes, []);
    ok(/bq-empty/.test(FL.bouquetArt.render(null).svg), 'null');
    ok(!/url\(#bq/.test(FL.bouquetArt.render(fromPopular('condolencias')).svg), 'sin envoltorio no usa degradados');
  });

  /* ---------- Regresiones de la revisión ---------- */
  test('lectura: la docena no pide ser impar', () => {
    const r = FL.reading.interpret(fromPopular('docena-roja'));
    ok(!r.warnings.some((w) => /pares/.test(w)), 'sin aviso de pares');
    ok(!r.suggestions.some((s) => /impar/.test(s.why)), 'sin sugerencia de impar');
  });

  test('lectura: artículo según el nombre y sin «con notas de .» vacío', () => {
    const one = (item) => FL.reading.interpret(B().create({ stems: [{ item, n: 1 }] })).summary;
    ok(/El girasol lleva/.test(one('girasol')), one('girasol'));
    ok(/La gerbera lleva/.test(one('gerbera')), one('gerbera'));
    ok(/La flor de cerezo lleva/.test(one('cerezo')), one('cerezo'));
    FL.items.forEach((it) => ok(!/con notas de \./.test(one(it.id)), it.id));
  });

  test('lectura: la sugerencia de impar no apunta a un ítem ya en el máximo', () => {
    const b = B().create({ stems: [{ item: 'rosa-roja', n: 24 }, { item: 'clavel', n: 2 }] });
    FL.reading.interpret(b).suggestions.filter((s) => /impar/.test(s.why)).forEach((s) => ok(s.item !== 'rosa-roja', 'no la rosa en 24'));
  });

  test('cuidados: un salto de línea en el nombre no abre otra propiedad del .ics', () => {
    const b = B().create({ stems: [{ item: 'rosa-roja', n: 3 }] });
    b.name = ['Ramo', 'ATTENDEE:mailto:x@y.z', 'DESCRIPTION:hola', 'fin'].join(String.fromCharCode(13)) + String.fromCharCode(0x2028) + 'X' + String.fromCharCode(0x85) + 'Y';
    const ics = FL.care.ics(b, new Date(2026, 8, 28));
    const lines = ics.split(String.fromCharCode(13, 10));
    ok(!lines.some((l) => /^(ATTENDEE|DESCRIPTION:hola)/.test(l)), 'sin propiedades inyectadas');
    const rest = lines.join('');
    [13, 10, 0x2028, 0x85].forEach((c) => ok(!rest.includes(String.fromCharCode(c)), 'sin salto suelto ' + c));
  });

  test('cuidados: un ramo solo en maceta no pide cambiar el agua', () => {
    const b = B().create({ stems: [{ item: 'orquidea', n: 1 }] });
    const p = FL.care.plan(b);
    eq(p.cut, 0);
    deepEq(p.general, []);
    eq(FL.care.ics(b), null);
  });
})(typeof window !== 'undefined' ? window : globalThis);
