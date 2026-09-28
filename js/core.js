/* Florilegio — utilidades compartidas y primitivas de dibujo botánico */
(function () {
  'use strict';
  const FL = (window.FL = window.FL || {});
  FL.flowers = [];
  FL.art = {};
  FL.reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const U = (FL.u = {});

  // Generador pseudoaleatorio con semilla: la misma flor se dibuja igual en el jardín y en primer plano.
  U.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const f = (U.f = (n) => Math.round(n * 10) / 10);
  const P = (U.P = (x, y) => f(x) + ',' + f(y));
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rad = (d) => (d * Math.PI) / 180;
  U.norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Con una hoja a pantalla completa abierta (taller, mostrador, regalo), el jardín queda inerte para teclado y lectores.
  U.syncSheets = function () {
    const on = !!document.querySelector('.sheet:not([hidden])');
    document.body.classList.toggle('sheet-open', on);
    document.querySelectorAll('#garden, .brand, .topnav, .colophon, #filterPill').forEach((el) => { el.inert = on; });
  };
  // Devuelve el foco a donde estaba, o a un respaldo si aquel control ya no se ve (quedó en una hoja cerrada).
  U.refocus = function (el, fallback) {
    const usable = (x) => x && x.focus && document.contains(x) && x.offsetParent !== null && !x.closest('[inert], [hidden]');
    const target = usable(el) ? el : usable(fallback) ? fallback : null;
    if (target) target.focus({ preventScroll: true });
  };
  // Texto escrito por personas, listo para insertar en HTML.
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Curva suave (Catmull-Rom a Bézier) que pasa por todos los puntos.
  U.smooth = function (pts, closed = true, k = 1) {
    const n = pts.length;
    const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let d = 'M' + P(pts[0][0], pts[0][1]);
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      d += 'C' + P(p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k) + ' ' +
        P(p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k) + ' ' + P(p2[0], p2[1]);
    }
    return closed ? d + 'Z' : d;
  };

  /*
   * Contorno de un pétalo (u hoja) que nace en (0,0) y apunta hacia arriba (y negativa).
   * tip: 'round' | 'point' | 'notch' | 'serrate' | 'ruffle'. Pequeñas imprecisiones (jit, asym)
   * evitan la simetría perfecta de lo dibujado a máquina.
   */
  U.petalPts = function (len, wid, o = {}) {
    const r = o.r || Math.random;
    const tip = o.tip || 'round';
    const base = o.base != null ? o.base : 0.14;
    const wpos = o.wpos != null ? o.wpos : 0.6;
    const jit = o.jit != null ? o.jit : 0.035;
    const tEnd = tip === 'point' ? 1 : o.tEnd != null ? o.tEnd : 0.76;
    const ns = o.ns || 7;
    const asym = o.asym != null ? o.asym : (r() - 0.5) * 0.14;
    const J = () => (r() - 0.5) * 2 * jit * wid;
    const k = Math.log(0.5) / Math.log(wpos);
    const taper = o.taper != null ? o.taper : 0.12;
    const W = (t) => {
      if (tip === 'point') {
        return wid * (Math.pow(Math.sin(Math.PI * Math.pow(t, k)), 0.85) * (1 - base) + base * (1 - t) * 0.6);
      }
      const rise = Math.sin((Math.PI / 2) * Math.min(1, t / wpos));
      const fall = t > wpos ? 1 - taper * Math.pow((t - wpos) / Math.max(0.01, tEnd - wpos), 2) : 1;
      return wid * (base + (1 - base) * Math.pow(rise, 0.75)) * fall;
    };
    const left = [], right = [];
    for (let i = 0; i <= ns; i++) {
      if (tip === 'point' && i === ns) break;
      const t = (i / ns) * tEnd;
      let tw = 0;
      if (o.teeth && t > 0.12) tw = (i % 2 ? 1 : -0.4) * (o.ta || 0.08) * wid;
      const w = W(t) + tw;
      const y = -len * t;
      left.push([-w * (1 + asym) + J(), y + J() * 0.5]);
      right.push([w * (1 - asym) + J(), y + J() * 0.5]);
    }
    let cap;
    if (tip === 'point') {
      cap = [[J() * 0.4 + (o.lean || 0) * len, -len]];
    } else {
      const lx = left[left.length - 1][0], rx = right[right.length - 1][0];
      const yE = -len * tEnd, h = len * (1 - tEnd);
      const m = o.cm || (tip === 'serrate' ? (o.teethN || 6) * 2 + 1 : tip === 'ruffle' ? 13 : 7);
      cap = [];
      for (let j = 1; j < m; j++) {
        const u = j / m;
        const x = lx + (rx - lx) * u;
        const s = 2 * u - 1;
        let y = yE - h * Math.sqrt(Math.max(0, 1 - s * s));
        if (tip === 'notch') y += h * (o.nd != null ? o.nd : 0.35) * Math.exp(-Math.pow((u - 0.5) / 0.09, 2));
        if (tip === 'serrate') y += (j % 2 ? -1 : 1) * h * (o.sd != null ? o.sd : 0.3) * (0.7 + r() * 0.6);
        if (tip === 'ruffle') y += Math.sin(u * Math.PI * (o.waves || 5) + (o.wph || 0)) * h * (o.ra != null ? o.ra : 0.18);
        cap.push([x + J() * 0.4, y + J() * 0.4]);
      }
    }
    return { pts: left.concat(cap, right.reverse()), cap };
  };
  U.petal = (len, wid, o = {}) => U.smooth(U.petalPts(len, wid, o).pts, true, o.k != null ? o.k : 1);

  // Hoja o pétalo curvado como una cinta (hojas de tulipán, lirio, lavanda).
  U.blade = function (len, wid, curve, o = {}) {
    const r = o.r || Math.random;
    const n = 9, L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const cx = curve * len * t * t, cy = -len * t;
      const dx = 2 * curve * len * t, dy = -len;
      const m = Math.hypot(dx, dy);
      const nx = -dy / m, ny = dx / m;
      const w = wid * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)), 0.7) * (1 - t * 0.35) + (r() - 0.5) * wid * 0.06;
      if (i === n) { L.push([cx, cy]); break; }
      L.push([cx - nx * w, cy - ny * w]);
      R.push([cx + nx * w, cy + ny * w]);
    }
    return U.smooth(L.concat(R.reverse()), true);
  };

  // Degradados
  U.stops = (a) => a.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>').join('');
  U.lg = (id, a, x1 = 0, y1 = 1, x2 = 0, y2 = 0) =>
    '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + U.stops(a) + '</linearGradient>';
  U.rg = (id, a, cx = 0.5, cy = 0.5, r = 0.5, fx, fy) =>
    '<radialGradient id="' + id + '" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fx="' + (fx != null ? fx : cx) + '" fy="' + (fy != null ? fy : cy) + '">' + U.stops(a) + '</radialGradient>';

  // Pétalo pintado: relleno, borde con pigmento acumulado y una veladura clara (efecto acuarela).
  U.pd = (d, fill, edge, o = {}) =>
    '<path d="' + d + '" fill="' + fill + '" stroke="' + edge + '" stroke-width="' + (o.sw != null ? o.sw : 0.7) +
    '" stroke-opacity="' + (o.so != null ? o.so : 0.45) + '" stroke-linejoin="round"/>' +
    (o.hl ? '<path d="' + d + '" fill="' + o.hl + '" opacity="' + (o.ha != null ? o.ha : 0.22) + '" transform="translate(0,' + f(o.hy || 0) + ') scale(' + (o.hs || '.55,.84') + ')"/>' : '');

  U.veins = (len, n, spread, color, op = 0.25, sw = 0.5, r) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const j = r ? (r() - 0.5) * spread * 0.2 : 0;
      const x2 = u * spread + j, y2 = -len * (0.6 + 0.28 * (1 - Math.abs(u)));
      s += '<path d="M' + P(u * 1.2, -1.5) + 'Q' + P(u * spread * 0.35, -len * 0.42) + ' ' + P(x2, y2) + '"/>';
    }
    return '<g fill="none" stroke="' + color + '" stroke-width="' + sw + '" stroke-opacity="' + op + '" stroke-linecap="round">' + s + '</g>';
  };

  /*
   * Coloca n elementos alrededor de un centro. La rotación va en el atributo del grupo externo;
   * el grupo interno (.pt) queda libre para las transformaciones CSS de cada especie.
   */
  U.ring = (n, off, cls, item, o = {}) => {
    const r = o.r || Math.random;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = off + (360 / n) * i + (r() - 0.5) * (o.aj != null ? o.aj : 8);
      const ty = o.rad ? ' translate(0,' + f(-o.rad) + ')' : '';
      const st = '--i:' + i + ';--a:' + f(a) + 'deg' + (o.style ? ';' + o.style(i, a) : '');
      s += '<g transform="rotate(' + f(a) + ')' + ty + '"><g class="pt ' + cls + '" style="' + st + '">' + item(i, a) + '</g></g>';
    }
    return '<g class="ring ' + cls + '-ring">' + s + '</g>';
  };

  // Hoja simple con nervadura.
  U.leaf = (len, wid, o = {}) => {
    const r = o.r || Math.random;
    const d = U.petal(len, wid, Object.assign({ tip: 'point', wpos: 0.42, base: 0.08, jit: 0.025, ns: o.teeth ? 14 : 8 }, o));
    let v = '';
    for (let j = 1; j <= 5; j++) {
      const t = j / 6.5, y = -len * t, w = wid * 0.8 * Math.sin(Math.PI * Math.min(1, t * 1.1));
      v += 'M0,' + f(y) + 'Q' + P(-w * 0.5, y - len * 0.05) + ' ' + P(-w, y - len * 0.1) +
        'M0,' + f(y) + 'Q' + P(w * 0.5, y - len * 0.05) + ' ' + P(w, y - len * 0.1);
    }
    return '<path d="' + d + '" fill="' + o.fill + '" stroke="' + (o.edge || '#3d5230') + '" stroke-width=".7" stroke-opacity=".5"/>' +
      (o.gloss ? '<path d="' + d + '" fill="#fff" opacity=".16" transform="translate(' + f(-wid * 0.2) + ',0) scale(.45,.9)"/>' : '') +
      '<path d="M0,0Q' + P(len * 0.02 * (r() - 0.5), -len * 0.5) + ' 0,' + f(-len * 0.95) + '" fill="none" stroke="' + (o.rib || '#dfe8c8') + '" stroke-width="' + f(Math.max(0.5, wid * 0.05)) + '" opacity=".5"/>' +
      '<path d="' + v + '" fill="none" stroke="' + (o.rib || '#dfe8c8') + '" stroke-width=".45" opacity=".35"/>';
  };

  let UID = 0;
  // Dibuja la cabeza floral de una especie como SVG. Devuelve el marcado, el punto de anclaje y la proporción.
  FL.drawHead = function (fl, opts = {}) {
    const fn = FL.art[fl.art];
    const id = 'h' + ++UID;
    const r = U.rng(U.hash(fl.id) + (opts.seed || 0));
    const out = fn(fl.pal || {}, r, id, opts);
    const vb = out.vb || '-100 -100 200 200';
    const svg = '<svg class="fh sp-' + fl.art + ' ' + (opts.cls || '') + '" viewBox="' + vb +
      '" aria-hidden="true" focusable="false"><defs>' + (out.defs || '') + '</defs>' + out.body + '</svg>';
    return { svg, anchor: out.anchor || [0.5, 0.5], aspect: out.aspect || 1 };
  };

  FL.byId = (id) => FL.flowers.find((x) => x.id === id);
})();
