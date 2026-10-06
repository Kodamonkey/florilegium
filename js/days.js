/* Florilegio — «Esos días que no hubo»: los ramos que no se dieron a tiempo, y el amor que sí hubo */
(function () {
  'use strict';
  const FL = window.FL;
  const D = (FL.days = {});
  const $ = (id) => document.getElementById(id);

  // Rosa blanca: la de las despedidas y la de los comienzos. El corazón queda tibio, como una vela.
  const FLOWER = {
    id: 'esos-dias', name: 'Rosa blanca', art: 'rose',
    pal: { a: '#c4b593', b: '#efe8d8', c: '#fffcf4', e: '#958863', g: '#55703f' }
  };
  // El relato, en cuatro capítulos y un cierre. La disculpa, la dedicatoria y la firma cierran la página en index.html.
  // Clases: «chapter» (número y título), «prose» (letra de carta), «quote» (una frase sola) y '' (línea grande).
  // La tumba del monte Carmelo: entierros natufios de la cueva de Raqefet, de hace 13.700 a 11.700 años,
  // con salvia y flores bajo los cuerpos (Nadel et al., PNAS, 2013).
  const LINES = [
    ['<span>I</span>Lo que queda en la mano', 'chapter'],
    ['Casi todo, al final, es aprender a dejar ir. Y casi siempre, en ese acto, queda un ramo de flores que no se dio.', ''],
    ['A veces es el amor que no entregamos a tiempo: el abrazo que guardamos para después, el te quiero que nos dio pudor decir, la visita que siempre podía ser la otra semana. Uno cree que habrá otra semana. Casi nunca la hay.', 'prose'],
    ['Otras veces son flores de verdad. Las que le llevamos a la abuela cuando ya no puede verlas, compradas a la carrera en la entrada del cementerio, y que dejamos sobre el cajón como una carta que llega a una casa vacía. Nunca le llevamos tantas como ese día.', 'prose'],
    ['<span>II</span>Las dos orillas', 'chapter'],
    ['Duele de los dos lados. Duele en quien tuvo las flores en la mano y no las dio, por orgullo, por timidez, por creer que no hacía falta. Y duele en quien las esperó sin decirlo, mirando la puerta en un cumpleaños, hasta que aprendió a decir que no le importaban.', 'prose'],
    ['Es el mismo ramo, visto desde las dos orillas de un mismo silencio.', 'quote'],
    ['<span>III</span>La foto y la tumba', 'chapter'],
    ['Hoy muchas flores se regalan para la foto. Las flores amarillas de cada 21 de septiembre, que una canción y miles de videos volvieron costumbre; los ramos cada vez más grandes, pensados para caber en una historia que dura veinticuatro horas. Un ramo vive una semana en el florero y un día en la pantalla, y a veces pesa más el día.', 'prose'],
    ['No lo digo con desprecio: publicar también es una forma de decir aquí estoy, te elegí. Pero el gesto es mucho más antiguo que cualquier pantalla. Hace unos trece mil años, en una cueva del monte Carmelo, alguien tendió salvia y flores bajo el cuerpo de los suyos antes de cubrirlos de tierra. Nadie iba a verlo. Nadie lo iba a contar.', 'prose'],
    ['No sabemos qué pensaba. Sabemos lo que hizo.', 'quote'],
    ['<span>IV</span>Lo que no se explica', 'chapter'],
    ['Durante mucho tiempo quise entenderlo todo. Le pedía a cada cosa una explicación antes de permitirme sentirla, y mientras esperaba esa respuesta se me fueron quedando ramos en la mano. Con los años dejé de buscarle un sentido a lo que hago y empecé a dárselo yo. Creo en quienes creo, y hoy eso vale más para mí que cualquier teoría sobre por qué nos regalamos flores.', 'prose'],
    ['Yo solo tenía que dárselas, porque a ella la hacían feliz. Y eso bastaba: era sentido suficiente para sostener el vacío de una existencia que no pide explicaciones, solo pasa.', 'prose'],
    ['Desde hoy quiero vivir más ahí. Voy a seguir mi propósito, pero ya no como una competencia contra un yo invisible, sino como un camino hacia lo único que de verdad deseo: hacer felices a quienes amo.', 'prose'],
    ['Así que no voy a explicar más las flores. Las voy a dar: sin foto y sin motivo, antes del cajón, antes del después, mientras todavía puedan verlas.', '']
  ];

  let root, btn, hint, text, fin, sys, opened = false, timers = [], lastFocus = null, glowT = 0, own = false, io = null;

  D.init = function () {
    root = $('days'); btn = $('daysFlower'); hint = $('daysHint'); text = $('daysText'); fin = $('daysFinal');
    sys = new FL.Particles($('daysFx'));
    $('daysBtn').addEventListener('click', () => D.open());
    $('daysBack').addEventListener('click', () => D.close());
    btn.addEventListener('click', bloom);
    // Quien baja por su cuenta lee a su ritmo: la página deja de bajar sola y cada párrafo aparece al llegar a él.
    root.addEventListener('wheel', takeOver, { passive: true });
    root.addEventListener('touchmove', takeOver, { passive: true });
    root.addEventListener('keydown', (e) => { if (['ArrowDown', 'PageDown', 'End', ' '].includes(e.key)) takeOver(); });
  };

  function show(el) {
    el.classList.add('show');
    if (el === fin) root.classList.add('done');
  }

  function takeOver() {
    if (!opened || own) return;
    own = true;
    if (!('IntersectionObserver' in window)) return;
    io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }), { root, threshold: 0.2 });
    text.querySelectorAll('p:not(.show)').forEach((p) => io.observe(p));
    if (!fin.classList.contains('show')) io.observe(fin);
  }

  function later(fn, ms) { timers.push(setTimeout(fn, FL.reduce ? Math.min(ms, 60) : ms)); }

  D.open = function () {
    if (!root.hidden) return;
    if (FL.focus.isOpen()) FL.focus.close();
    FL.explore.close(true);
    if (FL.calendar && FL.calendar.isOpen()) FL.calendar.close(true);
    lastFocus = document.activeElement;
    opened = false; own = false;
    if (io) { io.disconnect(); io = null; }
    timers.forEach(clearTimeout); timers = [];
    btn.innerHTML = FL.drawHead(FLOWER, { special: true, cls: 'closed slow' }).svg;
    btn.setAttribute('aria-label', 'Abrir la rosa blanca');
    text.innerHTML = LINES.map(([t, cls]) => '<p class="' + cls + '">' + t + '</p>').join('');
    root.classList.remove('bloomed', 'on', 'done');
    root.hidden = false;
    root.scrollTop = 0;
    document.body.classList.add('days-open');
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
    later(() => { if (!opened) hint.classList.add('show'); }, 2200);
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
    btn.setAttribute('aria-label', 'Rosa blanca abierta');
    hint.classList.remove('show');
    svg.classList.remove('closed');
    svg.classList.add('open');
    root.classList.add('bloomed');
    warm(14);
    later(() => warm(10), 2600);
    const ps = text.querySelectorAll('p');
    const reveal = (el) => {
      show(el);
      if (own) return;
      const r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 90) root.scrollBy({ top: r.bottom - window.innerHeight + 130, behavior: FL.reduce ? 'auto' : 'smooth' });
    };
    // Cada párrafo espera a que el anterior alcance a leerse: más texto, más pausa; un título de capítulo, un respiro.
    let t = 4600;
    ps.forEach((p) => {
      later(() => reveal(p), t);
      t += p.classList.contains('chapter') ? 1400 : Math.min(9000, Math.max(2200, p.textContent.length * 42));
    });
    later(() => reveal(fin), t + 600);
  }

  function warm(n) {
    if (FL.reduce) return;
    const r = btn.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = r.width * (0.15 + Math.random() * 0.3);
      sys.add({ type: 'mote', x: r.left + r.width / 2 + Math.cos(a) * d, y: r.top + r.height / 2 + Math.sin(a) * d, vx: 0, vy: -8, rise: -8 - Math.random() * 8, s: 0.7 + Math.random() * 1.1, life: 4 + Math.random() * 3, col: '#f4dfb0', drag: 0.8 });
    }
  }

  D.close = function (instant) {
    if (root.hidden) return;
    root.classList.remove('on');
    timers.forEach(clearTimeout); timers = [];
    if (io) { io.disconnect(); io = null; }
    setTimeout(() => {
      root.hidden = true;
      document.body.classList.remove('days-open');
      hint.classList.remove('show');
      fin.classList.remove('show');
      sys.clear();
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ }
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, instant || FL.reduce ? 20 : 1100);
  };

  D.isOpen = () => !root.hidden;

  D.tick = function (dt, T) {
    if (root.hidden) return;
    sys.step(dt, T);
    // Muy de vez en cuando, una mota de luz: el espacio queda casi vacío.
    glowT -= dt;
    if (!FL.reduce && glowT <= 0 && sys.count('pollen') < 7) {
      glowT = 1.4 + Math.random() * 2;
      sys.add({ type: 'pollen', x: Math.random() * sys.w, y: sys.h * (0.2 + Math.random() * 0.7), s: 0.6 + Math.random() * 0.8, life: 12, fin: 3, col: '#ecd6a4', a: 0.7 });
    }
  };

  D.resize = () => sys.resize();
})();
