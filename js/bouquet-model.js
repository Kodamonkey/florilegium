/* Florilegio — modelo de ramo (esquema v1 en data/schema/bouquet.schema.json):
   crear, normalizar, validar, migrar, codificar para enlaces #ramo= y guardar en «Mis ramos». */
(function () {
  'use strict';
  const FL = window.FL;
  const B = (FL.bouquet = {});
  const VERSION = 1;
  const WRAPS = ['kraft', 'seda', 'tela', 'ninguno'];
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const KEY = 'fl.bouquets';
  const lim = () => FL.limits || { items: 12, stemsPerItem: 24, stems: 48, message: 280, intent: 500 };

  const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max) : '');
  const now = () => new Date().toISOString();
  B.newId = () => 'b_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  B.newSeed = () => (Math.random() * 4294967295) >>> 0;

  B.create = function (partial) {
    return B.normalize(Object.assign({ v: VERSION, stems: [] }, partial || {})).bouquet;
  };

  // Devuelve una copia válida y la lista de ajustes hechos (ítems desconocidos, límites, textos largos).
  B.normalize = function (input) {
    const L = lim(), issues = [];
    const src = B.migrate(input && typeof input === 'object' ? input : {});
    const out = { v: VERSION };
    out.id = typeof src.id === 'string' && /^b_[a-z0-9]{4,24}$/.test(src.id) ? src.id : B.newId();
    if (src.name) out.name = str(src.name, 80);
    out.createdAt = str(src.createdAt, 40) || now();
    out.updatedAt = str(src.updatedAt, 40) || out.createdAt;
    if (src.occasion && FL.occasion && FL.occasion(src.occasion)) out.occasion = src.occasion;
    if (src.intent && (src.intent.text || (src.intent.feelings || []).length)) {
      out.intent = {};
      if (src.intent.text) out.intent.text = str(src.intent.text, L.intent);
      const feel = (src.intent.feelings || []).filter((m) => FL.meanings.includes(m)).slice(0, 10);
      if (feel.length) out.intent.feelings = feel;
    }
    // Tallos: ítems conocidos, sin repetir, cantidades enteras dentro de los límites.
    const merged = new Map();
    (Array.isArray(src.stems) ? src.stems : []).forEach((s) => {
      if (!s || !FL.item(s.item)) { issues.push('ítem desconocido: ' + (s && s.item)); return; }
      const n = Math.round(Number(s.n));
      if (!(n >= 1)) { issues.push('cantidad inválida: ' + s.item); return; }
      merged.set(s.item, (merged.get(s.item) || 0) + n);
    });
    let total = 0;
    out.stems = [];
    for (const [item, n0] of merged) {
      if (out.stems.length >= L.items) { issues.push('más de ' + L.items + ' ítems'); break; }
      let n = Math.min(n0, L.stemsPerItem);
      if (n < n0) issues.push(item + ': máximo ' + L.stemsPerItem + ' tallos');
      n = Math.min(n, L.stems - total);
      if (n < 1) { issues.push('más de ' + L.stems + ' tallos en total'); break; }
      out.stems.push({ item, n });
      total += n;
    }
    const w = src.wrap || {};
    out.wrap = { style: WRAPS.includes(w.style) ? w.style : 'kraft' };
    const wrapDef = FL.taxonomy.wraps.find((x) => x.id === out.wrap.style);
    if (HEX.test(w.color || '')) out.wrap.color = w.color.toLowerCase();
    else if (wrapDef && wrapDef.colors.length) out.wrap.color = wrapDef.colors[0];
    out.ribbon = { color: HEX.test((src.ribbon || {}).color || '') ? src.ribbon.color.toLowerCase() : FL.taxonomy.ribbons[0] };
    const c = src.card || {};
    out.card = { to: str(c.to, 60), message: str(c.message, L.message), from: str(c.from, 60) };
    const seed = Number(src.layoutSeed);
    out.layoutSeed = Number.isInteger(seed) && seed >= 0 && seed <= 4294967295 ? seed : B.newSeed();
    if (src.reading && typeof src.reading.summary === 'string' && src.reading.source === 'local') {
      out.reading = Object.assign({}, src.reading, { summary: str(src.reading.summary, 2000) });
    }
    return { bouquet: out, issues };
  };

  // Lista de problemas sin corregir nada (útil en pruebas y al recibir datos de afuera).
  B.validate = (b) => {
    const { bouquet, issues } = B.normalize(b);
    if (!bouquet.stems.length) issues.push('el ramo no tiene tallos');
    return issues;
  };

  // Hoy solo existe la versión 1; los objetos sin versión se tratan como v1.
  B.migrate = function (obj) {
    if (!obj || typeof obj !== 'object') return {};
    if (obj.v == null || obj.v === VERSION) return obj;
    if (obj.v > VERSION) return Object.assign({}, obj, { v: VERSION });
    return obj;
  };

  B.total = (b) => b.stems.reduce((a, s) => a + s.n, 0);
  B.flowerCount = (b) => b.stems.reduce((a, s) => a + ((FL.item(s.item) || {}).type === 'flower' ? s.n : 0), 0);
  B.clone = (b) => JSON.parse(JSON.stringify(b));
  B.count = (b, item) => (b.stems.find((s) => s.item === item) || { n: 0 }).n;

  // Suma o resta tallos de un ítem respetando los límites. Devuelve true si cambió algo.
  B.add = function (b, item, delta) {
    const L = lim();
    const s = b.stems.find((x) => x.item === item);
    const total = B.total(b);
    if (delta > 0) {
      if (!s && b.stems.length >= L.items) return false;
      const room = Math.min(L.stems - total, L.stemsPerItem - (s ? s.n : 0));
      const d = Math.min(delta, room);
      if (d <= 0) return false;
      if (s) s.n += d; else b.stems.push({ item, n: d });
    } else {
      if (!s) return false;
      s.n += delta;
      if (s.n <= 0) b.stems.splice(b.stems.indexOf(s), 1);
    }
    b.updatedAt = now();
    delete b.reading;
    return true;
  };

  /* ---------- Enlaces: JSON compacto → deflate (si el navegador lo permite) → base64url ---------- */
  const toCompact = (b) => {
    const o = { s: b.stems.map((s) => [s.item, s.n]), w: [b.wrap.style, b.wrap.color || ''], r: b.ribbon.color, k: b.layoutSeed };
    if (b.name) o.n = b.name;
    if (b.occasion) o.o = b.occasion;
    if (b.card && (b.card.to || b.card.message || b.card.from)) o.c = [b.card.to, b.card.message, b.card.from];
    // Ninguna lectura viaja en el enlace: quien lo recibe ve la lectura local, calculada al abrirlo, y la intención escrita queda privada.
    return o;
  };
  const fromCompact = (o) => ({
    v: VERSION,
    name: o.n, occasion: o.o,
    stems: (o.s || []).map(([item, n]) => ({ item, n })),
    wrap: { style: (o.w || [])[0], color: (o.w || [])[1] || undefined },
    ribbon: { color: o.r },
    card: o.c ? { to: o.c[0], message: o.c[1], from: o.c[2] } : undefined,
    layoutSeed: o.k
  });
  const b64 = {
    enc: (bytes) => {
      let s = '';
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    dec: (str) => {
      const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4));
      const out = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
      return out;
    }
  };
  const pipe = async (bytes, Stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'))).arrayBuffer());
  const canZip = typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

  B.encode = async function (b) {
    const bytes = new TextEncoder().encode(JSON.stringify(toCompact(b)));
    if (canZip) {
      try { return 'z' + b64.enc(await pipe(bytes, CompressionStream)); } catch (e) { /* sin compresión */ }
    }
    return 'j' + b64.enc(bytes);
  };

  B.decode = async function (code) {
    try {
      if (!code || code.length > 8000) return null;
      let bytes = b64.dec(code.slice(1));
      if (code[0] === 'z') {
        if (!canZip) return null;
        bytes = await pipe(bytes, DecompressionStream);
      } else if (code[0] !== 'j') return null;
      const o = JSON.parse(new TextDecoder().decode(bytes));
      const { bouquet } = B.normalize(fromCompact(o));
      return bouquet.stems.length ? bouquet : null;
    } catch (e) {
      return null;
    }
  };

  // Sin location.origin: desde file:// en Firefox vale 'null'.
  B.link = async (b) => location.href.split('#')[0] + '#ramo=' + (await B.encode(b));

  /* ---------- «Mis ramos» (solo en este navegador) ---------- */
  const read = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(raw) ? raw.map((x) => B.normalize(x).bouquet).filter((x) => x.stems.length) : [];
    } catch (e) { return []; }
  };
  const write = (list) => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  };
  B.list = () => read().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  B.get = (id) => read().find((x) => x.id === id) || null;
  B.save = function (b) {
    const list = read().filter((x) => x.id !== b.id);
    b.updatedAt = now();
    list.push(B.normalize(b).bouquet);
    return write(list.slice(-60));
  };
  B.remove = (id) => write(read().filter((x) => x.id !== id));
})();
