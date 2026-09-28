/* Florilegio — vista de regalo: lo que ve quien abre un enlace #ramo=… (ramo, tarjeta, lectura y cuidados) */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const Gf = (FL.gift = {});
  const $ = (id) => document.getElementById(id);
  let root, cur = null, preview = false, lastFocus = null, sys = null;

  Gf.init = function () {
    root = $('gift');
    sys = new FL.Particles($('giftFx'));
    $('giftBack').addEventListener('click', () => Gf.close());
    $('giftCopy').addEventListener('click', () => {
      if (!cur) return;
      if (preview) { Gf.close(); return; }
      const copy = FL.bouquet.clone(cur);
      delete copy.id;
      copy.card = { to: '', message: '', from: '' };
      Gf.close(true);
      FL.atelier.open({ bouquet: copy });
    });
    $('giftIcs').addEventListener('click', () => cur && FL.care.download(cur));
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const els = Array.from(root.querySelectorAll('button, summary, [href]')).filter((x) => x.offsetParent !== null);
      if (!els.length) return;
      const at = document.activeElement, first = els[0], last = els[els.length - 1];
      // El foco puede estar en la hoja misma (tabindex -1): Tab o Mayús+Tab no deben escaparse hacia el taller de atrás.
      if (!els.includes(at)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    });
  };

  // Abre desde un código de enlace (#ramo=…).
  Gf.openCode = async function (code) {
    const b = await FL.bouquet.decode(code);
    if (!b) {
      Gf.open(null);
      return;
    }
    Gf.open(b);
  };

  Gf.open = function (b, opts = {}) {
    preview = !!opts.preview;
    cur = b;
    if (FL.focus.isOpen()) FL.focus.close();
    lastFocus = document.activeElement;
    const esc = U.esc;
    if (!b) {
      $('giftEyebrow').textContent = 'Enlace incompleto';
      $('giftTitle').textContent = 'Este ramo no llegó entero';
      $('giftBq').innerHTML = '';
      $('giftCard').innerHTML = '<p>El enlace parece cortado o dañado. Pide a quien te lo envió que lo copie de nuevo.</p>';
      $('giftReading').innerHTML = '';
      $('giftCare').innerHTML = '';
      $('giftIcs').hidden = true;
      $('giftCopy').hidden = true;
    } else {
      const c = b.card || {};
      $('giftEyebrow').textContent = preview ? 'Así lo verá quien lo reciba' : c.to ? 'Para ' + c.to : 'Un ramo para ti';
      $('giftTitle').textContent = b.name || (b.occasion ? FL.occasion(b.occasion).name : 'Flores que dicen algo');
      $('giftBq').innerHTML = FL.bouquetArt.render(b, { cls: 'enter' }).svg;
      $('giftCard').innerHTML = c.message || c.from
        ? '<blockquote>' + esc(c.message).replace(/\n/g, '<br>') + '</blockquote>' + (c.from ? '<p class="gift-from">— ' + esc(c.from) + '</p>' : '')
        : '';
      const r = FL.reading.interpret(b);
      const summary = b.reading && b.reading.source === 'ai' ? b.reading.summary : r.summary;
      $('giftReading').innerHTML = '<h3>Qué dice este ramo</h3><p class="rd-summary">' + esc(summary) + '</p>' +
        '<ul class="gift-items">' + r.perItem.map((x) => '<li><strong>' + esc(x.n + ' ' + x.name.toLowerCase()) + '</strong> — ' + esc(x.says) + '</li>').join('') + '</ul>' +
        (r.notes.length ? '<p class="note">' + esc(r.notes[0]) + '</p>' : '');
      $('giftCare').innerHTML = FL.care.planHTML(b);
      $('giftIcs').hidden = !FL.care.plan(b).cut;
      $('giftCopy').hidden = false;
      $('giftCopy').textContent = preview ? 'Volver al taller' : 'Armar uno parecido';
    }
    // En la vista previa, el taller sigue detrás: no hay jardín al que volver desde aquí.
    $('giftBack').hidden = preview;
    root.hidden = false;
    root.scrollTop = 0;
    U.syncSheets();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('on')));
    if (b && !FL.reduce) setTimeout(() => celebrate(b), 700);
    setTimeout(() => root.focus({ preventScroll: true }), 300);
  };

  function celebrate(b) {
    const r = $('giftBq').getBoundingClientRect();
    const cols = b.stems.map((s) => (FL.item(s.item) || {}).hue).filter(Boolean);
    FL.burst(sys, r.left + r.width / 2, r.top + r.height * 0.35, cols.length ? cols : ['#f3d27a'], 18, r.width * 0.6);
  }

  Gf.close = function (instant) {
    if (root.hidden) return;
    root.classList.remove('on');
    const done = () => {
      root.hidden = true;
      sys.clear();
      U.syncSheets();
      if (location.hash.startsWith('#ramo=')) {
        try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ }
      }
      U.refocus(lastFocus, document.getElementById('atelierBtn'));
    };
    if (instant || FL.reduce) done(); else setTimeout(done, 600);
  };
  Gf.isOpen = () => root && !root.hidden;
  Gf.tick = (dt, T) => { if (root && !root.hidden) sys.step(dt, T); };
  Gf.resize = () => sys && sys.resize();
})();
