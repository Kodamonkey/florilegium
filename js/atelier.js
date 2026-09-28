/* Florilegio — taller de ramos: elegir flores y follajes, vestir el ramo, leer lo que dice,
   pedir una propuesta desde lo que sientes, guardar en «Mis ramos» y compartir por enlace. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const A = (FL.atelier = {});
  const $ = (id) => document.getElementById(id);
  const DRAFT = 'fl.draft';
  let root, cur = null, role = '', query = '', lastFocus = null, renderT = 0, toastT = 0, busyMsg = '', itemsDone = false;

  const esc = U.esc;
  // Nombres para leer los colores de envoltorio y cinta en voz alta.
  const COLOR_NAMES = {
    '#c9a77c': 'kraft claro', '#b48a5c': 'kraft tostado', '#e2cfae': 'arena', '#f3e6ea': 'rosa pálido', '#e9dcc6': 'crema',
    '#dfe7ef': 'celeste', '#f1efe6': 'blanco', '#2f3a2c': 'verde noche', '#efe7da': 'lino', '#c8b8a6': 'topo', '#7c8a6a': 'salvia',
    '#384454': 'azul pizarra', '#b54470': 'frambuesa', '#a3182b': 'rojo', '#e7c25c': 'dorado', '#f4f0e4': 'marfil', '#6f97e0': 'azul',
    '#4d6647': 'verde musgo', '#7d69bb': 'lavanda', '#2b3127': 'carbón'
  };

  A.init = function () {
    root = $('atelier');
    const T = FL.taxonomy;
    $('atFeelings').innerHTML = FL.meanings.map((m) => '<button type="button" class="chip" data-feel="' + m + '" aria-pressed="false">' + m + '</button>').join('');
    $('atOccasion').innerHTML = '<option value="">Sin ocasión en particular</option>' + T.occasions.map((o) => '<option value="' + o.id + '">' + o.name + '</option>').join('');
    $('atRoles').innerHTML = [['', 'Todo']].concat(Object.entries(T.roles).map(([k, v]) => [k, v.name])).map(([k, v]) =>
      '<button type="button" class="chip" data-role="' + k + '" aria-pressed="' + (k === '' ? 'true' : 'false') + '">' + v + '</button>').join('');
    $('atWraps').innerHTML = T.wraps.map((w) => '<button type="button" class="chip" data-wrap="' + w.id + '" aria-pressed="false">' + w.name + '</button>').join('');
    $('atRibbons').innerHTML = T.ribbons.map((c) => swatch('ribbon', c)).join('');
    // La paleta se dibuja al abrir el taller por primera vez, no al cargar la página.
    // Sus miniaturas llevan la luz del tema: al cambiarlo se rehacen.
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mq && mq.addEventListener) mq.addEventListener('change', () => { if (itemsDone) renderItems(); });

    root.addEventListener('click', onClick);
    $('atSearch').addEventListener('input', (e) => { query = U.norm(e.target.value.trim()); renderItems(); });
    // La ocasión cambia lo que el ramo dice: la lectura de la IA deja de valer.
    $('atOccasion').addEventListener('change', (e) => { if (!cur) return; if (e.target.value) cur.occasion = e.target.value; else delete cur.occasion; changed(); });
    [['atName', 'name'], ['atTo', 'to'], ['atMsg', 'message'], ['atFrom', 'from']].forEach(([id, key]) => {
      $(id).addEventListener('input', (e) => {
        if (!cur) return;
        if (key === 'name') cur.name = e.target.value; else cur.card[key] = e.target.value;
        saveDraft();
      });
    });
    root.addEventListener('keydown', trap);
    $('atelierBtn').addEventListener('click', () => A.open());
  };

  const swatch = (kind, c) => '<button type="button" class="swatch" data-' + kind + '="' + c + '" style="--c:' + c + '" aria-pressed="false" aria-label="' +
    (kind === 'ribbon' ? 'Cinta ' : 'Envoltorio ') + (COLOR_NAMES[c] || c) + '"></button>';

  /* ---------- Abrir y cerrar ---------- */
  // opts: { bouquet } para editar una copia, { add: id } para sumar una flor, o nada para retomar el borrador.
  A.open = function (opts = {}) {
    if (FL.focus.isOpen()) FL.focus.close();
    FL.explore.close(true);
    if (FL.showcase && FL.showcase.isOpen()) FL.showcase.close(true);
    if (!cur) cur = loadDraft() || FL.bouquet.create();
    if (opts.bouquet) replace(FL.bouquet.normalize(opts.bouquet).bouquet);
    if (opts.add && !FL.bouquet.add(cur, opts.add, 1)) setTimeout(() => toast('El ramo ya está en el máximo de tallos o de tipos: quita algo para sumar ' + FL.item(opts.add).name.toLowerCase() + '.'), 400);
    if (!root.hidden) { sync(true); return; }
    lastFocus = document.activeElement;
    root.hidden = false;
    if (!itemsDone) renderItems();
    U.syncSheets();
    requestAnimationFrame(() => root.classList.add('on'));
    sync(true);
    try { history.replaceState(null, '', '#armar'); } catch (e) { /* sin historial */ }
    setTimeout(() => $('atClose').focus({ preventScroll: true }), 60);
  };

  A.close = function () {
    if (root.hidden) return;
    if (!$('atMineList').hidden) { toggleMine(false); return; }
    root.classList.remove('on');
    setTimeout(() => {
      root.hidden = true;
      U.syncSheets();
      if (location.hash === '#armar') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ } }
      U.refocus(lastFocus, $('atelierBtn'));
    }, FL.reduce ? 20 : 380);
  };
  A.isOpen = () => root && !root.hidden;
  A.current = () => cur;
  // Desde una ficha abierta en el taller: filtra la paleta por un sentimiento.
  A.search = function (text) {
    $('atSearch').value = text;
    query = U.norm(text);
    renderItems();
    $('atSearch').scrollIntoView({ block: 'center', behavior: FL.reduce ? 'auto' : 'smooth' });
  };

  // Con «Mis ramos» abierto, el foco queda dentro del cajón; si no, dentro del taller.
  function trap(e) {
    if (e.key !== 'Tab') return;
    const scope = $('atMineList').hidden ? root : $('atMineList');
    const els = Array.from(scope.querySelectorAll('button, [href], input, select, textarea, summary')).filter((x) => x.offsetParent !== null && !x.disabled);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1], at = document.activeElement;
    if (!scope.contains(at)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  }

  // Cambia el ramo en edición sin perder el anterior: si tenía flores y no estaba guardado tal cual, va a «Mis ramos».
  function replace(next) {
    if (cur && cur.stems.length && next.id !== cur.id) {
      const saved = FL.bouquet.get(cur.id);
      const sig = (b) => JSON.stringify([b.name || '', b.stems, b.wrap, b.ribbon, b.card, b.occasion || '']);
      if (!saved || sig(saved) !== sig(cur)) {
        const keep = FL.bouquet.clone(cur);
        if (!keep.name) keep.name = 'Borrador ' + new Date().toLocaleDateString('es');
        if (FL.bouquet.save(keep)) setTimeout(() => toast('Tu ramo anterior quedó guardado en Mis ramos.'), 450);
      }
    }
    cur = next;
    $('atRationale').innerHTML = '';
    $('atIntent').value = (cur.intent && cur.intent.text) || '';
  }

  /* ---------- Paleta de flores y follajes ---------- */
  // Cada miniatura es una imagen (FL.headImg): la lista entera se rehace con cada tecla del buscador.
  function renderItems() {
    itemsDone = true;
    const list = FL.items.filter((it) => {
      if (role && it.bouquet.role !== role) return false;
      if (!query) return true;
      return U.norm([it.name, it.sci.replace(/<[^>]+>/g, ''), it.meanings.join(' '), it.colors.join(' ')].join(' ')).includes(query);
    });
    $('atItems').innerHTML = list.length ? list.map((it) => {
      const r = FL.role(it.bouquet.role);
      return '<li class="at-item" data-item="' + it.id + '">' +
        '<button type="button" class="at-add" data-inc="' + it.id + '" aria-label="Agregar ' + esc(it.name) + '">' +
          '<span class="at-thumb">' + FL.headImg(it, { open: true, pad: 0.15 }) + '</span>' +
          '<span class="at-nm">' + it.name + '<small>' + r.name + (it.meanings.length ? ' · ' + it.meanings.join(', ') : '') + '</small></span>' +
        '</button>' +
        '<span class="at-qty"><button type="button" class="qbtn" data-dec="' + it.id + '" aria-label="Quitar un tallo de ' + esc(it.name) + '">−</button>' +
        '<span class="at-n" data-count="' + it.id + '">0</span>' +
        '<button type="button" class="qbtn" data-inc="' + it.id + '" aria-label="Sumar un tallo de ' + esc(it.name) + '">+</button></span>' +
        (it.type === 'flower' ? '<button type="button" class="at-info" data-info="' + it.id + '" aria-label="Ver la ficha de ' + esc(it.name) + '">ficha</button>' : '') +
        '</li>';
    }).join('') : '<li class="empty">Nada coincide con esa búsqueda.</li>';
    syncCounts();
  }

  function syncCounts() {
    if (!cur) return;
    root.querySelectorAll('[data-count]').forEach((o) => {
      const n = FL.bouquet.count(cur, o.dataset.count);
      o.textContent = n;
      o.closest('.at-item').classList.toggle('in', n > 0);
    });
  }

  /* ---------- Eventos ---------- */
  function onClick(e) {
    const t = e.target.closest('button, summary');
    if (!t || !root.contains(t)) return;
    const d = t.dataset;
    if (d.inc) { if (!FL.bouquet.add(cur, d.inc, 1)) toast('Llegaste al máximo de tallos para un ramo.'); changed(); return; }
    if (d.dec) { FL.bouquet.add(cur, d.dec, -1); changed(); return; }
    if (d.info) { FL.focus.open(FL.byId(d.info), t); return; }
    if (d.role != null) {
      role = d.role;
      root.querySelectorAll('[data-role]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.role === role)));
      renderItems();
      return;
    }
    if (d.feel) { t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true')); return; }
    if (d.wrap) {
      const w = FL.taxonomy.wraps.find((x) => x.id === d.wrap);
      cur.wrap = { style: w.id };
      if (w.colors.length) cur.wrap.color = w.colors[0];
      changed(false);
      return;
    }
    if (d.wrapcolor) { cur.wrap.color = d.wrapcolor; changed(false); return; }
    if (d.ribbon) { cur.ribbon.color = d.ribbon; changed(false); return; }
    if (d.suggest) { if (!FL.bouquet.add(cur, d.suggest, +d.sn || 3)) toast('No cabe: el ramo ya está en el máximo.'); changed(); return; }
    if (d.open) { const b = FL.bouquet.get(d.open); if (b) { replace(b); toggleMine(false); sync(true); } return; }
    if (d.del) {
      const b = FL.bouquet.get(d.del);
      if (b && window.confirm('¿Borrar «' + (b.name || 'Ramo sin nombre') + '» de Mis ramos? No se puede deshacer.')) {
        FL.bouquet.remove(d.del);
        renderMine();
        $('atMineClose').focus({ preventScroll: true });
      }
      return;
    }
    if (d.sharemine) { const b = FL.bouquet.get(d.sharemine); if (b) share(b); return; }
    switch (t.id) {
      case 'atClose': A.close(); break;
      case 'atMine': toggleMine(true); break;
      case 'atMineClose': toggleMine(false); break;
      case 'atPropose': propose(false); break;
      case 'atProposeAI': propose(true); break;
      case 'atAI': interpretAI(); break;
      case 'atSave':
        if (!cur.stems.length) { toast('Agrega al menos una flor antes de guardar.'); break; }
        toast(FL.bouquet.save(cur) ? 'Guardado en Mis ramos (solo en este navegador).' : 'No se pudo guardar: el navegador no permite almacenamiento.');
        break;
      case 'atShare': if (cur.stems.length) share(cur); else toast('El ramo está vacío.'); break;
      case 'atGift': if (cur.stems.length) FL.gift.open(FL.bouquet.clone(cur), { preview: true }); else toast('El ramo está vacío.'); break;
      case 'atNew': replace(FL.bouquet.create()); sync(true); break;
      default: break;
    }
  }

  function feelings() { return Array.from(root.querySelectorAll('[data-feel][aria-pressed="true"]')).map((c) => c.dataset.feel); }

  /* ---------- Propuesta desde lo que sientes ---------- */
  async function propose(useAI) {
    const req = {
      text: $('atIntent').value.trim(), feelings: feelings(), occasion: $('atOccasion').value || undefined,
      petSafe: $('atPetSafe').checked, hemisphere: FL.hemisphere(), season: FL.seasonOf(new Date())
    };
    if (!req.text && !req.feelings.length && !req.occasion) { toast('Escribe lo que quieres decir o elige un sentimiento.'); $('atIntent').focus(); return; }
    let res = null;
    const box = $('atRationale');
    if (useAI && FL.ai.available) {
      busy(true, 'Pensando un ramo…');
      try { res = await FL.ai.compose(req); busy(false); } catch (err) { busy(false); toast('La IA no respondió (' + err.message + '). Uso la propuesta local.'); }
    }
    if (!res) res = FL.reading.compose(req);
    const keep = { name: cur.name, card: cur.card };
    cur = FL.bouquet.normalize(Object.assign({}, res.bouquet, keep, { id: cur.id })).bouquet;
    if (res.reading && res.reading.source === 'ai') cur.reading = { source: 'ai', summary: res.reading.summary, at: new Date().toISOString(), full: res.reading };
    box.innerHTML = '<strong>' + esc(res.rationale.lead) + '</strong>' +
      '<ul>' + res.rationale.items.map((x) => '<li>' + esc(x.n + ' × ' + x.name) + ': ' + esc(x.why) + '</li>').join('') + '</ul>';
    sync(true);
  }

  // La lectura se pega solo si el ramo sigue siendo el mismo que se envió.
  async function interpretAI() {
    if (!cur.stems.length) { toast('El ramo está vacío.'); return; }
    const sent = cur, stamp = cur.updatedAt;
    busy(true, 'Leyendo tu ramo…');
    try {
      const r = await FL.ai.interpret(sent);
      busy(false);
      if (cur !== sent || cur.updatedAt !== stamp) { toast('El ramo cambió mientras la IA lo leía. Vuelve a pedir la lectura.'); return; }
      cur.reading = { source: 'ai', summary: r.summary, at: new Date().toISOString(), full: r };
      renderReading();
      saveDraft();
    } catch (err) {
      busy(false);
      toast('La IA no respondió (' + err.message + '). Sigue disponible la lectura local.');
    }
  }

  function busy(on, msg) {
    root.classList.toggle('busy', on);
    ['atAI', 'atProposeAI', 'atPropose'].forEach((id) => { $(id).disabled = on; });
    if (on) { busyMsg = msg; toast(msg, true); return; }
    // Solo se retira el aviso de espera, no un mensaje que haya llegado después.
    const t = $('atToast');
    if (busyMsg && t.textContent === busyMsg) t.classList.remove('show');
    busyMsg = '';
  }

  /* ---------- Compartir ---------- */
  async function share(b) {
    const url = await FL.bouquet.link(b);
    if (location.protocol === 'file:') {
      window.prompt('La página está abierta desde tu disco: este enlace solo funciona en este computador. Para compartir, ábrela desde un servidor (ver README).', url);
      return;
    }
    const title = b.name || 'Un ramo para ti';
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try {
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado. Quien lo abra verá el ramo, la tarjeta y cómo cuidarlo.');
    } catch (e) {
      window.prompt('Copia este enlace:', url);
    }
  }

  /* ---------- Mis ramos ---------- */
  function toggleMine(on) {
    $('atMineList').hidden = !on;
    if (on) { renderMine(); $('atMineClose').focus({ preventScroll: true }); }
    else $('atMine').focus({ preventScroll: true });
  }
  function renderMine() {
    const list = FL.bouquet.list();
    $('atMineItems').innerHTML = list.length ? list.map((b) =>
      '<li class="mine-card"><div class="mine-bq">' + FL.bouquetArt.render(b).svg + '</div><div class="mine-meta"><p class="mine-nm">' + esc(b.name || 'Ramo sin nombre') + '</p>' +
      '<p class="mini">' + FL.bouquet.total(b) + ' tallos · ' + new Date(b.updatedAt).toLocaleDateString('es') + '</p>' +
      '<div class="mine-actions"><button type="button" class="pillbtn" data-open="' + b.id + '">Abrir</button><button type="button" class="pillbtn" data-sharemine="' + b.id + '">Compartir</button>' +
      '<button type="button" class="pillbtn pillbtn--quiet" data-del="' + b.id + '">Borrar</button></div></div></li>').join('')
      : '<li class="empty">Todavía no guardas ramos. Los ramos se guardan solo en este navegador.</li>';
  }

  /* ---------- Estado y dibujo ---------- */
  function changed(resetReading = true) {
    if (resetReading && cur.reading) delete cur.reading;
    cur.updatedAt = new Date().toISOString();
    sync(false);
  }

  function sync(full) {
    if (!cur) return;
    syncCounts();
    root.querySelectorAll('[data-wrap]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.wrap === cur.wrap.style)));
    const w = FL.taxonomy.wraps.find((x) => x.id === cur.wrap.style), box = $('atWrapColors');
    if (box.dataset.style !== w.id) { box.innerHTML = w.colors.map((c) => swatch('wrapcolor', c)).join(''); box.dataset.style = w.id; }
    root.querySelectorAll('[data-wrapcolor]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.wrapcolor === cur.wrap.color)));
    root.querySelectorAll('[data-ribbon]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.ribbon === cur.ribbon.color)));
    if (full) {
      $('atName').value = cur.name || '';
      $('atTo').value = cur.card.to || '';
      $('atMsg').value = cur.card.message || '';
      $('atFrom').value = cur.card.from || '';
      $('atOccasion').value = cur.occasion || '';
    }
    const total = FL.bouquet.total(cur), L = FL.limits;
    $('atCount').textContent = total ? total + (total === 1 ? ' tallo' : ' tallos') + ' · ' + cur.stems.length + (cur.stems.length === 1 ? ' tipo' : ' tipos') + ' (máximo ' + L.stems + ')' : 'Toca una flor para empezar.';
    clearTimeout(renderT);
    renderT = setTimeout(() => {
      $('atCanvas').innerHTML = FL.bouquetArt.render(cur, { cls: full ? 'enter' : '' }).svg;
      renderReading();
    }, full ? 0 : 60);
    saveDraft();
  }

  function renderReading() {
    const box = $('atReading'), src = $('atSource');
    const had = box.contains(document.activeElement) ? document.activeElement.dataset.suggest || '' : null;
    paintReading(box, src);
    if (had == null) return;
    const again = (had && box.querySelector('[data-suggest="' + had + '"]')) || box.querySelector('[data-suggest]');
    if (again) again.focus({ preventScroll: true });
    else { box.tabIndex = -1; box.focus({ preventScroll: true }); }
  }

  function paintReading(box, src) {
    if (!cur.stems.length) { box.innerHTML = '<p class="muted">Cuando agregues flores, aquí aparecerá lo que tu ramo dice.</p>'; src.textContent = ''; return; }
    const local = FL.reading.interpret(cur);
    const ai = cur.reading && cur.reading.source === 'ai' ? cur.reading.full || { summary: cur.reading.summary } : null;
    src.textContent = ai ? 'IA' : 'local';
    src.className = 'src' + (ai ? ' src--ai' : '');
    const r = ai || local;
    const meanings = (r.meanings && r.meanings.length ? r.meanings : local.meanings).slice(0, 5);
    // Los avisos y notas locales se suman a los de la IA, que puede traer solo un resumen.
    const notes = ai && ai.cultural_notes && ai.cultural_notes.length ? ai.cultural_notes : local.notes;
    const warnings = Array.from(new Set((ai && ai.warnings ? ai.warnings : []).concat(local.warnings)));
    const maxW = Math.max(...meanings.map((m) => m.weight), 0.01);
    box.innerHTML = '<p class="rd-summary">' + esc(r.summary) + '</p>' +
      '<ul class="rd-bars">' + meanings.map((m) => '<li><span>' + esc(m.id) + '</span><i style="--w:' + Math.round((m.weight / maxW) * 100) + '%"></i></li>').join('') + '</ul>' +
      listBlock('Notas culturales', notes) +
      listBlock('Ten en cuenta', warnings, 'rd-warn', 8) +
      ((local.suggestions || []).length ? '<p class="mini">Sugerencias</p><div class="rd-sugg">' + local.suggestions.map((s) =>
        '<button type="button" class="chip" data-suggest="' + s.item + '" data-sn="' + (s.n || 3) + '">+ ' + esc(FL.item(s.item).name) + '</button><span>' + esc(s.why) + '</span>').join('') + '</div>' : '');
  }
  const listBlock = (title, arr, cls, max) => (arr && arr.length ? '<p class="mini">' + title + '</p><ul class="rd-list ' + (cls || '') + '">' + arr.slice(0, max || 5).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '');

  function toast(msg, sticky) {
    const t = $('atToast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    if (!sticky) toastT = setTimeout(() => t.classList.remove('show'), 3800);
  }

  function saveDraft() {
    try { localStorage.setItem(DRAFT, JSON.stringify(cur)); } catch (e) { /* sin almacenamiento */ }
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT);
      return raw ? FL.bouquet.normalize(JSON.parse(raw)).bouquet : null;
    } catch (e) { return null; }
  }

  A.aiChanged = function (on) {
    $('atAI').hidden = !on;
    $('atProposeAI').hidden = !on;
  };
})();
