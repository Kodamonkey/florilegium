/* Florilegio — mostrador: ramos tradicionales de Occidente por temporada y por temática,
   con la temporada calculada según el hemisferio y las próximas fechas del calendario. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const S = (FL.showcase = {});
  const $ = (id) => document.getElementById(id);
  const SEASONS = ['primavera', 'verano', 'otoño', 'invierno'];
  let root, season = 'ahora', theme = '', query = '', lastFocus = null, io = null, hay = null;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  S.init = function () {
    root = $('showcase');
    $('showcaseBtn').addEventListener('click', () => S.open());
    root.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const d = t.dataset;
      if (d.custom) {
        const p = FL.popular.find((x) => x.id === d.custom);
        S.close(true);
        FL.atelier.open({ bouquet: { stems: p.stems, wrap: p.wrap, ribbon: p.ribbon, occasion: p.occasions[0], layoutSeed: p.layoutSeed, name: p.name } });
        return;
      }
      if (d.allSeasons != null) { season = ''; paint(); return; }
      if (t.id === 'scClose') S.close();
    });
    // Tres filtros, tres desplegables: cambiar uno vuelve a pintar la lista sin mover el foco.
    $('scTheme').addEventListener('change', (e) => { theme = e.target.value; paint(); });
    $('scSeason').addEventListener('change', (e) => { season = e.target.value; paint(); });
    $('scHemi').addEventListener('change', (e) => { FL.setHemisphere(e.target.value); paint(); });
    $('scSearch').addEventListener('input', (e) => { query = e.target.value; paint(); });
    // «/» lleva al buscador desde cualquier parte del mostrador.
    root.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.target.closest('input, textarea, select')) { e.preventDefault(); $('scSearch').focus(); }
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const els = U.withNearby(Array.from(root.querySelectorAll('button, [href], select')).filter((x) => x.offsetParent !== null));
      if (!els.length) return;
      if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
    });
  };

  S.open = function (opts) {
    if (opts && opts.theme != null) theme = opts.theme;
    if (FL.focus.isOpen()) FL.focus.close();
    FL.explore.close(true);
    if (FL.calendar && FL.calendar.isOpen()) FL.calendar.close(true);
    // Una sola hoja a la vez: si el taller estaba abierto (por ejemplo, al llegar con #ramos), se cierra.
    if (FL.atelier.isOpen()) FL.atelier.close(true);
    lastFocus = document.activeElement;
    root.hidden = false;
    U.syncSheets();
    render();
    requestAnimationFrame(() => root.classList.add('on'));
    try { history.replaceState(null, '', '#ramos'); } catch (e) { /* sin historial */ }
    setTimeout(() => $('scClose').focus({ preventScroll: true }), 60);
  };

  S.close = function (instant) {
    if (root.hidden) return;
    root.classList.remove('on');
    const done = () => {
      root.hidden = true;
      if (io) io.disconnect();
      U.syncSheets();
      if (location.hash === '#ramos') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ } }
      if (!instant) U.refocus(lastFocus, $('showcaseBtn'));
    };
    if (instant || FL.reduce) done(); else setTimeout(done, 380);
  };
  S.isOpen = () => root && !root.hidden;

  // Lo que se puede buscar de cada ramo: nombre, historia, ocasiones (con sus otras formas de decirlas) y flores.
  function haystack(p) {
    if (!hay) hay = {};
    if (!hay[p.id]) {
      const occ = p.occasions.map(FL.occasion).filter(Boolean);
      hay[p.id] = U.norm([p.name, p.story].concat(occ.map((o) => o.name), occ.flatMap((o) => o.words || []),
        p.stems.map((s) => (FL.item(s.item) || {}).name || ''), p.seasons).join(' '));
    }
    return hay[p.id];
  }
  const matches = (p, q) => U.matches(haystack(p), q);

  // Ramos visibles con los filtros actuales; los de temporada primero.
  S.filter = function (opts) {
    const hemi = opts.hemisphere || FL.hemisphere();
    const now = FL.seasonOf(opts.date || new Date(), hemi);
    const want = opts.season === 'ahora' ? now : opts.season;
    return FL.popular.filter((p) => {
      if (opts.query && !matches(p, opts.query)) return false;
      if (opts.theme && !p.occasions.includes(opts.theme)) return false;
      if (want === 'todo') return !p.seasons.length;
      if (want) return !p.seasons.length || p.seasons.includes(want);
      return true;
    }).sort((a, b) => (b.seasons.includes(now) ? 1 : 0) - (a.seasons.includes(now) ? 1 : 0));
  };

  function render() { paint(); }

  function paint() {
    const hemi = FL.hemisphere(), now = FL.seasonOf(new Date(), hemi);
    const opt = (v, label, on) => '<option value="' + v + '"' + (on ? ' selected' : '') + '>' + label + '</option>';
    const used = new Set(FL.popular.flatMap((p) => p.occasions));
    $('scTheme').innerHTML = opt('', 'Cualquiera', !theme) +
      FL.taxonomy.occasions.filter((o) => used.has(o.id)).map((o) => opt(o.id, o.name, theme === o.id)).join('');
    $('scSeason').innerHTML = opt('ahora', 'Ahora (' + now + ')', season === 'ahora') + opt('', 'Todas', season === '') +
      SEASONS.map((s) => opt(s, cap(s), season === s)).join('');
    $('scHemi').innerHTML = opt('S', 'Sur', hemi === 'S') + opt('N', 'Norte', hemi === 'N');
    const list = S.filter({ season, theme, query, hemisphere: hemi });
    $('scCount').textContent = list.length === 1 ? '1 ramo' : list.length + ' ramos';
    $('scGrid').innerHTML = list.length ? list.map((p) => {
      const occ = p.occasions.slice(0, 2).map((id) => FL.occasion(id).name).join(' · ');
      const when = p.seasons.length ? p.seasons.map(cap).join(', ') : 'Todo el año';
      const inSeason = p.seasons.includes(now);
      const top = FL.reading.interpret(FL.bouquet.create(p)).meanings.slice(0, 3).map((m) => m.id);
      return '<li class="sc-card"><div class="sc-bq" data-bq="' + p.id + '"></div>' +
        '<div class="sc-meta"><p class="eyebrow">' + occ + '</p><h3>' + p.name + '</h3>' +
        '<p class="sc-when">' + when + (inSeason ? ' <span class="badge">de temporada</span>' : '') + '</p>' +
        '<p class="sc-story">' + p.story + '</p>' +
        '<p class="sc-says">' + top.map((m) => '<span>' + m + '</span>').join('') + '</p>' +
        '<button type="button" class="pillbtn" data-custom="' + p.id + '">Personalizar</button></div></li>';
    }).join('') : empty(hemi);
    lazy();
  }

  // Sin resultados: si la búsqueda o la ocasión sí encuentran ramos en otra temporada, se ofrece verlos.
  function empty(hemi) {
    const wider = season && S.filter({ season: '', theme, query, hemisphere: hemi }).length;
    const what = query.trim() ? 'con «' + U.esc(query.trim()) + '»' : 'con esos filtros';
    return '<li class="empty">No hay ramos ' + what + (season ? ' en esta temporada' : '') + '.' +
      (wider ? ' <button type="button" class="linkbtn" data-all-seasons>Ver en todas las temporadas</button>' : '') + '</li>';
  }

  // Los dibujos se generan al entrar en pantalla: cada ramo lleva decenas de flores.
  function lazy() {
    if (io) io.disconnect();
    const paint = (el) => {
      const p = FL.popular.find((x) => x.id === el.dataset.bq);
      el.innerHTML = FL.bouquetArt.render(FL.bouquet.create(p), { cls: 'enter' }).svg;
      el.removeAttribute('data-bq');
    };
    const els = root.querySelectorAll('[data-bq]');
    if (!('IntersectionObserver' in window)) { els.forEach(paint); return; }
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { paint(e.target); io.unobserve(e.target); } }), { root, rootMargin: '200px 0px' });
    els.forEach((el) => io.observe(el));
  }
})();
