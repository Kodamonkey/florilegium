/* Florilegio — dibujo de un ramo: reparte las cabezas en cúpula según su papel (protagonistas al centro,
   espigas arriba, follaje al borde), las separa con FL.layout y agrega tallos, envoltorio y cinta. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const { f, P } = U;
  const BA = (FL.bouquetArt = {});
  const W = 400, H = 520, TIE = [200, 396];
  // Margen de las cabezas dibujadas como imagen (una imagen recorta lo que sobresale de su viewBox).
  const PAD = 0.2;
  let SEQ = 0;

  // z: orden de dibujo; size: ancho base de la cabeza; ring: franja de la cúpula (0 = centro, 1 = borde);
  // arc: ángulos permitidos (grados, 0 = derecha, -90 = arriba); allow: cuánto puede quedar detrás de otras.
  const ROLE = {
    greenery: { z: 10, size: 112, ring: [0.8, 1.12], arc: [-205, 25], allow: 0.6 },
    spike: { z: 20, size: 80, ring: [0.7, 1.02], arc: [-165, -15], allow: 0.3 },
    filler: { z: 30, size: 62, ring: [0.25, 1], arc: [-180, 180], allow: 0.5 },
    secondary: { z: 40, size: 76, ring: [0.35, 0.9], arc: [-180, 180], allow: 0.14 },
    focal: { z: 50, size: 96, ring: [0, 0.6], arc: [-180, 180], allow: 0.1 }
  };
  const ORDER = ['greenery', 'spike', 'filler', 'secondary', 'focal'];

  const roleOf = (it) => (it.bouquet && ROLE[it.bouquet.role] ? it.bouquet.role : 'secondary');
  const stemColor = (it) => (FL.stemCfg && FL.stemCfg[it.art] && FL.stemCfg[it.art].c) || (it.pal && it.pal.st) || '#5f7d3f';
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('');
  };

  // Calcula la composición sin dibujar: útil también en pruebas.
  BA.arrange = function (b) {
    const r = U.rng(b.layoutSeed || 1);
    const units = [];
    b.stems.forEach((s) => {
      const it = FL.item(s.item);
      if (!it) return;
      for (let k = 0; k < s.n; k++) units.push({ it, role: roleOf(it), k });
    });
    const count = units.length;
    const kSize = U.clamp(1.3 - count * 0.012, 0.74, 1.25);
    const R = U.clamp(62 + Math.sqrt(count) * 25, 84, 172), Ry = R * 0.8;
    const C = [200, 58 + Ry + 20];
    const nodes = [];
    // Sin protagonistas, las acompañantes ocupan el centro; con pocas flores al centro, también las espigas.
    const nOf = (role) => units.filter((u) => u.role === role).length;
    const core = nOf('focal') + nOf('secondary');
    const conf = {
      secondary: nOf('focal') ? ROLE.secondary : Object.assign({}, ROLE.secondary, { ring: [0, 0.8] }),
      spike: core >= 4 ? ROLE.spike : Object.assign({}, ROLE.spike, { ring: [core ? 0.35 : 0.1, 0.98], arc: [-180, 180] })
    };
    ORDER.forEach((role) => {
      const group = units.filter((u) => u.role === role);
      const cfg = conf[role] || ROLE[role];
      group.forEach((u, j) => {
        const m = group.length;
        let rr, th;
        if (count === 1) { rr = 0; th = -90; }
        else if (role === 'focal' && m === 1) { rr = 0.05; th = -90; }
        else {
          const t = (j + 0.5) / m;
          rr = cfg.ring[0] + (cfg.ring[1] - cfg.ring[0]) * Math.sqrt(t) + (r() - 0.5) * 0.08;
          th = role === 'spike' || role === 'greenery'
            ? cfg.arc[0] + (cfg.arc[1] - cfg.arc[0]) * ((j + 0.5 + (r() - 0.5) * 0.4) / m)
            : cfg.arc[0] + ((j * 137.508 + r() * 25) % (cfg.arc[1] - cfg.arc[0]));
        }
        // Tres variantes por especie: tallos repetidos no se ven calcados y las imágenes son pocas y reutilizables.
        const seed = (u.k % 3) * 7;
        const drawn = FL.canImage ? FL.headArt(u.it, { open: true, pad: PAD, seed }) : FL.drawHead(u.it, { seed, cls: 'open' });
        const w = cfg.size * kSize * (u.it.type === 'flower' ? Math.min(1.2, u.it.size || 1) : 1);
        const h = w * drawn.aspect;
        const x = C[0] + Math.cos(U.rad(th)) * rr * R, y = C[1] + Math.sin(U.rad(th)) * rr * Ry - (role === 'spike' ? h * 0.2 : 0);
        nodes.push({
          x, y, rx: w * 0.42, ry: h * 0.42, z: cfg.z + nodes.length * 0.001, band: role === 'focal' || role === 'secondary' ? role : 'u' + nodes.length,
          allow: cfg.allow, minX: 26 + w * 0.3, maxX: W - 26 - w * 0.3, minY: 26 + h * 0.3, maxY: Math.min(TIE[1] - 70, C[1] + Ry * 0.62),
          it: u.it, role, w, h, drawn
        });
      });
    });
    FL.layout.relax(nodes, { gap: 2, allow: 0.1, iterations: 90 });
    return { nodes, R, Ry, C, count };
  };

  function wrapSheets(b, lay) {
    const style = b.wrap.style, col = b.wrap.color || '#c9a77c', id = 'bq' + ++SEQ;
    if (style === 'ninguno') return { back: '', front: '', sleeve: '', defs: '' };
    const { R, Ry, C } = lay;
    const dark = shade(col, 0.82), light = shade(col, 1.08);
    const top = C[1] - Ry * 0.45, L = C[0] - R * 1.18, Rt = C[0] + R * 1.18;
    const defs = '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + light + '"/><stop offset="1" stop-color="' + dark + '"/></linearGradient>' +
      (style === 'kraft' ? '<pattern id="' + id + 'k" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><path d="M0,0L0,7" stroke="' + dark + '" stroke-width=".6" opacity=".35"/></pattern>' : '');
    const texture = style === 'kraft' ? ' <path d="__D__" fill="url(#' + id + 'k)"/>' : '';
    const op = style === 'seda' ? ' opacity=".9"' : '';
    // Hoja de atrás: sube por detrás de la cúpula con un borde ondulado.
    let d = 'M' + P(TIE[0] - 14, TIE[1]) + 'L' + P(L, top + Ry * 0.25);
    const waves = 7;
    for (let i = 0; i < waves; i++) {
      const x0 = L + ((Rt - L) * i) / waves, x1 = L + ((Rt - L) * (i + 1)) / waves;
      const yArc = (x) => top - Math.sqrt(Math.max(0, 1 - Math.pow((x - C[0]) / (R * 1.2), 2))) * Ry * 0.55;
      d += 'Q' + P((x0 + x1) / 2, yArc((x0 + x1) / 2) - 10) + ' ' + P(x1, yArc(x1) + (i === waves - 1 ? Ry * 0.25 : 0));
    }
    d += 'L' + P(TIE[0] + 14, TIE[1]) + 'Z';
    const back = '<path d="' + d + '" fill="url(#' + id + 'w)" stroke="' + dark + '" stroke-width="1"' + op + '/>' + texture.replace('__D__', d);
    // Hojas de adelante: dos solapas que se cruzan sobre los tallos.
    const yF = C[1] + Ry * 0.55;
    const flapL = 'M' + P(TIE[0] - 16, TIE[1] + 4) + 'L' + P(C[0] - R * 1.08, yF - 14) + 'Q' + P(C[0] - R * 0.3, yF + 12) + ' ' + P(C[0] + R * 0.35, yF + 30) + 'L' + P(TIE[0] + 10, TIE[1] + 4) + 'Z';
    const flapR = 'M' + P(TIE[0] + 16, TIE[1] + 4) + 'L' + P(C[0] + R * 1.08, yF - 20) + 'Q' + P(C[0] + R * 0.3, yF + 4) + ' ' + P(C[0] - R * 0.25, yF + 26) + 'L' + P(TIE[0] - 10, TIE[1] + 4) + 'Z';
    const fold = (a, bb) => '<path d="M' + P(a[0], a[1]) + 'L' + P(bb[0], bb[1]) + '" stroke="' + dark + '" stroke-width=".8" opacity=".45"/>';
    const front = '<path d="' + flapL + '" fill="' + light + '" stroke="' + dark + '" stroke-width="1"' + op + '/>' + texture.replace('__D__', flapL) +
      fold([TIE[0] - 6, TIE[1]], [C[0] - R * 0.55, yF]) +
      '<path d="' + flapR + '" fill="url(#' + id + 'w)" stroke="' + dark + '" stroke-width="1"' + op + '/>' + texture.replace('__D__', flapR) +
      fold([TIE[0] + 6, TIE[1]], [C[0] + R * 0.6, yF - 4]);
    const sleeve = '<path d="M' + P(TIE[0] - 17, TIE[1]) + 'L' + P(TIE[0] - 25, 472) + 'L' + P(TIE[0] + 25, 472) + 'L' + P(TIE[0] + 17, TIE[1]) + 'Z" fill="url(#' + id + 'w)" stroke="' + dark + '" stroke-width="1"' + op + '/>';
    return { back, front, sleeve, defs };
  }

  function bow(color) {
    const dk = shade(color, 0.75), [x, y] = TIE;
    return '<g class="bq-bow">' +
      '<path d="M' + P(x - 4, y + 2) + 'C' + P(x - 22, y + 20) + ' ' + P(x - 30, y + 48) + ' ' + P(x - 20, y + 70) + 'L' + P(x - 12, y + 62) + 'C' + P(x - 18, y + 44) + ' ' + P(x - 12, y + 22) + ' ' + P(x + 2, y + 6) + 'Z" fill="' + color + '" stroke="' + dk + '" stroke-width=".8"/>' +
      '<path d="M' + P(x + 4, y + 2) + 'C' + P(x + 18, y + 22) + ' ' + P(x + 30, y + 44) + ' ' + P(x + 26, y + 68) + 'L' + P(x + 17, y + 64) + 'C' + P(x + 20, y + 44) + ' ' + P(x + 10, y + 24) + ' ' + P(x - 2, y + 6) + 'Z" fill="' + color + '" stroke="' + dk + '" stroke-width=".8"/>' +
      '<path d="M' + P(x, y) + 'C' + P(x - 34, y - 26) + ' ' + P(x - 44, y + 14) + ' ' + P(x, y + 4) + 'Z" fill="' + color + '" stroke="' + dk + '" stroke-width=".8"/>' +
      '<path d="M' + P(x, y) + 'C' + P(x + 34, y - 26) + ' ' + P(x + 44, y + 14) + ' ' + P(x, y + 4) + 'Z" fill="' + color + '" stroke="' + dk + '" stroke-width=".8"/>' +
      '<ellipse cx="' + f(x) + '" cy="' + f(y + 2) + '" rx="7" ry="6" fill="' + dk + '"/></g>';
  }

  /*
   * Devuelve { svg, nodes }. opts.label: texto accesible; opts.cls: clases extra del <svg>.
   */
  BA.render = function (b, opts = {}) {
    if (!b || !b.stems || !b.stems.length) {
      return { svg: '<svg class="bq bq-empty ' + (opts.cls || '') + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><ellipse cx="200" cy="250" rx="120" ry="150" fill="none" stroke="currentColor" stroke-dasharray="4 7" opacity=".35"/></svg>', nodes: [] };
    }
    const lay = BA.arrange(b);
    const wrap = wrapSheets(b, lay);
    let stems = '', ends = '', heads = '';
    const sorted = lay.nodes.slice().sort((a, c) => a.z - c.z);
    sorted.forEach((n, i) => {
      const col = stemColor(n.it);
      const sx = n.x, sy = n.y + n.h * 0.25;
      const cx = (sx + TIE[0]) / 2 + (sx - TIE[0]) * 0.15, cy = (sy + TIE[1]) / 2;
      stems += '<path d="M' + P(sx, sy) + 'Q' + P(cx, cy) + ' ' + P(TIE[0] + (sx - TIE[0]) * 0.05, TIE[1]) + '" stroke="' + col + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
      const ex = TIE[0] + (sx - TIE[0]) * 0.1 + (i % 5 - 2) * 2.4;
      ends += '<path d="M' + P(TIE[0] + (sx - TIE[0]) * 0.05, TIE[1]) + 'L' + P(ex, 500 + (i % 3) * 3) + '" stroke="' + col + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<ellipse cx="' + f(ex) + '" cy="' + f(500 + (i % 3) * 3) + '" rx="1.3" ry=".8" fill="#dbe6c2"/>';
      const tilt = U.clamp((n.x - TIE[0]) / lay.R, -1, 1) * 14;
      // En la página cada cabeza es una imagen: un ramo grande en línea serían miles de nodos SVG.
      const svg = n.drawn.src
        ? '<image href="' + n.drawn.src + '" x="' + f(-n.w * (0.5 + PAD)) + '" y="' + f(-n.h * (0.5 + PAD)) + '" width="' + f(n.w * (1 + 2 * PAD)) +
          '" height="' + f(n.h * (1 + 2 * PAD)) + '" preserveAspectRatio="xMidYMid meet"/>'
        : n.drawn.svg.replace('<svg ', '<svg x="' + f(-n.w / 2) + '" y="' + f(-n.h / 2) + '" width="' + f(n.w) + '" height="' + f(n.h) +
          '" style="width:' + f(n.w) + 'px;height:' + f(n.h) + 'px;overflow:visible" ');
      heads += '<g transform="translate(' + P(n.x, n.y) + ') rotate(' + f(tilt) + ')"><g class="bqh" style="--d:' + f(i * 45) + 'ms">' + svg + '</g></g>';
    });
    const label = opts.label || 'Ramo: ' + b.stems.map((s) => s.n + ' ' + (FL.item(s.item) || {}).name).join(', ');
    const svg = '<svg class="bq ' + (opts.cls || '') + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + label.replace(/"/g, '&quot;') + '">' +
      '<defs>' + wrap.defs + '</defs>' + wrap.back + '<g class="bq-stems">' + stems + '</g>' + heads + wrap.front +
      '<g class="bq-ends">' + ends + '</g>' + wrap.sleeve + bow(b.ribbon.color) + '</svg>';
    return { svg, nodes: lay.nodes };
  };
})();
