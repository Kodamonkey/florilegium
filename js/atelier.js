/* Florilegio — taller de ramos: elegir flores y follajes, vestir el ramo, leer lo que dice,
   pedir una propuesta desde lo que sientes, guardar en «Mis ramos» y compartir por enlace. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const A = (FL.atelier = {});
  const $ = (id) => document.getElementById(id);
  const DRAFT = 'fl.draft';
  let root, dock, cur = null, role = '', query = '', lastFocus = null, renderT = 0, toastT = 0, itemsDone = false, lastKey = '', leads = [], occPicked = null, moreOpen = false;
  const narrow = window.matchMedia ? window.matchMedia('(max-width: 760px)') : { matches: false };

  const esc = U.esc;

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
    // Cada plegable resume lo elegido, para saber qué hay dentro sin abrirlo.
    root.addEventListener('click', () => requestAnimationFrame(summaries));
    root.addEventListener('change', () => requestAnimationFrame(summaries));
    root.addEventListener('toggle', (e) => { if (e.target.classList && e.target.classList.contains('rd-more')) moreOpen = e.target.open; }, true);
    $('atSearch').addEventListener('input', (e) => { query = U.norm(e.target.value.trim()); renderItems(); });
    // La ocasión cambia lo que el ramo dice. Elegida aquí, manda sobre la que se lea en el texto.
    $('atOccasion').addEventListener('change', (e) => { occPicked = !!e.target.value; if (!cur) return; if (e.target.value) cur.occasion = e.target.value; else delete cur.occasion; changed(); });
    [['atName', 'name'], ['atTo', 'to'], ['atMsg', 'message'], ['atFrom', 'from']].forEach(([id, key]) => {
      $(id).addEventListener('input', (e) => {
        if (!cur) return;
        if (key === 'name') cur.name = e.target.value; else cur.card[key] = e.target.value;
        saveDraft();
      });
    });
    root.addEventListener('keydown', trap);
    // En celulares el ramo queda arriba y la lista de flores muy abajo: mientras el ramo no se ve, una barra lo muestra.
    dock = document.createElement('button');
    dock.type = 'button';
    dock.id = 'atDock';
    dock.className = 'at-dock';
    dock.innerHTML = '<span class="at-dock-bq" aria-hidden="true"></span><span class="at-dock-txt"><span></span><small>Ver el ramo</small></span>' +
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4"/></svg>';
    root.appendChild(dock);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { root.classList.toggle('docked', !e.isIntersecting); dockArt(); }, { root }).observe($('atCanvas'));
    }
    $('atelierBtn').addEventListener('click', () => A.open());
    FL.plate.bind($('atPng'), $('atPdf'), () => cur, toast);
    if (canShare()) $('atRecipeSend').textContent = 'Enviar la receta';
  };

  const canShare = () => !!navigator.share && matchMedia('(pointer: coarse)').matches;

  const swatch = (kind, c) => '<button type="button" class="swatch" data-' + kind + '="' + c + '" style="--c:' + c + '" aria-pressed="false" aria-label="' +
    (kind === 'ribbon' ? 'Cinta ' : 'Envoltorio ') + FL.swatchName(c) + '"></button>';

  /* ---------- Abrir y cerrar ---------- */
  // opts: { bouquet } para editar una copia, { add: id } para sumar una flor,
  // { mine: true } para abrir directo «Mis ramos», o nada para retomar el borrador.
  A.open = function (opts = {}) {
    if (FL.focus.isOpen()) FL.focus.close();
    FL.explore.close(true);
    if (FL.calendar && FL.calendar.isOpen()) FL.calendar.close(true);
    if (FL.showcase && FL.showcase.isOpen()) FL.showcase.close(true);
    if (!cur) cur = loadDraft() || FL.bouquet.create();
    if (opts.bouquet) replace(FL.bouquet.normalize(opts.bouquet).bouquet);
    // Desde el calendario: un ramo nuevo (el anterior queda en «Mis ramos») y, si hay ocasión, propuesto de inmediato.
    if (opts.fresh || opts.occasion) replace(FL.bouquet.create());
    if (opts.occasion) { cur.occasion = opts.occasion; occPicked = true; setTimeout(() => propose(false), 0); }
    if (opts.add && !FL.bouquet.add(cur, opts.add, 1)) setTimeout(() => toast('El ramo ya está en el máximo de tallos o de tipos: quita algo para sumar ' + FL.item(opts.add).name.toLowerCase() + '.'), 400);
    if (!root.hidden) {
      sync(true);
      if (opts.mine) { try { history.replaceState(null, '', '#mis-ramos'); } catch (e) { /* sin historial */ } toggleMine(true); }
      return;
    }
    lastFocus = document.activeElement;
    root.hidden = false;
    if (!itemsDone) {
      // Plegables, la primera vez: en pantallas anchas la paleta y el envoltorio parten abiertos; en el celular, cerrados.
      const wide = window.matchMedia && window.matchMedia('(min-width: 1100px)').matches;
      $('atPickFold').open = !!wide;
      $('atDressFold').open = !!wide;
      renderItems();
    }
    U.syncSheets();
    requestAnimationFrame(() => root.classList.add('on'));
    sync(true);
    // El léxico se compila mientras el navegador descansa: la primera propuesta no espera.
    if (FL.intent && FL.intent.warm) (window.requestIdleCallback || setTimeout)(() => FL.intent.warm());
    try { history.replaceState(null, '', opts.mine ? '#mis-ramos' : '#armar'); } catch (e) { /* sin historial */ }
    setTimeout(() => { if (opts.mine) toggleMine(true); else $('atClose').focus({ preventScroll: true }); }, 60);
  };

  A.close = function (instant) {
    if (root.hidden) return;
    if (!instant && !$('atMineList').hidden) { toggleMine(false); return; }
    if (!instant && !$('atRecipeBox').hidden) { toggleRecipe(false); return; }
    $('atMineList').hidden = true;
    $('atRecipeBox').hidden = true;
    root.classList.remove('on');
    const done = () => {
      root.hidden = true;
      U.syncSheets();
      if (location.hash === '#armar' || location.hash === '#mis-ramos') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ } }
      if (!instant) U.refocus(lastFocus, $('atelierBtn'));
    };
    if (instant || FL.reduce) done(); else setTimeout(done, 380);
  };
  A.isOpen = () => root && !root.hidden;
  A.current = () => cur;
  // Desde una ficha abierta en el taller: filtra la paleta por un sentimiento.
  A.search = function (text) {
    $('atPickFold').open = true;
    $('atSearch').value = text;
    query = U.norm(text);
    renderItems();
    $('atSearch').scrollIntoView({ block: 'center', behavior: FL.reduce ? 'auto' : 'smooth' });
  };

  // Con un cajón abierto («Mis ramos» o la receta), el foco queda dentro de él; si no, dentro del taller.
  function trap(e) {
    if (e.key !== 'Tab') return;
    const scope = [$('atMineList'), $('atRecipeBox')].find((d) => !d.hidden) || root;
    const els = U.withNearby(Array.from(scope.querySelectorAll('button, [href], input, select, textarea, summary')).filter((x) => x.offsetParent !== null && !x.disabled));
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1], at = document.activeElement;
    const near = document.getElementById('nearby');
    if (!scope.contains(at) && at !== near) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
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
    // «Otra opción» y sus flores ya vistas son de la propuesta anterior; la ocasión de este ramo se juzga de nuevo.
    leads = []; lastKey = ''; occPicked = null;
    $('atAnother').hidden = true;
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
      case 'atDock': $('atCanvas').scrollIntoView({ block: 'center', behavior: FL.reduce ? 'auto' : 'smooth' }); break;
      case 'atMine': toggleMine(true); break;
      case 'atMineClose': toggleMine(false); break;
      case 'atPropose': propose(false); break;
      case 'atAnother': propose(true); break;
      case 'atSave':
        if (!cur.stems.length) { toast('Agrega al menos una flor antes de guardar.'); break; }
        toast(FL.bouquet.save(cur) ? 'Guardado en Mis ramos (solo en este navegador).' : 'No se pudo guardar: el navegador no permite almacenamiento.');
        break;
      case 'atShare': if (cur.stems.length) share(cur); else toast('El ramo está vacío.'); break;
      case 'atGift': if (cur.stems.length) FL.gift.open(FL.bouquet.clone(cur), { preview: true }); else toast('El ramo está vacío.'); break;
      case 'atNew': replace(FL.bouquet.create()); toggleMine(false); sync(true); break;
      case 'atRecipe': if (cur.stems.length) toggleRecipe(true); else toast('El ramo está vacío.'); break;
      case 'atRecipeClose': toggleRecipe(false); break;
      case 'atRecipeSend': sendRecipe(); break;
      default: break;
    }
  }

  function feelings() { return Array.from(root.querySelectorAll('[data-feel][aria-pressed="true"]')).map((c) => c.dataset.feel); }

  /* ---------- Propuesta desde lo que sientes ---------- */
  // «Otra opción» pide lo mismo evitando las flores principales ya propuestas; si se agotan, vuelve a empezar.
  // La búsqueda corre en setTimeout(0) para que el clic se pinte antes.
  function propose(again) {
    const req = {
      text: $('atIntent').value.trim(), feelings: feelings(), occasion: pickedOccasion(),
      petSafe: $('atPetSafe').checked, hemisphere: FL.hemisphere(), season: FL.seasonOf(new Date())
    };
    if (!req.text && !req.feelings.length && !req.occasion) { toast('Escribe lo que quieres decir o elige un sentimiento.'); $('atIntent').focus(); return; }
    const key = JSON.stringify(req);
    if (!again || key !== lastKey) { leads = []; lastKey = key; }
    if (again) req.avoidLeads = leads.slice();
    setTimeout(() => {
      const res = FL.reading.compose(req);
      if (res.search && res.search.cycled) { leads = []; toast('No quedan otras flores principales para esto: vuelvo a la primera propuesta.'); }
      const lead = res.bouquet.stems[0] && res.bouquet.stems[0].item;
      if (lead && !leads.includes(lead)) leads.push(lead);
      // La ocasión que ahora muestra el selector la puso la propuesta: solo cuenta como elegida si venía del pedido
      // y el motor la mantuvo (una fiesta elegida no envuelve un duelo). Si la dejó de lado, la siguiente vuelta pide sin ella.
      occPicked = !!req.occasion && res.bouquet.occasion === req.occasion;
      if (req.occasion && !occPicked) lastKey = JSON.stringify(Object.assign({}, req, { occasion: undefined, avoidLeads: undefined }));
      const keep = { name: cur.name, card: cur.card };
      cur = FL.bouquet.normalize(Object.assign({}, res.bouquet, keep, { id: cur.id })).bouquet;
      // Por qué este ramo, en una frase; flor por flor, a un toque.
      $('atRationale').innerHTML = '<p>' + esc(res.rationale.lead) + '</p>' +
        '<details class="at-why"><summary>Flor por flor</summary><ul>' +
        res.rationale.items.map((x) => '<li>' + esc(x.n + ' × ' + x.name) + ': ' + esc(x.why) + '</li>').join('') + '</ul></details>';
      $('atAnother').hidden = false;
      sync(true);
    }, 0);
  }

  // El selector va en el pedido solo si la persona eligió esa ocasión. La que dejó una propuesta anterior salió del texto:
  // con un texto nuevo se vuelve a leer (un duelo no queda como «cumpleaños») y no cambia la clave de «Otra opción».
  function pickedOccasion() {
    const v = $('atOccasion').value;
    if (!v) return undefined;
    if (occPicked == null) {
      // Ramo abierto o retomado: si su propio texto ya dice esa ocasión, salió de ahí; si no, la eligió alguien.
      const it = cur.intent || {}, d = it.text ? FL.reading.detect({ text: it.text, feelings: it.feelings || [] }) : null;
      occPicked = !(d && d.occasion && d.occasion.id === v);
    }
    return occPicked ? v : undefined;
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
      if (canShare()) { await navigator.share({ title, url }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try {
      await navigator.clipboard.writeText(url);
      toast('Enlace copiado. Quien lo abra verá el ramo, la tarjeta y cómo cuidarlo.');
    } catch (e) {
      window.prompt('Copia este enlace:', url);
    }
  }

  /* ---------- Receta para la florería ---------- */
  function toggleRecipe(on) {
    $('atRecipeBox').hidden = !on;
    U.syncSheets();
    if (on) { $('atMineList').hidden = true; renderRecipe(); $('atRecipeClose').focus({ preventScroll: true }); }
    else $('atRecipe').focus({ preventScroll: true });
  }
  function renderRecipe() {
    $('atRecipeBq').innerHTML = FL.bouquetArt.render(cur).svg;
    $('atRecipeBody').innerHTML = cur.stems.length ? FL.recipe.html(cur, { card: true }) : '<p class="muted">El ramo está vacío.</p>';
  }
  // Con el enlace al ramo, quien atiende la florería ve también el dibujo.
  async function sendRecipe() {
    if (!cur.stems.length) { toast('El ramo está vacío.'); return; }
    const link = location.protocol === 'file:' ? '' : await FL.bouquet.link(cur);
    const text = FL.recipe.text(cur, { card: true, link });
    try {
      if (canShare()) { await navigator.share({ title: 'Receta para la florería', text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try {
      await navigator.clipboard.writeText(text);
      toast('Receta copiada: pégala en un mensaje a la florería.');
    } catch (e) {
      window.prompt('Copia la receta:', text);
    }
  }

  /* ---------- Mis ramos ---------- */
  function toggleMine(on) {
    $('atMineList').hidden = !on;
    if (on) $('atRecipeBox').hidden = true;
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
      // La tarjeta se abre sola si ya tiene algo escrito; vacía, queda plegada y no pesa.
      if (cur.name || cur.card.to || cur.card.message || cur.card.from) $('atCardFold').open = true;
      $('atOccasion').value = cur.occasion || '';
    }
    summaries();
    const total = FL.bouquet.total(cur), L = FL.limits;
    // El tope se avisa solo cuando ya se acerca.
    $('atCount').textContent = total ? countText() + (total >= L.stems * 0.8 ? ' (máximo ' + L.stems + ')' : '') : 'Toca una flor para empezar.';
    clearTimeout(renderT);
    renderT = setTimeout(() => {
      $('atCanvas').innerHTML = FL.bouquetArt.render(cur, { cls: full ? 'enter' : '' }).svg;
      renderReading();
      dockArt();
      if (!$('atRecipeBox').hidden) renderRecipe();
    }, full ? 0 : 60);
    saveDraft();
  }

  function countText() {
    const total = FL.bouquet.total(cur), n = cur.stems.length;
    return total + (total === 1 ? ' tallo' : ' tallos') + ' · ' + n + (n === 1 ? ' tipo' : ' tipos');
  }

  // La barra solo se dibuja cuando se ve (pantallas angostas, con el ramo fuera de la vista).
  function dockArt() {
    if (!cur || !dock || !narrow.matches || !root.classList.contains('docked')) return;
    dock.hidden = !cur.stems.length;
    if (dock.hidden) return;
    dock.querySelector('.at-dock-txt span').textContent = countText();
    dock.querySelector('.at-dock-bq').innerHTML = FL.bouquetArt.render(cur).svg;
  }

  function renderReading() {
    const box = $('atReading');
    const had = box.contains(document.activeElement) ? document.activeElement.dataset.suggest || '' : null;
    paintReading(box);
    if (had == null) return;
    const again = (had && box.querySelector('[data-suggest="' + had + '"]')) || box.querySelector('[data-suggest]');
    if (again) again.focus({ preventScroll: true });
    else { box.tabIndex = -1; box.focus({ preventScroll: true }); }
  }

  function paintReading(box) {
    if (!cur.stems.length) { box.innerHTML = '<p class="muted">Cuando agregues flores, aquí aparecerá lo que tu ramo dice.</p>'; return; }
    const r = FL.reading.display(cur, { petSafe: $('atPetSafe').checked });
    const maxW = Math.max(...r.meanings.map((m) => m.weight), 0.01);
    // Lo que dice y los avisos quedan a la vista; las notas culturales y las sugerencias, plegadas.
    const more = listBlock('Notas culturales', r.notes) +
      (r.suggestions.length ? '<p class="mini">Sugerencias</p><div class="rd-sugg">' + r.suggestions.map((s) =>
        '<button type="button" class="chip" data-suggest="' + s.item + '" data-sn="' + (s.n || 3) + '">+ ' + esc(FL.item(s.item).name) + '</button><span>' + esc(s.why) + '</span>').join('') + '</div>' : '');
    const n = (r.notes || []).slice(0, 5).length + r.suggestions.length;
    box.innerHTML = '<p class="rd-summary">' + esc(r.summary) + '</p>' +
      '<ul class="rd-bars">' + r.meanings.map((m) => '<li><span>' + esc(m.id) + '</span><i style="--w:' + Math.round((m.weight / maxW) * 100) + '%"></i></li>').join('') + '</ul>' +
      listBlock('Ten en cuenta', r.warnings, 'rd-warn', 8) +
      (n ? '<details class="rd-more"' + (moreOpen ? ' open' : '') + '><summary>Notas y sugerencias · ' + n + '</summary>' + more + '</details>' : '');
  }
  const listBlock = (title, arr, cls, max) => (arr && arr.length ? '<p class="mini">' + title + '</p><ul class="rd-list ' + (cls || '') + '">' + arr.slice(0, max || 5).map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '');

  // Resúmenes de los plegables: «Gratitud · Cumpleaños · sin tóxicas» y «Papel kraft · ●●».
  function summaries() {
    if (!cur) return;
    const fine = feelings().concat($('atOccasion').value ? [$('atOccasion').selectedOptions[0].text] : [])
      .concat($('atPetSafe').checked ? ['sin tóxicas'] : []);
    $('atFineSum').textContent = fine.length ? fine.join(' · ') : 'sentimientos, ocasión y mascotas';
    const w = FL.taxonomy.wraps.find((x) => x.id === cur.wrap.style);
    const dot = (c) => '<i class="at-dot" style="--c:' + c + '"></i>';
    $('atDressSum').innerHTML = esc(w ? w.name : '') + (w && w.colors.length && cur.wrap.color ? dot(cur.wrap.color) : '') + dot(cur.ribbon.color);
  }

  function toast(msg) {
    const t = $('atToast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 3800);
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
})();
