/* Florilegio — mostrador: ramos tradicionales de Occidente por temporada y por temática,
   con la temporada calculada según el hemisferio y las próximas fechas del calendario. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const S = (FL.showcase = {});
  const $ = (id) => document.getElementById(id);
  const SEASONS = ['primavera', 'verano', 'otoño', 'invierno'];
  let root, season = 'ahora', theme = '', lastFocus = null, io = null;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  S.init = function () {
    root = $('showcase');
    $('showcaseBtn').addEventListener('click', () => S.open());
    root.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const d = t.dataset;
      if (d.season != null) { season = d.season; render(); return; }
      if (d.theme != null) { theme = theme === d.theme ? '' : d.theme; render(); return; }
      if (d.hemi) { FL.setHemisphere(d.hemi); render(); return; }
      if (d.custom) {
        const p = FL.popular.find((x) => x.id === d.custom);
        S.close(true);
        FL.atelier.open({ bouquet: { stems: p.stems, wrap: p.wrap, ribbon: p.ribbon, occasion: p.occasions[0], layoutSeed: p.layoutSeed, name: p.name } });
        return;
      }
      if (t.id === 'scClose') S.close();
    });
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const els = Array.from(root.querySelectorAll('button')).filter((x) => x.offsetParent !== null);
      if (!els.length) return;
      if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
    });
  };

  S.open = function () {
    if (FL.focus.isOpen()) FL.focus.close();
    FL.explore.close(true);
    // Una sola hoja a la vez: si el taller estaba abierto (por ejemplo, al llegar con #ramos), se cierra.
    if (FL.atelier.isOpen()) FL.atelier.close();
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

  // Ramos visibles con los filtros actuales; los de temporada primero.
  S.filter = function (opts) {
    const hemi = opts.hemisphere || FL.hemisphere();
    const now = FL.seasonOf(opts.date || new Date(), hemi);
    const want = opts.season === 'ahora' ? now : opts.season;
    return FL.popular.filter((p) => {
      if (opts.theme && !p.occasions.includes(opts.theme)) return false;
      if (want === 'todo') return !p.seasons.length;
      if (want) return !p.seasons.length || p.seasons.includes(want);
      return true;
    }).sort((a, b) => (b.seasons.includes(now) ? 1 : 0) - (a.seasons.includes(now) ? 1 : 0));
  };

  function render() {
    // Al rehacer los chips se conserva el foco en el que se acaba de tocar.
    const act = document.activeElement, keep = act && root.contains(act) ? ['season', 'theme', 'hemi'].find((k) => act.dataset[k] != null) : null;
    const keepVal = keep ? act.dataset[keep] : null;
    paint();
    if (keep) {
      const again = root.querySelector('[data-' + keep + '="' + keepVal + '"]');
      if (again) again.focus({ preventScroll: true });
    }
  }

  function paint() {
    // En celulares cada fila de filtros se desliza de lado: al rehacerla se conserva dónde estaba.
    const rows = ['scHemi', 'scSeasons', 'scThemes'], keepX = rows.map((id) => $(id).scrollLeft);
    const hemi = FL.hemisphere(), now = FL.seasonOf(new Date(), hemi);
    $('scHemi').innerHTML = ['N', 'S'].map((h) => '<button type="button" class="chip" data-hemi="' + h + '" aria-pressed="' + (h === hemi) + '">Hemisferio ' + (h === 'N' ? 'norte' : 'sur') + '</button>').join('');
    $('scSeasons').innerHTML = [['ahora', 'Ahora: ' + now], ['', 'Todas'], ['todo', 'Todo el año']].concat(SEASONS.map((s) => [s, cap(s)]))
      .map(([k, v]) => '<button type="button" class="chip" data-season="' + k + '" aria-pressed="' + (season === k) + '">' + v + '</button>').join('');
    const used = new Set(FL.popular.flatMap((p) => p.occasions));
    $('scThemes').innerHTML = FL.taxonomy.occasions.filter((o) => used.has(o.id))
      .map((o) => '<button type="button" class="chip" data-theme="' + o.id + '" aria-pressed="' + (theme === o.id) + '">' + o.name + '</button>').join('');
    const today = new Date();
    const upcoming = FL.taxonomy.occasions.filter((o) => o.date && used.has(o.id)).map((o) => ({ o, d: FL.occasionDate(o, today) })).sort((a, b) => a.d - b.d).slice(0, 3);
    $('scUpcoming').innerHTML = '<span class="mini">Próximas fechas</span> ' + upcoming.map(({ o, d }) => {
      const days = Math.round((d - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);
      return '<button type="button" class="linkbtn" data-theme="' + o.id + '">' + o.name + ' · ' + d.toLocaleDateString('es', { day: 'numeric', month: 'short' }) + (days === 0 ? ' (hoy)' : ' (en ' + days + (days === 1 ? ' día)' : ' días)')) + '</button>';
    }).join('');
    rows.forEach((id, i) => { $(id).scrollLeft = keepX[i]; });
    const list = S.filter({ season, theme, hemisphere: hemi });
    $('scCount').textContent = list.length === 1 ? '1 ramo' : list.length + ' ramos';
    $('scGrid').innerHTML = list.length ? list.map((p) => {
      const occ = p.occasions.map((id) => FL.occasion(id).name).join(' · ');
      const when = p.seasons.length ? p.seasons.map(cap).join(', ') : 'Todo el año';
      const inSeason = p.seasons.includes(now);
      const top = FL.reading.interpret(FL.bouquet.create(p)).meanings.slice(0, 3).map((m) => m.id);
      return '<li class="sc-card"><div class="sc-bq" data-bq="' + p.id + '"></div>' +
        '<div class="sc-meta"><p class="eyebrow">' + occ + '</p><h3>' + p.name + '</h3>' +
        '<p class="sc-when">' + when + (inSeason ? ' <span class="badge">de temporada</span>' : '') + '</p>' +
        '<p class="sc-story">' + p.story + '</p>' +
        '<p class="sc-says">' + top.map((m) => '<span>' + m + '</span>').join('') + '</p>' +
        '<button type="button" class="pillbtn" data-custom="' + p.id + '">Personalizar</button></div></li>';
    }).join('') : '<li class="empty">No hay ramos con esos filtros. Prueba otra temporada.</li>';
    lazy();
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
