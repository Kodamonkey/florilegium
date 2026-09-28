/* Florilegio — ilustraciones (segunda parte) */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u, A = FL.art;
  const { f, P, lg, rg, ring, petalPts, smooth, pd, veins } = U;
  const LIGHT = (id) => rg(id + 'L', [[0, '#fff', 0.55], [0.55, '#fff', 0.08], [1, '#fff', 0]], 0.34, 0.26, 0.78);
  const lightOver = (id, op) => '<circle r="104" fill="url(#' + id + 'L)" opacity="' + op + '" class="lit"/>';

  // Flor de cinco pétalos fundida en un solo trazo (jazmín, cerezo, nomeolvides).
  const five = (len, wid, o, rot) => {
    let d = '';
    for (let q = 0; q < 5; q++) d += smooth(U.tp(petalPts(len, wid, o).pts, rot + q * 72));
    return d;
  };

  /* ---------- Jazmín ---------- */
  A.jasmine = function (p, r, id) {
    const defs = lg(id + 'p', [[0, p.a], [0.35, p.b], [1, p.c]]) + lg(id + 'lf', [[0, '#2c4220'], [1, '#6b8a45']]) +
      lg(id + 'bd', [[0, p.bud], [1, '#fbe8ee']]) + LIGHT(id);
    let body = '';
    const stem = (x, y) => '<path d="M0,74Q' + P(x * 0.2, 40) + ' ' + P(x, y) + '" stroke="#5b7a3c" stroke-width="1.6" fill="none"/>';
    [[-70, -20, -60], [66, -34, 58], [-40, 40, -110], [48, 36, 112], [4, -70, 4]].forEach(([x, y, a]) => {
      body += '<g transform="translate(' + P(x * 0.5, y * 0.5 + 20) + ') rotate(' + a + ')">' +
        U.leaf(38, 13, { r, fill: 'url(#' + id + 'lf)', gloss: true, rib: '#cfe0b0' }) + '</g>';
    });
    const flowers = [[-34, -30, 1, -8], [24, -46, 0.92, 20], [44, 6, 1, 40], [-8, 14, 1.06, 10], [-50, 22, 0.84, -30], [10, -14, 0.78, 60]];
    const buds = [[-18, -62, -20], [52, -30, 30], [-62, -8, -50], [30, 34, 60]];
    let st = '';
    flowers.forEach(([x, y]) => (st += stem(x, y)));
    buds.forEach(([x, y]) => (st += stem(x, y)));
    body += st;
    buds.forEach(([x, y, a], i) => {
      body += '<g transform="translate(' + P(x, y) + ') rotate(' + a + ')"><g class="jb" style="--i:' + i + '">' +
        '<ellipse cx="0" cy="-9" rx="4.2" ry="10" fill="url(#' + id + 'bd)" stroke="' + p.e + '" stroke-width=".5"/>' +
        '<path d="M-3,0L0,-5L3,0Z" fill="#5b7a3c"/></g></g>';
    });
    flowers.forEach(([x, y, s, rot], i) => {
      const d = five(30, 11, { r, tip: 'round', tEnd: 0.8, wpos: 0.62, base: 0.32, jit: 0.04 }, rot);
      body += '<g transform="translate(' + P(x, y) + ') scale(' + s + ')"><g class="jf" style="--i:' + i + '">' +
        pd(d, 'url(#' + id + 'p)', p.e, { so: 0.45, sw: 0.6 }) +
        '<circle r="4.2" fill="' + p.x + '"/><circle r="1.8" fill="#8b8a4a"/></g></g>';
    });
    body += lightOver(id, 0.3);
    return { vb: '-100 -100 200 180', anchor: [0.5, 0.96], aspect: 0.9, defs, body };
  };

  /* ---------- Dalia ---------- */
  A.dahlia = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.a], [0.45, p.b], [1, p.c]]) + lg(id + 'i', [[0, p.a], [0.75, p.b], [1, p.c]]) +
      rg(id + 's', [[0, p.a, 0.5], [1, p.a, 0]]) + LIGHT(id);
    const n = [16, 16, 15, 14, 13, 12, 10, 8, 6], L = [92, 82, 72, 62, 52, 42, 32, 23, 14];
    let body = '';
    for (let k = 0; k < 9; k++) {
      const len = L[k], wid = len * (k < 5 ? 0.25 : 0.34), cup = k >= 5;
      body += ring(n[k], k * 137.5, 'dh' + k, () => {
        const d = U.petal(len, wid, { r, tip: cup ? 'round' : 'point', wpos: cup ? 0.6 : 0.52, base: 0.35, tEnd: 0.75, jit: 0.025, taper: 0.3 });
        return pd(d, 'url(#' + id + (k < 4 ? 'o' : 'i') + ')', p.e, { so: 0.35, sw: 0.6 }) +
          '<path d="M0,-2L0,' + f(-len * 0.88) + '" stroke="' + p.a + '" stroke-width=".8" opacity=".35"/>' +
          '<path d="M' + f(wid * 0.18) + ',-3L' + f(wid * 0.1) + ',' + f(-len * 0.82) + '" stroke="#fff" stroke-width=".7" opacity=".35"/>';
      }, { r, aj: 3, style: () => '--rr:' + (k % 2 ? 14 : -14) + 'deg' });
      if (k === 3) body += '<circle r="52" fill="url(#' + id + 's)"/>';
    }
    body += '<circle r="6" fill="' + p.a + '"/>' + lightOver(id, 0.35);
    return { defs, body };
  };

  /* ---------- Crisantemo ---------- */
  A.chrysanthemum = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.a], [0.4, p.b], [1, p.c]]) + rg(id + 's', [[0, p.a, 0.55], [1, p.a, 0]]) + LIGHT(id);
    const rings = [[34, 94, 6.8], [32, 80, 6.6], [28, 66, 6.3], [24, 52, 6], [20, 38, 5.6], [14, 25, 5]];
    let body = '';
    rings.forEach(([n, len, wid], k) => {
      body += ring(n, k * 7.3, 'ch' + k, () => {
        const Ln = len * (0.88 + r() * 0.22);
        const d = U.petal(Ln, wid, { r, tip: 'round', tEnd: 0.9, wpos: 0.8, base: 0.55, taper: 0.4, jit: 0.04, lean: (r() - 0.5) * 0.2 });
        return pd(d, 'url(#' + id + 'o)', p.e, { so: 0.35, sw: 0.5 }) + '<path d="M0,-3L0,' + f(-Ln * 0.85) + '" stroke="' + p.a + '" stroke-width=".6" opacity=".3"/>';
      }, { r, aj: 5 });
      if (k === 2) body += '<circle r="50" fill="url(#' + id + 's)"/>';
    });
    body += '<circle r="7" fill="' + p.a + '" opacity=".85"/>' + lightOver(id, 0.35);
    return { defs, body };
  };

  /* ---------- Flor de cerezo (rama) ---------- */
  A.cherry = function (p, r, id) {
    const defs = lg(id + 'p', [[0, p.a], [0.4, p.b], [1, p.c]]) + lg(id + 'br', [[0, p.br], [1, p.br2]], 0, 0, 1, 0) +
      lg(id + 'lf', [[0, '#6b5a2a'], [1, '#a4a052']]) + LIGHT(id);
    const branch = 'M0,98C-4,60 -10,34 -22,12C-34,-10 -52,-36 -72,-62M-22,12C0,-6 26,-26 54,-52M-40,-18C-46,-34 -44,-50 -38,-66';
    let body = '<path d="' + branch + '" stroke="url(#' + id + 'br)" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="' + branch + '" stroke="#b39a8a" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-dasharray="2 9" opacity=".7"/>';
    [[-60, -50, -40], [40, -40, 50], [-14, 24, -100], [8, -20, 70]].forEach(([x, y, a]) => {
      body += '<g transform="translate(' + P(x, y) + ') rotate(' + a + ')">' + U.leaf(22, 8, { r, teeth: true, ta: 0.06, fill: 'url(#' + id + 'lf)', rib: '#e2dca8' }) + '</g>';
    });
    const bl = [[-70, -62, 0.95], [-48, -34, 1.08], [-38, -68, 0.85], [-16, 8, 1.02], [18, -18, 0.95], [52, -50, 1.05], [36, -36, 0.8], [-4, 52, 0.9]];
    bl.forEach(([x, y, s], i) => {
      const rot = r() * 72;
      const d = five(26, 12.5, { r, tip: 'notch', nd: 0.95, tEnd: 0.8, wpos: 0.66, base: 0.18, taper: 0.05, jit: 0.035 }, rot);
      let stam = '';
      for (let j = 0; j < 16; j++) {
        const a = U.rad(j * 22.5 + r() * 10), l = 8 + r() * 4;
        stam += '<path d="M0,0L' + P(Math.cos(a) * l, Math.sin(a) * l) + '" stroke="#f2d6dd" stroke-width=".5"/><circle cx="' + f(Math.cos(a) * l) + '" cy="' + f(Math.sin(a) * l) + '" r=".9" fill="' + p.y + '"/>';
      }
      body += '<g transform="translate(' + P(x, y) + ') scale(' + s + ')"><g class="cb" style="--i:' + i + '">' +
        pd(d, 'url(#' + id + 'p)', p.e, { so: 0.4, sw: 0.5 }) + '<circle r="4" fill="#c85a7c" opacity=".8"/>' + stam + '</g></g>';
    });
    [[-58, -8, -60], [60, -62, 40], [-80, -76, -30]].forEach(([x, y, a]) => {
      body += '<g transform="translate(' + P(x, y) + ') rotate(' + a + ')"><ellipse cy="-6" rx="3.6" ry="6.5" fill="' + p.a + '"/><path d="M-3,0L0,-4L3,0Z" fill="#7a5a3c"/></g>';
    });
    body += lightOver(id, 0.25);
    return { anchor: [0.5, 0.99], defs, body };
  };

  /* ---------- Nomeolvides ---------- */
  A.forgetmenot = function (p, r, id) {
    const defs = lg(id + 'p', [[0, p.c], [0.35, p.b], [1, p.a]]) + lg(id + 'lf', [[0, '#3f5a2e'], [1, '#86a462']]) + LIGHT(id);
    const bloom = (s) => {
      const d = five(15 * s, 13 * s, { r, tip: 'round', tEnd: 0.66, wpos: 0.62, base: 0.4, jit: 0.04 }, r() * 72);
      return pd(d, 'url(#' + id + 'p)', p.e, { so: 0.4, sw: 0.5 }) +
        '<circle r="' + f(5 * s) + '" fill="#fbf8ea"/><circle r="' + f(3.2 * s) + '" fill="' + p.y + '"/><circle r="' + f(1.1 * s) + '" fill="#6b5a2a"/>';
    };
    let body = '';
    [[-60, 40, -110], [58, 50, 115], [0, 70, 180]].forEach(([x, y, a]) => {
      body += '<g transform="translate(' + P(x * 0.4, y * 0.4) + ') rotate(' + a + ')">' + U.leaf(46, 15, { r, fill: 'url(#' + id + 'lf)', rib: '#d8e4c0' }) + '</g>';
    });
    // Dos cimas escorpioides que se desenrollan alrededor de la flor principal.
    const coil = (cx, cy, dir, R, count, off) => {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, th = dir * (Math.PI * 0.5 + t * Math.PI * 2.2), rr = R * (1 - t * 0.82);
        pts.push([cx + Math.cos(th) * rr, cy - Math.sin(th) * rr]);
      }
      let s = '<path d="' + smooth(pts, false) + '" stroke="#6a8a4c" stroke-width="1.6" fill="none"/>';
      for (let i = 0; i < count; i++) {
        const q = pts[Math.min(40, Math.round(4 + i * (34 / count)))];
        const sc = 1 - i * (0.6 / count), idx = off + i;
        const inner = i >= count - 2
          ? '<ellipse cy="-2" rx="' + f(3 * sc + 1) + '" ry="' + f(4 * sc + 1.5) + '" fill="' + p.bud + '"/>'
          : bloom(sc * 1.05);
        s += '<g transform="translate(' + P(q[0], q[1]) + ')"><g class="mf" style="--i:' + idx + ';--v:' + (i < 3 ? 1 : 0) + '">' + inner + '</g></g>';
      }
      return s;
    };
    body += coil(38, -18, 1, 52, 8, 0) + coil(-40, -8, -1, 46, 7, 8);
    body += '<g class="mfmain">' + bloom(1.9) + '</g>';
    body += lightOver(id, 0.25);
    return { defs, body };
  };

  /* ---------- Loto (vista lateral) ---------- */
  A.lotus = function (p, r, id) {
    const defs = lg(id + 'p', [[0, p.a], [0.45, p.b], [1, p.c]]) + lg(id + 'q', [[0, p.a], [0.6, p.b], [1, p.c]]) +
      lg(id + 'pod', [[0, '#9fae4a'], [1, p.pod]]) + LIGHT(id);
    const petal = (cls, rot, len, wid, open, fill) => {
      const d = U.petal(len, wid, { r, tip: 'point', wpos: 0.5, base: 0.3, jit: 0.02, lean: rot * 0.0012 });
      return '<g transform="translate(0,38) rotate(' + rot + ')"><g class="pt ' + cls + '" style="--o:' + open + 'deg">' +
        pd(d, fill, p.e, { so: 0.3, hl: '#fff', ha: 0.25 }) + veins(len * 0.9, 7, wid * 0.55, p.v, 0.25, 0.45, r) + '</g></g>';
    };
    let body = '';
    body += petal('lb', -44, 84, 30, -22, 'url(#' + id + 'q)') + petal('lb', 44, 84, 30, 22, 'url(#' + id + 'q)') +
      petal('lb', -16, 94, 32, -8, 'url(#' + id + 'q)') + petal('lb', 16, 94, 32, 8, 'url(#' + id + 'q)');
    let pod = '';
    for (let i = 0; i < 26; i++) {
      const a = U.rad(-180 + (i / 25) * 180), l = 12 + r() * 6;
      pod += '<path d="M' + P(Math.cos(a) * 14, -6 + Math.sin(a) * 3) + 'l' + P(Math.cos(a) * l * 0.4, -l) + '" stroke="' + p.y + '" stroke-width="1.4" stroke-linecap="round"/>';
    }
    pod += '<path d="M-17,-8L17,-8L11,12L-11,12Z" fill="url(#' + id + 'pod)"/><ellipse cx="0" cy="-8" rx="17" ry="5" fill="#d8dd82"/>';
    for (let i = 0; i < 7; i++) pod += '<circle cx="' + f(-10 + i * 3.4) + '" cy="' + f(-8 + (i % 2 ? 1.2 : -1)) + '" r="1.2" fill="#7f8a34"/>';
    body += '<g class="pod">' + pod + '</g>';
    body += petal('lf', -62, 70, 32, -24, 'url(#' + id + 'p)') + petal('lf', 62, 70, 32, 24, 'url(#' + id + 'p)') +
      petal('lf', -28, 90, 38, -14, 'url(#' + id + 'p)') + petal('lf', 28, 90, 38, 14, 'url(#' + id + 'p)') +
      petal('lf', 0, 96, 40, 0, 'url(#' + id + 'p)');
    body += '<ellipse cx="0" cy="42" rx="10" ry="5" fill="#7c9a5c"/>' + lightOver(id, 0.3);
    return { vb: '-100 -110 200 160', anchor: [0.5, 0.97], aspect: 0.8, defs, body };
  };

  /* ---------- Diente de león (cabeza de semillas) ---------- */
  A.dandelion = function (p, r, id) {
    const defs = rg(id + 'h', [[0, '#fff', 0.35], [0.55, '#fff', 0.1], [1, '#fff', 0]]) + rg(id + 'sh', [[0, '#a8a488', 0.5], [0.62, '#a8a488', 0.28], [1, '#a8a488', 0]]);
    const N = 118, R = 64, seeds = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.39996;
      seeds.push([Math.cos(th) * rad, y, Math.sin(th) * rad, i]);
    }
    seeds.sort((a, b) => a[2] - b[2]);
    let body = '<circle r="84" fill="url(#' + id + 'sh)"/><circle r="72" fill="url(#' + id + 'h)"/>';
    seeds.forEach(([x, y, z, i]) => {
      const px = x * R, py = y * R, depth = (z + 1) / 2, op = 0.35 + depth * 0.6;
      const ang = Math.atan2(py, px), facing = Math.abs(z);
      const spread = U.rad(55 + facing * facing * 125), n = 10;
      let pap = '';
      const L = 11 + r() * 4;
      for (let j = 0; j < n; j++) {
        const a = ang - spread + (2 * spread * j) / (n - 1) + (r() - 0.5) * 0.15;
        pap += 'M' + P(px, py) + 'l' + P(Math.cos(a) * L, Math.sin(a) * L);
      }
      body += '<g class="seed" data-x="' + f(px) + '" data-y="' + f(py) + '" opacity="' + f(op) + '">' +
        '<path d="M' + P(x * 7, y * 7) + 'L' + P(px * 0.88, py * 0.88) + '" stroke="' + p.a + '" stroke-width=".6"/>' +
        '<path d="' + pap + '" stroke="#7c7660" stroke-width=".85" stroke-opacity=".5" fill="none"/>' +
        '<path d="' + pap + '" stroke="' + p.c + '" stroke-width=".5" fill="none"/>' +
        '<circle cx="' + f(px) + '" cy="' + f(py) + '" r=".9" fill="' + p.c + '"/></g>';
    });
    body += '<circle r="7.5" fill="' + p.core + '"/><circle r="4" cx="-1.5" cy="-1.5" fill="#b3a46a" opacity=".6"/>';
    return { defs, body };
  };

  /* ---------- Amapola ---------- */
  A.poppy = function (p, r, id) {
    const defs = lg(id + 'o', [[0, p.a], [0.35, p.b], [1, p.c]]) + rg(id + 'cap', [[0, '#c4cfb8'], [1, p.cap]], 0.4, 0.35, 0.7) + LIGHT(id);
    let body = '';
    const pet = (cls, rot, len, wid) => {
      const pp = petalPts(len, wid, { r, tip: 'ruffle', waves: 4 + ((r() * 2) | 0), ra: 0.14, wph: r() * 3, tEnd: 0.64, wpos: 0.72, base: 0.3, jit: 0.05 });
      const d = smooth(pp.pts);
      let cr = '';
      for (let i = 0; i < 7; i++) {
        const x0 = (r() - 0.5) * wid * 0.6, y0 = -len * (0.25 + r() * 0.3);
        cr += 'M' + P(x0, y0) + 'Q' + P(x0 + (r() - 0.5) * 20, y0 - len * 0.2) + ' ' + P(x0 + (r() - 0.5) * wid, y0 - len * (0.3 + r() * 0.2));
      }
      return '<g transform="rotate(' + rot + ')"><g class="pt ' + cls + '">' + pd(d, 'url(#' + id + 'o)', p.e, { so: 0.35, hl: '#ff9a7a', ha: 0.18 }) +
        '<path class="crease" d="' + cr + '" stroke="' + p.a + '" stroke-width=".8" fill="none"/>' +
        '<path d="' + U.petal(len * 0.3, wid * 0.32, { r, tip: 'round', tEnd: 0.7, base: 0.5 }) + '" fill="' + p.bl + '" stroke="#e9ddd6" stroke-width=".8" stroke-opacity=".5"/>' +
        '</g></g>';
    };
    body += pet('po', -28, 90, 82) + pet('po', 152, 90, 82) + pet('pi', 62, 82, 74) + pet('pi', 242, 82, 74);
    let st = '';
    for (let i = 0; i < 48; i++) {
      const a = U.rad(i * 7.5 + r() * 5), l0 = 10, l1 = 16 + r() * 5;
      st += '<path d="M' + P(Math.cos(a) * l0, Math.sin(a) * l0) + 'L' + P(Math.cos(a) * l1, Math.sin(a) * l1) + '" stroke="#2a1a24" stroke-width=".7"/>' +
        '<circle cx="' + f(Math.cos(a) * l1) + '" cy="' + f(Math.sin(a) * l1) + '" r="1.3" fill="#231523"/>';
    }
    body += '<g class="core">' + st + '<circle r="11" fill="url(#' + id + 'cap)"/>';
    for (let i = 0; i < 9; i++) {
      const a = U.rad(i * 40);
      body += '<path d="M0,0L' + P(Math.cos(a) * 10, Math.sin(a) * 10) + '" stroke="#3a2b3a" stroke-width="1.3" stroke-linecap="round"/>';
    }
    body += '<circle r="2" fill="#3a2b3a"/></g>' + lightOver(id, 0.3);
    return { defs, body };
  };

  /* ---------- Iris barbado ---------- */
  A.iris = function (p, r, id) {
    const defs = lg(id + 'f', [[0, p.a], [0.4, p.b], [1, p.c]]) + lg(id + 's', [[0, p.d], [0.5, p.e2], [1, p.f]]) + LIGHT(id);
    const part = (cls, rot, len, wid, grad, o, open) => {
      const d = U.petal(len, wid, Object.assign({ r, tip: 'ruffle', waves: 3, ra: 0.12, tEnd: 0.72, wpos: 0.62, base: 0.14, jit: 0.03 }, o));
      let extra = '';
      if (cls === 'fall') {
        let w = '';
        for (let i = 0; i < 9; i++) {
          const x = (i - 4) * wid * 0.07;
          w += 'M' + P(x * 0.4, -4) + 'Q' + P(x, -len * 0.18) + ' ' + P(x * 1.6, -len * 0.36);
        }
        extra += '<path d="' + w + '" stroke="' + p.w + '" stroke-width=".7" fill="none" opacity=".7"/>';
        let b = '';
        for (let i = 0; i < 26; i++) {
          const t = 0.05 + (i / 26) * 0.38;
          b += '<circle cx="' + f((r() - 0.5) * 4) + '" cy="' + f(-len * t) + '" r="' + f(1 + r() * 0.9) + '"/>';
        }
        extra += '<g fill="' + p.y + '">' + b + '</g>';
      }
      return '<g transform="rotate(' + rot + ')"><g class="pt ' + cls + '" style="--o:' + open + 'deg">' +
        pd(d, 'url(#' + id + grad + ')', p.e, { so: 0.3, hl: '#fff', ha: 0.18 }) + veins(len * 0.85, 6, wid * 0.55, p.e, 0.2, 0.45, r) + extra + '</g></g>';
    };
    let body = part('std', -34, 72, 38, 's', {}, -6) + part('std', 34, 72, 38, 's', {}, 6) + part('std', 0, 82, 44, 's', {}, 0);
    body += part('fall', -126, 88, 40, 'f', {}, -10) + part('fall', 126, 88, 40, 'f', {}, 10) + part('fall', 180, 98, 44, 'f', {}, 0);
    [-126, 126, 180].forEach((a) => {
      body += '<g transform="rotate(' + a + ')"><path class="sty" d="' + U.petal(34, 11, { r, tip: 'notch', nd: 0.5, tEnd: 0.8 }) + '" fill="' + p.e2 + '" stroke="' + p.e + '" stroke-width=".5" stroke-opacity=".4"/></g>';
    });
    body += lightOver(id, 0.3);
    return { vb: '-100 -110 200 200', anchor: [0.5, 0.72], defs, body };
  };

  /* ---------- Jacinto (espiga) ---------- */
  A.hyacinth = function (p, r, id) {
    const defs = rg(id + 'p', [[0, p.a], [0.4, p.b], [1, p.c]]);
    const rows = 13, items = [];
    for (let k = 0; k < rows; k++) {
      const y = -14 - k * 10.6, R = 24 - k * 0.8;
      for (let j = 0; j < 5; j++) {
        const phi = k * 0.7 + (j * Math.PI * 2) / 5;
        items.push([Math.sin(phi) * R, y, Math.cos(phi), k]);
      }
    }
    items.sort((a, b) => a[2] - b[2]);
    let body = '<path d="M0,6L0,-40" stroke="#6a8d4a" stroke-width="5" stroke-linecap="round"/>';
    items.forEach(([x, y, z, k]) => {
      const s = 0.8 + 0.28 * (z + 1) / 2, rot = x * 0.8 + (r() - 0.5) * 20;
      let d = '';
      for (let q = 0; q < 6; q++) d += smooth(U.tp(petalPts(12, 4.6, { r, tip: 'point', wpos: 0.45, base: 0.5, jit: 0.05, lean: (r() - 0.5) * 0.3 }).pts, q * 60 + rot));
      const s0 = k > rows - 4 ? 0.55 : k > rows - 7 ? 0.8 : 0.95;
      const shade = z < 0 ? ' opacity="' + f(0.55 + (z + 1) * 0.35) + '"' : '';
      body += '<g transform="translate(' + P(x, y) + ') scale(' + f(s) + ')"' + shade + '><g class="hc" style="--row:' + k + ';--s0:' + s0 + '">' +
        '<circle r="6" fill="' + p.a + '"/>' + pd(d, 'url(#' + id + 'p)', p.e, { so: 0.35, sw: 0.5 }) + '<circle r="1.8" fill="' + p.e + '"/></g></g>';
    });
    return { vb: '-60 -172 120 182', anchor: [0.5, 0.955], aspect: 182 / 120, defs, body };
  };
})();
