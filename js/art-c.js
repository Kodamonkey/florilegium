/* Florilegio — ilustraciones (tercera parte): gerbera, lisianthus, alstroemeria, ranúnculo, fresia, anémona
   y los rellenos de ramo (gypsophila, eucalipto, helecho, ruscus, limonium). */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u, A = FL.art;
  const { f, P, lg, rg, ring, petalPts, smooth, pd, veins } = U;
  const LIGHT = (id) => rg(id + 'L', [[0, '#fff', 0.55], [0.55, '#fff', 0.08], [1, '#fff', 0]], 0.34, 0.26, 0.78);
  const lightOver = (id, op) => '<circle r="104" fill="url(#' + id + 'L)" opacity="' + op + '" class="lit"/>';
  // Punto y ángulo (grados, 0 = hacia arriba) de una curva cuadrática en t.
  const quad = (a, c, b, t) => {
    const u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], y = u * u * a[1] + 2 * u * t * c[1] + t * t * b[1];
    const dx = 2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]), dy = 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
    return [x, y, (Math.atan2(dy, dx) * 180) / Math.PI + 90];
  };

  /* ---------- Gerbera ---------- */
  A.gerbera = function (p, r, id) {
    const defs = lg(id + 'r', [[0, p.a], [0.35, p.b], [1, p.c]]) + lg(id + 'q', [[0, p.a], [0.6, p.b], [1, p.b]]) +
      rg(id + 'd', [[0, p.d0], [0.7, p.d1], [1, p.d1]]) + LIGHT(id);
    const ray = (len, wid, fill) => () => {
      const L = len * (0.92 + r() * 0.14), Wd = wid * (0.9 + r() * 0.2);
      const d = U.petal(L, Wd, { r, tip: 'notch', nd: 0.22, tEnd: 0.9, wpos: 0.55, base: 0.42, taper: 0.1, jit: 0.03, lean: (r() - 0.5) * 0.06 });
      return pd(d, fill, p.e, { so: 0.35, sw: 0.55, hl: p.c, ha: 0.2, hs: '.4,.9' }) + veins(L * 0.9, 3, Wd * 0.28, p.a, 0.22, 0.4, r);
    };
    let body = ring(24, 0, 'gb', ray(88, 10, 'url(#' + id + 'q)'), { r, rad: 22, aj: 3 });
    body += ring(24, 7.5, 'gf', ray(82, 10.5, 'url(#' + id + 'r)'), { r, rad: 23, aj: 3 });
    body += ring(32, 3, 'gt', () => pd(U.petal(15 + r() * 4, 3.4, { r, tip: 'round', base: 0.5, jit: 0.04 }), p.t, p.e, { so: 0.3, sw: 0.4 }), { r, rad: 18, aj: 4 });
    body += '<circle r="20" fill="' + p.y + '"/><circle r="16" fill="url(#' + id + 'd)"/>';
    const N = 90, c = 15 / Math.sqrt(N);
    for (let k = 0; k < N; k++) {
      const rr = c * Math.sqrt(k + 0.5), th = k * 2.39996;
      body += '<circle cx="' + f(Math.cos(th) * rr) + '" cy="' + f(Math.sin(th) * rr) + '" r="' + f(0.6 + (rr / 15) * 0.6) +
        '" fill="' + (rr > 12 ? p.y : p.d1) + '" opacity=".8"/>';
    }
    body += lightOver(id, 0.35);
    return { defs, body };
  };

  /* ---------- Lisianthus (doble, con borde de color) ---------- */
  A.lisianthus = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.c], [0.66, p.c], [0.86, p.b], [1, p.a]]) + lg(id + 'i', [[0, p.c], [0.8, p.c], [0.94, p.b], [1, p.a]]) +
      rg(id + 's', [[0, p.e, 0.35], [1, p.e, 0]]) + LIGHT(id);
    const rings = [[5, 80, 58], [5, 68, 50], [5, 56, 42], [4, 44, 34], [4, 32, 26], [3, 21, 17]];
    let body = '';
    rings.forEach(([n, len, wid], k) => {
      body += ring(n, k * 41 + r() * 20, 'ls' + k, () => {
        const L = len * (0.9 + r() * 0.16), Wd = wid * (0.88 + r() * 0.24);
        const d = U.petal(L, Wd, { r, tip: 'ruffle', waves: 3 + ((r() * 3) | 0), ra: 0.16, wph: r() * 3, tEnd: 0.66, wpos: 0.7, base: 0.22, jit: 0.04 });
        return pd(d, 'url(#' + id + (k < 3 ? 'o' : 'i') + ')', p.e, { so: 0.3, sw: 0.55, hl: '#fff', ha: 0.3 }) + veins(L * 0.8, 5, Wd * 0.45, p.b, 0.14, 0.4, r);
      }, { r, aj: 14, style: () => '--w:' + f((r() - 0.5) * 30) + 'deg' });
      if (k === 2) body += '<circle r="40" fill="url(#' + id + 's)"/>';
    });
    body += '<g class="core"><circle r="5" fill="' + p.y + '"/><path d="M-3,-1Q0,-8 3,-1M-1,0Q-6,4 -4,7M1,0Q6,4 4,7" stroke="#b8b060" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>';
    body += lightOver(id, 0.35);
    return { defs, body };
  };

  /* ---------- Alstroemeria (grupo de flores) ---------- */
  A.alstroemeria = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.c], [0.35, p.b], [1, p.a]]) + lg(id + 'i', [[0, p.y], [0.3, p.c], [0.75, p.b], [1, p.a]]) +
      lg(id + 'st', [[0, '#5a7a3a'], [1, '#8fae62']]) + LIGHT(id);
    const bloom = (s) => {
      let g = '';
      [0, 120, -120].forEach((a) => {
        const d = U.petal(58, 30, { r, tip: 'point', wpos: 0.62, base: 0.2, jit: 0.03, lean: (r() - 0.5) * 0.08 });
        g += '<g transform="rotate(' + f(a + (r() - 0.5) * 10) + ')"><g class="pt ao">' + pd(d, 'url(#' + id + 'o)', p.e, { so: 0.35, hl: '#fff', ha: 0.2 }) +
          veins(52, 3, 12, p.a, 0.18, 0.45, r) + '</g></g>';
      });
      [-60, 60, 180].forEach((a) => {
        const up = a !== 180;
        const d = U.petal(50, 17, { r, tip: 'point', wpos: 0.66, base: 0.2, jit: 0.03 });
        let marks = '';
        if (up) {
          marks += '<ellipse cx="0" cy="-20" rx="6" ry="14" fill="' + p.y + '" opacity=".75"/>';
          for (let i = 0; i < 9; i++) {
            const t = 0.14 + r() * 0.36, x = (r() - 0.5) * 9;
            marks += '<path d="M' + P(x, -50 * t) + 'l' + P((r() - 0.5) * 1.5, -3 - r() * 4) + '" stroke="' + p.s + '" stroke-width="' + f(0.9 + r() * 0.7) + '" stroke-linecap="round"/>';
          }
        }
        g += '<g transform="rotate(' + f(a + (r() - 0.5) * 8) + ')"><g class="pt ai">' + pd(d, 'url(#' + id + 'i)', p.e, { so: 0.35 }) + marks + '</g></g>';
      });
      let st = '';
      for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 3.2, tip = [x * 2.2, -30 - r() * 8];
        st += '<path d="M' + P(x * 0.3, 2) + 'Q' + P(x * 1.4, -16) + ' ' + P(tip[0], tip[1]) + '" stroke="' + p.b + '" stroke-width=".9" fill="none"/>' +
          '<ellipse cx="' + f(tip[0]) + '" cy="' + f(tip[1]) + '" rx="1.5" ry="2.6" fill="' + p.s + '"/>';
      }
      g += '<g class="stm">' + st + '</g><circle r="4" fill="' + p.y + '"/>';
      return '<g transform="scale(' + f(s) + ')">' + g + '</g>';
    };
    const heads = [[-50, -30, 0.62, -18], [52, -38, 0.6, 20], [0, -6, 0.86, 0]];
    let body = '';
    [[-24, -86, -14], [30, -92, 16]].forEach(([x, y, a]) => {
      body += '<path d="M0,70Q' + P(x * 0.3, 10) + ' ' + P(x, y + 12) + '" stroke="url(#' + id + 'st)" stroke-width="1.8" fill="none"/>' +
        '<g transform="translate(' + P(x, y) + ') rotate(' + a + ')"><ellipse cy="0" rx="5" ry="12" fill="' + p.b + '" stroke="' + p.e + '" stroke-width=".5"/>' +
        '<path d="M0,-12L0,11" stroke="#7fa04f" stroke-width="1.2" opacity=".6"/></g>';
    });
    heads.forEach(([x, y]) => { body += '<path d="M0,70Q' + P(x * 0.25, 20) + ' ' + P(x, y) + '" stroke="url(#' + id + 'st)" stroke-width="2" fill="none"/>'; });
    heads.forEach(([x, y, s, a], i) => {
      body += '<g transform="translate(' + P(x, y) + ') rotate(' + a + ')"><g class="af" style="--i:' + i + '">' + bloom(s) + '</g></g>';
    });
    body += lightOver(id, 0.25);
    return { vb: '-100 -112 200 190', anchor: [0.5, 0.958], aspect: 0.95, defs, body };
  };

  /* ---------- Ranúnculo ---------- */
  A.ranunculus = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.a], [0.45, p.b], [1, p.c]]) + lg(id + 'i', [[0, p.a], [0.75, p.b], [1, p.b]]) +
      rg(id + 's', [[0, p.a, 0.55], [0.7, p.a, 0.12], [1, p.a, 0]]) + rg(id + 'g', [[0, '#e3ecb0'], [1, p.g]]) + LIGHT(id);
    const rings = [[6, 88, 60], [7, 78, 52], [8, 68, 46], [9, 58, 40], [10, 49, 34], [10, 40, 28], [9, 32, 22], [8, 24, 17], [7, 17, 12]];
    let body = '';
    rings.forEach(([n, len, wid], k) => {
      body += ring(n, k * 23 + r() * 10, 'rn' + k, () => {
        const L = len * (0.92 + r() * 0.12), Wd = wid * (0.9 + r() * 0.2);
        const d = U.petal(L, Wd, { r, tip: 'round', tEnd: 0.68, wpos: 0.72, base: 0.3, taper: 0.1, jit: 0.02 });
        const cup = smooth(petalPts(L, Wd, { r, tip: 'round', tEnd: 0.68, wpos: 0.72, base: 0.3 }).cap.map((q) => [q[0] * 0.82, q[1] + L * 0.06]), false);
        return pd(d, 'url(#' + id + (k < 4 ? 'o' : 'i') + ')', p.e, { so: 0.32, sw: 0.5, hl: '#fff', ha: 0.18 }) +
          '<path d="' + cup + '" fill="none" stroke="' + p.c + '" stroke-width="' + f(L * 0.035) + '" stroke-linecap="round" opacity=".55"/>';
      }, { r, aj: 8 });
      if (k === 2 || k === 5) body += '<circle r="' + (k === 2 ? 56 : 32) + '" fill="url(#' + id + 's)"/>';
    });
    body += '<g class="core"><circle r="8" fill="url(#' + id + 'g)"/><circle r="8" fill="none" stroke="' + p.a + '" stroke-width="1.2" opacity=".5"/></g>';
    body += lightOver(id, 0.4);
    return { defs, body };
  };

  /* ---------- Fresia (espiga unilateral, vista lateral) ---------- */
  A.freesia = function (p, r, id) {
    const defs = lg(id + 'f', [[0, p.a], [0.35, p.b], [1, p.c]]) + lg(id + 'b', [[0, '#7c9a52'], [1, p.b]]) + LIGHT(id);
    const A0 = [0, 4], C0 = [0, -112], B0 = [150, -114];
    let body = '<path d="M' + P(A0[0], A0[1]) + 'Q' + P(C0[0], C0[1]) + ' ' + P(B0[0], B0[1]) + '" stroke="' + p.st + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    const n = 7;
    for (let i = n - 1; i >= 0; i--) {
      const t = i < 4 ? 0.36 + i * 0.14 : 0.86 + (i - 4) * 0.07, q = quad(A0, C0, B0, t);
      const open = i < 4, s = open ? 1.9 - i * 0.2 : 1.2 - (i - 4) * 0.2;
      let g = '';
      if (open) {
        const tube = 'M-5,0C-6,-14 -9,-24 -13,-32L13,-32C9,-24 6,-14 5,0Z';
        g += '<path d="' + tube + '" fill="url(#' + id + 'f)" stroke="' + p.e + '" stroke-width=".6" stroke-opacity=".5"/>';
        [-58, -20, 20, 58].forEach((a, j) => {
          const d = U.petal(20, 11, { r, tip: 'round', tEnd: 0.74, wpos: 0.6, base: 0.3, jit: 0.04 });
          g += '<g transform="translate(0,-28) rotate(' + f(a + (r() - 0.5) * 10) + ')">' + pd(d, j === 1 || j === 2 ? p.c : 'url(#' + id + 'f)', p.e, { so: 0.4, sw: 0.5 }) + '</g>';
        });
        g += '<ellipse cx="0" cy="-30" rx="5" ry="3" fill="' + p.a + '" opacity=".5"/>';
      } else {
        g += '<path d="M-4,0C-5,-8 -4,-18 0,-24C4,-18 5,-8 4,0Z" fill="url(#' + id + 'b)" stroke="' + p.e + '" stroke-width=".5" stroke-opacity=".4"/>';
      }
      body += '<g transform="translate(' + P(q[0], q[1]) + ') rotate(' + f(q[2] - 90 + 14) + ') scale(' + f(s) + ')"><g class="ff" style="--i:' + i + ';--s0:' + (open ? 0.4 : 0.85) + '">' + g + '</g></g>';
    }
    body += lightOver(id, 0.2);
    return { vb: '-40 -160 200 170', anchor: [40 / 200, 164 / 170], aspect: 170 / 200, defs, body };
  };

  /* ---------- Anémona ---------- */
  A.anemone = function (p, r, id) {
    const defs = lg(id + 't', [[0, p.w], [0.2, p.w], [0.34, p.a], [0.72, p.b], [1, p.c]]) + LIGHT(id);
    const tepal = (len, wid) => () => {
      const L = len * (0.94 + r() * 0.1), Wd = wid * (0.9 + r() * 0.2);
      const d = U.petal(L, Wd, { r, tip: 'ruffle', waves: 2, ra: 0.08, wph: r() * 3, tEnd: 0.7, wpos: 0.66, base: 0.3, jit: 0.025 });
      return pd(d, 'url(#' + id + 't)', p.e, { so: 0.3, hl: '#fff', ha: 0.16 }) + veins(L * 0.85, 7, Wd * 0.55, p.e, 0.16, 0.4, r);
    };
    let body = ring(5, 0, 'an0', tepal(90, 66), { r, aj: 6 }) + ring(5, 36, 'an1', tepal(78, 56), { r, aj: 6 });
    let st = '';
    for (let i = 0; i < 44; i++) {
      const a = U.rad(i * (360 / 44) + r() * 4), l0 = 11, l1 = 19 + r() * 6;
      st += '<path d="M' + P(Math.cos(a) * l0, Math.sin(a) * l0) + 'L' + P(Math.cos(a) * l1, Math.sin(a) * l1) + '" stroke="' + p.k + '" stroke-width=".7"/>' +
        '<circle cx="' + f(Math.cos(a) * l1) + '" cy="' + f(Math.sin(a) * l1) + '" r="1.5" fill="' + p.k + '"/>';
    }
    let boss = '<circle r="12" fill="' + p.k + '"/>';
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, rr = r() * 9;
      boss += '<circle cx="' + f(Math.cos(a) * rr) + '" cy="' + f(Math.sin(a) * rr) + '" r="' + f(0.8 + r() * 0.8) + '" fill="#3c3752"/>';
    }
    body += '<g class="core">' + st + boss + '</g>' + lightOver(id, 0.3);
    return { defs, body };
  };

  /* ================= Rellenos y follajes (solo para ramos) ================= */

  /* ---------- Gypsophila ---------- */
  A.gypsophila = function (p, r) {
    let stems = '', dots = '';
    const tiny = (x, y, s) => {
      let d = '';
      for (let q = 0; q < 5; q++) {
        const a = U.rad(q * 72 + r() * 30), rr = 2.2 * s;
        d += '<circle cx="' + f(x + Math.cos(a) * rr * 0.55) + '" cy="' + f(y + Math.sin(a) * rr * 0.55) + '" r="' + f(rr * 0.62) + '"/>';
      }
      return d;
    };
    const branch = (x0, y0, x1, y1, depth) => {
      const cx = (x0 + x1) / 2 + (r() - 0.5) * 20, cy = (y0 + y1) / 2 + (r() - 0.5) * 10;
      stems += '<path d="M' + P(x0, y0) + 'Q' + P(cx, cy) + ' ' + P(x1, y1) + '" stroke-width="' + f(0.5 + depth * 0.45) + '"/>';
      if (depth > 0) {
        const k = 2 + ((r() * 2) | 0);
        for (let i = 0; i < k; i++) {
          const a = U.rad(-90 + (r() - 0.5) * 150), l = 12 + r() * 14 + depth * 6;
          branch(x1, y1, x1 + Math.cos(a) * l, y1 + Math.sin(a) * l * 0.9, depth - 1);
        }
      } else {
        const m = 3 + ((r() * 5) | 0);
        for (let i = 0; i < m; i++) dots += tiny(x1 + (r() - 0.5) * 12, y1 + (r() - 0.5) * 10, 0.8 + r() * 0.5);
      }
    };
    branch(0, 92, 0, 10, 0);
    for (let i = 0; i < 6; i++) {
      const a = U.rad(-90 + (i - 2.5) * 22 + (r() - 0.5) * 10), l = 30 + r() * 16;
      branch(0, 24 + i * 4, Math.cos(a) * l, 10 + Math.sin(a) * l, 2);
    }
    const body = '<g fill="none" stroke="' + p.st + '" stroke-linecap="round">' + stems + '</g>' +
      '<g fill="' + p.b + '" stroke="' + p.a + '" stroke-width=".35">' + dots + '</g>';
    return { anchor: [0.5, 0.96], body };
  };

  /* ---------- Eucalipto (dólar de plata) ---------- */
  A.eucalyptus = function (p, r, id) {
    const defs = rg(id + 'l', [[0, p.c], [0.6, p.b], [1, p.a]], 0.4, 0.35, 0.75);
    const A0 = [0, 96], C0 = [(r() - 0.5) * 40, 0], B0 = [(r() - 0.5) * 24, -94];
    let body = '<path d="M' + P(A0[0], A0[1]) + 'Q' + P(C0[0], C0[1]) + ' ' + P(B0[0], B0[1]) + '" stroke="' + p.st + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
    // Hojas opuestas en pares cruzados: un par se ve de costado, el siguiente de frente.
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t = 0.1 + (i / (n - 1)) * 0.88, q = quad(A0, C0, B0, t), R = 22 * (1 - t * 0.5) * (0.9 + r() * 0.2);
      const leaf = (cx, cy, rx, ry, rot, op) => '<ellipse cx="' + f(cx) + '" cy="' + f(cy) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" transform="rotate(' + f(rot) + ' ' + P(cx, cy) + ')" fill="url(#' + id + 'l)" stroke="' + p.a + '" stroke-width=".6" stroke-opacity=".6" opacity="' + op + '"/>';
      if (i % 2 === 0) {
        [-1, 1].forEach((side) => {
          const cx = q[0] + side * R * 1.05, cy = q[1] - R * 0.25;
          body += '<path d="M' + P(q[0], q[1]) + 'L' + P(cx - side * R * 0.6, cy) + '" stroke="' + p.st + '" stroke-width="1" opacity=".7"/>' +
            leaf(cx, cy, R * 0.92, R * 0.8, side * 25 + (r() - 0.5) * 16, 1);
        });
      } else {
        body += leaf(q[0] + (r() - 0.5) * 4, q[1] - R * 0.5, R * 0.62, R * 0.86, (r() - 0.5) * 16, 0.92);
      }
    }
    return { anchor: [0.5, 0.98], defs, body };
  };

  /* ---------- Helecho de cuero ---------- */
  A.fern = function (p, r, id) {
    const defs = lg(id + 'l', [[0, p.a], [1, p.c]]);
    const A0 = [0, 96], C0 = [(r() - 0.5) * 30, -10], B0 = [(r() - 0.5) * 50, -96];
    let body = '';
    const n = 11;
    for (let i = 0; i < n; i++) {
      const t = 0.18 + (i / n) * 0.8, q = quad(A0, C0, B0, t), L = 66 * (1 - t) + 9;
      [-1, 1].forEach((side) => {
        const d = U.petal(L, L * 0.13, { r, tip: 'point', wpos: 0.3, base: 0.3, teeth: true, ta: 0.35, ns: 12, jit: 0.02 });
        body += '<g transform="translate(' + P(q[0], q[1]) + ') rotate(' + f(q[2] + side * (58 - t * 22)) + ')">' +
          '<path d="' + d + '" fill="url(#' + id + 'l)" stroke="' + p.a + '" stroke-width=".5" stroke-opacity=".6"/></g>';
      });
    }
    body += '<path d="M' + P(A0[0], A0[1]) + 'Q' + P(C0[0], C0[1]) + ' ' + P(B0[0], B0[1]) + '" stroke="' + p.st + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    return { anchor: [0.5, 0.98], defs, body };
  };

  /* ---------- Ruscus ---------- */
  A.ruscus = function (p, r, id) {
    const defs = lg(id + 'l', [[0, p.a], [0.6, p.b], [1, p.c]]);
    const A0 = [0, 96], C0 = [(r() - 0.5) * 34, 0], B0 = [(r() - 0.5) * 30, -96];
    let body = '<path d="M' + P(A0[0], A0[1]) + 'Q' + P(C0[0], C0[1]) + ' ' + P(B0[0], B0[1]) + '" stroke="' + p.st + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    const n = 11;
    for (let i = 0; i < n; i++) {
      const t = 0.16 + (i / (n - 1)) * 0.84, q = quad(A0, C0, B0, t), side = i % 2 ? 1 : -1, L = 42 * (1 - t * 0.45);
      body += '<g transform="translate(' + P(q[0], q[1]) + ') rotate(' + f(q[2] + side * (48 - t * 18)) + ')">' +
        U.leaf(L, L * 0.34, { r, fill: 'url(#' + id + 'l)', edge: p.a, gloss: true, rib: p.c, wpos: 0.45 }) + '</g>';
    }
    return { anchor: [0.5, 0.98], defs, body };
  };

  /* ---------- Limonium ---------- */
  A.limonium = function (p, r) {
    let stems = '', heads = '';
    const tips = [];
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 20 + (r() - 0.5) * 12, y = -40 - r() * 44;
      tips.push([x, y]);
      stems += '<path d="M0,94Q' + P(x * 0.3, 10) + ' ' + P(x, y) + '"/>';
    }
    tips.forEach(([x0, y0]) => {
      for (let j = 0; j < 9; j++) {
        const x = x0 + (r() - 0.5) * 30, y = y0 + (r() - 0.5) * 26, s = 4 + r() * 3;
        const pts = [];
        for (let q = 0; q < 7; q++) {
          const a = U.rad(q * (360 / 7)), rr = s * (0.75 + r() * 0.4);
          pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
        }
        heads += '<path d="' + smooth(pts) + '" fill="' + (r() < 0.5 ? p.a : p.b) + '" stroke="' + p.c + '" stroke-width=".5"/>' +
          '<circle cx="' + f(x + (r() - 0.5) * 2) + '" cy="' + f(y + (r() - 0.5) * 2) + '" r="' + f(1 + r()) + '" fill="' + p.w + '"/>';
      }
    });
    return { anchor: [0.5, 0.97], body: '<g fill="none" stroke="' + p.st + '" stroke-width="1.6" stroke-linecap="round">' + stems + '</g>' + heads };
  };
})();
