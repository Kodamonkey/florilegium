/* Florilegio — el jardín: composición orgánica, brisa, parallax y reacción al cursor */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const { f } = U;
  const G = (FL.garden = { plants: [], tall: false });

  // Filas de atrás hacia adelante: las espigas atrás, las flores de gran cabeza adelante.
  const BACK = ['lavanda', 'cerezo', 'jacinto', 'margarita', 'crisantemo', 'nomeolvides', 'clavel', 'iris', 'jazmin'];
  const MID = ['tulipan', 'rosa-blanca', 'orquidea', 'amapola', 'rosa-amarilla', 'lirio', 'rosa-rosada', 'gardenia'];
  const FRONT = ['peonia', 'girasol', 'rosa-roja', 'diente-de-leon', 'hortensia', 'dalia', 'loto', 'camelia'];
  const DRIFT = ['#f8cbd8', '#fbe3ea', '#fff4f7', '#f3d27a', '#f2e8df', '#e9a3b8', '#d9d0ef'];

  const mouse = (G.mouse = { px: -1e4, py: -1e4, nx: 0, ny: 0, sx: 0, sy: 0, active: false });
  let root, back, lastW = 0, lastH = 0, io, spawnT = 0;

  function bandsFor(W, VH) {
    const mobile = W < 700;
    let per = Math.max(3, Math.floor(W / (mobile ? 124 : 150)));
    let bands = Math.ceil(FL.flowers.length / per);
    const tall = mobile || bands > 4 || VH < 520;
    let lists;
    if (!tall && bands === 3) lists = [BACK, MID, FRONT];
    else if (!tall) {
      const flat = BACK.concat(MID, FRONT);
      per = Math.ceil(flat.length / bands);
      lists = [];
      for (let b = 0; b < bands; b++) lists.push(flat.slice(b * per, (b + 1) * per));
    } else {
      const flat = [];
      for (let i = 0; i < 9; i++) [FRONT[i], BACK[i], MID[i]].forEach((id) => id && flat.push(id));
      per = Math.max(2, Math.min(per, mobile ? 3 : 5));
      lists = [];
      for (let b = 0; b * per < flat.length; b++) lists.push(flat.slice(b * per, (b + 1) * per));
    }
    return { tall, lists, mobile };
  }

  G.build = function () {
    root = document.getElementById('garden');
    back = document.getElementById('ground');
    const W = document.documentElement.clientWidth, VH = window.innerHeight;
    lastW = W; lastH = VH;
    const { tall, lists, mobile } = bandsFor(W, VH);
    G.tall = tall;
    root.querySelectorAll('.plant, .bandfront').forEach((n) => n.remove());
    G.plants = [];
    const r = U.rng(20260928);
    const nb = lists.length;
    let H, grounds = [];
    if (!tall) {
      H = Math.max(VH, 600);
      for (let b = 0; b < nb; b++) grounds.push(H * (0.56 + (0.42 * b) / Math.max(1, nb - 1)));
    } else {
      const top = mobile ? 300 : 360, gap = mobile ? 205 : 235;
      H = top + nb * gap + 40;
      for (let b = 0; b < nb; b++) grounds.push(top + b * gap + gap * 0.92);
    }
    root.style.height = H + 'px';
    const base = tall ? (mobile ? 118 : 138) : U.clamp(W * 0.1, 96, 196);
    let idx = 0;
    lists.forEach((ids, b) => {
      const slot = W / ids.length;
      ids.forEach((id, i) => {
        const fl = FL.byId(id);
        if (!fl) return;
        const depth = tall ? 0.35 + r() * 0.65 : U.clamp((b + 0.5 + (r() - 0.5) * 0.6) / nb, 0, 1);
        const head = base * (tall ? 0.8 + depth * 0.32 : 0.62 + depth * 0.5) * (fl.size || 1);
        const stemLen = (tall ? (mobile ? 190 : 220) * (0.45 + depth * 0.45) : H * (0.1 + depth * 0.12)) * (fl.stemK || 1) * (0.72 + r() * 0.56);
        let x = slot * (i + 0.5) + (r() - 0.5) * slot * 0.6 + (b % 2 ? slot * 0.18 : -slot * 0.12);
        x = U.clamp(x, head * 0.5 + 4, W - head * 0.5 - 4);
        const gd = tall ? 0.15 + r() * 0.45 : 0.25 + b * 0.35 + r() * 0.55;
        const gy = grounds[b] + (r() - 0.5) * 26;
        G.plants.push(makePlant(fl, x, gy, depth, b, head, stemLen, r, idx++, gd));
      });
      addBandFront(W, grounds[b], b, r, tall);
    });
    drawGround(W, H, grounds, r);
    observe();
    measure();
  };

  function makePlant(fl, x, ground, depth, band, head, stemLen, r, idx, gd) {
    const drawn = FL.drawHead(fl);
    const ax = drawn.anchor[0], ay = drawn.anchor[1];
    const hw = head, hh = head * drawn.aspect;
    const bend = (r() - 0.5) * hw * 0.45;
    const Wp = Math.max(hw * 1.5, 70);
    const Hp = stemLen + hh * ay;
    const tx = Wp / 2 + bend, ty = hh * ay;
    const stem = FL.drawStem(fl, { W: Wp, H: Hp, sx: Wp / 2, tx, ty, head: hw, bend: -bend * 0.5 }, r);
    const z = 10 + band * 10 + Math.round(depth * 8);
    const windy = fl.art === 'lavender' || fl.art === 'hyacinth' || fl.art === 'daisy' || fl.art === 'poppy';
    const amp = (windy ? 2.4 : 1.2) + r() * 1.3;
    const dur = 5.5 + r() * 4.5;
    const el = document.createElement('div');
    el.className = 'plant sp-' + fl.art + (!G.tall && band === 0 ? ' far' : '');
    el.dataset.id = fl.id;
    el.style.cssText = 'left:' + f(x - Wp / 2) + 'px;top:' + f(ground - Hp) + 'px;width:' + f(Wp) + 'px;height:' + f(Hp) + 'px;z-index:' + z;
    el.innerHTML = '<div class="sway" style="--amp:' + f(amp) + 'deg;--dur:' + f(dur) + 's;--sd:' + f(-r() * dur) + 's;--gd:' + f(gd) + 's">' + stem +
      '<button type="button" class="head" style="left:' + f(tx - hw * ax) + 'px;top:' + f(ty - hh * ay) + 'px;width:' + f(hw) + 'px;height:' + f(hh) +
      'px;--ax:' + f(ax * 100) + '%;--ay:' + f(ay * 100) + '%;--nd:' + f(4 + r() * 3) + 's" aria-label="' + fl.name + '">' +
      '<span class="bloom"><span class="turn">' + drawn.svg + '</span></span><span class="tag">' + fl.name + '</span></button></div>';
    root.appendChild(el);
    const btn = el.querySelector('.head');
    const p = { fl, el, btn, turn: el.querySelector('.turn'), svg: el.querySelector('.fh'), depth, lean: 0, rx: 0, ry: 0, tx: 0, ty: 0, box: { x, ground, Hp, hh, Wp } };
    btn.addEventListener('click', () => FL.focus.open(fl, btn));
    btn.addEventListener('pointerenter', () => hover(p));
    btn.addEventListener('focus', () => hover(p));
    return p;
  }

  // La hierba y una leve bruma delante de cada fila dan profundidad y esconden la base de los tallos.
  function addBandFront(W, y, b, r, tall) {
    const div = document.createElement('div');
    div.className = 'bandfront';
    const h = 70;
    div.style.cssText = 'top:' + f(y - h + 14) + 'px;height:' + h + 'px;z-index:' + (19 + b * 10);
    let s = '<svg viewBox="0 0 ' + f(W) + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">';
    // Matas de hierba irregulares, no una franja pareja.
    let d1 = '', d2 = '';
    let x = r() * 20;
    while (x < W) {
      const clump = 2 + ((r() * 5) | 0), tallC = r() < 0.3 ? 1.6 : 1;
      for (let k = 0; k < clump; k++) {
        const bx = x + (r() - 0.5) * 10, bh = (6 + r() * 20) * tallC, lean = (r() - 0.5) * 16;
        const seg = 'M' + f(bx) + ',' + (h + 2) + 'Q' + f(bx + lean * 0.2) + ',' + f(h - bh * 0.6) + ' ' + f(bx + lean) + ',' + f(h - bh - 8);
        if (r() < 0.5) d1 += seg; else d2 += seg;
      }
      x += 10 + r() * (tall ? 34 : 46);
    }
    s += '<path d="' + d1 + '" style="stroke:var(--grass)" stroke-width="1.1" fill="none" opacity=".5" stroke-linecap="round"/>' +
      '<path d="' + d2 + '" style="stroke:var(--sage)" stroke-width=".9" fill="none" opacity=".35" stroke-linecap="round"/></svg>';
    div.innerHTML = s;
    root.appendChild(div);
  }

  function drawGround(W, H, grounds, r) {
    let s = '<defs><radialGradient id="gw"><stop offset="0" style="stop-color:var(--ground)"/><stop offset="1" style="stop-color:var(--ground)" stop-opacity="0"/></radialGradient></defs>';
    grounds.forEach((y) => {
      for (let i = 0; i < 3; i++) {
        s += '<ellipse cx="' + f(W * (i / 2) + (r() - 0.5) * W * 0.3) + '" cy="' + f(y + (r() - 0.5) * 30) + '" rx="' + f(W * (0.18 + r() * 0.14)) + '" ry="' + f(30 + r() * 40) + '" fill="url(#gw)" opacity="' + f(0.5 + r() * 0.5) + '"/>';
      }
    });
    back.setAttribute('viewBox', '0 0 ' + f(W) + ' ' + f(H));
    back.innerHTML = s;
  }

  // En pantallas altas, cada planta crece cuando entra en la vista.
  function observe() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window) || FL.reduce) {
      G.plants.forEach((p) => p.el.classList.add('seen'));
      return;
    }
    io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    G.plants.forEach((p) => io.observe(p.el));
  }

  function measure() {
    const top = root.getBoundingClientRect().top + window.scrollY;
    G.plants.forEach((p) => {
      const b = p.box;
      p.cx = b.x;
      p.cy = top + b.ground - b.Hp * 0.55;
      p.hx = b.x;
      p.hy = top + b.ground - b.Hp + b.hh * 0.4;
    });
  }
  G.measure = measure;

  // Interacciones al pasar: el diente de león suelta semillas, el cerezo deja caer pétalos.
  function hover(p) {
    if (FL.reduce || !G.ambient) return;
    const rc = p.btn.getBoundingClientRect();
    if (p.fl.art === 'dandelion') FL.releaseSeeds(p.svg, G.ambient, 2, null);
    if (p.fl.art === 'cherry') {
      for (let i = 0; i < 3; i++) shed(rc.left + rc.width * (0.2 + Math.random() * 0.6), rc.top + rc.height * (0.2 + Math.random() * 0.5), p.fl.pal);
    }
  }
  function shed(x, y, pal) {
    G.ambient.add({ type: 'petal', x, y, vx: 8, vy: 6, vr: (Math.random() - 0.5) * 2, s: 0.8 + Math.random() * 0.4, life: 14, col: pal.b, col2: pal.c, wind: 16, fall: 18 });
  }

  // Semillas del diente de león: se ocultan en el SVG y siguen su vuelo en el lienzo de partículas.
  FL.releaseSeeds = function (svg, sys, n, from) {
    const all = Array.from(svg.querySelectorAll('.seed:not(.gone)'));
    if (!all.length) return 0;
    const m = svg.getScreenCTM();
    if (!m) return 0;
    const dark = document.documentElement.matches('[data-theme="dark"]') || (!document.documentElement.matches('[data-theme="light"]') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    for (let i = 0; i < n && all.length; i++) {
      const s = all.splice((Math.random() * all.length) | 0, 1)[0];
      const pt = new DOMPoint(+s.dataset.x, +s.dataset.y).matrixTransform(m);
      s.classList.add('gone');
      let vx = 30 + Math.random() * 40, vy = -20 - Math.random() * 30;
      if (from) {
        const dx = pt.x - from.x, dy = pt.y - from.y, d = Math.hypot(dx, dy) || 1;
        vx = (dx / d) * 90 + 30; vy = (dy / d) * 60 - 30;
      }
      sys.add({ type: 'seed', x: pt.x, y: pt.y, vx, vy, s: 0.9 + Math.random() * 0.5, life: 12 + Math.random() * 6, col: dark ? '#eeeadc' : '#8f8870', col2: dark ? '#c9c0a0' : '#6d6450', wind: 24, drag: 0.5, rot: 0 });
    }
    clearTimeout(svg._regrow);
    svg._regrow = setTimeout(() => svg.querySelectorAll('.seed.gone').forEach((s) => s.classList.remove('gone')), 9000);
    return all.length;
  };

  G.headOf = (id) => {
    const p = G.plants.find((q) => q.fl.id === id);
    return p ? p.btn : null;
  };
  G.setHidden = (id, on) => {
    const p = G.plants.find((q) => q.fl.id === id);
    if (p) p.el.classList.toggle('away', on);
  };
  G.setFilter = (set) => {
    G.plants.forEach((p) => {
      p.el.classList.toggle('dim', !!set && !set.has(p.fl.id));
      p.el.classList.toggle('match', !!set && set.has(p.fl.id));
    });
  };

  G.onPointer = function (e) {
    if (e.pointerType === 'touch') { mouse.active = false; return; }
    mouse.active = true;
    mouse.px = e.clientX + window.scrollX;
    mouse.py = e.clientY + window.scrollY;
    mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ny = (e.clientY / window.innerHeight) * 2 - 1;
  };
  G.onLeave = () => { mouse.active = false; mouse.nx = 0; mouse.ny = 0; };

  G.resize = function () {
    const W = document.documentElement.clientWidth, VH = window.innerHeight;
    if (Math.abs(W - lastW) > 2 || (!G.tall && Math.abs(VH - lastH) > 120)) G.build();
    else measure();
    if (G.ambient) G.ambient.resize();
  };

  G.tick = function (dt, T) {
    const k = Math.min(1, dt * 2.2);
    mouse.sx += (mouse.nx - mouse.sx) * k;
    mouse.sy += (mouse.ny - mouse.sy) * k;
    const sy = window.scrollY;
    for (const p of G.plants) {
      const par = p.depth - 0.45;
      const tx = mouse.sx * par * 26;
      const ty = mouse.sy * par * 10 + (G.tall ? -sy * par * 0.05 : 0);
      let target = 0;
      if (mouse.active) {
        const dx = mouse.px - p.cx, dy = mouse.py - p.cy, d = Math.hypot(dx, dy), R = 180;
        if (d < R) target = -Math.sign(dx || 1) * 7 * Math.pow(1 - d / R, 1.4);
      }
      p.lean += (target - p.lean) * Math.min(1, dt * 2.6);
      if (Math.abs(tx - p.tx) > 0.05 || Math.abs(ty - p.ty) > 0.05) {
        p.tx = tx; p.ty = ty;
        p.el.style.translate = f(tx) + 'px ' + f(ty) + 'px';
      }
      if (Math.abs(p.lean - (p.lastLean || 0)) > 0.02) {
        p.lastLean = p.lean;
        p.el.style.rotate = p.lean.toFixed(2) + 'deg';
      }
      if (p.fl.art === 'sunflower') {
        // Gira hacia el cursor; sin cursor, hacia un sol imaginario arriba a la derecha.
        let ry = 16, rx = 10;
        if (mouse.active) {
          ry = U.clamp((mouse.px - p.hx) / 420, -1, 1) * 30;
          rx = U.clamp(-(mouse.py - p.hy) / 420, -1, 1) * 20;
        }
        p.ry += (ry - p.ry) * Math.min(1, dt * 1.6);
        p.rx += (rx - p.rx) * Math.min(1, dt * 1.6);
        p.turn.style.transform = 'perspective(520px) rotateX(' + p.rx.toFixed(2) + 'deg) rotateY(' + p.ry.toFixed(2) + 'deg)';
      }
    }
    // Pétalos y polen a la deriva
    const A = G.ambient;
    if (A && !FL.reduce && !document.body.classList.contains('days-open')) {
      spawnT -= dt;
      if (spawnT <= 0 && A.count('petal') < (lastW < 700 ? 4 : 7)) {
        spawnT = 2.2 + Math.random() * 3;
        const col = DRIFT[(Math.random() * DRIFT.length) | 0];
        const fromTop = Math.random() < 0.7;
        A.add({
          type: 'petal', x: fromTop ? Math.random() * A.w * 0.8 : -20, y: fromTop ? -20 : Math.random() * A.h * 0.5,
          vx: 12, vy: 14, vr: (Math.random() - 0.5) * 1.6, s: 0.7 + Math.random() * 0.8, life: 30, col, col2: '#ffffff', wind: 14 + Math.random() * 10, fall: 16 + Math.random() * 12
        });
      }
      while (A.count('pollen') < (lastW < 700 ? 10 : 20)) {
        A.add({ type: 'pollen', x: Math.random() * A.w, y: Math.random() * A.h, s: 0.5 + Math.random() * 0.8, life: 14 + Math.random() * 12, fin: 2, col: '#e9c25c', a: 0.8 });
      }
    }
    // Pétalos del cerezo que caen solos, de vez en cuando
    if (A && !FL.reduce && Math.random() < dt * 0.12) {
      const c = G.plants.find((p) => p.fl.art === 'cherry');
      if (c && !c.el.classList.contains('away')) {
        const rc = c.btn.getBoundingClientRect();
        if (rc.bottom > 0 && rc.top < window.innerHeight) shed(rc.left + rc.width * (0.2 + Math.random() * 0.6), rc.top + rc.height * 0.4, c.fl.pal);
      }
    }
  };
})();
