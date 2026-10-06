/* Florilegio — arranque, bucle de animación, teclado y enlaces directos */
(function () {
  'use strict';
  const FL = window.FL;

  // #girasol abre esa flor; #esos-dias, la sección especial; #armar, el taller;
  // #mis-ramos, los ramos guardados; #ramos, el mostrador; #fechas, el calendario; #ramo=… un ramo compartido.
  function route() {
    const raw = location.hash.slice(1);
    if (!raw) return;
    if (raw.startsWith('ramo=')) { FL.gift.openCode(raw.slice(5)); return; }
    const h = decodeURIComponent(raw);
    if (h === 'esos-dias') { FL.days.open(); return; }
    if (h === 'armar') { FL.atelier.open(); return; }
    if (h === 'mis-ramos') { FL.atelier.open({ mine: true }); return; }
    if (h === 'ramos') { FL.showcase.open(); return; }
    if (h === 'fechas') { FL.calendar.open(); return; }
    const fl = FL.byId(h);
    if (fl && (!FL.focus.cur || FL.focus.cur.id !== h)) {
      const head = FL.garden.headOf(h);
      if (head) head.scrollIntoView({ block: 'center' });
      FL.focus.open(fl, head);
    }
  }

  function init() {
    const count = document.getElementById('flowerCount');
    if (count) { const w = FL.countWords(FL.flowers.length); count.textContent = w.charAt(0).toUpperCase() + w.slice(1); }
    FL.garden.ambient = FL.Ambient(document.getElementById('ambient'));
    FL.focus.init();
    FL.explore.init();
    FL.days.init();
    FL.calendar.init();
    FL.atelier.init();
    FL.showcase.init();
    FL.gift.init();
    const foot = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    foot('footMine', () => FL.atelier.open({ mine: true }));

    const G = FL.garden;
    window.addEventListener('pointermove', (e) => { G.onPointer(e); if (G.mouse.active) FL.wake(); }, { passive: true });
    const leave = () => { G.onLeave(); FL.wake(); };
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { G.resize(); FL.focus.resize(); FL.days.resize(); FL.gift.resize(); FL.wake(); }, 220);
    });
    /*
     * Al desplazar solo hace falta un cuadro si el cursor está sobre el jardín o si el parallax lo calcula el bucle.
     * Mientras dura el scroll, el vaivén de las flores se pausa: cada cuadro del scroll recalculaba sus ~60 animaciones.
     */
    let st = 0;
    const settled = () => { st = 0; document.body.classList.remove('scrolling'); };
    window.addEventListener('scroll', () => {
      G.onScroll();
      if (G.mouse.active || G.plxJS) FL.wake();
      if (!st) document.body.classList.add('scrolling');
      clearTimeout(st);
      st = setTimeout(settled, 160);
    }, { passive: true });
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (FL.days.isOpen()) FL.days.close();
        else if (FL.gift.isOpen()) FL.gift.close();
        else if (FL.focus.isOpen()) FL.focus.close();
        else if (FL.atelier.isOpen()) FL.atelier.close();
        else if (FL.calendar.isOpen()) FL.calendar.close();
        else if (FL.showcase.isOpen()) FL.showcase.close();
        else if (FL.explore.isOpen()) FL.explore.close();
      } else if (FL.focus.isOpen() && !e.target.closest('input, textarea, select')) {
        if (e.key === 'ArrowRight') FL.focus.step(1);
        if (e.key === 'ArrowLeft') FL.focus.step(-1);
      }
    });

    document.body.classList.add('ready');
    // El jardín se arma tras el primer cuadro: el título y la navegación se pintan sin esperar a dibujar 31 flores.
    requestAnimationFrame(() => setTimeout(() => {
      G.build();
      FL.wake();
      setTimeout(route, 300);
    }, 0));

    /*
     * Bucle de animación a demanda: corre mientras el cursor mueve el jardín, hay una vista abierta con sus
     * partículas o la deriva de fondo se pinta aquí (sin worker). En reposo no pide cuadros: cada cuadro pedido
     * obligaba a recalcular los estilos de las ~60 animaciones del jardín, y en celulares eso copaba el hilo principal.
     */
    let raf = 0, last = 0, T = 0;
    const covered = () => { const b = document.body.classList; return b.contains('focus-open') || b.contains('days-open') || b.contains('sheet-open'); };
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      T += dt;
      let more = false;
      if (!covered()) {
        if (G.tick(dt, T)) more = true;
        if (G.ambient.step(dt, T)) more = true;
      }
      FL.focus.tick(dt, T);
      FL.days.tick(dt, T);
      FL.gift.tick(dt, T);
      if (FL.focus.isOpen() || FL.days.isOpen() || FL.gift.isOpen()) more = true;
      raf = more ? requestAnimationFrame(loop) : 0;
    };
    FL.wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    // Abrir o cerrar una vista cambia las clases del cuerpo: la deriva se pausa debajo y el bucle despierta.
    const sync = () => { G.ambient.run(!covered() && !document.hidden); FL.wake(); };
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
