/* Florilegio — receta para la florería: qué pedir y cuánto, para mostrar en el mostrador o enviar por mensaje,
   y un enlace a Google Maps para buscar florerías cerca. */
(function () {
  'use strict';
  const FL = window.FL;
  const R = (FL.recipe = {});
  const ROLES = ['focal', 'secondary', 'spike', 'filler', 'greenery'];

  // Solo la palabra «florería»: Maps busca cerca de quien la abre y la página no le pasa nada más.
  R.mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('florería');

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
