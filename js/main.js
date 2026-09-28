/* Florilegio — arranque, bucle de animación, teclado y enlaces directos */
(function () {
  'use strict';
  const FL = window.FL;

  // #girasol abre esa flor; #esos-dias, la sección especial; #armar, el taller;
  // #ramos, el mostrador; #ramo=… un ramo compartido.
  function route() {
    const raw = location.hash.slice(1);
    if (!raw) return;
    if (raw.startsWith('ramo=')) { FL.gift.openCode(raw.slice(5)); return; }
    const h = decodeURIComponent(raw);
    if (h === 'esos-dias') { FL.days.open(); return; }
    if (h === 'armar') { FL.atelier.open(); return; }
    if (h === 'ramos') { FL.showcase.open(); return; }
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
    FL.garden.build();
    FL.garden.ambient = new FL.Particles(document.getElementById('ambient'));
    FL.focus.init();
    FL.explore.init();
    FL.days.init();
    FL.atelier.init();
    FL.showcase.init();
    FL.gift.init();
    FL.ai.check();

    window.addEventListener('pointermove', FL.garden.onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', FL.garden.onLeave);
    window.addEventListener('blur', FL.garden.onLeave);
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { FL.garden.resize(); FL.focus.resize(); FL.days.resize(); FL.gift.resize(); }, 220);
    });
    window.addEventListener('scroll', () => FL.garden.measure(), { passive: true });
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (FL.days.isOpen()) FL.days.close();
        else if (FL.gift.isOpen()) FL.gift.close();
        else if (FL.focus.isOpen()) FL.focus.close();
        else if (FL.atelier.isOpen()) FL.atelier.close();
        else if (FL.showcase.isOpen()) FL.showcase.close();
        else if (FL.explore.isOpen()) FL.explore.close();
      } else if (FL.focus.isOpen() && !e.target.closest('input, textarea, select')) {
        if (e.key === 'ArrowRight') FL.focus.step(1);
        if (e.key === 'ArrowLeft') FL.focus.step(-1);
      }
    });

    document.body.classList.add('ready');
    setTimeout(route, 300);

    let last = performance.now(), T = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      T += dt;
      const b = document.body.classList;
      if (!b.contains('focus-open') && !b.contains('days-open') && !b.contains('sheet-open')) {
        FL.garden.tick(dt, T);
        FL.garden.ambient.step(dt, T);
      }
      FL.focus.tick(dt, T);
      FL.days.tick(dt, T);
      FL.gift.tick(dt, T);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
