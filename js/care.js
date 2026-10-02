/* Florilegio — cuidar la flor que te regalan: ficha de cuidados, plan para un ramo y recordatorios (.ics) */
(function () {
  'use strict';
  const FL = window.FL;
  const C = (FL.care = {});
  const TOX = { ninguna: 'no tóxica', baja: 'leve', media: 'moderada', alta: 'grave', desconocida: 'sin datos' };
  const WATER = { poca: 'poca agua (unos 5 cm)', media: 'agua hasta la mitad del florero', mucha: 'mucha agua; revisa el nivel a diario' };

  C.toxLabel = (lv) => TOX[lv] || lv;

  C.lifeText = function (care) {
    const [a, b] = care.vaseLife;
    if (care.form === 'potted') return 'En maceta, su floración dura de ' + Math.round(a / 30) + ' a ' + Math.round(b / 30) + ' meses.';
    return 'En florero dura de ' + a + ' a ' + b + ' días.';
  };

  // Sección «Cuidados» de la ficha de una flor.
  C.section = function (it) {
    const c = it.care, t = c.toxicity;
    const lv = [t.cats, t.dogs].includes('alta') ? 'alta' : [t.cats, t.dogs].includes('media') ? 'media' : 'baja';
    return '<section class="c-care" id="c-care"><p class="label">Cuidados</p>' +
      '<p class="care-life">' + C.lifeText(c) + (c.form === 'cut' ? ' Prefiere ' + WATER[c.water] + '.' : '') + '</p>' +
      '<ul class="care-steps">' + c.steps.map((s) => '<li>' + s + '</li>').join('') + '</ul>' +
      (c.avoid.length ? '<p class="care-avoid"><span class="mini">Evitar</span> ' + c.avoid.join(' ') + '</p>' : '') +
      '<div class="care-tox tox-' + lv + '"><p class="mini">Mascotas</p><p>Gatos: ' + C.toxLabel(t.cats) + ' · Perros: ' + C.toxLabel(t.dogs) + '. ' + t.note + '</p></div>' +
      '</section>';
  };

  // Plan de cuidados para un ramo completo.
  C.plan = function (b) {
    const items = b.stems.map((s) => FL.item(s.item)).filter(Boolean);
    const cut = items.filter((it) => it.care.form === 'cut');
    const first = cut.length ? Math.min(...cut.map((it) => it.care.vaseLife[0])) : 0;
    const last = cut.length ? Math.max(...cut.filter((it) => it.type === 'flower').map((it) => it.care.vaseLife[1]).concat([first])) : 0;
    const water = ['mucha', 'media', 'poca'].find((w) => cut.some((it) => it.care.water === w)) || 'media';
    const specific = items.filter((it) => it.care.steps.length).map((it) => ({ id: it.id, name: it.name, steps: it.care.steps, form: it.care.form }));
    const cats = items.filter((it) => it.care.toxicity.cats === 'alta' || it.care.toxicity.cats === 'media').map((it) => it.name);
    const dogs = items.filter((it) => it.care.toxicity.dogs === 'alta' || it.care.toxicity.dogs === 'media').map((it) => it.name);
    // Si todo va en maceta no hay florero: ni pasos de agua ni recordatorios de cambiarla.
    return { first, last, water, cut: cut.length, general: cut.length ? FL.taxonomy.careGeneral : [], specific, cats, dogs, potted: items.filter((it) => it.care.form === 'potted').map((it) => it.name) };
  };

  // Cuánto dura el ramo y cuánta agua quiere, en texto ('' si no hay florero). p: lo que devuelve C.plan.
  C.lifeLine = function (p) {
    if (!p.last) return '';
    return (p.first === p.last ? 'Con buenos cuidados, el ramo luce unos ' + p.last + ' días.'
      : 'Las primeras flores empezarán a decaer hacia el día ' + p.first + '; las más duraderas pueden llegar al día ' + p.last + '.') +
      ' Prefiere ' + WATER[p.water] + '.';
  };

  C.planHTML = function (b) {
    const p = C.plan(b), life = C.lifeLine(p);
    return '<div class="care-plan">' +
      (life ? '<p class="care-life">' + life + '</p>' : '') +
      (p.general.length ? '<ol class="care-steps">' + p.general.map((s) => '<li>' + s + '</li>').join('') + '</ol>' : '') +
      (p.specific.length ? '<div class="care-specific">' + p.specific.map((s) => '<details><summary>' + s.name + (s.form === 'potted' ? ' (en maceta)' : '') + '</summary><ul>' + s.steps.map((x) => '<li>' + x + '</li>').join('') + '</ul></details>').join('') + '</div>' : '') +
      (p.cats.length || p.dogs.length ? '<div class="care-tox tox-media"><p class="mini">Mascotas</p><p>' +
        (p.cats.length ? 'Tóxicas para gatos: ' + p.cats.join(', ') + '. ' : '') + (p.dogs.length ? 'Para perros: ' + p.dogs.join(', ') + '.' : '') + ' Ubica el ramo fuera de su alcance.</p></div>' : '') +
      '</div>';
  };

  // Calendario con un recordatorio cada dos días para cambiar el agua, mientras dure el ramo (null si no hay florero).
  C.ics = function (b, start) {
    const p = C.plan(b);
    if (!p.cut) return null;
    const d0 = start || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const day = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    const first = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 2);
    const count = Math.max(1, Math.ceil(Math.max(p.last, 4) / 2) - 1);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    // Texto de propiedad: todo salto de línea (CR, LF, NEL, U+2028/2029) se escapa y los demás controles se quitan,
    // para que un nombre llegado por enlace no pueda abrir otra propiedad del calendario.
    const text = (s) => s.replace(/\r\n|[\r\n\u0085\u2028\u2029]/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n');
    const desc = text('Corta 1–2 cm de los tallos en diagonal, lava el florero y pon agua fresca.\n' +
      p.specific.slice(0, 4).map((s) => s.name + ': ' + s.steps[0]).join('\n'));
    // RFC 5545: líneas de hasta 75 octetos en UTF-8; se corta entre caracteres, nunca dentro de uno (tildes, emojis).
    const fold = (line) => {
      const out = [];
      let s = '', size = 0;
      for (const ch of line) {
        const c = ch.codePointAt(0), n = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
        if (size + n > 75) { out.push(s); s = ' '; size = 1; }
        s += ch; size += n;
      }
      out.push(s);
      return out.join('\r\n');
    };
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Florilegio//Cuidados//ES', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:' + (b.id || 'ramo') + '-' + day(first) + '@florilegio',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + day(first),
      'RRULE:FREQ=DAILY;INTERVAL=2;COUNT=' + count,
      fold('SUMMARY:' + text('Cambiar el agua de las flores' + (b.name ? ' · ' + b.name : ''))),
      fold('DESCRIPTION:' + desc),
      'END:VEVENT', 'END:VCALENDAR', ''
    ].join('\r\n');
  };

  C.download = function (b) {
    const ics = C.ics(b);
    if (!ics) return;
    FL.u.save(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'cuidados-' + FL.u.slug(b.name, 'ramo') + '.ics');
  };

})();
