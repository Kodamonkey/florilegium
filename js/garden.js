/* Florilegio — el jardín: composición orgánica, brisa, parallax y reacción al cursor */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const { f } = U;
  const G = (FL.garden = { plants: [], tall: false });

  // Filas de atrás hacia adelante: las espigas atrás, las flores de gran cabeza adelante.
  const BACK = ['lavanda', 'cerezo', 'jacinto', 'margarita', 'fresia', 'crisantemo', 'nomeolvides', 'clavel', 'iris', 'jazmin'];
  const MID = ['tulipan', 'rosa-blanca', 'lisianthus', 'orquidea', 'amapola', 'rosa-amarilla', 'alstroemeria', 'lirio', 'rosa-rosada', 'gardenia'];
  const FRONT = ['peonia', 'girasol', 'ranunculo', 'rosa-roja', 'diente-de-leon', 'gerbera', 'hortensia', 'dalia', 'anemona', 'loto', 'camelia'];
  const DRIFT = ['#f8cbd8', '#fbe3ea', '#fff4f7', '#f3d27a', '#f2e8df', '#e9a3b8', '#d9d0ef'];

  const mouse = (G.mouse = { px: -1e4, py: -1e4, nx: 0, ny: 0, sx: 0, sy: 0, cx: 0, cy: 0, active: false });
  let root, back, lastW = 0, lastH = 0, io, spawnT = 0;

  /*
   * Las cabezas del jardín son imágenes (FL.headImage), no SVG en línea: más de diez mil nodos menos que
   * el navegador tendría que recorrer y pintar cada vez que algo se mueve. El diente de león queda en línea:
   * sus semillas se sueltan una a una al pasar el cursor.
   */
  const LIVE = new Set(['dandelion']);
  const PAD = 0.25;
  const drawnCache = {};

  // Al cambiar entre tema claro y oscuro, las imágenes se rehacen con la luz nueva.
  G.refreshHeads = function () {
    G.plants.forEach((p) => { if (p.img) p.img.src = FL.headImage(p.fl, { drawn: drawnCache[p.fl.id], pad: PAD }); });
  };
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', () => G.refreshHeads());
  }

  // Reparte las flores en filas. extra suma filas cuando la composición no deja ver bien cada flor.
  function bandsFor(W, VH, extra) {
    const mobile = W < 700;
    let per = Math.max(3, Math.floor(W / (mobile ? 124 : 150)));
    const bands = Math.ceil(FL.flowers.length / per) + extra;
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
      const n = Math.max(BACK.length, MID.length, FRONT.length);
      for (let i = 0; i < n; i++) [FRONT[i], BACK[i], MID[i]].forEach((id) => id && flat.push(id));
      per = Math.max(2, Math.min(per, mobile ? 3 : 5) - extra);
      lists = [];
      for (let b = 0; b * per < flat.length; b++) lists.push(flat.slice(b * per, (b + 1) * per));
    }
    return { tall, lists, mobile };
  }

  // Zonas que las cabezas no deben invadir: el título y la navegación (cuando está arriba).
  function reservedZones() {
    const top = root.getBoundingClientRect().top + window.scrollY;
    const zones = [];
    document.querySelectorAll('.brand, .topnav').forEach((el) => {
      const rc = el.getBoundingClientRect();
      if (!rc.width || rc.top > window.innerHeight / 2) return;
      // La navegación es fija: su zona es la de la pantalla sin desplazar, aunque se reconstruya con scroll.
      const dy = getComputedStyle(el).position === 'fixed' ? 0 : window.scrollY;
      zones.push({ x0: rc.left - 12, y0: rc.top + dy - top - 8, x1: rc.right + 12, y1: rc.bottom + dy - top + 10 });
    });
    return zones;
  }

  /*
   * Planifica sin tocar el DOM: tamaño y fila de cada flor, posición inicial escalonada entre filas
   * y luego FL.layout.relax, para que ninguna cabeza tape a otra más de la cuenta.
   */
  function plan(W, VH, extra, avoid, drawn) {
    const { tall, lists, mobile } = bandsFor(W, VH, extra);
    const r = U.rng(20260928 + extra);
    const nb = lists.length;
    let H;
    const grounds = [];
    if (!tall) {
      H = Math.max(VH, 600);
      for (let b = 0; b < nb; b++) grounds.push(H * (0.56 + (0.42 * b) / Math.max(1, nb - 1)));
    } else {
      // En pantallas bajas (un celular en horizontal) el jardín empieza bajo el título, no a 360 px: si no, la
      // primera pantalla queda solo con el título.
      const below = avoid.reduce((m, z) => Math.max(m, z.y1), 0);
      const top = mobile ? 300 : VH < 520 ? U.clamp(below + 40, 160, 360) : 360, gap = mobile ? 205 : 235;
      H = top + nb * gap + 40;
      for (let b = 0; b < nb; b++) grounds.push(top + b * gap + gap * 0.92);
    }
    const base = tall ? (mobile ? 118 : 138) : U.clamp(W * 0.1, 96, 196);
    const items = [];
    lists.forEach((ids, b) => {
      const slot = W / ids.length;
      ids.forEach((id, i) => {
        const fl = FL.byId(id);
        if (!fl) return;
        const dr = drawn[id];
        const depth = tall ? 0.35 + r() * 0.65 : U.clamp((b + 0.5 + (r() - 0.5) * 0.6) / nb, 0, 1);
        const hw = Math.max(24, Math.min(base * (tall ? 0.8 + depth * 0.32 : 0.62 + depth * 0.5) * (fl.size || 1), slot * 0.9 - 10));
        const hh = hw * dr.aspect, ax = dr.anchor[0], ay = dr.anchor[1];
        const stem0 = (tall ? (mobile ? 190 : 220) * (0.45 + depth * 0.45) : H * (0.1 + depth * 0.12)) * (fl.stemK || 1) * (0.72 + r() * 0.56);
        const ground = grounds[b] + (r() - 0.5) * 26;
        const bend = (r() - 0.5) * hw * 0.3;
        const stag = ((b % 2) - 0.5) * slot * 0.5;
        const hx = U.clamp(slot * (i + 0.5) + stag + (r() - 0.5) * slot * 0.24, hw * 0.5 + 4, W - hw * 0.5 - 4);
        // Centro de la cabeza según el largo del tallo, y el rango de alturas que el tallo permite.
        const cy = (stem) => ground - stem - hh * ay + hh / 2;
        const minStem = Math.max(36, stem0 * 0.6), maxStem = Math.max(minStem, stem0 * 1.7);
        const z = 10 + b * 10 + Math.round(depth * 8);
        items.push({
          fl, dr, b, depth, hw, hh, ax, ay, ground, bend, z, gd: tall ? 0.15 + r() * 0.45 : 0.25 + b * 0.35 + r() * 0.55,
          node: {
            x: hx, y: cy(stem0), rx: hw * 0.44, ry: hh * 0.44, band: b, z,
            minX: hw * 0.46 + 4, maxX: W - hw * 0.46 - 4, minY: Math.max(cy(maxStem), hh * 0.46 + 8), maxY: cy(minStem)
          }
        });
      });
    });
    const nodes = items.map((it) => it.node);
    FL.layout.relax(nodes, { gap: 10, allow: 0.1, avoid });
    const vis = FL.layout.visibility(nodes);
    items.forEach((it, k) => {
      it.vis = vis[k];
      it.stemLen = it.ground - it.node.y - it.hh * it.ay + it.hh / 2;
      it.x = it.node.x - it.bend - it.hw * (0.5 - it.ax);
    });
    return { tall, lists, H, grounds, items, minVis: Math.min(...vis) };
  }

  G.build = function () {
    root = document.getElementById('garden');
    back = document.getElementById('ground');
    // Con la pestaña oculta el ancho puede llegar en 0; se usa un mínimo y el jardín se rehace al cambiar de tamaño.
    const W = Math.max(320, document.documentElement.clientWidth), VH = Math.max(480, window.innerHeight);
    lastW = W; lastH = VH;
    root.querySelectorAll('.plant, .bandfront, .layout-debug').forEach((n) => n.remove());
    G.plants = [];
    // El dibujo de cada flor no depende del tamaño de la ventana: se hace una sola vez.
    const drawn = drawnCache;
    FL.flowers.forEach((fl) => { if (!drawn[fl.id]) drawn[fl.id] = FL.drawHead(fl); });
    const avoid = reservedZones();
    G.avoid = avoid;
    let best = null;
    for (let extra = 0; extra < 3; extra++) {
      const pl = plan(W, VH, extra, avoid, drawn);
      if (!best || pl.minVis > best.minVis + 0.02) best = pl;
      if (pl.minVis >= 0.85) break;
    }
    G.tall = best.tall;
    G._plan = best;
    G.report = { minVis: best.minVis, bands: best.lists.length, tall: best.tall, vis: best.items.map((it) => ({ id: it.fl.id, v: +it.vis.toFixed(3) })) };
    root.style.height = best.H + 'px';
    const r = U.rng(4242);
    best.items.forEach((it) => G.plants.push(makePlant(it, r)));
    best.grounds.forEach((y, b) => addBandFront(W, y, b, r, best.tall));
    drawGround(W, best.H, best.grounds, r);
    if (/[?&]debug=layout\b/.test(location.search)) debugLayout(best);
    observe();
    measure();
  };

  function makePlant(it, r) {
    const { fl, dr: drawn, hw, hh, ax, ay, bend, stemLen, depth, b: band, gd, z, x, ground } = it;
    const Wp = Math.max(hw * 1.5, 70);
    const Hp = stemLen + hh * ay;
    const tx = Wp / 2 + bend, ty = hh * ay;
    const stem = FL.drawStem(fl, { W: Wp, H: Hp, sx: Wp / 2, tx, ty, head: hw, bend: -bend * 0.5 }, r);
    const windy = fl.art === 'lavender' || fl.art === 'hyacinth' || fl.art === 'daisy' || fl.art === 'poppy' || fl.art === 'freesia';
    const amp = (windy ? 2 : 1) + r() * 1.1;
    const dur = 5.5 + r() * 4.5;
    const el = document.createElement('div');
    el.className = 'plant sp-' + fl.art + (!G.tall && band === 0 ? ' far' : '');
    el.dataset.id = fl.id;
    el.style.cssText = 'left:' + f(x - Wp / 2) + 'px;top:' + f(ground - Hp) + 'px;width:' + f(Wp) + 'px;height:' + f(Hp) + 'px;z-index:' + z;
    const art = LIVE.has(fl.art) ? drawn.svg : FL.headImg(fl, { drawn, pad: PAD });
    el.innerHTML = '<div class="sway" style="--amp:' + f(amp) + 'deg;--dur:' + f(dur) + 's;--sd:' + f(-r() * dur) + 's;--gd:' + f(gd) + 's">' + stem +
      '<button type="button" class="head" style="left:' + f(tx - hw * ax) + 'px;top:' + f(ty - hh * ay) + 'px;width:' + f(hw) + 'px;height:' + f(hh) +
      'px;--ax:' + f(ax * 100) + '%;--ay:' + f(ay * 100) + '%;--nd:' + f(4 + r() * 3) + 's" aria-label="' + fl.name + '">' +
      '<span class="bloom"><span class="turn">' + art + '</span></span><span class="tag">' + fl.name + '</span></button></div>';
    root.appendChild(el);
    const btn = el.querySelector('.head');
    const p = { fl, el, btn, turn: el.querySelector('.turn'), svg: el.querySelector('.fh'), img: el.querySelector('.fhimg'), depth, lean: 0, rx: 0, ry: 0, tx: 0, ty: 0, box: { x, ground, Hp, hh, Wp, hx: it.node.x } };
    // Terminado el crecimiento, sus animaciones se retiran: con «fill: both» dejaban dos capas de GPU vivas por planta.
    el.addEventListener('animationend', (e) => { if (e.animationName === 'bloomin') el.classList.add('grown'); });
    btn.addEventListener('click', () => FL.focus.open(fl, btn));
    btn.addEventListener('pointerenter', () => hover(p));
    btn.addEventListener('focus', () => hover(p));
    return p;
  }

  // ?debug=layout: dibuja la elipse de cada cabeza con su porcentaje visible.
  function debugLayout(pl) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'layout-debug');
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;z-index:300;pointer-events:none;overflow:visible');
    svg.innerHTML = pl.items.map((it) => {
      const n = it.node, col = it.vis < 0.85 ? '#d0302f' : '#2f7d4a';
      return '<ellipse cx="' + f(n.x) + '" cy="' + f(n.y) + '" rx="' + f(n.rx) + '" ry="' + f(n.ry) + '" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-dasharray="4 3"/>' +
        '<text x="' + f(n.x) + '" y="' + f(n.y) + '" text-anchor="middle" font-size="12" font-family="monospace" fill="' + col + '">' + it.fl.id.slice(0, 6) + ' ' + Math.round(it.vis * 100) + '%</text>';
    }).join('');
    root.appendChild(svg);
    console.info('[layout] filas:', pl.lists.length, '· modo alto:', pl.tall, '· visibilidad mínima:', pl.minVis.toFixed(3));
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
      p.cx = b.hx;
      p.cy = top + b.ground - b.Hp * 0.55;
      p.hx = b.hx;
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

  /*
   * El jardín visible, desenfocado, pintado una sola vez en un lienzo: el fondo de la flor en primer plano.
   * Un backdrop-filter se ve igual, pero se recalcula entero en cada cuadro en que algo se mueve encima
   * (la flor al abrirse, sus partículas) y en GPU integradas eso dejaba la vista a la mitad de cuadros.
   * Se pinta a baja resolución: es más barato y, desenfocado, no se nota.
   */
  G.impression = function (cv) {
    const W = window.innerWidth, H = window.innerHeight;
    const x = cv.getContext('2d', { alpha: false });
    const blur = 'filter' in x, k = blur ? 0.25 : 0.08; // sin filtros de lienzo, la baja resolución hace de desenfoque
    cv.width = Math.max(1, Math.round(W * k));
    cv.height = Math.max(1, Math.round(H * k));
    const css = getComputedStyle(document.documentElement);
    x.fillStyle = getComputedStyle(document.body).backgroundColor;
    x.fillRect(0, 0, cv.width, cv.height);
    if (blur) x.filter = 'blur(' + f(9 * k) + 'px) saturate(0.85)';
    x.setTransform(k, 0, 0, k, 0, 0);
    // La luz del cielo, arriba a la derecha (como .sky::after).
    const vm = Math.max(W, H) / 100, sun = x.createRadialGradient(W - 17 * vm, vm, 0, W - 17 * vm, vm, 25 * vm);
    const light = css.getPropertyValue('--sun').trim() || 'rgba(255, 226, 164, 0.62)';
    sun.addColorStop(0, light);
    sun.addColorStop(1, light.replace(/[\d.]+\s*\)$/, '0)')); // el mismo color, transparente: hacia negro se ensucia
    x.fillStyle = sun;
    x.fillRect(0, 0, W, H);
    // Tallos como trazos: desenfocados no hace falta más.
    x.strokeStyle = css.getPropertyValue('--grass').trim() || '#8fa27f';
    x.lineWidth = 4;
    const heads = [];
    for (const p of G.plants) {
      if (p.el.classList.contains('away')) continue;
      const pr = p.el.getBoundingClientRect();
      if (pr.bottom < 0 || pr.top > H || pr.right < 0 || pr.left > W) continue;
      const hr = p.btn.getBoundingClientRect();
      x.globalAlpha = 0.7;
      x.beginPath();
      x.moveTo(hr.left + hr.width / 2, hr.top + hr.height / 2);
      x.lineTo(pr.left + pr.width / 2, pr.bottom);
      x.stroke();
      if (p.img && p.img.complete) heads.push([p, p.img.getBoundingClientRect()]);
    }
    for (const [p, rc] of heads) {
      x.globalAlpha = p.el.classList.contains('far') ? 0.86 : 1;
      try { x.drawImage(p.img, rc.left, rc.top, rc.width, rc.height); } catch (e) { /* imagen aún sin decodificar */ }
    }
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
    mouse.cx = e.clientX;
    mouse.cy = e.clientY;
    mouse.px = e.clientX + window.scrollX;
    mouse.py = e.clientY + window.scrollY;
    mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ny = (e.clientY / window.innerHeight) * 2 - 1;
  };
  G.onLeave = () => { mouse.active = false; mouse.nx = 0; mouse.ny = 0; };
  // Las plantas no cambian de lugar en la página al desplazarse; solo el cursor, que queda sobre otro punto.
  G.onScroll = () => {
    mouse.px = mouse.cx + window.scrollX;
    mouse.py = mouse.cy + window.scrollY;
  };

  G.resize = function () {
    const W = Math.max(320, document.documentElement.clientWidth), VH = Math.max(480, window.innerHeight);
    if (Math.abs(W - lastW) > 2 || (!G.tall && Math.abs(VH - lastH) > 120)) G.build();
    else measure();
    if (G.ambient) G.ambient.resize();
  };

  G.tick = function (dt, T) {
    const k = Math.min(1, dt * 2.2);
    mouse.sx += (mouse.nx - mouse.sx) * k;
    mouse.sy += (mouse.ny - mouse.sy) * k;
    const sy = G.tall ? window.scrollY : 0; // leer scrollY obliga a recalcular estilos en medio del cuadro
    for (const p of G.plants) {
      const par = p.depth - 0.45;
      const tx = mouse.sx * par * 14;
      const ty = mouse.sy * par * 6 + (G.tall ? -sy * par * 0.05 : 0);
      let target = 0;
      if (mouse.active) {
        const dx = mouse.px - p.cx, dy = mouse.py - p.cy, d = Math.hypot(dx, dy), R = 180;
        if (d < R) target = -Math.sign(dx || 1) * 5 * Math.pow(1 - d / R, 1.4);
      }
      p.lean += (target - p.lean) * Math.min(1, dt * 2.6);
      // Una sola escritura de transform por planta, y solo si algo cambió.
      if (Math.abs(tx - p.tx) > 0.05 || Math.abs(ty - p.ty) > 0.05 || Math.abs(p.lean - (p.lastLean || 0)) > 0.02) {
        p.tx = tx; p.ty = ty; p.lastLean = p.lean;
        p.el.style.transform = 'translate(' + f(tx) + 'px,' + f(ty) + 'px) rotate(' + p.lean.toFixed(2) + 'deg)';
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
        // Solo se escribe cuando el giro cambia de verdad: cada escritura obliga a recalcular estilos y pintar.
        if (Math.abs(p.rx - (p.lastRx || 0)) > 0.05 || Math.abs(p.ry - (p.lastRy || 0)) > 0.05) {
          p.lastRx = p.rx; p.lastRy = p.ry;
          p.turn.style.transform = 'perspective(520px) rotateX(' + p.rx.toFixed(2) + 'deg) rotateY(' + p.ry.toFixed(2) + 'deg)';
        }
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
