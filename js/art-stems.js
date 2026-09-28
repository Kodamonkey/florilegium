/* Florilegio — tallos, hojas y agua de cada planta del jardín */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const { f, P } = U;

  const C = {
    rose: { c: '#4d6a38', w: 0.035, leaf: 'rose', n: 2, thorn: true },
    tulip: { c: '#6f8f4f', w: 0.045, leaf: 'strap', n: 2 },
    sunflower: { c: '#5f7d3b', w: 0.055, leaf: 'heart', n: 3 },
    peony: { c: '#5f7a3f', w: 0.038, leaf: 'cut', n: 2 },
    lily: { c: '#5c7a3e', w: 0.036, leaf: 'lance', n: 6 },
    orchid: { c: '#54683c', w: 0.026, leaf: 'orchid', arch: true },
    daisy: { c: '#5f7d3f', w: 0.03, leaf: 'lance', n: 2 },
    lavender: { c: '#7f9170', w: 0.03, leaf: 'grass', n: 7, lc: ['#6f8466', '#b1bfa6'] },
    hydrangea: { c: '#5a7340', w: 0.045, leaf: 'broad', n: 2, teeth: true },
    carnation: { c: '#7f9b8a', w: 0.03, leaf: 'lance', n: 4, lc: ['#5f7f74', '#a8c2b6'] },
    camellia: { c: '#4a5a33', w: 0.04, leaf: 'broad', n: 3, gloss: true },
    gardenia: { c: '#44592f', w: 0.04, leaf: 'broad', n: 3, gloss: true },
    jasmine: { c: '#4f6b35', w: 0.025, leaf: 'pinnate', n: 2 },
    dahlia: { c: '#5d763f', w: 0.04, leaf: 'cut', n: 2 },
    chrysanthemum: { c: '#5c7440', w: 0.035, leaf: 'cut', n: 3 },
    cherry: { c: '#5b4038', w: 0.075, leaf: 'none', woody: true },
    forgetmenot: { c: '#6a8a4c', w: 0.03, leaf: 'lance', n: 3 },
    lotus: { c: '#7c9a5c', w: 0.035, leaf: 'lotus' },
    dandelion: { c: '#9aae72', w: 0.025, leaf: 'rosette' },
    poppy: { c: '#6f8b4a', w: 0.022, leaf: 'rosette', lobed: true },
    iris: { c: '#5f7d52', w: 0.045, leaf: 'sword', n: 4, lc: ['#4f6d52', '#95b38f'] },
    hyacinth: { c: '#6a8d4a', w: 0.06, leaf: 'strap', n: 4 }
  };
  FL.stemCfg = C;

  let SID = 0;
  /*
   * g = { W, H, sx, tx, ty, head, bend }: caja de la planta, raíz en (sx, H) y extremo del tallo en (tx, ty).
   */
  FL.drawStem = function (fl, g, r) {
    const c = C[fl.art] || C.rose;
    const id = 's' + ++SID;
    const lc = c.lc || ['#3e5a2c', '#86a462'];
    const H = g.H, sx = g.sx, hd = g.head;
    const cx = sx + (g.tx - sx) * 0.25 + g.bend, cy = (H + g.ty) / 2;
    const at = (t) => {
      const u = 1 - t;
      return [u * u * sx + 2 * u * t * cx + t * t * g.tx, u * u * H + 2 * u * t * cy + t * t * g.ty];
    };
    const ang = (t) => {
      const dx = 2 * (1 - t) * (cx - sx) + 2 * t * (g.tx - cx), dy = 2 * (1 - t) * (cy - H) + 2 * t * (g.ty - cy);
      return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    };
    const sw = Math.max(1.4, hd * c.w);
    const lf = 'url(#' + id + 'l)';
    let defs = '<linearGradient id="' + id + 's" gradientUnits="userSpaceOnUse" x1="0" y1="' + f(H) + '" x2="0" y2="' + f(g.ty) + '">' +
      U.stops(c.woody ? [[0, '#3f2c26'], [1, '#8a6a5c']] : [[0, '#3a5228'], [0.6, c.c], [1, '#9db57c']]) + '</linearGradient>' +
      U.lg(id + 'l', [[0, lc[0]], [1, lc[1]]]);
    let back = '', front = '';
    const leafAt = (x, y, a, svg) => '<g transform="translate(' + P(x, y) + ') rotate(' + f(a) + ')">' + svg + '</g>';
    const stemD = 'M' + P(sx, H) + 'Q' + P(cx, cy) + ' ' + P(g.tx, g.ty);

    switch (c.leaf) {
      case 'rose':
        for (let i = 0; i < c.n; i++) {
          const t = 0.3 + i * 0.28 + r() * 0.08, q = at(t), side = i % 2 ? 1 : -1, a = ang(t) + side * (48 + r() * 12), Lp = hd * 0.34;
          let s = '<path d="M0,0L0,' + f(-Lp) + '" stroke="' + c.c + '" stroke-width="' + f(sw * 0.45) + '"/>';
          [[0.42, -1], [0.42, 1], [0.78, -1], [0.78, 1]].forEach(([k, sd]) => {
            s += '<g transform="translate(0,' + f(-Lp * k) + ') rotate(' + sd * 62 + ')">' + U.leaf(hd * 0.17, hd * 0.075, { r, teeth: true, ta: 0.07, fill: lf }) + '</g>';
          });
          s += '<g transform="translate(0,' + f(-Lp * 0.96) + ')">' + U.leaf(hd * 0.2, hd * 0.085, { r, teeth: true, ta: 0.07, fill: lf }) + '</g>';
          back += leafAt(q[0], q[1], a, s);
        }
        break;
      case 'lance':
        for (let i = 0; i < c.n; i++) {
          const t = 0.18 + (i / c.n) * 0.62 + r() * 0.05, q = at(t), side = i % 2 ? 1 : -1;
          back += leafAt(q[0], q[1], ang(t) + side * (26 + r() * 18), U.leaf(hd * (0.5 - i * 0.04), hd * 0.075, { r, fill: lf, wpos: 0.35 }));
        }
        break;
      case 'strap':
      case 'sword':
      case 'grass': {
        const n = c.n || 3;
        for (let i = 0; i < n; i++) {
          const side = i % 2 ? 1 : -1;
          const len = (H - g.ty) * (c.leaf === 'grass' ? 0.35 + r() * 0.3 : 0.5 + r() * 0.3);
          const wid = hd * (c.leaf === 'grass' ? 0.022 : c.leaf === 'sword' ? 0.07 : 0.1);
          const curve = c.leaf === 'sword' ? side * 0.04 : side * (0.12 + r() * 0.22);
          const a = side * (c.leaf === 'sword' ? 4 + i * 4 : 6 + r() * 16);
          const d = U.blade(len, wid, curve, { r });
          const svg = '<path d="' + d + '" fill="' + lf + '" stroke="#34482a" stroke-width=".6" stroke-opacity=".4"/>' +
            '<path d="M0,0Q' + P(curve * len * 0.25, -len * 0.5) + ' ' + P(curve * len, -len) + '" stroke="#e3ecd0" stroke-width=".6" fill="none" opacity=".35"/>';
          if (i < n / 2) back += leafAt(sx + side * 2, H, a, svg);
          else front += leafAt(sx + side * 2, H, a, svg);
        }
        break;
      }
      case 'heart':
        for (let i = 0; i < c.n; i++) {
          const t = 0.22 + i * 0.24, q = at(t), side = i % 2 ? 1 : -1;
          const s = '<path d="M0,0Q' + P(side * 4, -hd * 0.08) + ' 0,' + f(-hd * 0.14) + '" stroke="' + c.c + '" stroke-width="' + f(sw * 0.5) + '" fill="none"/>' +
            '<g transform="translate(0,' + f(-hd * 0.13) + ')">' + U.leaf(hd * (0.52 - i * 0.07), hd * (0.25 - i * 0.03), { r, fill: lf, wpos: 0.3, base: 0.3, teeth: true, ta: 0.03 }) + '</g>';
          back += leafAt(q[0], q[1], ang(t) + side * (58 + r() * 10), s);
        }
        break;
      case 'broad':
        for (let i = 0; i < c.n; i++) {
          const t = 0.35 + i * 0.2 + r() * 0.05, q = at(t), side = i % 2 ? 1 : -1;
          back += leafAt(q[0], q[1], ang(t) + side * (45 + r() * 15), U.leaf(hd * 0.42, hd * 0.16, { r, fill: lf, wpos: 0.5, gloss: c.gloss, teeth: c.teeth, ta: 0.04 }));
        }
        break;
      case 'cut':
        for (let i = 0; i < c.n; i++) {
          const t = 0.25 + i * 0.25 + r() * 0.05, q = at(t), side = i % 2 ? 1 : -1;
          let s = '<path d="M0,0L0,' + f(-hd * 0.1) + '" stroke="' + c.c + '" stroke-width="' + f(sw * 0.45) + '"/>';
          [-38, 0, 38].forEach((a2) => {
            s += '<g transform="translate(0,' + f(-hd * 0.1) + ') rotate(' + a2 + ')">' + U.leaf(hd * (a2 ? 0.26 : 0.32), hd * 0.07, { r, fill: lf, teeth: fl.art !== 'peony', ta: 0.12 }) + '</g>';
          });
          back += leafAt(q[0], q[1], ang(t) + side * (50 + r() * 10), s);
        }
        break;
      case 'pinnate':
        for (let i = 0; i < c.n; i++) {
          const t = 0.35 + i * 0.3, q = at(t), side = i % 2 ? 1 : -1, Lp = hd * 0.36;
          let s = '<path d="M0,0L0,' + f(-Lp) + '" stroke="' + c.c + '" stroke-width="1"/>';
          [0.3, 0.6].forEach((k) => {
            [-1, 1].forEach((sd) => { s += '<g transform="translate(0,' + f(-Lp * k) + ') rotate(' + sd * 58 + ')">' + U.leaf(hd * 0.13, hd * 0.05, { r, fill: lf, gloss: true }) + '</g>'; });
          });
          s += '<g transform="translate(0,' + f(-Lp * 0.95) + ')">' + U.leaf(hd * 0.17, hd * 0.06, { r, fill: lf, gloss: true }) + '</g>';
          back += leafAt(q[0], q[1], ang(t) + side * 50, s);
        }
        break;
      case 'orchid':
        [-78, 70, -30].forEach((a, i) => {
          back += leafAt(sx, H - 2, a, U.leaf(hd * (i === 2 ? 0.45 : 0.62), hd * 0.19, { r, fill: lf, wpos: 0.55, base: 0.3, gloss: true }));
        });
        break;
      case 'rosette':
        for (let i = 0; i < 5; i++) {
          const side = i % 2 ? 1 : -1, a = side * (52 + r() * 30);
          back += leafAt(sx, H, a, U.leaf(hd * (0.38 + r() * 0.16), hd * 0.09, { r, fill: lf, teeth: true, ta: c.lobed ? 0.25 : 0.4, ns: 12, wpos: 0.55 }));
        }
        break;
      case 'lotus': {
        const rx = hd * 1.05, ry = hd * 0.16;
        defs += U.rg(id + 'w', [[0, '#cfe3e0', 0.85], [0.7, '#a9cbc9', 0.55], [1, '#a9cbc9', 0]]) + U.rg(id + 'p', [[0, '#9ebf73'], [0.8, '#5f8a45'], [1, '#4b7038']]);
        back += '<ellipse cx="' + f(sx) + '" cy="' + f(H) + '" rx="' + f(rx) + '" ry="' + f(ry) + '" fill="url(#' + id + 'w)"/>';
        for (let i = 1; i <= 3; i++) {
          back += '<ellipse class="ripple" style="--i:' + i + '" cx="' + f(sx) + '" cy="' + f(H) + '" rx="' + f(rx * 0.25 * i) + '" ry="' + f(ry * 0.25 * i) + '" fill="none" stroke="#fff" stroke-width=".8" opacity="' + f(0.5 - i * 0.12) + '"/>';
        }
        const px = sx + (r() < 0.5 ? -1 : 1) * rx * 0.5;
        let pad = '<ellipse cx="' + f(px) + '" cy="' + f(H - ry * 0.1) + '" rx="' + f(hd * 0.42) + '" ry="' + f(hd * 0.1) + '" fill="url(#' + id + 'p)" stroke="#3d5a2c" stroke-width=".6"/>';
        for (let i = 0; i < 9; i++) {
          const a = U.rad(i * 40);
          pad += '<path d="M' + P(px, H - ry * 0.1) + 'l' + P(Math.cos(a) * hd * 0.38, Math.sin(a) * hd * 0.08) + '" stroke="#c9dca6" stroke-width=".5" opacity=".6"/>';
        }
        back += pad;
        break;
      }
      default:
        break;
    }

    let stem = '<path d="' + stemD + '" stroke="url(#' + id + 's)" stroke-width="' + f(sw) + '" fill="none" stroke-linecap="round"/>';
    if (c.woody) {
      const q = at(0.55), a = ang(0.55) - 40;
      stem += '<path d="M' + P(q[0], q[1]) + 'l' + P(Math.sin(U.rad(a)) * hd * 0.3, -Math.cos(U.rad(a)) * hd * 0.3) + '" stroke="url(#' + id + 's)" stroke-width="' + f(sw * 0.5) + '" stroke-linecap="round"/>';
      stem += '<path d="' + stemD + '" stroke="#b9a092" stroke-width="' + f(sw * 0.18) + '" fill="none" stroke-dasharray="1.5 8" opacity=".6"/>';
    }
    if (c.thorn) {
      for (let i = 0; i < 5; i++) {
        const t = 0.1 + i * 0.17 + r() * 0.05, q = at(t), side = i % 2 ? 1 : -1, a = ang(t);
        stem += '<g transform="translate(' + P(q[0], q[1]) + ') rotate(' + f(a) + ')"><path d="M' + f(side * sw * 0.4) + ',-2.5L' + f(side * (sw * 0.4 + 4)) + ',2L' + f(side * sw * 0.4) + ',1.5Z" fill="#6d5a3c"/></g>';
      }
    }
    return '<svg class="stem" viewBox="0 0 ' + f(g.W) + ' ' + f(H) + '" preserveAspectRatio="none" aria-hidden="true"><defs>' + defs + '</defs>' + back + stem + front + '</svg>';
  };
})();
