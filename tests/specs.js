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

  test('buscadores: todas las palabras, sin tildes y con plurales', () => {
    const h = FL.u.norm('Día de la Madre · Rosa roja · Girasol');
    ok(FL.u.matches(h, ''), 'sin texto, todo');
    ok(FL.u.matches(h, 'DIA madre'), 'sin tildes ni mayúsculas');
    ok(FL.u.matches(h, 'rosas rojas'), 'plural en -s');
    ok(FL.u.matches(h, 'girasoles'), 'plural en -es');
    ok(!FL.u.matches(h, 'rosa blanca'), 'todas las palabras');
    ok(!FL.u.matches(h, 'tulipanes'), 'lo que no está');
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
    // Una lectura antigua de la IA (ramos guardados antes de quitarla) no viaja en el enlace.
    eq((await B().decode(await B().encode(ai))).reading, undefined, 'Una lectura antigua de la IA (ramos guardados antes de quitarla) no viaja en el enlace');
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

  test('fechas: cada ocasión dice por qué y nombra flores del catálogo', () => {
    if (!FL.calendar || !FL.calendar.list) skip('FL.calendar no está cargado');
    const list = FL.calendar.list(new Date(2026, 0, 1));
    const ids = list.map((o) => o.id);
    FL.taxonomy.occasions.forEach((o) => ok(ids.includes(o.id), 'falta ' + o.id));
    ok(ids.includes('sant-jordi'), 'Sant Jordi');
    eq(new Set(ids).size, ids.length, 'sin repetidos');
    const firstOpen = list.findIndex((o) => !o.when);
    ok(firstOpen > 0 && list.slice(0, firstOpen).every((o) => o.when), 'primero las fechas');
    for (let i = 1; i < firstOpen; i++) ok(list[i].when >= list[i - 1].when, 'orden cronológico');
    const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    eq(iso(list.find((o) => o.id === 'san-valentin').when), '2026-02-14');
    eq(iso(list.find((o) => o.id === 'sant-jordi').when), '2026-04-23');
    eq(iso(list.find((o) => o.id === 'dia-madre').when), '2026-05-10');
    eq(list.find((o) => o.id === 'cumpleanos').when, null);
    list.forEach((o) => {
      ok(o.why && o.why.length > 40, o.id + ': por qué');
      ok(o.flowers.length > 0, o.id + ': flores');
      o.flowers.forEach((id) => ok(FL.item(id), o.id + ': ' + id));
      if (o.theme) ok(FL.popular.some((p) => p.occasions.includes(o.id)), o.id + ': ramo');
    });
    ok(list.find((o) => o.id === 'san-valentin').flowers.includes('rosa-roja'));
    ok(list.find((o) => o.id === 'todos-santos').flowers.includes('crisantemo'));
    ok(!list.find((o) => o.id === 'sant-jordi').theme, 'Sant Jordi no abre el mostrador');
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

  // Lo que comparten las pruebas del buscador: la lectura del ramo, su peso de un sentimiento y la cuenta de flores.
  const R = FL.reading;
  const weightOf = (r, m) => (r.reading.meanings.find((x) => x.id === m) || { weight: 0 }).weight;
  const flowerCount = (t) => B().flowerCount(compose({ text: t }).bouquet);
  const tagOf = (q) => show(q.text != null ? q.text : q.feelings);
  // Celdas (sentimiento|mascotas) donde ninguna flor permitida puede decir el sentimiento. Si el catálogo cambia, se actualiza aquí.
  const KNOWN_GAPS = ['Perdón|true'];

  test('propuesta: la lectura dice lo mismo que la intención (KNOWN_GAPS)', () => {
    FL.meanings.forEach((m) => FL.taxonomy.seasons.forEach((season) => [false, true].forEach((petSafe) => {
      const r = compose({ feelings: [m], season, petSafe }), tag = m + ' · ' + season + (petSafe ? ' · mascotas' : '');
      if (r.detected.fallback) {
        ok(KNOWN_GAPS.includes(m + '|' + petSafe), tag + ': respaldo inesperado');
        ok(/Ninguna flor segura para mascotas habla de/.test(r.rationale.lead), tag + ': ' + r.rationale.lead);
        return;
      }
      const rd = R.interpret(r.bouquet).meanings;
      eq(rd[0].id, m, tag);
      if (r.search.delta > 0) ok(rd[0].weight - (rd[1] ? rd[1].weight : 0) >= 0.035, tag + ': margen ' + show(rd.slice(0, 2)));
    })));
    // Si alguien da a Perdón una flor segura para mascotas, esto falla y KNOWN_GAPS se actualiza.
    FL.taxonomy.seasons.forEach((season) => ok(compose({ feelings: ['Perdón'], season, petSafe: true }).detected.fallback, 'Perdón con mascotas en ' + season));
  });

  test('propuesta: pares de sentimientos', () => {
    FL.meanings.forEach((a, i) => FL.meanings.slice(i + 1).forEach((b) => {
      const r = compose({ feelings: [a, b] });
      eq(R.interpret(r.bouquet).meanings[0].id, r.detected.top, a + ' + ' + b);
    }));
  });

  test('propuesta: INTENTS — lectura, protagonista y texto coinciden', () => {
    INTENTS.forEach((q) => {
      const r = compose(q), tag = tagOf(q);
      eq(r.reading.meanings[0].id, r.detected.top, tag + ': lectura');
      if (!r.detected.ask.include.length && !isDozen(r) && !r.detected.fallback) {
        ok(FL.item(r.bouquet.stems[0].item).meanings.includes(r.detected.top), tag + ': la protagonista dice ' + r.detected.top);
      }
      const m = r.rationale.lead.match(/lo dice: (.+?) queda en primer lugar/);
      if (m) eq(m[1], R.phraseFor(r.bouquet, r.detected.top), tag + ': frase');
    });
  });

  test('propuesta: la búsqueda es exacta', () => {
    [{ text: 'quiero pedirle perdón a mi hermana' }, { text: 'mi abuela falleció' }, { text: 'unas 15 flores para mi amiga' },
      { text: 'algo alegre y amarillo' }, { feelings: ['Esperanza', 'Calma'] }].forEach((q) => {
      deepEq(R.compose(Object.assign({}, base, q), { exhaustive: true }).bouquet.stems, compose(q).bouquet.stems, tagOf(q));
    });
  });

  test('propuesta: rápida y completa', () => {
    INTENTS.forEach((q) => {
      const s = compose(q).search, tag = tagOf(q);
      eq(s.exact, true, tag + ': exacta');
      ok(s.opened < 3000, tag + ': ' + s.opened + ' núcleos');
      ok(s.ms < 400, tag + ': ' + s.ms + ' ms');
    });
  });

  test('propuesta: crisantemo y orquídea solo si se piden', () => {
    const party = ids(compose({ text: 'feliz cumpleaños' }).bouquet);
    ok(!party.includes('crisantemo') && !party.includes('orquidea'), party.join(', '));
    ok(ids(compose({ text: 'quiero crisantemos para mi abuela' }).bouquet).includes('crisantemo'), 'crisantemo pedido');
    ok(ids(compose({ text: 'una orquídea para mi jefa' }).bouquet).includes('orquidea'), 'orquídea pedida');
  });

  test('propuesta: nada rojo y nada romántico', () => {
    const red = compose({ text: 'algo para mi novia, nada rojo' });
    ok(!red.bouquet.stems.some((s) => FL.item(s.item).colors.every((c) => c === 'rojo')), 'sin rojo: ' + ids(red.bouquet).join(', '));
    const r = compose({ text: 'te quiero, pero no de forma romántica' });
    ok(!ids(r.bouquet).includes('rosa-roja'), 'sin rosa roja');
    ok(r.bouquet.wrap.style !== 'seda', 'sin seda');
    ok(weightOf(r, 'Amor') < 0.1, 'Amor ' + weightOf(r, 'Amor'));
    ok(/Dejé fuera lo que sonara a/.test(r.rationale.lead), r.rationale.lead);
    ok(!/Dejé fuera/.test(compose({ text: 'gracias por todo, profesora' }).rationale.lead), 'lo que evita la profe no se cuenta');
  });

  test('propuesta: cariño de familia no es una declaración', () => {
    const r = compose({ text: 'te quiero mucho hermanita' });
    ok(!ids(r.bouquet).includes('rosa-roja'), ids(r.bouquet).join(', '));
    eq(r.bouquet.wrap.style, 'kraft');
    ok(!/amor declarado|Declarar amor/.test(r.reading.summary + r.rationale.lead), r.reading.summary);
  });

  test('propuesta: plantillas de tamaño', () => {
    ok([5, 7].includes(flowerCount('algo pequeño para mi amiga')), 'pequeño: ' + flowerCount('algo pequeño para mi amiga'));
    eq(flowerCount('un ramo grande para celebrar'), 21, 'grande');
    eq(flowerCount('unas 9 flores'), 9);
    eq(compose({ text: 'una docena de rosas' }).bouquet.stems[0].n, 12, 'docena');
  });

  test('propuesta: duelo sin perdón ni fiesta', () => {
    const r = compose({ text: 'lo siento mucho por tu pérdida' });
    eq(r.detected.occasion, 'condolencias');
    eq(r.bouquet.wrap.style, 'ninguno');
    ok(!/pedir perdón/i.test(r.rationale.lead + r.reading.summary), r.rationale.lead);
    ok(weightOf(r, 'Perdón') < 0.1, 'Perdón ' + weightOf(r, 'Perdón'));
    const c = compose({ text: 'feliz cumpleaños a mi abuela que ya no está' });
    ok(c.bouquet.occasion !== 'cumpleanos', 'sin cumpleaños');
    ok(/Lo leí como un recuerdo, no como una fiesta/.test(c.rationale.lead), c.rationale.lead);
    eq(compose({ text: 'no te pido perdón, te doy las gracias' }).detected.occasion !== 'disculpa', true, 'sin disculpa');
  });

  test('propuesta: extrañar no es duelo', () => {
    const r = compose({ text: 'te extraño mucho' });
    ok(r.bouquet.wrap.style !== 'ninguno', 'con envoltorio');
    ok(B().flowerCount(r.bouquet) % 2 === 1, B().flowerCount(r.bouquet) + ' flores');
  });

  test('propuesta: sin recuerdo donde no va', () => {
    ['mejórate pronto, te espero en casa', 'estoy muy triste porque mi amiga está en el hospital', 'felicitaciones por tu graduación', 'ramo para mi profe que se jubila']
      .forEach((t) => ok(weightOf(compose({ text: t }), 'Recuerdo') < 0.1, t));
  });

  test('propuesta: temporada honesta', () => {
    const inSeason = (it, s) => !it.seasons.length || it.seasons.includes(s) || it.seasons.length >= 4;
    FL.taxonomy.seasons.forEach((s) => {
      const r = compose({ feelings: ['Gratitud'], season: s }), lead = r.rationale.lead;
      if (/Prioricé flores de/.test(lead)) {
        let fw = 0, sw = 0;
        r.bouquet.stems.forEach((x) => {
          const it = FL.item(x.item);
          if (it.bouquet.role === 'greenery') return;
          const w = R.weight(it, x.n);
          fw += w;
          if (inSeason(it, s)) sw += w;
        });
        ok(inSeason(FL.item(r.bouquet.stems[0].item), s) || sw >= fw / 2, s + ': ' + ids(r.bouquet).join(', '));
      } else ok(/pocas flores de temporada/.test(lead), s + ': ' + lead);
    });
  });

  test('propuesta: explicación legible', () => {
    const extra = ['algo para mi novia, nada rojo', 'te quiero, pero no de forma romántica', 'gracias por todo, profesora', 'te quiero mucho hermanita',
      'algo pequeño para mi amiga', 'un ramo grande para celebrar', 'unas 9 flores', 'una docena de rosas', 'lo siento mucho por tu pérdida',
      'feliz cumpleaños a mi abuela que ya no está', 'no te pido perdón, te doy las gracias', 'te extraño mucho'].map((text) => ({ text }));
    const BAD = ['undefined', 'NaN', '  ', ' .', '%', 'de el '];
    INTENTS.concat(extra).forEach((q) => {
      const r = compose(q), tag = tagOf(q), named = new Set([].concat(...r.detected.ask.include.map((w) => w.ids)));
      [r.rationale.lead].concat(r.rationale.items.map((x) => x.why)).forEach((s) => BAD.forEach((w) => ok(!s.includes(w), tag + ': «' + w + '» en ' + show(s))));
      r.rationale.items.forEach((x) => {
        ok(/\)$/.test(x.why), tag + ': ' + x.why);
        if (named.has(x.item)) ok(/^(la|lo|las|los) pediste; /.test(x.why), tag + ': ' + x.why);
      });
    });
    const sis = compose({ text: 'quiero pedirle perdón a mi hermana' }).rationale.lead;
    ok(sis.includes('para tu hermana') && !/hermanos/.test(sis), sis);
    const mem = compose({ text: 'falleció el papá de mi mejor amigo' }).rationale.lead;
    ok(mem.includes('en memoria de su papá'), mem);
    const neg = compose({ text: 'no estoy enojada, solo quiero agradecerte' }).rationale.lead;
    ok(neg.includes('No conté «enojada»'), neg);
  });

  test('propuesta: variedad determinista y otra opción', () => {
    const seen = new Set();
    ['Ana', 'Beto', 'Carla', 'Diego', 'Elisa', 'Fede', 'Gabi', 'Hugo', 'Inés', 'Juan', 'Kari', 'Lucas']
      .forEach((n) => ids(compose({ text: 'gracias por todo, ' + n }).bouquet).forEach((id) => seen.add(id)));
    ok(seen.has('helecho') && seen.has('ruscus'), 'follajes: ' + Array.from(seen).join(', '));
    const a = compose({ text: 'gracias por todo' });
    const b = compose({ text: 'gracias por todo', avoidLeads: [a.bouquet.stems[0].item] });
    ok(b.bouquet.stems[0].item !== a.bouquet.stems[0].item || b.search.cycled, 'otra protagonista: ' + b.bouquet.stems[0].item);
  });

  /* Pegar en tests/specs.js al final del bloque «6. Qué ramo dice lo que sientes», justo antes de
     «/* ---------- 6b. Lo que pide el texto: tamaño, cantidad, flores, colores ---------- *\/».
     Usa las ayudas de ese bloque: base, compose, isDozen, R, weightOf, tagOf, ids, B, show. */

  // Hallazgos 20 y 21: nunca un ramo vacío; si hubo que achicarlo, el texto lo dice.
  test('propuesta: nunca un ramo vacío (nombradas con cantidad, muchas flores, colores escasos)', () => {
    ['para mi mamá: una hortensia y cinco margaritas', 'una rosa roja y cinco margaritas para mi novia', 'un tulipán y siete fresias para pedir perdón',
      'para mi amiga: un girasol y cinco tulipanes', 'unas 44 flores en tonos rosados', 'unas 46 flores en tonos morados',
      'dos docenas de rosas y dos docenas de girasoles', '23 girasoles y 22 margaritas', '13 rosas, 13 girasoles, 13 lirios, 13 tulipanes',
      'rosas, girasoles, lirios, tulipanes, peonías, margaritas, claveles, dalias, gerberas, fresias, iris'].forEach((text) => {
      const r = compose({ text });
      ok(r.bouquet.stems.length > 0, text);
      ok(!/prueba sacar alguna exclusión/.test(r.rationale.lead), text + ': ' + r.rationale.lead);
    });
    const blue = compose({ text: 'feliz san valentín mi amor, unas 48 flores, en tonos azul', season: 'otoño', petSafe: true });
    ok(blue.bouquet.stems.length > 0, 'azul con mascotas');
    ok(/no alcanzan las flores para cuarenta y cuatro: armé uno de \d+ flores/.test(blue.rationale.lead), blue.rationale.lead);
  });

  // Hallazgos 22 y 23: «rosas» sigue las reglas de siempre; la docena roja no ignora el color pedido.
  test('propuesta: «rosas» no trae rosa roja sin romance ni con «nada rojo»; la docena respeta el color', () => {
    ['solo rosas', 'unas rosas', 'una docena de rosas', 'unas rosas para mi novia, nada rojo'].forEach((text) =>
      ok(!ids(compose({ text }).bouquet).includes('rosa-roja'), text));
    ['feliz san valentín mi amor, en tonos rosado', 'para mi novia en nuestro aniversario, algo blanco'].forEach((text) =>
      ok(!isDozen(compose({ text })), text));
  });

  // Hallazgos 24, 30 y 57: «Otra opción» cambia la protagonista o avisa que volvió a empezar, también con flores nombradas.
  test('propuesta: «Otra opción» nunca repite sin avisar', () => {
    ['tres rosas para mi mamá', 'unos tulipanes para pedirle perdón a mi hermana', 'quiero girasoles para mi amiga', 'con 5 girasoles',
      'una docena de rosas rojas para mi novia en nuestro aniversario', 'feliz san valentín mi amor', 'una sola flor para mi mamá',
      'algo pequeño para mi amiga'].forEach((text) => {
      const seen = [];
      for (let k = 0; k < 15; k++) {
        const r = compose({ text, avoidLeads: seen.slice() }), lead = r.bouquet.stems[0].item;
        if (r.search.cycled) return;
        ok(!seen.includes(lead), text + ': repite ' + lead + ' sin cycled');
        ok(r.search.agree || !seen.length || /a la par de/.test(r.rationale.lead), text + ': «Otra opción» llevó a una lectura que no coincide (' + lead + ')');
        seen.push(lead);
      }
      ok(false, text + ': no volvió a empezar');
    });
  });

  // Hallazgos 25, 26, 32 y 44: el texto nunca dice que aparece lo que la lectura no tiene, ni «X primero y X también».
  test('propuesta: «también aparece» solo lo que la lectura tiene', () => {
    [{ text: 'en tonos azul' }, { text: 'una sola rosa roja para mi mamá' }, { text: 'quiero una orquídea para mi mamá' },
      { text: 'para mi novia, de color morado', season: 'verano', hemisphere: 'N' }, { text: 'perdóname, solo girasoles', season: 'verano', petSafe: true },
      { text: 'solo girasoles para mi amiga', season: 'verano' }, { text: 'solo lirio', season: 'invierno', hemisphere: 'N', feelings: ['Recuerdo', 'Esperanza', 'Alegría'] },
      { text: 'con 5 girasoles', season: 'verano' }].forEach((q) => {
      const r = compose(q), L = r.rationale.lead, tag = tagOf(q);
      const phr = (id) => R.phraseFor(r.bouquet, id, r.detected.romance);
      const said = FL.meanings.filter((m) => new RegExp('(?:y|también) ' + phr(m) + ' (?:también )?(?:aparecen?|en segundo lugar)|también aparecen? ' + phr(m) + '\\.').test(L));
      said.forEach((m) => ok(weightOf(r, m) > 0, tag + ': dice que aparece ' + m + ' — ' + L));
      FL.meanings.forEach((m) => ok(!L.includes(phr(m) + ' queda primero y ' + phr(m)), tag + ': ' + L));
      const near = /Busqué flores de ([^.]*), que van con ese gesto/.exec(L);
      if (near) FL.meanings.filter((m) => near[1].includes(phr(m))).forEach((m) => ok(weightOf(r, m) > 0, tag + ': busqué ' + m + ' — ' + L));
    });
  });

  // Hallazgos 27, 38 y 55: sin romance, ni la propuesta ni la lectura dicen «amor declarado», aunque el ramo lleve rojo.
  test('propuesta: sin romance nunca «amor declarado»', () => {
    ['te extraño mucho mamá', 'te extraño mucho papá', 'te echo de menos, hermano', 'te extraño mucho', 'una sola rosa roja para mi mamá',
      'para mi amiga: un girasol y cinco tulipanes', 'nada romántico, para mi colega'].forEach((text) => FL.taxonomy.seasons.forEach((season) => {
      const r = compose({ text, season });
      if (r.detected.romance) return;
      const all = [r.rationale.lead, r.reading.summary].concat(r.rationale.items.map((x) => x.why)).join(' ');
      ok(!/amor declarado|Declarar amor|declaración de amor/.test(all), text + ' en ' + season + ': ' + all);
    }));
    const r = compose({ feelings: ['Recuerdo'], occasion: 'dia-madre', season: 'invierno' });
    ok(!/amor declarado/.test(r.rationale.lead + r.reading.summary), r.reading.summary);
    // La lectura de un ramo guardado usa su pedido: con «te extraño, papá» las rosas rojas son cariño; sin pedido, decide el rojo.
    const red = (intent) => B().create(Object.assign({ stems: [{ item: 'rosa-roja', n: 7 }] }, intent ? { intent } : {}));
    eq(R.phraseFor(red({ text: 'te extraño mucho papá' }), 'Amor'), 'cariño');
    ok(!/amor declarado/.test(R.display(red({ text: 'te extraño mucho papá' })).summary), 'display con pedido de familia');
    eq(R.phraseFor(red({ text: 'te amo mi amor' }), 'Amor'), 'amor declarado');
    eq(R.phraseFor(red(null), 'Amor'), 'amor declarado');
    ok(/Dejé fuera lo que sonara a romance/.test(compose({ text: 'te quiero, pero no de forma romántica' }).rationale.lead), 'romance, no «amor declarado»');
  });

  // Hallazgo 33: la razón «mascotas» solo si las que lo dirían son tóxicas.
  test('propuesta: el respaldo culpa a la regla que de verdad sacó las flores', () => {
    [{ text: 'te amo mamá, todo morado', season: 'verano', petSafe: true }, { text: 'nos casamos, para mi sobrina, de color morado', petSafe: true },
      { text: 'perdóname, por favor', petSafe: true }, { text: 'perdóname, sin tulipanes ni jacintos' }].forEach((q) => {
      const r = compose(q), fb = r.detected.fallback;
      if (!fb) return;
      if (fb.reason === 'mascotas') fb.blockers.forEach((id) => ok(['cats', 'dogs'].some((k) => ['media', 'alta'].includes(FL.item(id).care.toxicity[k])), tagOf(q) + ': ' + id));
      if (/tóxic[oa]s? para ellas/.test(r.rationale.lead)) eq(fb.reason, 'mascotas', tagOf(q));
    });
  });

  // Hallazgo 34: la lectura no sugiere una flor tóxica con mascotas ni una que se pidió dejar fuera.
  test('lectura: las sugerencias respetan mascotas y exclusiones', () => {
    [{ text: 'perdóname, por favor', hemisphere: 'N', petSafe: true }, { text: 'nos casamos, para mi sobrina, de color morado', petSafe: true },
      { text: 'te extraño mucho', petSafe: true }, { feelings: ['Perdón'], petSafe: true }].forEach((q) =>
      compose(q).reading.suggestions.forEach((s) => ok(!['cats', 'dogs'].some((k) => ['media', 'alta'].includes(FL.item(s.item).care.toxicity[k])), tagOf(q) + ': ' + s.item)));
    const r = compose({ text: 'perdóname, sin tulipanes ni jacintos' });
    r.reading.suggestions.forEach((s) => ok(!['tulipan', 'jacinto'].includes(s.item), 'sugiere ' + s.item));
    ok(!/podrías sumar (tulipán|jacinto)/.test(r.reading.summary), r.reading.summary);
  });

  // Hallazgos 39 y 46: el color pedido solo si es el que la flor muestra; el papel es el de este ramo.
  test('propuesta: color y papel de cada flor, verdaderos', () => {
    [{ text: 'para mi novia, de color morado', season: 'verano', hemisphere: 'N' }, { text: 'flores amarillas para mi amiga' },
      { text: 'quiero algo de color azul y blanco para mi abuelo' }, { text: 'quiero pedirle perdón a mi hermana, discutimos feo' },
      { text: 'te extraño mucho' }, { feelings: ['Calma'], season: 'verano', hemisphere: 'N' }].forEach((q) => {
      const r = compose(q), tag = tagOf(q);
      r.rationale.items.forEach((x, k) => {
        const c = /; en (\S+), como pediste/.exec(x.why);
        if (c) eq(FL.item(x.item).colors[0], c[1], tag + ': ' + x.name);
        if (k > 0) ok(!/\(protagonista\)$/.test(x.why), tag + ': ' + x.name + ' — ' + x.why);
        if (k === 0) ok(!/\(acompañante\)$/.test(x.why), tag + ': ' + x.name + ' — ' + x.why);
      });
    });
  });

  // Hallazgos 40, 45, 51 y 52: concordancia, «ni», sin «la que» suelta ni ecos «cariño («cariño»)».
  test('propuesta: castellano cuidado en la explicación', () => {
    const lead = (q) => compose(typeof q === 'string' ? { text: q } : q).rationale.lead;
    ok(/nuevos comienzos quedan en primer lugar/.test(lead('bienvenida al mundo, bebé')), lead('bienvenida al mundo, bebé'));
    ok(/también aparecen nuevos comienzos/.test(lead({ occasion: 'boda', season: 'verano' })), lead({ occasion: 'boda', season: 'verano' }));
    ok(/No conté «triste», «enojada» ni «preocupada» porque los negaste/.test(lead('no estoy triste ni enojada ni preocupada, solo quiero agradecerle')), 'ni');
    ok(/nada rojo ni amarillo/.test(lead('nada rojo ni amarillo, para mi suegra')), 'nada … ni');
    ok(/sin tulipanes ni jacintos/.test(lead('perdóname, sin tulipanes ni jacintos')), 'sin … ni');
    ['una docena de rosas rojas para mi novia', 'una sola rosa'].forEach((t) => ok(!/(pediste|novia)\. Elegí la que/.test(lead(t)), t + ': ' + lead(t)));
    ok(/^Partí de la ocasión: San Valentín\./.test(lead({ occasion: 'san-valentin' })), lead({ occasion: 'san-valentin' }));
    ['para mi mamá con mucho cariño', 'tengo miedo', 'un abrazo'].forEach((t) => ok(!/(\S+) \(«\1»\)/.test(lead(t)), t + ': ' + lead(t)));
    ok(/con una hortensia y cinco margaritas/.test(lead('para mi mamá: una hortensia y cinco margaritas')), lead('para mi mamá: una hortensia y cinco margaritas'));
    // «Propongo un ramo alegre» solo si el ramo es de alegría (los lirios con mascotas quedan fuera, pero el ramo sale de ellos).
    const lil = compose({ text: 'le encantan los lirios', petSafe: true });
    ok(!/ramo alegre/.test(lil.rationale.lead) || lil.detected.top === 'Alegría', lil.rationale.lead);
    // Las tóxicas nombradas, en una sola nota; si el respaldo ya habló de mascotas, no se repite.
    const tox = compose({ text: 'gracias, 9 jazmín, amapolas, limonium, 6 cerezo, jacintos y gypsophila', season: 'otoño', petSafe: true }).rationale.lead;
    ok(/Dejé fuera la amapola, la flor de cerezo y el jacinto: son tóxicos para mascotas\./.test(tox), tox);
    const tul = compose({ text: 'perdóname, para mi profe, con tulipanes y margaritas', season: 'verano', petSafe: true }).rationale.lead;
    eq((tul.match(/tulipán/g) || []).length, 1, tul);
  });

  // Hallazgo 41: «pocas flores de temporada» solo cuando el catálogo de verdad tiene pocas.
  test('propuesta: «pocas flores de temporada» solo si es cierto', () => {
    const pool = FL.items.filter((it) => it.type === 'flower' && it.bouquet.florist && ['focal', 'secondary', 'spike'].includes(it.bouquet.role));
    const inSeason = (it, s) => !it.seasons.length || it.seasons.includes(s) || it.seasons.length >= 4;
    [{ text: 'gracias por todo, para mis tías, con lavanda' }, { text: 'mi amiga está en el hospital, que se mejore pronto' }, { text: 'Lirios para mi abuela' },
      { feelings: ['Gratitud'], season: 'verano' }, { feelings: ['Gratitud'], season: 'invierno' }].forEach((q) => {
      const r = compose(q), s = q.season || base.season;
      if (/pocas flores de temporada/.test(r.rationale.lead)) ok(pool.filter((it) => inSeason(it, s)).length * 3 < pool.length, tagOf(q) + ': ' + r.rationale.lead);
    });
    ok(/La lavanda no es flor de primavera, pero la pediste/.test(compose({ text: 'gracias por todo, para mis tías, con lavanda' }).rationale.lead), 'la pediste');
  });

  // Hallazgos 42 y 43: una fiesta no se lee como perdón ni luto; «no como una fiesta» solo si había fiesta.
  test('propuesta: las fiestas no hablan de perdón ni de luto', () => {
    ['boda', 'nacimiento', 'cumpleanos', 'graduacion'].forEach((occasion) => FL.taxonomy.seasons.forEach((season) => [false, true].forEach((petSafe) => {
      const r = compose({ occasion, season, petSafe }), S = r.reading.summary;
      ok(!/pedido de perdón|luto/.test(S), occasion + ' ' + season + ': ' + S);
      ok(!/recuerdo/.test(S), occasion + ' ' + season + ': ' + S);
    })));
    ok(!/no como una fiesta/.test(compose({ text: 'mi papá murió, quiero agradecer a los doctores' }).rationale.lead), 'agradecer no es fiesta');
  });

  // Hallazgos 28 y 48: lo nombrado está o una nota dice por qué; el número que se repite es el pedido o el armado.
  test('propuesta: rellenos nombrados y números que se repiten', () => {
    const a = compose({ text: 'rosas con gypsophila y limonium' });
    ok(ids(a.bouquet).includes('limonium') || /limonium quedó fuera/.test(a.rationale.lead), a.rationale.lead);
    const b = compose({ text: 'girasoles con eucalipto y helecho' });
    ok(ids(b.bouquet).includes('helecho') || /helecho quedó fuera/.test(b.rationale.lead), b.rationale.lead);
    const c = compose({ text: 'cien flores para mi mamá', season: 'verano' });
    ok(!/cuarenta y ocho flores/.test(c.rationale.lead), c.rationale.lead);
    ok(new RegExp('armé ' + B().flowerCount(c.bouquet) + ' flores').test(c.rationale.lead), c.rationale.lead);
  });

  // Hallazgos 50 y 53: los sentimientos marcados se citan como se marcaron; mayúsculas y artículo de la ocasión.
  test('propuesta: sentimientos marcados y ocasiones bien escritos', () => {
    ok(/Partí de lo que marcaste: amor\./.test(compose({ text: 'en tonos blancos', feelings: ['Amor'], season: 'verano' }).rationale.lead), 'amor');
    ok(/No encontré cómo sumar un pedido de perdón/.test(compose({ feelings: ['Amor', 'Perdón'], season: 'verano', petSafe: true }).rationale.lead), 'perdón perdido');
    ok(/Encaja con la ocasión: San Valentín\./.test(compose({ occasion: 'san-valentin', feelings: ['Amistad'] }).reading.summary), 'San Valentín');
    const one = (occasion) => R.interpret(B().create({ stems: [{ item: 'girasol', n: 7 }], occasion })).summary;
    ok(/Para una boda, podrías sumar/.test(one('boda')), one('boda'));
    ok(/Para el Día de la Madre, podrías sumar/.test(one('dia-madre')), one('dia-madre'));
    ['Rosas rojas para mi novia', 'Lirios para mi abuela'].forEach((t) => ok(!/con [A-ZÁÉÍÓÚ]/.test(compose({ text: t }).rationale.lead), t));
  });

  // Hallazgo 54: un párrafo legible y lo de las mascotas una sola vez.
  test('propuesta: explicación sin repetir lo de las mascotas y de largo razonable', () => {
    [{ text: 'perdóname, para mi suegra, algo sobrio', hemisphere: 'N', petSafe: true },
      { text: 'lo siento, para mi mamá, sin lirios ni tulipanes', feelings: ['Esperanza'], season: 'verano', petSafe: true },
      { text: 'te pido disculpas por lo de ayer, para mis tías, con lirios', season: 'otoño', hemisphere: 'N', petSafe: true },
      { text: 'gracias, 9 jazmín, amapolas, limonium, 6 cerezo, jacintos y gypsophila', season: 'otoño', petSafe: true }].forEach((q) => {
      const L = compose(q).rationale.lead, tag = tagOf(q);
      ok(L.length <= 500, tag + ': ' + L.length + ' caracteres');
      ok((L.match(/mascotas/g) || []).length <= 1, tag + ': ' + L);
    });
  });

  /* Pegar en tests/specs.js después de la sección «6. Qué ramo dice lo que sientes» (usa `compose` e `isMourning`,
     definidos al comienzo de esa sección), por ejemplo justo antes del cierre `})(typeof window …)`.
     Guardan el contrato del motor del que depende el taller (js/atelier.js): el taller ya no manda como «ocasión del selector»
     la que dejó una propuesta anterior, así que el pedido de «Otra opción» y el de un texto nuevo llegan sin ella.
     El cableado del taller mismo (que no está cargado en tests/run.cjs) se prueba con scratchpad/fix-ui/repro.cjs. */
  test('taller: «Otra opción» cambia la flor principal aunque el texto traiga la ocasión', () => {
    ['felicitaciones por tu graduación', 'feliz cumpleaños abuela', 'feliz día de la madre'].forEach((text) => {
      const a = compose({ text });
      ok(a.detected.occasion, 'el texto trae ocasión (el taller la muestra en el selector): ' + text);
      const lead = a.bouquet.stems[0].item;
      // El mismo pedido, sin la ocasión que el selector solo muestra, más la flor ya propuesta.
      const b = compose({ text, avoidLeads: [lead] });
      ok(b.bouquet.stems[0].item !== lead, text + ': ' + lead + ' se repite');
      eq(b.detected.occasion, a.detected.occasion, 'la ocasión sigue leyéndose del texto: ' + text);
      ok(!b.search.cycled, 'no se agotan las flores en el primer clic: ' + text);
    });
  });

  test('taller: un duelo escrito después de un cumpleaños no queda como cumpleaños', () => {
    // Lo que el taller pide tras «feliz cumpleaños abuela» → «mi abuela falleció», sin la ocasión que dejó la primera propuesta.
    const first = compose({ text: 'feliz cumpleaños abuela' });
    eq(first.detected.occasion, 'cumpleanos');
    const r = compose({ text: 'mi abuela falleció' });
    ok(isMourning(r), 'se lee como duelo');
    eq(r.detected.occasion, 'condolencias');
    eq(r.bouquet.occasion, 'condolencias');
    eq(r.bouquet.wrap.style, 'ninguno');
    ok(!/cumplea/i.test(r.rationale.lead), 'la explicación no habla de cumpleaños: ' + r.rationale.lead);
  });

  test('taller: una fiesta elegida a mano no envuelve un duelo', () => {
    const r = compose({ text: 'mi abuela falleció', occasion: 'cumpleanos' });
    ok(isMourning(r), 'se lee como duelo');
    eq(r.bouquet.occasion, 'condolencias');
    eq(r.bouquet.wrap.style, 'ninguno');
    ok(/no como una fiesta/.test(r.rationale.lead), r.rationale.lead);
    // Una muerte de hace tiempo junto a la fiesta elegida es contexto: sigue siendo cumpleaños.
    eq(compose({ text: 'para mi mamá, que extraña a mi abuela que murió el año pasado', occasion: 'cumpleanos' }).bouquet.occasion, 'cumpleanos');
    // Una ocasión que no es fiesta, elegida a mano, se respeta en el duelo.
    eq(compose({ text: 'gracias por acompañarnos, mi papá falleció', occasion: 'agradecimiento' }).bouquet.occasion, 'agradecimiento');
  });

  test('taller: la ocasión elegida a mano sigue mandando', () => {
    // Si la persona sí eligió la ocasión, el taller la manda y el motor la respeta.
    const r = compose({ text: 'te quiero mucho', occasion: 'aniversario' });
    eq(r.detected.occasion, 'aniversario');
    eq(r.bouquet.occasion, 'aniversario');
    const lead = r.bouquet.stems[0].item;
    const b = compose({ text: 'te quiero mucho', occasion: 'aniversario', avoidLeads: [lead] });
    ok(b.bouquet.stems[0].item !== lead, '«Otra opción» con ocasión elegida cambia la flor principal');
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

  /* ---------- 6c. Intención: qué siente el texto, para quién y qué evita ---------- */
  const read = (t, o) => FL.intent.read(t, o);
  const has = (d, m) => d.ranked.some((x) => x.id === m);
  const top = (t) => read(t).ranked[0].id;

  const N1 = [['eres capaz de todo', 'Calma'], ['me das terror', 'Perdón'], ['felicitaciones por tu logro', 'Amor'], ['mi abuela falleció', 'Perdón'],
    ['me duelen las amígdalas', 'Amistad'], ['capaz que llueva', 'Admiración'], ['por favor', 'Gratitud'], ['el Día Internacional de la Mujer', 'Nuevos comienzos'],
    ['un saludo para mi profe', 'Esperanza'], ['una sola flor', 'Alegría'], ['gracias a la enfermera que me cuidó', 'Esperanza']];
  test('intención: palabras completas, no pedazos', () => {
    N1.forEach(([t, m]) => eq(read(t).raw[m] || 0, 0, t + ' → ' + m));
    eq(read('le gustan los girasoles').cues.length, 0, 'las flores las lee el pedido');
  });

  test('intención: la negación vale dentro de su frase', () => {
    const d = read('no estoy enojada, solo quiero agradecerte');
    eq(d.ranked[0].id, 'Gratitud');
    ok(!has(d, 'Perdón'), 'sin perdón');
    eq(d.cues.find((c) => /enojada/.test(c.quote)).neg, 'drop');
    ok(!has(read('no me arrepiento de nada'), 'Perdón'), 'no me arrepiento');
    eq(top('nunca te olvidaré'), 'Recuerdo');
    ok(has(read('no quiero que estés triste'), 'Esperanza'), 'no quiero que estés triste');
    eq(top('mi mamá no está bien'), 'Esperanza');
    const p = read('no te pido perdón, te doy las gracias');
    ok(!has(p, 'Perdón'), 'no te pido perdón');
    ok(R.parse('no te pido perdón, te doy las gracias').occasion !== 'disculpa', 'sin ocasión de disculpa');
    eq(read('no sabes cuánto te quiero').cues.find((c) => c.intent === 'carino').neg, null, 'no sabes cuánto');
  });

  test('intención: negar lo que dice el ramo lo evita', () => {
    const a = read('te quiero, pero no de forma romántica');
    ok(a.avoid.includes('Amor'), 'evita Amor');
    eq(a.target.Amor, undefined);
    ok(read('nada triste, que sea alegre').avoid.includes('Recuerdo'), 'evita Recuerdo');
    const c = read('no es para pedir perdón, es para celebrar');
    ok(c.avoid.includes('Perdón'), 'evita Perdón');
    eq(c.occasion, null);
    eq(c.ranked[0].id, 'Alegría');
  });

  test('intención: intensidad', () => {
    ok(read('te quiero muchísimo').raw.Amor > read('te quiero').raw.Amor, 'muchísimo suma');
    ok(read('estoy un poco nerviosa').raw.Calma < read('estoy nerviosa').raw.Calma, 'un poco resta');
  });

  test('intención: emociones, destinatarios y su día', () => {
    eq(top('estoy nerviosa por la entrevista'), 'Calma');
    const p = read('para mi polola');
    eq(p.ranked[0].id, 'Amor');
    ok(p.romance, 'polola es romance');
    eq(read('para mi mamá en su día').occasion.id, 'dia-madre');
    const profe = read('para mi profe en su día');
    eq(profe.occasion.id, 'dia-profesor');
    eq(profe.occasionSource, 'day');
    eq(top('🙏'), 'Gratitud');
    const heart = read('❤️');
    eq(heart.ranked[0].id, 'Amor');
    ok(!heart.romance, 'un corazón solo no es romance');
    eq(top('estoy muy triste 😢'), 'Esperanza');
    eq(read('para mi amiga Paz').raw.Calma, 0, 'Paz es un nombre');
    const me = read('para mí, que tuve una semana pesadísima');
    ok(me.forSelf, 'para mí');
    eq(me.ranked[0].id, 'Calma');
    eq(top('ramo para mi profe que se jubila'), 'Gratitud');
  });

  test('intención: el duelo manda, pero solo con palabras de duelo', () => {
    const d = read('falleció el papá de mi mejor amigo');
    eq(d.ranked[0].id, 'Recuerdo');
    ok(d.mourning, 'duelo');
    eq(d.recipient.id, 'amigos');
    ok(d.recipients.some((r) => r.id === 'padre' && r.memory && r.role === 'third'), 'el papá se recuerda');
    ok((d.raw.Amistad || 0) < d.raw.Recuerdo / 4, 'la amistad pesa poco');
    const b = read('feliz cumpleaños en el cielo, abuelo');
    eq(b.ranked[0].id, 'Recuerdo');
    ok(b.mourning, 'duelo');
    eq(b.occasion.id, 'condolencias');
    eq(b.droppedOccasion, 'cumpleanos');
    const s = read('lo siento mucho por tu pérdida');
    ok(s.mourning, 'pésame');
    eq(s.occasion.id, 'condolencias');
    eq(s.raw['Perdón'], 0, 'no es una disculpa');
    ['estoy en el cielo contigo', 'perdí a mi amiga en una pelea', 'mi amigo partió a Europa', 'te extraño mucho'].forEach((t) => ok(!read(t).mourning, t));
  });

  test('intención: cariño de familia no es romance', () => {
    const h = read('te quiero mucho hermanita');
    ok(!h.romance, 'sin romance');
    ok(h.ranked[0].id !== 'Amor', 'top ' + h.ranked[0].id);
    const e = read('estoy enojada con mi hermana pero la quiero');
    ok(!e.romance, 'sin romance');
    ok(e.target['Perdón'] > 0, 'con perdón');
    const d = read('mi amiga terminó con su pololo y está muy triste');
    eq(d.recipient.id, 'amigos');
    ok(d.recipients.some((r) => r.group === 'pareja' && r.role === 'third'), 'el pololo es de ella');
    ok(!d.romance, 'sin romance');
    ok(d.avoidSilent.includes('Amor'), 'evita Amor en silencio');
  });

  test('intención: sin sentimientos', () => {
    const h = read('hola');
    ok(h.guessed, 'adivina');
    deepEq(h.target, { 'Alegría': 1 });
    const t = read('tres rosas blancas');
    ok(t.guessed, 'adivina');
    eq(t.ranked[0].id, 'Nuevos comienzos');
  });

  test('intención: vocabulario válido', () => {
    const X = FL.taxonomy, re = (p) => new RegExp(FL.intent.phraseRe(p, false));
    const cues = [].concat(...X.intents.map((it) => (it.strong || []).concat(it.words || [])));
    cues.concat(X.neutral, ...X.recipients.map((r) => r.words)).forEach((p) => ok(re(p) instanceof RegExp, p));
    const dup = (arr) => arr.filter((p, i) => arr.indexOf(p) !== i);
    deepEq(dup(cues.concat(X.neutral)), [], 'repetidas en intents o neutral');
    deepEq(dup([].concat(...X.recipients.map((r) => r.words))), [], 'repetidas en recipients');
    const sum = (mix) => Object.values(mix).reduce((a, b) => a + b, 0);
    X.intents.forEach((it) => [it.mix].concat(Object.values(it.with || {})).forEach((mix) => approx(sum(mix), 1, 0.011, it.id)));
    X.recipients.forEach((r) => approx(sum(r.mix), 1, 0.011, r.id));
    const reserved = new Set(FL.items.map((it) => FL.intent.fold(it.name.toLowerCase())).concat(Object.keys(X.aliases)));
    ok(!cues.some((p) => reserved.has(p)), 'una flor no es una emoción: ' + cues.filter((p) => reserved.has(p)).join(', '));
  });

  /* Specs del lector (hallazgos 0–19, 35–37, 47, 49, 60). Van en tests/specs.js, bloque «6c. Intención»,
     justo antes de test('intención: determinista y forma de la mezcla', …): usan read, has y top de ese bloque y R. */

  test('intención: palabras de muerte que no son un duelo', () => {
    ['se me murió el celular y no pude llamarte para tu cumpleaños, perdón', 'te voy a amar hasta la muerte',
      'un ramo de despedida por su partida a Canadá', 'mi colega ya no está con nosotros en la empresa, se cambió de trabajo',
      'para mi hermana que ya no está viviendo en Chile, la extraño', 'mi mejor amiga se nos fue a vivir a Australia',
      'se murió de la risa con el chiste', 'lo siento por tu papá, no sabía que estaba tan enfermo',
      'feliz cumpleaños amiga 🖤🖤', 'para el bautizo de mi sobrino 🕊️'].forEach((t) => {
      const d = read(t);
      ok(!d.mourning, t);
      ok(!d.occasion || d.occasion.id !== 'condolencias', t + ' → ' + (d.occasion && d.occasion.id));
    });
    eq(read('feliz cumpleaños amiga 🖤🖤').occasion.id, 'cumpleanos');
    eq(read('lo siento por tu papá, no sabía que estaba tan enfermo').occasion.id, 'recuperacion');
  });

  test('intención: formas de nombrar una muerte', () => {
    [['descansa en paz abuelito, te extrañamos', 'tu abuelito'], ['Q.E.P.D. tío Juan', 'tu tío'], ['flores para mi mamá que está en el cielo', 'tu mamá'],
      ['mi tata nos dejó ayer', 'tu tata'], ['siento mucho lo de tu papá', 'su papá'], ['mi abuelita partió anoche', 'tu abuelita']].forEach(([t, mem]) => {
      const d = read(t);
      ok(d.mourning, t);
      eq(d.ranked[0].id, 'Recuerdo', t);
      eq(d.memoryText, mem, t);
    });
    const p = read('para mi papá en el cielo, feliz día del padre');
    ok(p.mourning, 'papá en el cielo');
    eq(p.memoryText, 'tu papá');
  });

  test('intención: perder un embarazo es duelo, no un nacimiento', () => {
    ['mi amiga perdió a su bebé', 'mi hermana tuvo una pérdida y está destrozada'].forEach((t) => {
      const d = read(t);
      ok(d.mourning, t);
      ok(!has(d, 'Alegría') && d.occasion.id !== 'nacimiento', t);
      ok(d.recipient && d.memoryText == null, t + ': quien sufrió la pérdida recibe el ramo');
    });
  });

  test('intención: una muerte pasada no apaga una fiesta para otra persona', () => {
    const d = read('mi abuelo murió el año pasado y hoy mi abuela está de cumpleaños, quiero alegrarla');
    ok(!d.mourning, 'sin duelo');
    eq(d.occasion.id, 'cumpleanos');
    eq(d.recipient.id, 'abuelos');
    eq(d.ranked[0].id, 'Alegría');
    const m = read('Hola! mi mamá cumple 70 años el sábado y le haremos una fiesta sorpresa. Este año fue difícil porque mi papá falleció en marzo, ' +
      'así que queremos algo alegre. Gracias!');
    ok(!m.mourning, 'sin duelo');
    eq(m.occasion.id, 'cumpleanos');
    eq(m.recipient.id, 'madre');
  });

  test('intención: la negación llega a través de «que» y de los artículos', () => {
    const f = read('no quiero que sea un ramo de funeral, es para mi abuela que está enferma');
    ok(!f.mourning, 'sin duelo');
    ok(f.avoid.includes('Recuerdo'), 'evita Recuerdo');
    eq(f.occasion.id, 'recuperacion');
    eq(f.droppedOccasion, null);
    const g = read('no quiero que se vea como una disculpa, es solo para agradecerle');
    ok(g.avoid.includes('Perdón'), 'evita Perdón');
    eq(g.occasion.id, 'agradecimiento');
    const n = read('no quiero que parezca un funeral ni una disculpa, es para celebrar a mi amiga');
    eq(n.cues.find((c) => c.intent === 'pedir-perdon').neg, 'avoid', 'ni una disculpa');
    ok(!has(n, 'Perdón') && !n.mourning, 'ni duelo ni perdón');
    eq(n.ranked[0].id, 'Alegría');
    ok(R.parse('no quiero que parezca un funeral ni una disculpa').occasion == null, 'sin ocasión');
  });

  test('intención: «no tan romántico» no es romántico', () => {
    ['algo no tan romántico, es para una amiga', 'no muy romántico porfa, es para mi prima', 'nada muy romántico, es para mi hermana'].forEach((t) => {
      const d = read(t);
      ok(!d.romance, t);
      ok(d.avoid.includes('Amor'), t + ': evita Amor');
      ok(!has(d, 'Amor'), t);
    });
    eq(read('algo no tan romántico, es para una amiga').recipient.text, 'una amiga');
  });

  test('intención: el dueño y el negado no son el destinatario', () => {
    [['un ramo para la mamá de mi polola', 'madre', 'la mamá de tu polola'], ['para el pololo de mi hija que la cuida tanto', 'pareja', 'el pololo de tu hija'],
      ['flores para la esposa de mi jefe que tuvo guagua', 'pareja', 'la esposa de tu jefe'], ['para los abuelos de mi polola, gracias por recibirme', 'abuelos', 'los abuelos de tu polola'],
      ['no es para mi novia, es para mi mamá', 'madre', 'tu mamá'], ['nada de rosas rojas, no es para mi polola, es para mi hermana', 'hermanos', 'tu hermana']].forEach(([t, id, txt]) => {
      const d = read(t);
      ok(!d.romance, t + ': sin romance');
      ok(d.ranked[0].id !== 'Amor', t + ': top ' + d.ranked[0].id);
      eq(d.recipient.id, id, t);
      eq(d.recipient.text, txt, t);
    });
    const s = read('no es para mí, es para mi mamá');
    deepEq(s.avoid, [], 'negar «para mí» no evita nada');
    ok(!s.forSelf, 'no es para quien escribe');
  });

  test('intención: «te amo» a la familia es cariño, no romance', () => {
    ['te amo mamá, feliz día', 'con mucho amor para mi abuela', 'te adoro abuelita', 'para mi hija, mi amor, que se gradúa',
      'besos y abrazos para mi tía que está enferma', 'para mi mamá en su día, la amo mucho', 'te amo amiga, gracias por todo'].forEach((t) => {
      const d = read(t);
      ok(!d.romance, t + ': sin romance');
      ok(d.ranked[0].id !== 'Amor', t + ': top ' + d.ranked[0].id);
    });
    // El Amor marcado para un hijo se respeta, pero sin romance: se dirá «cariño».
    const c = read('mucho ánimo, para mi hijo', { feelings: ['Amor'] });
    ok(!c.romance, 'Amor marcado para un hijo');
    eq(c.ranked[0].id, 'Amor');
    const r = R.compose({ text: 'te amo mamá, feliz día', season: 'primavera', hemisphere: 'S' });
    ok(!/amor declarado/.test(r.rationale.lead + ' ' + r.reading.summary), r.rationale.lead);
    ok(!r.bouquet.stems.some((x) => x.item === 'rosa-roja'), 'sin rosa roja');
    ok(r.bouquet.wrap.style !== 'seda', 'sin seda');
    // Con la pareja, o sin nadie más, sí.
    ['te amo', 'para mi polola, te amo', 'te amo mi vida', 'para mi esposa con todo mi amor', 'besos mi amor'].forEach((t) => {
      const d = read(t);
      ok(d.romance, t + ': romance');
      eq(d.ranked[0].id, 'Amor', t);
    });
    // Una ocasión de pareja con otra persona como destinataria no es una declaración: para los papás o la abuela, cariño.
    ['para mis papás por su aniversario', 'nos casamos, para mi abuela', 'para mi prima Serena que se casa'].forEach((t) => ok(!read(t).romance, t + ': sin romance'));
    ok(read('feliz aniversario').romance, 'un aniversario sin nadie más es de pareja');
  });

  test('intención: «de mi vida» y «mi rey» no son una pareja', () => {
    const a = read('gracias por ser la mejor amiga de mi vida');
    ok(!a.romance, 'sin romance');
    eq(a.recipient.id, 'amigos');
    eq(a.recipient.text, 'tu mejor amiga');
    ['mi hijo es lo mejor de mi vida y hoy se gradúa', 'para mi hijo, mi rey, que cumple 5 años'].forEach((t) => {
      const d = read(t);
      ok(!d.romance, t);
      eq(d.recipient.id, 'hijos', t);
    });
    const s = read('para mi señora, la mujer de mi vida');
    eq(s.recipient.text, 'tu señora');
    ok(s.romance, 'la señora sí es pareja');
  });

  test('intención: cortesía, «recuerda que» y la memoria de título', () => {
    ['perdón por la molestia, ¿pueden hacer algo para mi abuela que está de cumpleaños?', 'disculpa la demora en responder, es para mi polola',
      'Hola, disculpa, quiero un ramo para mi mamá por su cumpleaños'].forEach((t) => {
      const d = read(t);
      ok(!has(d, 'Perdón'), t);
      ok(!d.occasion || d.occasion.id !== 'disculpa', t);
    });
    ok(!has(read('para mi mamá, recuerda que no le gustan los lirios'), 'Recuerdo'), 'recuerda que');
    const m = read('para mi polola que entregó su memoria de título');
    ok(!has(m, 'Recuerdo'), 'memoria de título');
    eq(m.cues[0].intent, 'logro');
  });

  test('intención: ocasiones dichas a la chilena y negaciones que no las borran', () => {
    eq(read('para el día de la mamá').occasion.id, 'dia-madre');
    eq(read('para el día del papá').occasion.id, 'dia-padre');
    eq(read('un regalo para la profe de mi hijo por el día del profe').occasion.id, 'dia-profesor');
    const c = read('no es mi cumpleaños, es el de mi hermana');
    eq(c.occasion.id, 'cumpleanos');
    eq(c.recipient.id, 'hermanos');
    const f = read('no fui a tu cumpleaños y me siento pésimo');
    eq(f.occasion.id, 'cumpleanos');
    eq(f.ranked[0].id, 'Perdón');
  });

  test('intención: nombres propios que son palabras o colores', () => {
    [['Paz está pasando por un mal momento', 'Calma'], ['para mi amiga paz que está de cumpleaños', 'Calma'], ['PARA MI AMIGA PAZ QUE CUMPLE AÑOS', 'Calma'],
      ['mi amiga soledad se titula mañana', 'Amistad'], ['mi hermana se fue a vivir a La Serena', 'Calma'], ['para mi prima Serena que se casa', 'Calma']].forEach(([t, m]) => {
      ok(!read(t).cues.some((x) => /^(?:paz|soledad|serena|esperanza)$/i.test(x.quote)), t + ' → ' + m);
    });
    ['para mi abuela Blanca que está de cumpleaños', 'un ramo para mi amiga Celeste que se titula', 'para mi sobrina Violeta, que nació ayer',
      'Rosa está de cumpleaños, tiene 60', 'Margarita cumple 90 años'].forEach((t) => {
      const a = R.parse(t);
      deepEq(a.colors, [], t + ': sin color');
      deepEq(a.include, [], t + ': sin flor');
    });
  });

  test('intención: vocabulario de Chile', () => {
    const c = read('la cagué con mi polola, quiero arreglarlo');
    eq(c.ranked[0].id, 'Perdón');
    ok(read('hace un año que empezamos a pololear').romance, 'pololear');
    eq(read('hace un año que empezamos a pololear').raw['Nuevos comienzos'] || 0, 0, '«empezamos a» no es un comienzo');
    eq(read('para mi señora que está de cumpleaños').recipient.id, 'pareja');
    eq(read('para mis papás por su aniversario').recipient.text, 'tus papás');
    ['q te mejores pronto abuelita', 'para mi amiga que se va a operar mañana', 'se operó de la rodilla mi papá', 'mi abuela está grave en la UCI'].forEach((t) => {
      const d = read(t);
      eq(d.ranked[0].id, 'Esperanza', t);
      eq(d.occasion && d.occasion.id, 'recuperacion', t);
    });
  });

  test('intención: cómo se nombra al destinatario', () => {
    eq(read('para una amiga que está de cumpleaños').recipient.text, 'una amiga');
    eq(read('para una amiga que está de cumpleaños').recipient.role, 'para');
    eq(read('felicidades por tu nuevo trabajo, te voy a echar de menos en la oficina').recipient, null);
    ok(read('felicidades por tu nuevo trabajo, te voy a echar de menos en la oficina').cues.some((c) => c.intent === 'extranar'), 'echar de menos');
    eq(read('perdón, quedé en pana y no llegué a tu cumple').recipient, null);
    eq(read('Mamá, te quiero mucho').recipient.text, 'tu mamá');
    eq(read('PARA MI AMIGA PAZ QUE CUMPLE AÑOS').recipient.text, 'tu amiga');
    eq(read('feliz día del profesor, miss').recipient.text, 'tu miss');
  });

  test('intención: quién partió en «el abuelo de mi novia»', () => {
    const a = read('el abuelo de mi novia falleció, quiero mandarle flores a ella');
    eq(a.memoryText, 'su abuelo');
    eq(a.recipient.id, 'pareja');
    const b = read('para el papá de mi mejor amigo que falleció');
    eq(b.memoryText, 'su papá');
    eq(b.recipient.text, 'tu mejor amigo');
  });

  test('intención: un bebé que ya nació no está «en camino»', () => {
    const e = FL.taxonomy.intents.find((x) => x.id === 'embarazo');
    ok(!/en camino/.test(e.label), e.label);
    eq(read('bienvenida al mundo, bebé').occasion.id, 'nacimiento');
  });

  test('intención: el vocabulario no pisa flores, colores ni emoji con letras', () => {
    const X = FL.taxonomy, P = FL.intent.phraseRe;
    const res = FL.items.map((it) => new RegExp('^' + P(it.name, true) + '$')).concat(
      Object.keys(X.aliases).map((a) => new RegExp('^' + P(a, true) + '$')),
      [].concat(...X.colors.map((c) => c.words || [])).map((w) => new RegExp('^' + P(w, false) + '$')));
    const cues = [].concat(X.neutral, ...X.intents.map((it) => (it.strong || []).concat(it.words || [])));
    const hit = cues.filter((p) => res.some((re) => re.test(FL.intent.fold(p.replace(/\*$/, '')))));
    deepEq(hit, [], 'señales que R.parse lee como flor o color');
    const bad = [].concat(...X.intents.map((it) => it.emoji || [])).filter((e) => /[\p{L}\p{N}\s]/u.test(e));
    deepEq(bad, [], 'emoji con letras');
  });

  /* Revisión final: duelo, destinatarios, cortesía y texto. */
  const textsOf = (r) => [r.rationale.lead, r.reading.summary].concat(r.rationale.items.map((x) => x.why)).join(' ');

  test('intención: perder un embarazo, dicho de otras formas, es duelo para quien lo sufre', () => {
    ['mi amiga perdió su embarazo', 'mi amiga perdió el embarazo', 'el bebé de mi amiga nació muerto', 'mi amiga sufrió una pérdida gestacional',
      'mi amiga tuvo un aborto espontáneo'].forEach((t) => {
      const d = read(t), r = compose({ text: t });
      ok(d.mourning, t);
      ok(d.occasion.id !== 'nacimiento' && !has(d, 'Alegría'), t);
      eq(d.recipient && d.recipient.text, 'tu amiga', t);
      eq(d.memoryText, null, t + ': nadie vivo se recuerda');
      ok(!/llegada de un bebé|nacimiento/.test(r.rationale.lead), t + ': ' + r.rationale.lead);
    });
  });

  test('intención: quien está de duelo recibe el ramo; quien partió es otro', () => {
    [['mi amiga está de duelo', 'tu amiga', null], ['mi amiga está en duelo, quiero acompañarla', 'tu amiga', null], ['mi abuela está de luto', 'tu abuela', null],
      ['mi mamá está triste porque se murió su perrito', 'tu mamá', null], ['el bebé de mi prima falleció', 'tu prima', null],
      ['la guagua de mi amiga murió', 'tu amiga', null], ['para mi tía, que en paz descanse su esposo', 'tu tía', 'su esposo'],
      ['para mi amiga que perdió a su mamá', 'tu amiga', 'su mamá'], ['mi amigo perdió a su mamá', 'tu amigo', 'su mamá'],
      ['para mi amiga que perdió a su papá la semana pasada', 'tu amiga', 'su papá'], ['acompañar a mi amiga en su dolor', 'tu amiga', null],
      ['quiero enviar flores a la familia de mi amigo que falleció', 'la familia', 'tu amigo'], ['para los papás de mi amigo que falleció', 'los papás', 'tu amigo']
    ].forEach(([t, rec, mem]) => {
      const d = read(t);
      ok(d.mourning, t);
      eq(d.recipient && d.recipient.text, rec, t);
      eq(d.memoryText, mem, t);
      ok(!d.cues.some((c) => c.intent === 'embarazo' && !c.neg) || !compose({ text: t }).rationale.lead.includes('llegada'), t);
    });
    eq(read('para Esperanza que perdió a su papá').memoryText, 'su papá');
    ok(!read('para Esperanza que perdió a su papá').cues.some((c) => c.intent === 'esperanza'), 'Esperanza es un nombre');
    eq(read('gracias por cuidar a mi papá en sus últimos días').recipient, null);
    ok(/viuda/.test(read('para la viuda de mi tío').recipient.text), read('para la viuda de mi tío').recipient.text);
  });

  test('intención: una muerte de hace horas o días sigue siendo un duelo; «se nos fue en Navidad» también', () => {
    ['mi abuela falleció hace unas horas y hoy es el cumpleaños de mi mamá', 'mi abuelita falleció hace dos días y el sábado es el cumpleaños de mi mamá']
      .forEach((t) => { const d = read(t); ok(d.mourning, t); eq(d.ranked[0].id, 'Recuerdo', t); });
    [['mi abuelita se nos fue en Navidad', 'tu abuelita'], ['mi tío se nos fue a Dios', 'tu tío'], ['nuestra querida Ana se nos fue en Abril, para su familia', null]]
      .forEach(([t, mem]) => { const d = read(t); ok(d.mourning, t); eq(d.memoryText, mem, t); });
    // La fiesta que dice cuándo no es una fiesta dejada de lado; la que se pide, sí.
    ok(!/no como/.test(compose({ text: 'mi abuelita se nos fue en Navidad' }).rationale.lead), 'en Navidad');
    ok(/no como una fiesta/.test(compose({ text: 'mi abuela falleció y quería mandar flores para Navidad' }).rationale.lead), 'para Navidad');
    const c = read('hoy se cumple un año de la muerte de mi hermano');
    ok(c.mourning && c.droppedOccasion == null, 'aniversario de una muerte, sin fiesta');
    eq(read('hoy se cumple un año desde que nos conocimos, mi amor').occasion.id, 'aniversario');
  });

  test('intención: un duelo con «la amo» no es romántico', () => {
    ['mi mamá falleció, la amo mucho', 'mi papá murió, lo amo', 'te amo papá, descansa en paz', 'mi hermano murió, lo amo con mi vida', 'descansa en paz mamá, te amo']
      .forEach((t) => {
        eq(read(t).romance, false, t);
        FL.taxonomy.seasons.forEach((season) => {
          const s = textsOf(compose({ text: t, season }));
          ok(!/pasión|amor declarado|declaración/.test(s), t + ' (' + season + '): ' + s);
        });
      });
  });

  test('intención: la pareja que manda el ramo junto a quien escribe no lo vuelve romántico', () => {
    ['mi novia y yo queremos regalarle flores a mi mamá', 'de parte de mi esposo y mía, para mi suegra', 'mi pololo y yo le queremos regalar flores a mi abuela',
      'para mi mamá, de parte mía y de mi polola', 'para el cumpleaños de mi mamá, con mi novio le queremos regalar algo',
      'mi señora y yo queremos saludar a mi mamá en su día'].forEach((t) => {
      const d = read(t), r = compose({ text: t });
      eq(d.romance, false, t);
      ok(d.recipient && d.recipient.group !== 'pareja', t);
      ok(!ids(r.bouquet).includes('rosa-roja') && r.bouquet.wrap.style !== 'seda', t + ': ' + ids(r.bouquet).join(' '));
    });
    ['no son para mi polola, son para mi mamá', 'no va para mi polola sino para mi hermana', 'las flores no son para mi esposa, son para mi suegra'].forEach((t) => {
      const d = read(t);
      eq(d.romance, false, t);
      ok(d.recipient.group !== 'pareja', t + ' → ' + d.recipient.text);
    });
  });

  test('intención: la cortesía con la florería no es un sentimiento', () => {
    ['disculpe, ¿hacen envíos? es para mi abuela', 'perdón por escribir tan tarde, necesito un ramo para mañana para mi mamá', 'disculpa la hora, es para mi señora',
      'perdón, ¿tienen girasoles?', 'disculpe, quería saber si tienen rosas para mi mamá',
      'perdón por las faltas de ortografía, es para mi abuela que está de cumpleaños'].forEach((t) => {
      const d = read(t);
      ok(!has(d, 'Perdón') && (!d.occasion || d.occasion.id !== 'disculpa'), t);
    });
    const a = read('Hola, buenas tardes. Quería encargar un ramo para mi señora por nuestro aniversario. Ojalá algo elegante, no muy grande. Muchas gracias!');
    deepEq(a.cues.map((c) => c.intent), [], 'saludo, encargo y «Muchas gracias»');
    const b = read('Buenas, mi abuelita falleció el domingo. Quiero algo sobrio y blanco para la familia. Gracias.');
    ok(!b.cues.some((c) => c.intent === 'gratitud'), 'el «Gracias.» final');
    eq(read('mamá, que tengas un feliz día').occasion, null);
    eq(read('feliz día mamá').occasion.id, 'dia-madre');
  });

  test('intención: un nombre en aposición, «no muy grande» y el «tu» de quien escribe', () => {
    const p = FL.reading.parse('Rosa, mi abuela, cumple 85');
    ok(!p.colors.length && !p.include.length, 'Rosa es un nombre');
    ok(!read('Paz, mi mejor amiga, se gradúa').cues.some((c) => c.intent === 'calma'), 'Paz es un nombre');
    ['un ramo no muy grande de condolencias', 'flores no tan caras de agradecimiento para mi profe', 'un ramo no muy grande de felicitaciones para mi hija'].forEach((t) => {
      ok(!read(t).cues.some((c) => c.neg), t);
      ok(!/No conté/.test(compose({ text: t }).rationale.lead), t);
    });
    eq(read('para ti y tu familia, feliz navidad').recipient.text, 'su familia');
    eq(read('que se mejore pronto tu mamá').recipient.text, 'su mamá');
    eq(read('gracias por todo, profe').cues.length, 1, '«gracias por todo» es una sola señal');
    eq(read('que te mejores pronto, abuelita').cues.length, 1, '«que te mejores pronto» es una sola señal');
  });

  test('pedido: «dos docenas de flores», «una docena de flores», «media docena de flores»', () => {
    eq(FL.reading.parse('dos docenas de flores').count, 24);
    eq(FL.reading.parse('una docena de flores').count, 12);
    eq(FL.reading.parse('media docena de flores').count, 6);
    eq(FL.reading.parse('una docena de rosas').count, null, 'la docena es de rosas, no el total');
  });

  test('propuesta: el texto dice lo que el ramo hace y lo que se pidió', () => {
    const w = (t, o) => compose(Object.assign({ text: t }, o || {}));
    // El blanco del duelo es recuerdo, no un comienzo.
    FL.taxonomy.seasons.forEach((season) => ['flores blancas para el funeral de mi abuelo', 'mi abuelita falleció, quiero algo blanco', 'condolencias, algo blanco y sobrio']
      .forEach((t) => { const s = textsOf(w(t, { season })); ok(!/nuevos? comienzos?/.test(s), t + ' (' + season + '): ' + s); }));
    // «un estilo sobrio» solo si se pidió.
    ['para mi jefe por su cumpleaños', 'para mi jefa que se jubila', 'para el funeral del papá de mi jefe'].forEach((t) => ok(!/sobrio/.test(w(t).rationale.lead), t));
    // Un pedido de perdón no se nombra si no se pidió; tampoco el «lo siento» del jacinto.
    [['mi abuela falleció, algo morado'], ['te extraño, para mi suegra, de color morado', { season: 'verano', hemisphere: 'N' }],
      ['nos casamos, para mi abuela, con tulipanes y margaritas', { hemisphere: 'N' }]].forEach(([t, o]) => ok(!/pedido de perdón/.test(w(t, o).reading.summary), t));
    ok(!/lo siento/.test(w('te extraño, para mi suegra, de color morado').reading.summary), 'jacinto sin disculpa');
    // Gramática: «no logré que dijera», «a recuerdo o a…», citas completas, el primer día sin él.
    const nv = w('para mi novia, de color morado', { season: 'verano', hemisphere: 'N' }).rationale.lead;
    ok(!/también dijera/.test(nv) && !/dijera cariño/.test(nv), nv);
    ok(/a recuerdo o a un pedido de perdón/.test(w('no quiero que parezca un funeral ni una disculpa, es para mi amiga').rationale.lead), 'a… o a…');
    ok(/«no fui a tu cumpleaños»/.test(w('no fui a tu cumpleaños y me siento pésimo').rationale.lead), 'cita completa');
    ok(!/nuevo comienzo/.test(w('mi papá murió el año pasado y es el primer día del padre sin él').rationale.lead), 'primer día sin él');
    // «Las flores de cerezo», un solo «:» por oración.
    ['mi hija y su pololo se casan', 'mi abuela falleció', 'calma y paz, algo con lavanda'].forEach((t) => {
      const s = w(t).reading.summary;
      ok(!/de flor de/.test(s) && !s.split(/[.!?](?:\s|$)/).some((x) => (x.match(/:/g) || []).length > 1), s);
    });
    // La docena se dice declaración solo con romance, en una flor que dice amor y fuera de un duelo.
    [['una docena de rosas para mi mamá'], ['12 girasoles para mi abuela que falleció', { season: 'verano' }], ['una docena de rosas'], ['te amo, 12 hortensia y 5 margaritas']]
      .forEach(([t, o]) => ok(!/declaración/.test(w(t, o).reading.summary), t));
    ok(/declaración/.test(w('una docena de rosas rojas para mi novia').reading.summary), 'la docena roja de pareja');
  });

  test('propuesta: muchas flores nombradas, notas verdaderas', () => {
    const a = compose({ text: 'rosas, girasoles, lirios, tulipanes, peonías, margaritas, claveles, dalias, gerberas, fresias, iris y gypsophila' });
    ok(!/un solo relleno/.test(a.rationale.lead), a.rationale.lead);
    const b = compose({ text: 'rosas, girasoles, lirios, tulipanes, peonías, margaritas, claveles, dalias, gerberas, fresias, iris y eucalipto' });
    ok(ids(b.bouquet).includes('eucalipto') && !ids(b.bouquet).includes('ruscus'), ids(b.bouquet).join(' '));
    const c = compose({ text: 'rosas, girasoles, lirios, tulipanes, peonías, margaritas, claveles, dalias, gerberas, fresias, iris, ranúnculos' });
    ok(!/s quedó fuera/.test(c.rationale.lead), c.rationale.lead);
  });

  test('propuesta: «Otra opción» nunca deja el ramo vacío y vuelve a la primera propuesta', () => {
    ['una hortensia y cinco margaritas para mi mamá', 'te amo, 12 hortensia y 5 margaritas', 'perdóname, discutimos feo, 24 claveles y 5 lavanda'].forEach((text) => {
      const r0 = compose({ text });
      const r1 = compose({ text, avoidLeads: [r0.bouquet.stems[0].item] });
      ok(r1.bouquet.stems.length > 0, text + ': ramo vacío');
    });
    [{ text: 'feliz san valentín mi amor' }, { text: 'para mi polola en nuestro aniversario', feelings: ['Recuerdo'], season: 'verano' }].forEach((req) => {
      const first = compose(req), leads = [];
      let r = first;
      for (let i = 0; i < 20 && !r.search.cycled; i++) { leads.push(r.bouquet.stems[0].item); r = compose(Object.assign({}, req, { avoidLeads: leads.slice() })); }
      ok(r.search.cycled, req.text + ': vuelve');
      deepEq(r.bouquet.stems, first.bouquet.stems, req.text + ': la primera propuesta');
    });
  });

  test('intención: determinista y forma de la mezcla', () => {
    const texts = INTENTS.map((q) => q.text).filter((t) => t != null).concat(N1.map((x) => x[0]), [
      'le gustan los girasoles', 'no estoy enojada, solo quiero agradecerte', 'no me arrepiento de nada', 'nunca te olvidaré', 'no quiero que estés triste',
      'mi mamá no está bien', 'no te pido perdón, te doy las gracias', 'no sabes cuánto te quiero', 'te quiero, pero no de forma romántica',
      'nada triste, que sea alegre', 'no es para pedir perdón, es para celebrar', 'te quiero muchísimo', 'te quiero', 'estoy un poco nerviosa',
      'estoy nerviosa', 'estoy nerviosa por la entrevista', 'para mi polola', 'para mi mamá en su día', 'para mi profe en su día', '🙏', '❤️',
      'estoy muy triste 😢', 'para mi amiga Paz', 'para mí, que tuve una semana pesadísima', 'ramo para mi profe que se jubila',
      'falleció el papá de mi mejor amigo', 'feliz cumpleaños en el cielo, abuelo', 'lo siento mucho por tu pérdida', 'estoy en el cielo contigo',
      'perdí a mi amiga en una pelea', 'mi amigo partió a Europa', 'te extraño mucho', 'te quiero mucho hermanita',
      'estoy enojada con mi hermana pero la quiero', 'mi amiga terminó con su pololo y está muy triste', 'hola', 'tres rosas blancas']);
    texts.forEach((t) => {
      const d = read(t), keys = Object.keys(d.target);
      deepEq(read(t), d, t + ': determinista');
      approx(keys.reduce((a, k) => a + d.target[k], 0), 1, 1e-9, t + ': suma');
      ok(keys.length >= 1 && keys.length <= 4, t + ': ' + keys.length + ' sentimientos');
      ok(d.ranked.every((x, i) => !i || d.ranked[i - 1].w >= x.w), t + ': orden');
    });
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

  /* ---------- 9. Lámina descargable ---------- */
  test('lámina: el PDF tiene una página por imagen y su índice apunta a cada objeto', () => {
    const NL = String.fromCharCode(10), raw = [0xff, 0xd8, 0x00, 0x80, 0xff, 0xd9];
    const jpeg = new Uint8Array(raw), jpegText = String.fromCharCode(...raw);
    const bytes = FL.plate.pdf([{ jpeg, w: 4, h: 6 }, { jpeg, w: 4, h: 6 }], { title: 'Para mamá ✿', date: new Date(2026, 9, 2, 9, 5, 7) });
    const s = Array.from(bytes, (c) => String.fromCharCode(c)).join('');
    ok(s.startsWith('%PDF-1.4' + NL), 'cabecera');
    ok(s.endsWith('%%EOF' + NL), 'final');
    ok(s.includes('/Count 2 /Kids [4 0 R 7 0 R]'), 'dos páginas');
    eq(s.split('/Filter /DCTDecode /Length 6 >>' + NL + 'stream' + NL + jpegText + NL + 'endstream').length, 3, 'imágenes íntegras');
    ok(s.includes('/Title <FEFF00500061007200610020006D0061006D00E10020273F>'), 'título en UTF-16');
    ok(s.includes('/CreationDate (D:20261002090507)'), 'fecha');
    const lines = s.split(NL), at = lines.lastIndexOf('startxref');
    const start = +lines[at + 1];
    ok(s.startsWith(['xref', '0 10', '0000000000 65535 f '].join(NL) + NL, start), 'tabla xref');
    const rows = s.slice(start).split(NL).slice(3, 12);
    eq(rows.length, 9, 'una entrada por objeto');
    rows.forEach((row, k) => {
      ok(/^\d{10} 00000 n $/.test(row), 'entrada de 20 bytes: ' + row);
      ok(s.startsWith((k + 1) + ' 0 obj' + NL, +row.slice(0, 10)), 'objeto ' + (k + 1));
    });
  });

  test('lámina: nombre de archivo sin tildes ni símbolos', () => {
    eq(FL.u.slug('Para mamá, con cariño ✿', 'ramo'), 'para-mama-con-carino');
    eq(FL.u.slug('', 'ramo'), 'ramo');
    eq(FL.u.slug('✿✿', 'ramo'), 'ramo');
  });

  test('lectura: las lecturas antiguas de la IA se ignoran', () => {
    const b = mk([['lirio', 3], ['rosa-roja', 2]]);
    const n = B().normalize(Object.assign({}, b, { reading: { source: 'ai', summary: 'x' } }));
    eq(n.bouquet.reading, undefined, 'normalize la descarta');
    deepEq(n.issues, []);
    const d = FL.reading.display(b);
    eq(d.source, 'local');
    eq(d.summary, FL.reading.interpret(b).summary);
    ok(d.warnings.some((w) => /gatos/.test(w)), 'avisos locales');
    return withStorage((ls) => {
      ls.setItem('fl.bouquets', JSON.stringify([Object.assign({}, b, { id: 'b_conia1', reading: { source: 'ai', summary: 'Resumen de la IA.' } })]));
      const list = B().list();
      deepEq(list.map((x) => x.id), ['b_conia1'], 'el ramo guardado sigue ahí');
      eq(list[0].reading, undefined, 'sin la lectura de la IA');
    });
  });

  test('lectura: el buscador y la lectura usan el mismo vector', () => {
    const R = FL.reading;
    FL.popular.forEach((p) => {
      const b = fromPopular(p.id), v = R.vector(b.stems), sum = v.reduce((a, x) => a + x, 0), ms = R.interpret(b).meanings;
      ms.forEach((m) => approx(v[FL.meanings.indexOf(m.id)] / sum, m.weight, 0.0006, p.id + ': ' + m.id));
      let best = 0;
      v.forEach((x, i) => { if (x > v[best]) best = i; });
      eq(FL.meanings[best], ms[0].id, p.id + ': el primero');
    });
  });

  test('dibujo: modo independiente, con cada cabeza en línea y sin URLs blob', () => {
    if (typeof document === 'undefined') skip('necesita un navegador');
    const b = fromPopular('docena-roja');
    const svg = FL.bouquetArt.render(b, { standalone: true, lit: '0.4' }).svg;
    ok(!/blob:/.test(svg), 'sin blob');
    eq((svg.match(/<svg /g) || []).length, 1 + B().total(b), 'un SVG por tallo');
    ok(svg.includes('--lit-o:0.4'), 'luz dada');
    const doc = new DOMParser().parseFromString(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '), 'image/svg+xml');
    eq(doc.getElementsByTagName('parsererror').length, 0, 'XML válido');
  });

  /* ---------- Receta para la florería ---------- */
  test('receta: protagonistas primero, unidades y color cuando la flor viene en varios', () => {
    const b = B().create({ stems: [{ item: 'eucalipto', n: 3 }, { item: 'tulipan', n: 7 }, { item: 'rosa-roja', n: 1 }, { item: 'orquidea', n: 2 }] });
    const L = FL.recipe.lines(b);
    deepEq(L.map((l) => l.item), ['rosa-roja', 'tulipan', 'orquidea', 'eucalipto']);
    eq(L[0].unit, 'tallo');
    eq(L[0].color, '', 'la rosa roja viene en un solo color');
    eq(L[1].unit, 'tallos');
    eq(L[1].color, 'rojo', 'el tulipán se dibuja rojo');
    eq(L[2].unit, 'macetas');
    eq(FL.recipe.totalText(L), '11 tallos y 2 macetas');
  });

  test('receta: texto con envoltorio, cinta y total; tarjeta y enlace solo si se piden', () => {
    const b = B().create({
      name: 'Para mamá', stems: [{ item: 'girasol', n: 5 }], wrap: { style: 'kraft', color: '#c9a77c' }, ribbon: { color: '#e7c25c' },
      card: { to: 'Mamá', message: 'Gracias', from: 'Seba' }
    });
    const t = FL.recipe.text(b);
    ok(t.startsWith('Receta para la florería · «Para mamá»'), t);
    ok(t.includes('- 5 tallos de girasol\n'), 'línea del girasol');
    ok(t.includes('Envoltorio: papel kraft claro'), 'envoltorio');
    ok(t.includes('Cinta: dorado'), 'cinta');
    ok(t.includes('Total: 5 tallos'), 'total');
    ok(!t.includes('Gracias') && !t.includes('Así se ve'), 'sin tarjeta ni enlace');
    const full = FL.recipe.text(b, { card: true, link: 'https://x.test/#ramo=abc' });
    ok(full.includes('Para: Mamá\n«Gracias»\nDe: Seba'), 'tarjeta');
    ok(full.endsWith('Así se ve: https://x.test/#ramo=abc'), 'enlace');
    const wrap = (style, color) => FL.recipe.wrapText(B().create({ stems: [{ item: 'girasol', n: 1 }], wrap: { style, color } }));
    eq(wrap('seda', '#f3e6ea'), 'papel de seda rosa pálido');
    eq(wrap('tela', '#7c8a6a'), 'tela salvia');
    eq(wrap('ninguno'), 'sin envoltorio');
  });

  test('receta: escapa la tarjeta y avisa lo que no suele haber en florerías', () => {
    const b = B().create({ stems: [{ item: 'loto', n: 1 }, { item: 'rosa-blanca', n: 2 }], card: { to: '<img src=x onerror=alert(1)>', message: 'a "b" <i>', from: '' } });
    const h = FL.recipe.html(b, { card: true });
    ok(!/<img|<i>/.test(h), 'sin etiquetas escritas por la persona');
    ok(h.includes('&lt;img'), 'escapado');
    ok(!FL.recipe.html(b).includes('recipe-card'), 'sin tarjeta por defecto');
    ok(/Loto: poco habitual en florerías/.test(FL.recipe.text(b)), 'aviso del loto');
    ok(!/Rosa blanca: poco habitual/.test(FL.recipe.text(b)), 'la rosa sí se consigue');
  });

  test('receta: florerías cerca, sin ubicación salvo que se dé, redondeada; el destino se puede cambiar', () => {
    eq(FL.recipe.mapsUrl, 'https://www.google.com/maps/search/?api=1&query=florer%C3%ADa');
    eq(FL.recipe.nearbyUrl(), FL.recipe.mapsUrl);
    eq(FL.recipe.nearbyUrl(null), FL.recipe.mapsUrl);
    // Con ubicación: el mapa se centra ahí, con tres decimales (unos cien metros) y sin más datos.
    eq(FL.recipe.nearbyUrl({ lat: -33.456789, lng: -70.648123 }), 'https://www.google.com/maps/search/florer%C3%ADa/@-33.457,-70.648,15z');
    eq(FL.recipe.provider().id, 'maps');
    ok(!/[?&](ll|sll|center|lat|lng|location)=/i.test(FL.recipe.nearbyUrl()), FL.recipe.nearbyUrl());
    eq(FL.recipe.openNearby(), false);
    FL.recipe.providers.echo = { id: 'echo', label: 'Eco', hint: 'nada', url: 'https://example.test/buscar' };
    ok(FL.recipe.useProvider('echo'));
    eq(FL.recipe.nearbyUrl(), 'https://example.test/buscar');
    ok(FL.recipe.useProvider('maps'));
    eq(FL.recipe.providerId, 'maps');
    delete FL.recipe.providers.echo;
    ok(!FL.recipe.useProvider('no-existe'));
  });
})(typeof window !== 'undefined' ? window : globalThis);
