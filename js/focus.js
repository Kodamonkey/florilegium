/* Florilegio — una flor en primer plano: transición, apertura propia de cada especie y ficha */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const F = (FL.focus = { cur: null });
  const $ = (id) => document.getElementById(id);
  let root, slot, hint, card, scroll, backdrop, stage, sys, bg, ctx = null, busy = false, lastFocus = null;

  const SEASON = { primavera: 'primavera', verano: 'verano', 'otoño': 'otoño', invierno: 'invierno' };
  const seasonText = (a) => a.map((s) => SEASON[s] || s).join(' · ');

  F.init = function () {
    root = $('focus'); slot = $('stageSlot'); hint = $('stageHint'); card = $('card');
    scroll = $('focusScroll'); backdrop = $('focusBackdrop'); stage = $('stage');
    sys = F.fx = new FL.Particles($('fx'));
    // Fondo: el jardín desenfocado, pintado una vez al abrir (FL.garden.impression).
    bg = document.createElement('canvas');
    bg.className = 'focus-bg';
    bg.setAttribute('aria-hidden', 'true');
    root.insertBefore(bg, root.firstChild);
    $('focusClose').addEventListener('click', () => F.close());
    $('focusPrev').addEventListener('click', () => F.step(-1));
    $('focusNext').addEventListener('click', () => F.step(1));
    backdrop.addEventListener('click', () => F.close());
    stage.addEventListener('click', (e) => { if (e.target === stage && window.innerWidth > 900) F.close(); });
    slot.addEventListener('click', (e) => interact(e));
    root.addEventListener('pointermove', (e) => { if (ctx) ctx.pointer = { x: e.clientX, y: e.clientY }; });
    card.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-go]');
      if (tab) {
        const t = card.querySelector('#' + tab.dataset.go);
        if (t) t.scrollIntoView({ behavior: FL.reduce ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      const add = e.target.closest('[data-add]');
      if (add) {
        F.close();
        FL.atelier.open({ add: add.dataset.add });
        return;
      }
      const chip = e.target.closest('[data-m]');
      if (chip) {
        F.close();
        // Desde el taller, el jardín queda tapado: se filtra la paleta del taller en vez del jardín.
        if (FL.atelier.isOpen()) FL.atelier.search(chip.dataset.m);
        else FL.explore.only('m', chip.dataset.m);
      }
    });
    root.addEventListener('keydown', trap);
  };

  function trap(e) {
    if (e.key !== 'Tab') return;
    const els = Array.from(root.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function fillCard(fl) {
    const c = fl.culture, s = fl.science;
    card.style.setProperty('--hue', fl.hue);
    card.innerHTML =
      '<header class="card-head">' +
        '<p class="eyebrow">' + fl.family + ' · ' + seasonText(fl.seasons) + '</p>' +
        '<h2 id="focusName">' + fl.name + '</h2>' +
        '<p class="sci">' + fl.sci + '</p>' +
        '<div class="card-tabs" role="group" aria-label="Ir a una lectura">' +
          '<button type="button" data-go="c-poe">Poética</button><button type="button" data-go="c-cul">Cultural</button><button type="button" data-go="c-sci">Científica</button><button type="button" data-go="c-care">Cuidados</button>' +
        '</div>' +
      '</header>' +
      '<section class="c-poe" id="c-poe"><p class="label">Significado poético</p><blockquote>' + fl.poetic + '</blockquote></section>' +
      '<section class="c-cul" id="c-cul"><p class="label">Significado cultural</p><p>' + c.symbol + '</p><p>' + c.history + '</p>' +
        (c.note ? '<p class="note">' + c.note + '</p>' : '') +
        '<div class="gift"><p class="mini">Al regalarla</p><p>' + c.gift + '</p></div></section>' +
      '<section class="c-sci" id="c-sci"><p class="label">Mirada científica</p><dl>' +
        '<div><dt>Nombre científico</dt><dd>' + fl.sci + '</dd></div>' +
        '<div><dt>Familia</dt><dd>' + fl.family + '</dd></div>' +
        '<div><dt>Origen</dt><dd>' + s.origin + '</dd></div>' +
        '<div><dt>Cómo crece</dt><dd>' + s.growth + '</dd></div>' +
        '<div><dt>Polinización</dt><dd>' + s.pollination + '</dd></div>' +
      '</dl><div class="curio"><p class="mini">Curiosidad</p><p>' + s.curiosity + '</p></div></section>' +
      FL.care.section(fl) +
      '<footer class="card-foot"><p class="mini">Buscar otras flores que hablan de</p><div class="chips">' +
        fl.meanings.map((m) => '<button type="button" class="chip" data-m="' + m + '">' + m + '</button>').join('') +
      '</div><button type="button" class="pillbtn" data-add="' + fl.id + '">Agregar a un ramo</button></footer>';
    card.scrollTop = 0;
  }

  function sizeSlot(aspect) {
    const sr = stage.getBoundingClientRect();
    const narrow = window.innerWidth < 900;
    const maxW = narrow ? Math.min(window.innerWidth * 0.78, 460) : Math.min(sr.width * 0.78, 580);
    const maxH = (narrow ? window.innerHeight * 0.48 : sr.height * 0.72);
    const w = Math.min(maxW, maxH / aspect);
    slot.style.width = w + 'px';
    slot.style.height = w * aspect + 'px';
  }

  function mount(fl) {
    const drawn = FL.drawHead(fl);
    sizeSlot(drawn.aspect);
    slot.className = 'stage-slot' + (fl.art === 'lotus' ? ' pond' : '');
    slot.innerHTML = '<div class="slot-in"><div class="slot-turn">' + drawn.svg + '</div>' +
      (fl.art === 'lotus' ? '<svg class="water" viewBox="-100 -12 200 24" aria-hidden="true"><ellipse rx="96" ry="9" class="w0"/><ellipse rx="40" ry="3.6" class="w1"/><ellipse rx="70" ry="6.2" class="w2"/></svg>' : '') + '</div>';
    hint.textContent = fl.hint || 'Toca la flor.';
    hint.classList.remove('whisper');
    root.style.setProperty('--hue', fl.hue);
    root.classList.toggle('dusk', fl.art === 'jasmine');
    const inner = slot.firstChild;
    return { fl, inner, turn: inner.firstChild, svg: inner.querySelector('.fh'), timers: [], acc: 0, rx: 0, ry: 0 };
  }

  F.open = function (fl, fromEl) {
    if (busy) return;
    if (!root.hidden) { swap(fl); return; }
    busy = true;
    lastFocus = document.activeElement;
    F.cur = fl;
    FL.explore.close(true);
    root.hidden = false;
    document.body.classList.add('focus-open');
    fillCard(fl);
    scroll.scrollTop = 0;
    ctx = mount(fl);
    const inner = ctx.inner;
    if (fromEl && !FL.reduce) {
      const to = slot.getBoundingClientRect(), from = fromEl.getBoundingClientRect();
      const s = from.width / to.width;
      const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2);
      inner.style.transition = 'none';
      inner.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
      inner.getBoundingClientRect();
      inner.style.transition = '';
      requestAnimationFrame(() => { inner.style.transform = ''; });
      FL.garden.setHidden(fl.id, true);
    }
    paintBackground();
    requestAnimationFrame(() => root.classList.add('on'));
    try { history.replaceState(null, '', '#' + fl.id); } catch (e) { /* sin historial */ }
    const c = ctx;
    c.timers.push(setTimeout(() => { bloom(c); busy = false; }, FL.reduce ? 30 : 950));
    setTimeout(() => $('focusClose').focus({ preventScroll: true }), 60);
  };

  // Sobre una hoja abierta (el taller) no hay jardín que pintar: ahí se desenfoca lo que haya detrás, con CSS.
  function paintBackground() {
    const overSheet = !!document.querySelector('.sheet:not([hidden])');
    root.classList.toggle('over-sheet', overSheet);
    if (!overSheet) FL.garden.impression(bg);
  }

  function bloom(c) {
    if (c !== ctx) return;
    const B = BEH[c.fl.art] || {};
    c.svg.classList.add('open');
    const r = slot.getBoundingClientRect();
    FL.burst(sys, r.left + r.width / 2, r.top + r.height / 2, [c.fl.pal.b || c.fl.hue, c.fl.pal.c || '#fff', c.fl.hue], 10, r.width * 0.5);
    if (B.enter) B.enter(c);
  }

  function leave(c) {
    if (!c) return;
    c.timers.forEach(clearTimeout);
    const B = BEH[c.fl.art] || {};
    if (B.leave) B.leave(c);
  }

  function swap(fl) {
    if (busy) return;
    busy = true;
    const old = ctx;
    leave(old);
    FL.garden.setHidden(old.fl.id, false);
    old.inner.classList.add('leaving');
    card.classList.add('fading');
    setTimeout(() => {
      F.cur = fl;
      fillCard(fl);
      card.classList.remove('fading');
      scroll.scrollTop = 0;
      ctx = mount(fl);
      ctx.inner.classList.add('entering');
      FL.garden.setHidden(fl.id, true);
      paintBackground();
      requestAnimationFrame(() => requestAnimationFrame(() => ctx.inner.classList.remove('entering')));
      try { history.replaceState(null, '', '#' + fl.id); } catch (e) { /* sin historial */ }
      const c = ctx;
      c.timers.push(setTimeout(() => { bloom(c); busy = false; }, FL.reduce ? 30 : 650));
    }, FL.reduce ? 20 : 420);
  }

  F.step = function (d) {
    if (!F.cur) return;
    const L = FL.flowers, i = L.indexOf(F.cur);
    swap(L[(i + d + L.length) % L.length]);
  };

  F.close = function () {
    if (root.hidden || busy) return;
    busy = true;
    const c = ctx, fl = c.fl;
    leave(c);
    // Con una hoja abierta encima del jardín, la flor no vuela de vuelta a su lugar: se desvanece.
    const target = document.querySelector('.sheet:not([hidden])') ? null : FL.garden.headOf(fl.id);
    root.classList.remove('on');
    c.svg.classList.remove('open', 'acid', 'alk', 'gust');
    if (target && !FL.reduce) {
      const to = target.getBoundingClientRect(), from = slot.getBoundingClientRect();
      const s = to.width / from.width;
      const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
      c.inner.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
    }
    setTimeout(() => {
      root.hidden = true;
      root.classList.remove('dusk');
      slot.innerHTML = '';
      sys.clear();
      FL.garden.setHidden(fl.id, false);
      document.body.classList.remove('focus-open');
      ctx = null; F.cur = null; busy = false;
      // Solo se borra el enlace de esta flor: si otra vista ya puso el suyo (#armar, #ramo=…), se respeta.
      if (location.hash === '#' + fl.id) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ } }
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, FL.reduce ? 20 : 950);
  };

  F.isOpen = () => !root.hidden;

  function interact(e) {
    if (!ctx || busy) return;
    const B = BEH[ctx.fl.art] || {};
    if (B.click) B.click(ctx, e);
    else rebloom(ctx);
  }

  // Vuelve a su estado de reposo con rapidez y se abre otra vez.
  function rebloom(c) {
    c.svg.classList.add('quick');
    c.svg.classList.remove('open');
    c.timers.push(setTimeout(() => {
      c.svg.classList.remove('quick');
      c.svg.getBoundingClientRect();
      c.svg.classList.add('open');
      const r = slot.getBoundingClientRect();
      FL.burst(sys, r.left + r.width / 2, r.top + r.height / 2, [c.fl.pal.b || c.fl.hue, c.fl.pal.c || '#fff'], 6, r.width * 0.4);
    }, 650));
  }

  const rect = () => slot.getBoundingClientRect();
  const mote = (col, x, y, rise) => sys.add({ type: 'mote', x, y, vx: 0, vy: rise, rise, s: 0.6 + Math.random() * 0.8, life: 3 + Math.random() * 3, col, drag: 1 });

  // Comportamientos propios de cada especie en primer plano.
  const BEH = {
    sunflower: {
      tick(c, dt) {
        const r = rect();
        let ry = 12, rx = 8;
        if (c.pointer) {
          ry = U.clamp((c.pointer.x - (r.left + r.width / 2)) / (r.width * 0.9), -1, 1) * 32;
          rx = U.clamp(-(c.pointer.y - (r.top + r.height / 2)) / (r.height * 0.9), -1, 1) * 22;
        }
        c.ry += (ry - c.ry) * Math.min(1, dt * 1.8);
        c.rx += (rx - c.rx) * Math.min(1, dt * 1.8);
        c.turn.style.transform = 'perspective(900px) rotateX(' + c.rx.toFixed(2) + 'deg) rotateY(' + c.ry.toFixed(2) + 'deg)';
        if (c.pointer) backdrop.style.setProperty('--lx', c.pointer.x + 'px'), backdrop.style.setProperty('--ly', c.pointer.y + 'px');
      },
      leave() { backdrop.style.removeProperty('--lx'); backdrop.style.removeProperty('--ly'); }
    },
    daisy: {
      enter(c) { c.loves = false; },
      click(c) {
        const left = Array.from(c.svg.querySelectorAll('.pt.df:not(.plucked), .pt.db:not(.plucked)'));
        if (!left.length) return;
        const front = left.filter((p) => p.classList.contains('df'));
        const pool = front.length ? front : left;
        const pt = pool[(Math.random() * pool.length) | 0];
        const a = U.rad(-parseFloat(pt.style.getPropertyValue('--a')) || 0);
        const sx = (Math.random() - 0.5) * 50, sy = 80;
        pt.style.setProperty('--fx', (sx * Math.cos(a) - sy * Math.sin(a)).toFixed(1) + 'px');
        pt.style.setProperty('--fy', (sx * Math.sin(a) + sy * Math.cos(a)).toFixed(1) + 'px');
        pt.style.setProperty('--fr', ((Math.random() - 0.5) * 140).toFixed(0) + 'deg');
        pt.classList.add('plucked');
        c.loves = !c.loves;
        const last = left.length === 1;
        hint.textContent = last ? (c.loves ? '…me quiere.' : '…no me quiere. Mejor pedir otra margarita.') : c.loves ? 'me quiere…' : 'no me quiere…';
        hint.classList.add('whisper');
        if (last) c.timers.push(setTimeout(() => {
          c.svg.querySelectorAll('.plucked').forEach((p) => p.classList.remove('plucked'));
          hint.textContent = c.fl.hint; hint.classList.remove('whisper');
        }, 3800));
      }
    },
    hydrangea: {
      enter(c) { c.timers.push(setTimeout(() => BEH.hydrangea.click(c), 1300)); },
      click(c) {
        c.acid = !c.acid;
        c.svg.classList.toggle('acid', c.acid);
        c.svg.classList.toggle('alk', !c.acid);
        hint.textContent = c.acid ? 'Suelo ácido: el aluminio las vuelve azules.' : 'Suelo alcalino: las flores se vuelven rosadas.';
        hint.classList.add('whisper');
      }
    },
    dandelion: {
      click(c, e) {
        const left = FL.releaseSeeds(c.svg, sys, 16, { x: e.clientX - 40, y: e.clientY + 10 });
        hint.textContent = left > 0 ? 'Otro soplo…' : 'Que se cumpla.';
        hint.classList.add('whisper');
      }
    },
    cherry: {
      tick(c, dt) {
        if (FL.reduce) return;
        c.acc += dt;
        if (c.acc > 0.55) {
          c.acc = 0;
          const r = rect();
          sys.add({
            type: 'petal', x: r.left + r.width * (0.15 + Math.random() * 0.7), y: r.top + r.height * (0.15 + Math.random() * 0.5),
            vx: 6, vy: 4, vr: (Math.random() - 0.5) * 2, s: 1.3 + Math.random() * 0.8, life: 12, col: c.fl.pal.b, col2: c.fl.pal.c, wind: 12, fall: 20
          });
        }
      }
    },
    lavender: {
      click(c) {
        c.svg.classList.add('gust');
        c.timers.push(setTimeout(() => c.svg.classList.remove('gust'), 3200));
        const r = rect();
        for (let i = 0; i < 14; i++) mote('#a58fdc', r.left + r.width * (0.3 + Math.random() * 0.4), r.top + r.height * (0.1 + Math.random() * 0.4), -20);
      },
      tick(c, dt) {
        if (FL.reduce) return;
        c.acc += dt;
        if (c.acc > 0.3) { c.acc = 0; const r = rect(); mote('#b7a4e8', r.left + r.width * (0.3 + Math.random() * 0.4), r.top + r.height * (0.12 + Math.random() * 0.4), -12); }
      }
    },
    jasmine: {
      tick(c, dt) {
        if (FL.reduce) return;
        c.acc += dt;
        if (c.acc > 0.4) { c.acc = 0; const r = rect(); mote('#fffbe8', r.left + r.width * (0.2 + Math.random() * 0.6), r.top + r.height * (0.2 + Math.random() * 0.5), -10); }
      }
    },
    gardenia: {
      tick(c, dt) {
        if (FL.reduce) return;
        c.acc += dt;
        if (c.acc > 0.5) { c.acc = 0; const r = rect(); mote('#efe6c4', r.left + r.width * (0.3 + Math.random() * 0.4), r.top + r.height * (0.3 + Math.random() * 0.4), -9); }
      }
    }
  };

  F.tick = function (dt, T) {
    if (root.hidden) return;
    sys.step(dt, T);
    if (ctx) {
      const B = BEH[ctx.fl.art];
      if (B && B.tick) B.tick(ctx, dt);
    }
  };

  F.resize = function () {
    sys.resize();
    if (!root.hidden) paintBackground();
    if (ctx) sizeSlot(ctx.svg.viewBox.baseVal.height / ctx.svg.viewBox.baseVal.width);
  };
})();
