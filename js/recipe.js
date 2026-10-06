/* Florilegio — receta para la florería: qué pedir y cuánto, para mostrar en el mostrador o enviar por mensaje,
   y un acceso persistente para buscar florerías cerca. El destino no está atado a la página:
   R.providers guarda los posibles; R.useProvider elige cuál usa el botón. */
(function () {
  'use strict';
  const FL = window.FL;
  const R = (FL.recipe = {});
  const ROLES = ['focal', 'secondary', 'spike', 'filler', 'greenery'];

  // Sin ubicación, el enlace lleva solo la palabra «florería» y Maps decide dónde buscar.
  const MAPS = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('florería');
  // Con la ubicación que el navegador entrega (solo si la persona acepta), el mapa se centra donde está.
  R.mapsAt = (lat, lng) => 'https://www.google.com/maps/search/' + encodeURIComponent('florería') + '/@' + (+lat).toFixed(3) + ',' + (+lng).toFixed(3) + ',15z';
  R.providers = {
    maps: {
      id: 'maps',
      label: 'Florerías cerca',
      hint: 'Abre Google Maps con las florerías cerca de ti. Tu navegador te pedirá la ubicación; Florilegio solo la usa para centrar el mapa y no la guarda.',
      url: MAPS,
      at: R.mapsAt
    }
  };
  R.providerId = 'maps';
  R.provider = () => R.providers[R.providerId];
  R.nearbyUrl = (c) => { const p = R.provider(); return c && p.at ? p.at(c.lat, c.lng) : p.url; };
  R.mapsUrl = MAPS;

  /*
   * La ubicación se pide solo al tocar «Florerías cerca» y solo sirve para centrar el mapa: se redondea a unos
   * cien metros, vive en memoria mientras la página está abierta y no se guarda ni se envía a ningún otro lado.
   */
  R.coords = null;
  R.denied = false;
  R.locate = () => new Promise((ok, no) => {
    if (R.coords) { ok(R.coords); return; }
    const g = typeof navigator !== 'undefined' && navigator.geolocation;
    if (!g) { no(new Error('sin geolocalización')); return; }
    g.getCurrentPosition((p) => {
      R.coords = { lat: +p.coords.latitude.toFixed(3), lng: +p.coords.longitude.toFixed(3) };
      ok(R.coords);
    }, (err) => { R.denied = true; no(err); }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 });
  });

  // true si la apertura la resolvió la app (Maps o el navegador de fuera) y el enlace no debe seguir su curso.
  R.openNearby = function (url) {
    url = url || R.nearbyUrl(R.coords);
    const cap = window.Capacitor;
    const native = !!(cap && (typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : cap.isNative));
    const browser = cap && cap.Plugins && cap.Plugins.Browser;
    if (native && browser && typeof browser.open === 'function') {
      browser.open({ url: url });
      return true;
    }
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    if (/\bAndroid\b/i.test(ua) && /\bwv\b/.test(ua) && typeof location !== 'undefined') {
      const q = encodeURIComponent('florería'), c = R.coords;
      location.href = 'intent://maps.google.com/maps?q=' + q + (c ? '&sll=' + c.lat + ',' + c.lng : '') +
        '#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
      return true;
    }
    return false;
  };

  // Lo que dicen los botones de florerías mientras se busca la ubicación y después.
  function label(state) {
    const p = R.provider();
    const text = { idle: p.label, busy: 'Buscando tu ubicación…', near: 'Florerías cerca de ti', ready: 'Abrir el mapa' }[state];
    document.querySelectorAll('[data-nearby]').forEach((el) => {
      const l = el.querySelector('[data-nearby-label]');
      if (l) l.textContent = text;
      el.classList.toggle('busy', state === 'busy');
      el.setAttribute('aria-busy', String(state === 'busy'));
      if (el.tagName === 'A') el.href = R.nearbyUrl(R.coords);
    });
  }

  /*
   * Un toque: con la ubicación ya conocida (o sin geolocalización), el mapa se abre al instante. Si no, se pide,
   * y al llegar se abre el mapa centrado ahí; si la persona no la da, se abre igual, sin ubicación. Si el navegador
   * bloquea la ventana porque la respuesta tardó, el botón queda listo para abrirlo con un segundo toque.
   */
  R.goNearby = function (e, el) {
    const geo = typeof navigator !== 'undefined' && navigator.geolocation;
    // Ya se sabe dónde está, o no hay cómo saberlo (sin geolocalización, o la persona dijo que no): enlace directo.
    if (R.coords || R.denied || !geo) {
      const url = R.nearbyUrl(R.coords);
      if (R.openNearby(url)) { e.preventDefault(); return; }
      if (el.tagName === 'A') { el.href = url; return; }
      e.preventDefault();
      window.open(url, '_blank', 'noopener');
      return;
    }
    e.preventDefault();
    if (el.classList.contains('busy')) return;
    label('busy');
    R.locate().catch(() => null).then(() => {
      label(R.coords ? 'near' : 'idle');
      const url = R.nearbyUrl(R.coords);
      if (R.openNearby(url)) return;
      const w = window.open(url, '_blank');
      if (w) w.opener = null;
      else label('ready');
    });
  };

  R.useProvider = function (id) {
    const p = R.providers[id];
    if (!p) return false;
    R.providerId = id;
    if (typeof document === 'undefined') return true;
    const a = document.getElementById('nearby');
    if (!a) return true;
    a.href = R.nearbyUrl(R.coords);
    a.title = p.hint;
    a.querySelector('[data-nearby-label]').textContent = p.label;
    a.querySelector('.sr').textContent = p.hint;
    return true;
  };

  // Un solo botón flotante en el jardín y la ficha; en el taller, la receta y el regalo hay uno en su lugar.
  function mountNearby() {
    const p = R.provider();
    const a = document.createElement('a');
    a.id = 'nearby';
    a.className = 'nearby';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.href = p.url;
    a.title = p.hint;
    a.setAttribute('data-nearby', '');
    a.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 17.5s5.5-4.8 5.5-8.7a5.5 5.5 0 0 0-11 0c0 3.9 5.5 8.7 5.5 8.7z"/><circle cx="10" cy="8.6" r="1.7"/></svg>' +
      '<span data-nearby-label></span><span class="sr"></span>';
    a.querySelector('[data-nearby-label]').textContent = p.label;
    a.querySelector('.sr').textContent = p.hint;
    document.body.appendChild(a);
    // Todos los botones de florerías (el flotante y los de cada vista) pasan por el mismo camino.
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-nearby]');
      if (el) R.goNearby(e, el);
    });
  }
  if (typeof document !== 'undefined' && document.getElementById('garden')) mountNearby();

  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // De los colores en que se vende la flor, el más cercano al que tiene en el dibujo.
  R.colorOf = function (it) {
    if (!it.colors || it.colors.length < 2) return '';
    const h = rgb(it.hue);
    let best = '', bestD = Infinity;
    it.colors.forEach((id) => {
      const c = FL.color(id);
      if (!c) return;
      const d = rgb(c.hex).reduce((a, v, i) => a + (v - h[i]) * (v - h[i]), 0);
      if (d < bestD) { bestD = d; best = id; }
    });
    return best;
  };

  // Envoltorio en palabras: «papel kraft claro», «papel de seda rosa pálido», «tela salvia».
  R.wrapText = function (b) {
    const w = FL.taxonomy.wraps.find((x) => x.id === b.wrap.style);
    if (!w || !w.colors.length) return 'sin envoltorio';
    const c = b.wrap.color ? FL.swatchName(b.wrap.color) : '';
    const name = !c ? w.name : c.startsWith(w.id) ? w.name.replace(w.id, c) : w.name + ' ' + c;
    return name.charAt(0).toLowerCase() + name.slice(1);
  };

  // Una línea por ítem, ordenadas como las arma quien hace ramos: protagonistas primero, follaje al final.
  R.lines = function (b) {
    return b.stems.map((s) => ({ s, it: FL.item(s.item) })).filter((x) => x.it)
      .sort((x, y) => ROLES.indexOf(x.it.bouquet.role) - ROLES.indexOf(y.it.bouquet.role))
      .map(({ s, it }) => {
        const potted = it.care && it.care.form === 'potted';
        return {
          item: it.id, n: s.n,
          unit: potted ? (s.n === 1 ? 'maceta' : 'macetas') : (s.n === 1 ? 'tallo' : 'tallos'),
          name: it.name.toLowerCase(),
          color: R.colorOf(it),
          rare: !it.bouquet.florist
        };
      });
  };

  R.totalText = function (lines) {
    const sum = (u) => lines.filter((l) => u.includes(l.unit)).reduce((a, l) => a + l.n, 0);
    const cut = sum(['tallo', 'tallos']), pots = sum(['maceta', 'macetas']);
    return [cut && cut + (cut === 1 ? ' tallo' : ' tallos'), pots && pots + (pots === 1 ? ' maceta' : ' macetas')].filter(Boolean).join(' y ');
  };

  const what = (l) => l.unit + ' de ' + l.name + (l.color ? ' en ' + l.color : '');
  const rareText = (l) => l.name.charAt(0).toUpperCase() + l.name.slice(1) + ': poco habitual en florerías, conviene preguntar antes.';
  const hasCard = (b) => b.card && (b.card.to || b.card.message || b.card.from);

  // Texto plano para copiar o enviar. o.card: incluye la tarjeta; o.link: enlace al dibujo del ramo.
  R.text = function (b, o = {}) {
    const lines = R.lines(b);
    const out = ['Receta para la florería' + (b.name ? ' · «' + b.name + '»' : ''), ''];
    lines.forEach((l) => out.push('- ' + l.n + ' ' + what(l)));
    out.push('', 'Envoltorio: ' + R.wrapText(b), 'Cinta: ' + FL.swatchName(b.ribbon.color), 'Total: ' + R.totalText(lines));
    lines.filter((l) => l.rare).forEach((l) => out.push(rareText(l)));
    if (o.card && hasCard(b)) {
      out.push('', 'Para la tarjeta');
      if (b.card.to) out.push('Para: ' + b.card.to);
      if (b.card.message) out.push('«' + b.card.message + '»');
      if (b.card.from) out.push('De: ' + b.card.from);
    }
    if (o.link) out.push('', 'Así se ve: ' + o.link);
    return out.join('\n');
  };

  R.html = function (b, o = {}) {
    const esc = FL.u.esc, lines = R.lines(b);
    return '<div class="recipe">' +
      '<ul class="recipe-list">' + lines.map((l) =>
        '<li><span class="recipe-n">' + l.n + '</span><span class="recipe-what">' + esc(what(l)) + '</span></li>').join('') + '</ul>' +
      '<dl class="recipe-dress"><dt>Envoltorio</dt><dd>' + esc(R.wrapText(b)) + '</dd>' +
        '<dt>Cinta</dt><dd>' + esc(FL.swatchName(b.ribbon.color)) + '</dd>' +
        '<dt>Total</dt><dd>' + esc(R.totalText(lines)) + '</dd></dl>' +
      lines.filter((l) => l.rare).map((l) => '<p class="recipe-rare">' + esc(rareText(l)) + '</p>').join('') +
      (o.card && hasCard(b) ? '<div class="recipe-card"><p class="mini">Para la tarjeta</p>' +
        (b.card.to ? '<p>Para: ' + esc(b.card.to) + '</p>' : '') +
        (b.card.message ? '<blockquote>' + esc(b.card.message).replace(/\n/g, '<br>') + '</blockquote>' : '') +
        (b.card.from ? '<p>De: ' + esc(b.card.from) + '</p>' : '') + '</div>' : '') +
      '</div>';
  };
})();
