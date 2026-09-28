/* Florilegio — arranque, bucle de animación, teclado y enlaces directos */
(function () {
  'use strict';
  const FL = window.FL;

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    if (h === 'esos-dias') { FL.days.open(); return; }
    const fl = FL.byId(h);
    if (fl && (!FL.focus.cur || FL.focus.cur.id !== h)) {
      const head = FL.garden.headOf(h);
      if (head) head.scrollIntoView({ block: 'center' });
      FL.focus.open(fl, head);
    }
  }

  function init() {
    FL.garden.build();
    FL.garden.ambient = new FL.Particles(document.getElementById('ambient'));
    FL.focus.init();
    FL.explore.init();
    FL.days.init();

    window.addEventListener('pointermove', FL.garden.onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', FL.garden.onLeave);
    window.addEventListener('blur', FL.garden.onLeave);
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { FL.garden.resize(); FL.focus.resize(); FL.days.resize(); }, 220);
    });
    window.addEventListener('scroll', () => FL.garden.measure(), { passive: true });
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (FL.days.isOpen()) FL.days.close();
        else if (FL.focus.isOpen()) FL.focus.close();
        else if (FL.explore.isOpen()) FL.explore.close();
      } else if (FL.focus.isOpen() && !e.target.closest('input')) {
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
      if (!b.contains('focus-open') && !b.contains('days-open')) {
        FL.garden.tick(dt, T);
        FL.garden.ambient.step(dt, T);
      }
      FL.focus.tick(dt, T);
      FL.days.tick(dt, T);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
