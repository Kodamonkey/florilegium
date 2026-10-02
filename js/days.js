/* Florilegio — «Esos días que no hubo»: una sola flor amarilla, para quien esperó algo que nunca llegó */
(function () {
  'use strict';
  const FL = window.FL;
  const D = (FL.days = {});
  const $ = (id) => document.getElementById(id);

  const FLOWER = {
    id: 'esos-dias', name: 'Rosa amarilla', art: 'rose',
    pal: { a: '#b86a06', b: '#f1af1d', c: '#ffe894', e: '#99590a', g: '#4f6b3a' }
  };
  // Para quien esperó algo que nunca llegó. La dedicatoria (Rilke) cierra la página en index.html.
  const LINES = [
    ['Esta flor es para quien alguna vez esperó algo que nunca llegó.', ''],
    ['Un ramo en una fecha que importaba. Una llamada, una respuesta, una puerta que no se abrió.', ''],
    ['Para lo que se desea y no se tiene. Para lo que se anhela aun sabiendo que quizá no llegue nunca.', ''],
    ['Si ese vacío te acompaña, no lo escondas: solo echa de menos quien sabe querer.', ''],
    ['No desesperes. Lo que no llegó no le quita nada a lo que eres. Todo saldrá bien.', ''],
    ['Se cuenta que Rainer Maria Rilke, en París, pasaba a diario junto a una mujer que pedía limosna y nunca le daba nada. «Habría que darle algo a su corazón, no a su mano», explicó. Un día le dejó una rosa recién abierta. Ella le besó la mano, se fue y no volvió en una semana. Cuando le preguntaron de qué había vivido esos días, respondió: «De la rosa».', 'aside'],
    ['Esta no llega por una fecha especial. Llega justo a tiempo.', '']
  ];

  let root, btn, hint, text, fin, sys, opened = false, timers = [], lastFocus = null, glowT = 0;

  D.init = function () {
    root = $('days'); btn = $('daysFlower'); hint = $('daysHint'); text = $('daysText'); fin = $('daysFinal');
    sys = new FL.Particles($('daysFx'));
    $('daysBtn').addEventListener('click', () => D.open());
    $('daysBack').addEventListener('click', () => D.close());
    btn.addEventListener('click', bloom);
  };

  function later(fn, ms) { timers.push(setTimeout(fn, FL.reduce ? Math.min(ms, 60) : ms)); }

  D.open = function () {
    if (!root.hidden) return;
    if (FL.focus.isOpen()) FL.focus.close();
    FL.explore.close(true);
    lastFocus = document.activeElement;
    opened = false;
    timers.forEach(clearTimeout); timers = [];
    btn.innerHTML = FL.drawHead(FLOWER, { special: true, cls: 'closed slow' }).svg;
    btn.setAttribute('aria-label', 'Abrir la flor amarilla');
    text.innerHTML = LINES.map(([t, cls]) => '<p class="' + cls + '">' + t + '</p>').join('');
    root.classList.remove('bloomed', 'on', 'done');
    root.hidden = false;
    root.scrollTop = 0;
    document.body.classList.add('days-open');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
    later(() => hint.classList.add('show'), 2200);
    try { history.replaceState(null, '', '#esos-dias'); } catch (e) { /* sin historial */ }
    setTimeout(() => root.focus({ preventScroll: true }), 400);
  };

  function bloom() {
    const svg = btn.querySelector('.fh');
    if (!svg) return;
    if (opened) {
      // Una vez abierta, tocarla solo la hace brillar un poco.
      root.classList.remove('pulse'); void root.offsetWidth; root.classList.add('pulse');
      warm(8);
      return;
    }
    opened = true;
    btn.setAttribute('aria-label', 'Rosa amarilla abierta');
    hint.classList.remove('show');
    svg.classList.remove('closed');
    svg.classList.add('open');
    root.classList.add('bloomed');
    warm(14);
    later(() => warm(10), 2600);
    const ps = text.querySelectorAll('p');
    const reveal = (el) => {
      el.classList.add('show');
      const r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 90) root.scrollBy({ top: r.bottom - window.innerHeight + 130, behavior: FL.reduce ? 'auto' : 'smooth' });
    };
    ps.forEach((p, i) => later(() => reveal(p), 4600 + i * 1900));
    later(() => { reveal(fin); root.classList.add('done'); }, 4600 + ps.length * 1900 + 1800);
  }

  function warm(n) {
    if (FL.reduce) return;
    const r = btn.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = r.width * (0.15 + Math.random() * 0.3);
      sys.add({ type: 'mote', x: r.left + r.width / 2 + Math.cos(a) * d, y: r.top + r.height / 2 + Math.sin(a) * d, vx: 0, vy: -8, rise: -8 - Math.random() * 8, s: 0.7 + Math.random() * 1.1, life: 4 + Math.random() * 3, col: '#f6cf62', drag: 0.8 });
    }
  }

  D.close = function () {
    if (root.hidden) return;
    root.classList.remove('on');
    timers.forEach(clearTimeout); timers = [];
    setTimeout(() => {
      root.hidden = true;
      document.body.classList.remove('days-open');
      hint.classList.remove('show');
      fin.classList.remove('show');
      sys.clear();
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ }
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, FL.reduce ? 20 : 1100);
  };

  D.isOpen = () => !root.hidden;

  D.tick = function (dt, T) {
    if (root.hidden) return;
    sys.step(dt, T);
    // Muy de vez en cuando, una mota de luz: el espacio queda casi vacío.
    glowT -= dt;
    if (!FL.reduce && glowT <= 0 && sys.count('pollen') < 7) {
      glowT = 1.4 + Math.random() * 2;
      sys.add({ type: 'pollen', x: Math.random() * sys.w, y: sys.h * (0.2 + Math.random() * 0.7), s: 0.6 + Math.random() * 0.8, life: 12, fin: 3, col: '#efc45a', a: 0.7 });
    }
  };

  D.resize = () => sys.resize();
})();
