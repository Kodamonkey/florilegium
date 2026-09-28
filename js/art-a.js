/* Florilegio — ilustraciones (primera parte). Cada especie devuelve su cabeza floral en SVG. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u, A = FL.art;
  const { f, P, lg, rg, ring, petalPts, smooth, pd, veins } = U;

  // Luz natural desde arriba a la izquierda, común a todas las flores.
  const LIGHT = (id) => rg(id + 'L', [[0, '#fff', 0.55], [0.55, '#fff', 0.08], [1, '#fff', 0]], 0.34, 0.26, 0.78);
  const lightOver = (id, op) => '<circle r="104" fill="url(#' + id + 'L)" opacity="' + op + '" class="lit"/>';
  // Rota y traslada una lista de puntos (para fundir varios pétalos en un solo trazo).
  const tp = (pts, deg, dx = 0, dy = 0) => {
    const a = U.rad(deg), c = Math.cos(a), s = Math.sin(a);
    return pts.map((q) => [q[0] * c - q[1] * s + dx, q[0] * s + q[1] * c + dy]);
  };
  U.tp = tp;

  /* ---------- Rosa ---------- */
  A.rose = function (p, r, id, o) {
    const sp = !!o.special;
    const defs = lg(id + 'o', [[0, p.a], [0.42, p.b], [1, p.c]]) +
      lg(id + 'i', [[0, p.a], [0.58, p.b], [1, p.c]]) +
      rg(id + 's', [[0, p.a, 0.55], [0.7, p.a, 0.14], [1, p.a, 0]]) +
      rg(id + 'c', [[0, p.a], [0.8, p.b], [1, p.b]]) +
      lg(id + 'g', [[0, '#3c5629'], [1, '#86a060']]) + LIGHT(id);
    const rings = sp
      ? [[6, 96, 50, 0], [6, 85, 46, 30], [5, 73, 41, 8], [5, 61, 35, 44], [5, 49, 29, 18], [4, 38, 24, 60], [4, 28, 19, 25]]
      : [[5, 92, 54, 0], [5, 77, 46, 36], [5, 62, 38, 14], [4, 47, 31, 52], [3, 33, 24, 22]];
    const sepal = (len, w = 11) => () => '<path d="' + U.petal(len, w, { r, tip: 'point', wpos: 0.3, base: 0.34, jit: 0.03, lean: (r() - 0.5) * 0.1 }) +
      '" fill="url(#' + id + 'g)" stroke="#2c4020" stroke-width=".6" stroke-opacity=".5"/>';
    let body = ring(5, 18, 'sepb', sepal(sp ? 98 : 84), { r, aj: 6 });
    rings.forEach(([n, len, wid, off], k) => {
      const fill = 'url(#' + id + (k < 2 ? 'o' : 'i') + ')';
      body += ring(n, off + r() * 12, 'r' + (k + 1), () => {
        const L = len * (0.93 + r() * 0.12), Wd = wid * (0.9 + r() * 0.16);
        const pp = petalPts(L, Wd, { r, tip: r() < 0.45 ? 'notch' : 'round', nd: 0.2, tEnd: 0.72, wpos: 0.64, base: 0.2, jit: 0.045 });
        const d = smooth(pp.pts);
        const curl = smooth(pp.cap.map((q) => [q[0] * 0.84, q[1] + L * 0.05]), false);
        return pd(d, fill, p.e, { hl: p.c, ha: 0.2, so: 0.4 }) +
          '<path d="' + curl + '" fill="none" stroke="' + p.c + '" stroke-width="' + f(L * 0.042) + '" stroke-linecap="round" opacity=".5"/>' +
          veins(L * 0.8, 3, Wd * 0.45, p.a, 0.14, 0.5, r);
      }, { r, aj: 10 });
      if (k === 1) body += '<circle r="66" fill="url(#' + id + 's)"/>';
      if (k === 3) body += '<circle r="40" fill="url(#' + id + 's)"/>';
    });
    let core = '<circle r="' + (sp ? 17 : 15) + '" fill="url(#' + id + 'c)"/>';
    for (let j = 0; j < 7; j++) {
      const rr = 2.5 + j * 2.1, a0 = U.rad(j * 67 + r() * 20), a1 = a0 + 2.5;
      core += '<path d="M' + P(Math.cos(a0) * rr, Math.sin(a0) * rr) + 'A' + f(rr) + ',' + f(rr) + ' 0 0 1 ' +
        P(Math.cos(a1) * rr, Math.sin(a1) * rr) + '" fill="none" stroke="' + p.c + '" stroke-width="' + f(1 + j * 0.3) +
        '" stroke-linecap="round" opacity="' + f(0.3 + j * 0.07) + '"/>';
    }
    body += '<g class="core">' + core + '</g>';
    if (sp) body += ring(5, 54, 'sepf', sepal(66, 6.5), { r, aj: 6 });
    body += lightOver(id, 0.5);
    return { defs, body };
  };

  /* ---------- Tulipán (vista lateral) ---------- */
  A.tulip = function (p, r, id) {
    const defs = lg(id + 'f', [[0, p.x], [0.16, p.a], [0.55, p.b], [1, p.c]]) +
      lg(id + 'b', [[0, p.x], [0.2, p.a], [0.85, p.b], [1, p.b]]) +
      lg(id + 'h', [[0, '#fff', 0], [0.5, '#fff', 0.55], [1, '#fff', 0]], 0, 0, 1, 0);
    const draw = (cls, x, rot, len, wid, fill, open) => {
      const d = U.petal(len, wid, { r, tip: 'round', tEnd: 0.8, wpos: 0.56, base: 0.34, jit: 0.02, taper: 0.42 });
      return '<g transform="translate(' + x + ',22) rotate(' + rot + ')"><g class="pt ' + cls + '" style="--o:' + open + 'deg">' +
        pd(d, fill, p.e, { so: 0.35 }) +
        '<path d="' + d + '" fill="url(#' + id + 'h)" opacity=".35" transform="scale(.42,.94)"/>' +
        veins(len * 0.9, 5, wid * 0.55, p.a, 0.2, 0.5, r) + '</g></g>';
    };
    let body = '<g class="tilt">';
    body += draw('tb', -12, -9, 104, 34, 'url(#' + id + 'b)', -14) + draw('tb', 12, 9, 104, 34, 'url(#' + id + 'b)', 14) +
      draw('tb', 0, 0, 108, 34, 'url(#' + id + 'b)', 0);
    let inside = '';
    for (let i = 0; i < 6; i++) {
      const x = -11 + i * 4.4;
      inside += '<path d="M' + f(x * 0.35) + ',16L' + f(x) + ',-20" stroke="' + p.s + '" stroke-width="1.1"/><ellipse cx="' + f(x) + '" cy="-24" rx="1.7" ry="5" fill="' + p.s + '"/>';
    }
    inside += '<path d="M0,18L0,-12" stroke="#cfcb90" stroke-width="4.5" stroke-linecap="round"/>';
    body += '<g class="tin">' + inside + '</g>';
    body += draw('tl', -8, -11, 98, 40, 'url(#' + id + 'f)', -26) + draw('tr', 8, 11, 98, 40, 'url(#' + id + 'f)', 26) +
      draw('tc', 0, 0, 94, 42, 'url(#' + id + 'f)', 0);
    body += '<ellipse cx="0" cy="25" rx="9" ry="5" fill="#6f8f4f"/></g>';
    return { vb: '-80 -125 160 160', anchor: [0.5, 0.95], defs, body };
  };

  /* ---------- Girasol ---------- */
  A.sunflower = function (p, r, id) {
    const defs = lg(id + 'r', [[0, p.a], [0.3, p.b], [1, p.c]]) + lg(id + 'q', [[0, p.a], [0.5, p.a], [1, p.b]]) +
      rg(id + 'd', [[0, p.d0], [0.5, p.d1], [0.82, p.d2], [1, p.d3]]) + lg(id + 'g', [[0, '#4e6128'], [1, p.gr]]) +
      rg(id + 'sh', [[0.6, '#000', 0], [0.86, '#000', 0.28], [1, '#000', 0]]) + LIGHT(id);
    const ray = (len, wid, fill) => () => {
      const L = len * (0.9 + r() * 0.2), Wd = wid * (0.85 + r() * 0.3);
      const d = U.petal(L, Wd, { r, tip: 'point', wpos: 0.4, base: 0.3, jit: 0.05, lean: (r() - 0.5) * 0.12 });
      return pd(d, fill, p.e, { so: 0.35, hl: p.c, ha: 0.25, hs: '.35,.9' }) + veins(L * 0.85, 3, Wd * 0.3, p.a, 0.2, 0.45, r);
    };
    let body = ring(26, 4, 'br', () => pd(U.petal(20 + r() * 6, 7, { r, tip: 'point', wpos: 0.4 }), 'url(#' + id + 'g)', '#34431c', {}), { r, rad: 32, aj: 4 });
    body += ring(22, 0, 'rb', ray(56, 11, 'url(#' + id + 'q)'), { r, rad: 30, aj: 5 });
    body += ring(22, 360 / 44, 'rf', ray(52, 11.5, 'url(#' + id + 'r)'), { r, rad: 31, aj: 5 });
    body += '<circle r="37" fill="url(#' + id + 'd)"/>';
    let fl = '';
    const N = 320, c = 35 / Math.sqrt(N);
    for (let k = 0; k < N; k++) {
      const rr = c * Math.sqrt(k + 0.5), th = k * 2.39996, t = rr / 35;
      const col = t > 0.8 ? p.d4 : t > 0.46 ? p.d2 : p.d1;
      fl += '<circle class="fl" cx="' + f(Math.cos(th) * rr) + '" cy="' + f(Math.sin(th) * rr) + '" r="' + f(0.7 + t * 0.95) +
        '" fill="' + col + '" style="--k:' + k + '"/>';
    }
    body += '<g class="disk">' + fl + '</g><circle r="37" fill="url(#' + id + 'sh)"/>' + lightOver(id, 0.45);
    return { defs, body };
  };

  /* ---------- Peonía ---------- */
  A.peony = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.a], [0.45, p.b], [1, p.c]]) + lg(id + 'i', [[0, p.a], [0.7, p.b], [1, p.b]]) +
      rg(id + 's', [[0, p.a, 0.5], [0.7, p.a, 0.12], [1, p.a, 0]]) + LIGHT(id);
    const rings = [[6, 94, 62], [7, 82, 54], [8, 70, 47], [8, 59, 41], [9, 48, 35], [9, 38, 29], [8, 28, 23], [7, 19, 16]];
    let body = '';
    rings.forEach(([n, len, wid], k) => {
      const fill = 'url(#' + id + (k < 3 ? 'o' : 'i') + ')';
      body += ring(n, r() * 360, 'q' + k, () => {
        const L = len * (0.88 + r() * 0.2), Wd = wid * (0.85 + r() * 0.3);
        const d = U.petal(L, Wd, { r, tip: 'ruffle', waves: 3 + ((r() * 3) | 0), ra: 0.2 + r() * 0.1, wph: r() * 3, tEnd: 0.68, wpos: 0.72, base: 0.24, jit: 0.06 });
        return pd(d, fill, p.e, { so: 0.3, hl: p.c, ha: 0.22 }) + veins(L * 0.8, 4, Wd * 0.5, p.a, 0.1, 0.45, r);
      }, { r, aj: 22, style: () => '--w:' + f((r() - 0.5) * 16) + 'deg' });
      if (k === 2) body += '<circle r="58" fill="url(#' + id + 's)"/>';
      if (k === 5) {
        let st = '<circle r="30" fill="url(#' + id + 's)"/>';
        for (let i = 0; i < 16; i++) {
          const a = r() * 6.28, rr = 3 + r() * 11;
          st += '<circle cx="' + f(Math.cos(a) * rr) + '" cy="' + f(Math.sin(a) * rr) + '" r="' + f(1.1 + r()) + '" fill="' + p.y + '" opacity=".85"/>';
        }
        body += '<g class="core">' + st + '</g>';
      }
    });
    body += lightOver(id, 0.4);
    return { defs, body };
  };

  /* ---------- Lirio ---------- */
  A.lily = function (p, r, id) {
    const defs = lg(id + 't', [[0, p.a], [0.18, p.b], [0.55, p.c], [1, p.c]]) + LIGHT(id);
    const tepal = (len, wid, outer) => () => {
      const L = len * (0.95 + r() * 0.1);
      const d = U.petal(L, wid, { r, tip: 'point', wpos: 0.38, base: 0.25, jit: 0.03, lean: (r() - 0.5) * 0.08, ns: 9 });
      let spots = '';
      for (let i = 0; i < (outer ? 8 : 14); i++) {
        const t = 0.12 + r() * 0.4, x = (r() - 0.5) * wid * 0.9 * Math.sin(Math.PI * t * 1.5);
        spots += '<ellipse cx="' + f(x) + '" cy="' + f(-L * t) + '" rx="' + f(0.8 + r() * 0.9) + '" ry="' + f(1.2 + r() * 1.4) +
          '" fill="' + p.s + '" opacity="' + f(0.5 + r() * 0.4) + '"/>';
      }
      return pd(d, 'url(#' + id + 't)', p.e, { so: 0.4 }) +
        '<path d="M0,-4Q' + P(wid * 0.05, -L * 0.45) + ' 0,' + f(-L * 0.82) + '" stroke="' + p.m + '" stroke-width="' + f(wid * 0.3) + '" stroke-linecap="round" fill="none" opacity=".3"/>' +
        spots + '<path d="M0,-4Q' + P(wid * 0.04, -L * 0.5) + ' 0,' + f(-L * 0.95) + '" stroke="#fff" stroke-width="1.1" fill="none" opacity=".6"/>';
    };
    let body = ring(3, 0, 'lo', tepal(96, 30, true), { r, aj: 6 }) + ring(3, 60, 'li', tepal(92, 38, false), { r, aj: 6 });
    body += '<circle r="12" fill="' + p.a + '" opacity=".6"/>';
    let st = '';
    for (let i = 0; i < 6; i++) {
      const a = U.rad(i * 60 + 30 + (r() - 0.5) * 20), L = 50 + r() * 10;
      const x = Math.cos(a) * L, y = Math.sin(a) * L;
      st += '<path d="M0,0Q' + P(Math.cos(a + 0.25) * L * 0.5, Math.sin(a + 0.25) * L * 0.5) + ' ' + P(x, y) + '" stroke="#e0e4bb" stroke-width="1.3" fill="none"/>' +
        '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="2.4" ry="6.5" fill="' + p.an + '" transform="rotate(' + f((a * 180) / Math.PI) + ' ' + P(x, y) + ')"/>';
    }
    const pa = U.rad(-100);
    st += '<path d="M0,0Q' + P(8, -30) + ' ' + P(Math.cos(pa) * 62, Math.sin(pa) * 62) + '" stroke="#d6dca6" stroke-width="2.2" fill="none"/>' +
      '<circle cx="' + f(Math.cos(pa) * 62) + '" cy="' + f(Math.sin(pa) * 62) + '" r="3.6" fill="#9fb05a"/>';
    body += '<g class="stm">' + st + '</g>' + lightOver(id, 0.35);
    return { defs, body };
  };

  /* ---------- Orquídea (Phalaenopsis) ---------- */
  A.orchid = function (p, r, id) {
    const defs = lg(id + 'p', [[0, p.a], [0.35, p.b], [1, p.c]]) + lg(id + 'l', [[0, p.l1], [1, p.l2]]) + LIGHT(id);
    const part = (cls, rot, len, wid, o) => {
      const d = U.petal(len, wid, Object.assign({ r, tip: 'round', tEnd: 0.78, wpos: 0.58, base: 0.16, jit: 0.02 }, o));
      return '<g transform="rotate(' + rot + ')"><g class="pt ' + cls + '" style="--fold:' + (rot > 0 ? -1 : rot < 0 ? 1 : 0) * 14 + 'deg">' +
        pd(d, 'url(#' + id + 'p)', p.e, { so: 0.35, hl: '#fff', ha: 0.35 }) + veins(len * 0.8, 7, wid * 0.55, p.v, 0.28, 0.45, r) + '</g></g>';
    };
    let body = part('os', -130, 64, 24, { wpos: 0.55 }) + part('os', 130, 64, 24, { wpos: 0.55 }) + part('os', 0, 66, 26, {});
    body += part('op', -76, 70, 50, { wpos: 0.62, base: 0.1, tEnd: 0.74 }) + part('op', 76, 70, 50, { wpos: 0.62, base: 0.1, tEnd: 0.74 });
    let lip = '';
    lip += '<path d="' + U.petal(24, 11, { r, tip: 'round' }) + '" fill="url(#' + id + 'l)" transform="rotate(-148) translate(0,-4)" opacity=".92"/>';
    lip += '<path d="' + U.petal(24, 11, { r, tip: 'round' }) + '" fill="url(#' + id + 'l)" transform="rotate(148) translate(0,-4)" opacity=".92"/>';
    lip += '<path d="M-5,8C-14,18 -16,30 -8,40C-4,45 4,45 8,40C16,30 14,18 5,8Z" fill="url(#' + id + 'l)" stroke="' + p.l1 + '" stroke-width=".6"/>';
    lip += '<path d="M-4,40C-8,47 -14,49 -17,45M4,40C8,47 14,49 17,45" stroke="' + p.l1 + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
    lip += '<ellipse cx="0" cy="12" rx="6" ry="5" fill="' + p.y + '"/>';
    for (let i = 0; i < 7; i++) lip += '<circle cx="' + f((r() - 0.5) * 9) + '" cy="' + f(9 + r() * 7) + '" r=".8" fill="' + p.l1 + '"/>';
    body += '<g class="lip">' + lip + '</g>';
    body += '<ellipse cx="0" cy="-2" rx="5.5" ry="9" fill="#fbf4f7" stroke="' + p.e + '" stroke-width=".6"/><ellipse cx="0" cy="-8" rx="3" ry="2.5" fill="#f0dfa0"/>';
    body = '<g transform="translate(0,-4) scale(1.3)">' + body + '</g>' + lightOver(id, 0.3);
    return { defs, body };
  };

  /* ---------- Margarita ---------- */
  A.daisy = function (p, r, id) {
    const defs = lg(id + 'r', [[0, p.a], [0.3, p.b], [1, p.c]]) + rg(id + 'd', [[0, p.y1], [0.7, p.y2], [1, p.y1]], 0.45, 0.4, 0.6) + LIGHT(id);
    const ray = (len) => () => {
      const L = len * (0.9 + r() * 0.18), Wd = 8.5 + r() * 2.5;
      const d = U.petal(L, Wd, { r, tip: 'notch', nd: 0.3, tEnd: 0.9, wpos: 0.5, base: 0.35, taper: 0.1, jit: 0.04 });
      return pd(d, 'url(#' + id + 'r)', p.e, { so: 0.45, sw: 0.6 }) + veins(L * 0.9, 3, Wd * 0.3, p.e, 0.22, 0.4, r);
    };
    let body = ring(17, 0, 'db', ray(80), { r, rad: 14, aj: 7 }) + ring(17, 360 / 34, 'df', ray(76), { r, rad: 15, aj: 7 });
    body += '<circle r="21" fill="url(#' + id + 'd)"/>';
    const N = 150, c = 20 / Math.sqrt(N);
    for (let k = 0; k < N; k++) {
      const rr = c * Math.sqrt(k + 0.5), th = k * 2.39996;
      body += '<circle cx="' + f(Math.cos(th) * rr) + '" cy="' + f(Math.sin(th) * rr) + '" r="' + f(0.6 + (rr / 20) * 0.5) +
        '" fill="' + (rr > 15 ? '#fbe07a' : p.y1) + '" opacity=".75"/>';
    }
    body += '<circle r="21" fill="none" stroke="' + p.y1 + '" stroke-width="1.2" opacity=".6"/>' + lightOver(id, 0.3);
    return { defs, body };
  };

  /* ---------- Lavanda (espigas) ---------- */
  A.lavender = function (p, r) {
    let body = '';
    for (let s = 0; s < 5; s++) {
      const ang = -16 + s * 8 + (r() - 0.5) * 5, H = 138 + r() * 26, bx = (s - 2) * 3, tx = (r() - 0.5) * 10;
      let g = '<path d="M0,0Q' + P(tx * 0.3, -H * 0.5) + ' ' + P(tx, -H) + '" stroke="' + p.st + '" stroke-width="1.6" fill="none"/>';
      const whorls = 11;
      for (let w = 0; w < whorls; w++) {
        const t = 0.5 + (w / whorls) * 0.5, y = -H * t, x = tx * t * t, sz = 1 - (w / whorls) * 0.45;
        for (let q = 0; q < 5; q++) {
          const side = q % 2 ? 1 : -1, xo = side * (1.5 + r() * 3.5) * sz, yo = (r() - 0.5) * 6, rot = side * (25 + r() * 30);
          g += '<ellipse cx="' + f(x + xo) + '" cy="' + f(y + yo) + '" rx="' + f(2.4 * sz) + '" ry="' + f(4.4 * sz) + '" fill="' + p.a +
            '" transform="rotate(' + f(rot) + ' ' + P(x + xo, y + yo) + ')"/>';
          if (r() < 0.75) {
            const x2 = x + xo * 1.6, y2 = y + yo - 2;
            g += '<ellipse cx="' + f(x2) + '" cy="' + f(y2) + '" rx="' + f(2.2 * sz) + '" ry="' + f(3.1 * sz) + '" fill="' + (r() < 0.5 ? p.b : p.c) +
              '" transform="rotate(' + f(rot * 1.4) + ' ' + P(x2, y2) + ')"/>';
          }
        }
      }
      body += '<g transform="translate(' + bx + ',0) rotate(' + f(ang) + ')"><g class="spk" style="--i:' + s + ';--sd:' + f(3 + r() * 2.4) +
        's;--sa:' + f(2 + r() * 2) + 'deg">' + g + '</g></g>';
    }
    return { vb: '-80 -178 160 184', anchor: [0.5, 0.967], aspect: 184 / 160, body };
  };

  /* ---------- Hortensia ---------- */
  A.hydrangea = function (p, r, id) {
    const defs = lg(id + 'pk', [[0, '#fff5f8'], [0.4, p.p1], [1, p.p2]]) + lg(id + 'bl', [[0, '#f1f5ff'], [0.4, p.b1], [1, p.b2]]) +
      lg(id + 'lf', [[0, '#2f4524'], [1, '#6f8c4f']]) +
      rg(id + 'dm', [[0, '#fff', 0.32], [0.45, '#fff', 0], [0.8, '#1b2350', 0.06], [1, '#1b2350', 0.3]], 0.42, 0.36, 0.62);
    let body = '';
    [-128, 132, -168].forEach((a, i) => {
      body += '<g transform="rotate(' + a + ') translate(0,-30)">' + U.leaf(i === 2 ? 70 : 88, i === 2 ? 30 : 38, { r, teeth: true, ta: 0.05, fill: 'url(#' + id + 'lf)', rib: '#c9d8a8' }) + '</g>';
    });
    const N = 70, pts = [];
    for (let k = 0; k < N; k++) {
      const rr = 80 * Math.sqrt((k + 0.5) / N), th = k * 2.39996;
      pts.push([Math.cos(th) * rr, Math.sin(th) * rr * 0.94, rr]);
    }
    pts.sort((a, b) => b[2] - a[2]);
    let fl = '<ellipse rx="80" ry="76" fill="' + p.e + '" opacity=".42"/>';
    pts.forEach(([x, y, rr]) => {
      const s = 16 + r() * 4 - rr * 0.035, rot = r() * 90;
      let d = '';
      for (let q = 0; q < 4; q++) d += smooth(tp(petalPts(s, s * 0.6, { r, tip: r() < 0.5 ? 'notch' : 'round', nd: 0.3, tEnd: 0.72, wpos: 0.62, base: 0.16, jit: 0.05 }).pts, rot + q * 90));
      const b0 = U.clamp(0.3 + ((x + 80) / 160) * 0.45 + (r() - 0.5) * 0.25, 0, 1);
      fl += '<g transform="translate(' + P(x, y) + ')"><g class="hf" style="--k:' + f(rr) + ';--b0:' + f(b0) + '">' +
        '<path d="' + d + '" fill="url(#' + id + 'pk)" stroke="' + p.e + '" stroke-width=".6" stroke-opacity=".45"/>' +
        '<path class="hb" d="' + d + '" fill="url(#' + id + 'bl)"/>' +
        '<circle r="1.7" fill="#f7f0d8"/><circle r=".8" fill="' + p.e + '"/></g></g>';
    });
    body += fl + '<circle r="86" fill="url(#' + id + 'dm)"/>';
    return { defs, body };
  };

  /* ---------- Clavel ---------- */
  A.carnation = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.a], [0.5, p.b], [1, p.c]]) + lg(id + 'i', [[0, p.a], [0.62, p.b], [1, p.c]]) +
      rg(id + 's', [[0, p.a, 0.6], [1, p.a, 0]]) + LIGHT(id);
    const rings = [[11, 86, 34, 7], [10, 72, 30, 6], [10, 58, 27, 6], [9, 45, 23, 5], [7, 32, 18, 5], [6, 20, 13, 4]];
    let body = '';
    rings.forEach(([n, len, wid, tn], k) => {
      body += ring(n, r() * 360, 'c' + k, () => {
        const L = len * (0.88 + r() * 0.2);
        const d = U.petal(L, wid * (0.85 + r() * 0.3), { r, tip: 'serrate', teethN: tn + 2, sd: 0.11, tEnd: 0.6, wpos: 0.9, base: 0.1, taper: 0, jit: 0.035, k: 0.85 });
        return pd(d, 'url(#' + id + (k < 2 ? 'o' : 'i') + ')', p.e, { so: 0.35, sw: 0.6, hl: p.c, ha: 0.18 }) + veins(L * 0.85, 5, wid * 0.6, p.a, 0.2, 0.4, r);
      }, { r, aj: 20, style: () => '--w:' + f((r() - 0.5) * 22) + 'deg' });
      if (k === 2) body += '<circle r="44" fill="url(#' + id + 's)"/>';
    });
    body += '<path d="M-2,2c-4,-6 -2,-13 3,-14c4,-1 5,4 1,5M2,1c5,-4 11,-2 11,3c0,4 -5,4 -5,1" stroke="#fbeef1" stroke-width="1.3" fill="none" stroke-linecap="round"/>';
    body += lightOver(id, 0.35);
    return { defs, body };
  };

  /* ---------- Camelia ---------- */
  A.camellia = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.a], [0.5, p.b], [1, p.c]]) + rg(id + 's', [[0, p.a, 0.45], [1, p.a, 0]]) + LIGHT(id);
    const rings = [[8, 90, 60], [8, 78, 52], [8, 66, 45], [7, 54, 38], [6, 42, 30], [5, 30, 22], [4, 19, 14]];
    let body = '';
    rings.forEach(([n, len, wid], k) => {
      body += ring(n, (k % 2) * (180 / n) + k * 4, 'm' + k, () => {
        const d = U.petal(len, wid * 0.84, { r, tip: 'round', tEnd: 0.7, wpos: 0.66, base: 0.24, taper: 0.14, jit: 0.015, asym: 0 });
        return pd(d, 'url(#' + id + 'o)', p.e, { so: 0.35, hl: '#fff', ha: 0.26, hs: '.5,.8' }) + veins(len * 0.7, 3, wid * 0.35, p.a, 0.1, 0.4, r);
      }, { r, aj: 1.5, style: () => '--jr:' + f((r() - 0.5) * 50) + 'deg' });
      if (k === 3) body += '<circle r="40" fill="url(#' + id + 's)"/>';
    });
    body += lightOver(id, 0.4);
    return { defs, body };
  };

  /* ---------- Gardenia ---------- */
  A.gardenia = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.a], [0.4, p.b], [1, p.c]]) + rg(id + 's', [[0, '#7d7550', 0.35], [1, '#7d7550', 0]]) + LIGHT(id);
    const rings = [[6, 92, 50, 0], [6, 72, 42, 30], [5, 52, 33, 12], [4, 34, 23, 48]];
    let body = '<g class="aroma">' + [0, 1, 2].map((i) => '<circle r="92" style="--i:' + i + '" fill="none" stroke="' + p.e + '" stroke-width=".9"/>').join('') + '</g>';
    rings.forEach(([n, len, wid, off], k) => {
      body += ring(n, off + r() * 8, 'g' + k, () => {
        const d = U.petal(len, wid, { r, tip: 'round', tEnd: 0.74, wpos: 0.62, base: 0.2, taper: 0.25, jit: 0.03, asym: 0.12 });
        return '<g transform="skewX(-14)">' + pd(d, 'url(#' + id + 'o)', p.e, { so: 0.4, hl: '#fff', ha: 0.3 }) + veins(len * 0.8, 3, wid * 0.3, p.e, 0.14, 0.4, r) + '</g>';
      }, { r, aj: 4 });
      if (k === 1) body += '<circle r="52" fill="url(#' + id + 's)"/>';
    });
    let core = '';
    for (let i = 0; i < 3; i++) {
      core += '<path d="' + U.petal(16, 12, { r, tip: 'round', tEnd: 0.7 }) + '" transform="rotate(' + (i * 120 + 20) + ') skewX(-25)" fill="url(#' + id + 'o)" stroke="' + p.e + '" stroke-width=".6" stroke-opacity=".5"/>';
    }
    body += '<g class="core">' + core + '<circle r="3" fill="' + p.y + '" opacity=".7"/></g>' + lightOver(id, 0.35);
    return { defs, body };
  };
})();
