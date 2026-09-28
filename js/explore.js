/* Florilegio — explorador discreto: búsqueda y filtros por significado, color y estación */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const E = (FL.explore = {});
  const $ = (id) => document.getElementById(id);
  const st = { m: null, c: null, s: null, q: '' };
  let panel, scrim, btn, list, count, pill, pillText, search;

  const strip = (h) => h.replace(/<[^>]+>/g, '');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  E.init = function () {
    panel = $('explorer'); scrim = $('exScrim'); btn = $('exploreBtn'); list = $('exList'); count = $('exCount');
    pill = $('filterPill'); pillText = $('filterPillText'); search = $('exSearch');
    $('chipsMeaning').innerHTML = FL.meanings.map((m) => '<button type="button" class="chip" data-k="m" data-v="' + m + '" aria-pressed="false">' + m + '</button>').join('');
    $('chipsColor').innerHTML = FL.colors.map(([c, hex]) => '<button type="button" class="chip chip--color" data-k="c" data-v="' + c + '" aria-pressed="false"><i style="--c:' + hex + '"></i>' + cap(c) + '</button>').join('');
    $('chipsSeason').innerHTML = FL.seasons.map((s) => '<button type="button" class="chip" data-k="s" data-v="' + s + '" aria-pressed="false">' + cap(s) + '</button>').join('');
    panel.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip[data-k]');
      if (chip) {
        const k = chip.dataset.k, v = chip.dataset.v;
        st[k] = st[k] === v ? null : v;
        apply();
        return;
      }
      const item = e.target.closest('[data-id]');
      if (item) openFlower(item.dataset.id);
    });
    search.addEventListener('input', () => { st.q = search.value; apply(); });
    btn.addEventListener('click', () => (panel.hidden ? E.open() : E.close()));
    $('exClose').addEventListener('click', () => E.close());
    scrim.addEventListener('click', () => E.close());
    $('filterClear').addEventListener('click', () => E.clear());
    apply();
  };

  function openFlower(id) {
    const fl = FL.byId(id);
    E.close(true);
    const head = FL.garden.headOf(id);
    if (head) {
      const r = head.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) head.scrollIntoView({ block: 'center' });
    }
    FL.focus.open(fl, head);
  }

  function matches(fl) {
    if (st.m && !fl.meanings.includes(st.m)) return false;
    if (st.c && !fl.colors.includes(st.c)) return false;
    if (st.s && !fl.seasons.includes(st.s)) return false;
    if (st.q.trim()) {
      const hay = U.norm([fl.name, strip(fl.sci), fl.family, fl.meanings.join(' '), fl.colors.join(' '), fl.seasons.join(' ')].join(' '));
      if (!U.norm(st.q.trim()).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  }

  function apply() {
    const active = st.m || st.c || st.s || st.q.trim();
    const hits = FL.flowers.filter(matches);
    FL.garden.setFilter(active ? new Set(hits.map((x) => x.id)) : null);
    panel.querySelectorAll('.chip[data-k]').forEach((ch) => ch.setAttribute('aria-pressed', String(st[ch.dataset.k] === ch.dataset.v)));
    count.textContent = hits.length === 1 ? '1 flor' : hits.length + ' flores';
    list.innerHTML = hits.length
      ? hits.map((fl) => '<li><button type="button" data-id="' + fl.id + '"><i style="--c:' + fl.hue + '"></i><span class="nm">' + fl.name + '</span><span class="sc">' + fl.sci.split(';')[0] + '</span></button></li>').join('')
      : '<li class="empty">Ninguna flor del jardín reúne todo eso. Prueba quitando un filtro.</li>';
    const parts = [st.m, st.c && cap(st.c), st.s && cap(st.s), st.q.trim() && '«' + st.q.trim() + '»'].filter(Boolean);
    pill.hidden = !active;
    pillText.textContent = parts.join(' · ') + ' — ' + count.textContent;
  }

  E.only = function (k, v) {
    st.m = st.c = st.s = null;
    st.q = '';
    search.value = '';
    st[k] = v;
    apply();
  };
  E.clear = function () {
    st.m = st.c = st.s = null;
    st.q = '';
    search.value = '';
    apply();
  };
  E.open = function () {
    panel.hidden = false;
    scrim.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { panel.classList.add('on'); scrim.classList.add('on'); });
    setTimeout(() => { if (window.innerWidth > 700) search.focus({ preventScroll: true }); }, 250);
  };
  E.close = function (instant) {
    if (panel.hidden) return;
    panel.classList.remove('on');
    scrim.classList.remove('on');
    btn.setAttribute('aria-expanded', 'false');
    const done = () => { panel.hidden = true; scrim.hidden = true; };
    if (instant) done(); else setTimeout(done, 380);
  };
  E.isOpen = () => !panel.hidden;
})();
