/* Florilegio — catálogo: conecta los datos generados (js/gen/data.js) con el resto de la página */
(function () {
  'use strict';
  const FL = window.FL, D = FL.data;

  FL.flowers.push(...D.flowers);
  FL.fillers = D.fillers;
  FL.items = FL.flowers.concat(FL.fillers);
  FL.popular = D.popular;

  const T = (FL.taxonomy = D.taxonomy);
  FL.meanings = T.meanings.map((m) => m.id);
  FL.colors = T.colors.filter((c) => c.explorer !== false).map((c) => [c.id, c.hex]);
  FL.seasons = T.seasons.slice();
  FL.limits = T.limits;

  const byId = new Map(FL.items.map((x) => [x.id, x]));
  FL.item = (id) => byId.get(id);
  FL.meaning = (id) => T.meanings.find((m) => m.id === id);
  FL.color = (id) => T.colors.find((c) => c.id === id);
  FL.occasion = (id) => T.occasions.find((o) => o.id === id);
  FL.role = (id) => T.roles[id];

  // Nombres de los colores de envoltorio y cinta, para leerlos en voz alta y escribirlos en la lámina del ramo.
  const SWATCH_NAMES = {
    '#c9a77c': 'kraft claro', '#b48a5c': 'kraft tostado', '#e2cfae': 'arena', '#f3e6ea': 'rosa pálido', '#e9dcc6': 'crema',
    '#dfe7ef': 'celeste', '#f1efe6': 'blanco', '#2f3a2c': 'verde noche', '#efe7da': 'lino', '#c8b8a6': 'topo', '#7c8a6a': 'salvia',
    '#384454': 'azul pizarra', '#b54470': 'frambuesa', '#a3182b': 'rojo', '#e7c25c': 'dorado', '#f4f0e4': 'marfil', '#6f97e0': 'azul',
    '#4d6647': 'verde musgo', '#7d69bb': 'lavanda', '#2b3127': 'carbón'
  };
  FL.swatchName = (hex) => SWATCH_NAMES[hex] || hex;

  // Número en palabras (femenino: «treinta y una flores»), de 1 a 99.
  FL.countWords = function (n) {
    const ONES = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince',
      'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuna', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco',
      'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
    const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    if (n < 30) return ONES[n];
    if (n > 99) return String(n);
    return TENS[Math.floor(n / 10)] + (n % 10 ? ' y ' + ONES[n % 10] : '');
  };

  // Hemisferio: por zona horaria (Chile, Argentina, Australia… → Sur); se puede cambiar a mano.
  FL.hemisphere = function () {
    try {
      const saved = localStorage.getItem('fl.hemisphere');
      if (saved === 'N' || saved === 'S') return saved;
    } catch (e) { /* sin almacenamiento */ }
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* sin Intl */ }
    return T.southTimeZones.some((z) => tz === z || tz.startsWith(z + '/')) ? 'S' : 'N';
  };
  FL.setHemisphere = function (h) {
    try { localStorage.setItem('fl.hemisphere', h); } catch (e) { /* sin almacenamiento */ }
  };
  FL.seasonOf = function (date, hemi) {
    const m = (date || new Date()).getMonth() + 1, table = T.seasonMonths[hemi || FL.hemisphere()];
    return Object.keys(table).find((s) => table[s].includes(m));
  };

  // Próxima fecha de una ocasión con día fijo o «n-ésimo día de la semana del mes».
  FL.occasionDate = function (o, from) {
    if (!o.date) return null;
    const now = from || new Date();
    const at = (y) => {
      const d = o.date;
      if (d.day) return new Date(y, d.month - 1, d.day);
      const first = new Date(y, d.month - 1, 1);
      const off = (d.weekday - first.getDay() + 7) % 7;
      return new Date(y, d.month - 1, 1 + off + (d.nth - 1) * 7);
    };
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let dt = at(now.getFullYear());
    if (dt < today) dt = at(now.getFullYear() + 1);
    return dt;
  };
})();
