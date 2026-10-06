/* Florilegio — cuándo se regalan flores: la fecha, el porqué y qué flores del jardín encajan. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const C = (FL.calendar = {});
  const $ = (id) => document.getElementById(id);

  // Por qué se regala y qué flores del catálogo lo sostienen. El texto sigue tradiciones ya contadas en el jardín.
  const GUIDE = {
    'san-valentin': {
      why: 'El lenguaje de las flores del siglo XIX fijó la rosa roja como declaración de amor, y el San Valentín moderno convirtió la docena en el ramo que todo el mundo reconoce. Una sola rosa dice lo mismo, más de cerca.',
      flowers: ['rosa-roja']
    },
    'dia-mujer': {
      why: 'Se regala para reconocer y agradecer. En este jardín, la gratitud se dice con hortensia, rosa rosada y clavel.',
      flowers: ['hortensia', 'rosa-rosada', 'clavel']
    },
    'sant-jordi': {
      why: 'En Cataluña, cada 23 de abril se regala una rosa roja, tradicionalmente a cambio de un libro. Es el mismo gesto íntimo de una sola rosa.',
      flowers: ['rosa-roja']
    },
    'dia-madre': {
      why: 'Anna Jarvis eligió el clavel para el primer Día de la Madre en Estados Unidos. Desde entonces, claveles y rosas rosadas dominan esos ramos. Donde es primavera, también se piden peonías.',
      flowers: ['clavel', 'rosa-rosada', 'peonia']
    },
    'dia-padre': {
      why: 'No hay una flor única en la tradición occidental de este jardín. En Corea se regalan claveles ese día. Para la gratitud y la admiración que pide la fecha, encajan también el girasol y la rosa amarilla.',
      flowers: ['clavel', 'girasol', 'rosa-amarilla']
    },
    'flores-amarillas': {
      why: 'Costumbre reciente en varios países de Latinoamérica, difundida por redes e inspirada en una canción de la teleserie argentina «Floricienta». El amarillo se lee hoy como amistad. En el hemisferio sur coincide con la primavera; en México, con el otoño.',
      flowers: ['rosa-amarilla', 'alstroemeria', 'fresia', 'girasol']
    },
    'dia-profesor': {
      why: 'Es un ramo de gracias. La hortensia y la rosa rosada son de las flores que más se asocian a la gratitud; el clavel las acompaña.',
      flowers: ['hortensia', 'rosa-rosada', 'clavel']
    },
    'todos-santos': {
      why: 'En Francia, España, Italia y buena parte de Latinoamérica, los crisantemos se llevan al cementerio el 1 de noviembre: en el hemisferio norte florecen justo entonces. Por eso allí casi no se regalan en fiestas. El lirio blanco y la rosa blanca acompañan el recuerdo.',
      flowers: ['crisantemo', 'lirio', 'rosa-blanca']
    },
    'navidad': {
      why: 'Se regala para celebrar y desear alegría. Este jardín no incluye la flor de Pascua. Si es invierno, encajan camelias y anémonas; si es verano, girasoles y margaritas.',
      flowers: ['camelia', 'anemona', 'girasol', 'margarita']
    },
    'cumpleanos': {
      why: 'Gerberas y alstroemerias se cultivan todo el año y duran muchos días: por eso llenan los ramos de cumpleaños. Las margaritas suman alegría.',
      flowers: ['gerbera', 'alstroemeria', 'margarita']
    },
    'aniversario': {
      why: 'Sigue siendo una declaración. La rosa roja es la forma clásica; si es primavera, las peonías dicen el mismo amor.',
      flowers: ['rosa-roja', 'peonia']
    },
    'boda': {
      why: 'El blanco nupcial se popularizó en el siglo XIX y arrastró al ramo. Rosas blancas y gypsophila, llamada también velo de novia, arman el clásico. En primavera se suman peonías, ranúnculos y fresias.',
      flowers: ['rosa-blanca', 'gypsophila', 'peonia', 'ranunculo', 'fresia']
    },
    'nacimiento': {
      why: 'Colores suaves para dar la bienvenida: rosa rosada, margarita y gypsophila. Si hay un recién nacido, conviene evitar las flores de perfume fuerte.',
      flowers: ['rosa-rosada', 'margarita', 'gypsophila']
    },
    'graduacion': {
      why: 'Amarillos para decir «te admiro». Girasoles y rosas amarillas son habituales en graduaciones y estrenos.',
      flowers: ['girasol', 'rosa-amarilla']
    },
    'condolencias': {
      why: 'En Occidente, el lirio blanco y la rosa blanca hablan de respeto y de paz. El crisantemo, en muchos países de Europa y Latinoamérica, se reserva al cementerio. Si hay gatos, el lirio se cambia por lisianthus blanco.',
      flowers: ['lirio', 'rosa-blanca', 'lisianthus', 'crisantemo']
    },
    'recuperacion': {
      why: 'Para visitar a alguien enfermo se prefieren flores alegres y de poco perfume: gerbera, rosa amarilla y margarita. Conviene preguntar antes: algunas unidades de hospital no permiten flores.',
      flowers: ['gerbera', 'rosa-amarilla', 'margarita']
    },
    'disculpa': {
      why: 'En los códigos florales modernos, el jacinto morado se asocia a la disculpa y la rosa blanca suma respeto. Las palabras de la tarjeta hacen el resto.',
      flowers: ['jacinto', 'rosa-blanca']
    },
    'agradecimiento': {
      why: 'En la floristería actual, la hortensia y la rosa rosada son dos de las flores que más se asocian a la gratitud. El clavel las acompaña.',
      flowers: ['hortensia', 'rosa-rosada', 'clavel']
    },
    'amistad': {
      why: 'El girasol dice «me alegras el día» casi en cualquier idioma, y el amarillo es hoy el color de la amistad. Margaritas, lavanda y alstroemeria dicen lo mismo con otro carácter.',
      flowers: ['girasol', 'rosa-amarilla', 'alstroemeria', 'margarita', 'lavanda']
    },
    'porque-si': {
      why: 'No hace falta una fecha. Una sola rosa es el gesto íntimo. Un ramo de campo —margaritas, lavanda, amapolas— tampoco pide motivo.',
      flowers: ['rosa-roja', 'margarita', 'lavanda', 'amapola']
    }
  };

  // Sant Jordi está documentado en la rosa roja y no es una ocasión del taller: vive solo en este calendario.
  const EXTRA = [{ id: 'sant-jordi', name: 'Sant Jordi', date: { month: 4, day: 23 } }];

  let root, lastFocus = null, query = '';

  C.list = function (from) {
    const today = from || new Date();
    const row = (id, name, date, note) => {
      const g = GUIDE[id];
      return {
        id, name, why: g.why, note: note || '', flowers: g.flowers.slice(),
        when: date ? FL.occasionDate({ date }, today) : null,
        theme: !!(FL.occasion(id) && FL.popular.some((p) => p.occasions.includes(id)))
      };
    };
    const dated = FL.taxonomy.occasions.filter((o) => o.date).map((o) => row(o.id, o.name, o.date, o.note))
      .concat(EXTRA.map((o) => row(o.id, o.name, o.date, '')));
    dated.sort((a, b) => a.when - b.when);
    const open = FL.taxonomy.occasions.filter((o) => !o.date).map((o) => row(o.id, o.name, null, o.note));
    return dated.concat(open);
  };

  C.init = function () {
    root = $('calendar');
    $('fechasBtn').addEventListener('click', () => C.open());
    root.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.id === 'calClose') { C.close(); return; }
      if (t.dataset.flower) {
        const id = t.dataset.flower;
        C.close(true);
        const head = FL.garden.headOf(id);
        if (head) head.scrollIntoView({ block: 'center' });
        FL.focus.open(FL.byId(id), head);
        return;
      }
      if (t.dataset.theme) {
        const theme = t.dataset.theme;
        C.close(true);
        FL.showcase.open({ theme });
        return;
      }
      // Un ramo nuevo para la fecha: con su ocasión si el taller la conoce; si no (Sant Jordi), con su flor.
      if (t.dataset.make) {
        const id = t.dataset.make, o = C.list().find((x) => x.id === id);
        C.close(true);
        FL.atelier.open(FL.occasion(id) ? { occasion: id } : { fresh: true, add: o && o.flowers[0] });
      }
    });
    $('calSearch').addEventListener('input', (e) => { query = e.target.value; paint(); });
    root.addEventListener('keydown', (e) => {
      // «/» lleva al buscador desde cualquier parte del calendario.
      if (e.key === '/' && !e.target.closest('input, textarea, select')) { e.preventDefault(); $('calSearch').focus(); return; }
      if (e.key !== 'Tab') return;
      const els = U.withNearby(Array.from(root.querySelectorAll('button, [href], summary, input')).filter((x) => x.offsetParent !== null));
      if (!els.length) return;
      if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
    });
  };

  C.open = function () {
    if (!root.hidden) return;
    if (FL.focus.isOpen()) FL.focus.close();
    FL.explore.close(true);
    if (FL.days.isOpen()) FL.days.close(true);
    if (FL.atelier.isOpen()) FL.atelier.close(true);
    if (FL.showcase.isOpen()) FL.showcase.close(true);
    if (FL.gift.isOpen()) FL.gift.close(true);
    lastFocus = document.activeElement;
    root.hidden = false;
    U.syncSheets();
    paint();
    requestAnimationFrame(() => root.classList.add('on'));
    try { history.replaceState(null, '', '#fechas'); } catch (e) { /* sin historial */ }
    setTimeout(() => $('calClose').focus({ preventScroll: true }), 60);
  };

  C.close = function (instant) {
    if (!root || root.hidden) return;
    root.classList.remove('on');
    const done = () => {
      root.hidden = true;
      U.syncSheets();
      if (location.hash === '#fechas') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* sin historial */ } }
      if (!instant) U.refocus(lastFocus, $('fechasBtn'));
    };
    if (instant || FL.reduce) done(); else setTimeout(done, 380);
  };

  C.isOpen = () => !!(root && !root.hidden);

  // Cuánto falta, en la unidad que se lee de un vistazo.
  function daysTo(d, today) { return Math.round((d - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5); }
  function soon(d, today) {
    const n = daysTo(d, today);
    if (n === 0) return 'hoy';
    if (n === 1) return 'mañana';
    if (n < 14) return 'en ' + n + ' días';
    if (n < 60) return 'en ' + Math.round(n / 7) + ' semanas';
    const m = Math.floor(n / 30.4);
    return m === 1 ? 'en un mes' : 'en ' + m + ' meses';
  }

  function whenLabel(d, today) {
    const text = d.toLocaleDateString('es', { day: 'numeric', month: 'long' });
    return text + (d.getFullYear() !== today.getFullYear() ? ' de ' + d.getFullYear() : '');
  }

  const CHEV = '<svg class="cal-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
  const img = (id) => (FL.canImage ? FL.headImg(FL.item(id), { open: true, pad: 0.15 }) : '');

  function flowerBtn(id) {
    const it = FL.item(id);
    const head = '<i class="cal-head">' + img(id) + '</i><span>' + U.esc(it.name) + '</span>';
    return FL.byId(id)
      ? '<li><button type="button" data-flower="' + id + '">' + head + '</button></li>'
      : '<li><span class="cal-static">' + head + '</span></li>';
  }

  // El día grande y el mes abreviado: la columna que se recorre con la vista.
  function dateBlock(d) {
    return '<span class="cal-date" aria-hidden="true"><b>' + d.getDate() + '</b>' +
      d.toLocaleDateString('es', { month: 'short' }).replace('.', '') + '</span>';
  }

  // Lo que se lee al abrir una fecha: el porqué, las flores y qué hacer con ellas.
  function detail(o) {
    return '<p class="cal-why">' + U.esc(o.why) + '</p>' +
      (o.note ? '<p class="cal-note">' + U.esc(o.note) + '</p>' : '') +
      '<ul class="cal-flowers" aria-label="Flores que encajan">' + o.flowers.map(flowerBtn).join('') + '</ul>' +
      '<div class="cal-actions"><button type="button" class="pillbtn pillbtn--solid" data-make="' + o.id + '">Armar un ramo</button>' +
      (o.theme ? '<button type="button" class="pillbtn" data-theme="' + o.id + '">Ver ramos</button>' : '') + '</div>';
  }

  function hero(o, today) {
    const n = daysTo(o.when, today);
    return '<article class="cal-next" id="cal-' + o.id + '" aria-labelledby="calNextName">' +
      '<div class="cal-next-body">' +
      '<p class="cal-kicker">' + (n === 0 ? 'Hoy' : 'La próxima · <span>' + soon(o.when, today) + '</span>') + '</p>' +
      '<h3 id="calNextName">' + U.esc(o.name) + '</h3>' +
      '<p class="cal-fulldate">' + whenLabel(o.when, today) + '</p>' + detail(o) + '</div>' +
      '<div class="cal-next-art" aria-hidden="true">' + o.flowers.slice(0, 3).map((id) => '<i>' + img(id) + '</i>').join('') + '</div>' +
      '</article>';
  }

  function item(o, today) {
    return '<li class="cal-item" id="cal-' + o.id + '"><details><summary>' +
      (o.when ? dateBlock(o.when) + '<span class="sr">' + whenLabel(o.when, today) + ': </span>' : '') +
      '<span class="cal-item-main"><span class="cal-item-name">' + U.esc(o.name) + '</span>' +
      (o.when ? '<span class="cal-item-soon">' + soon(o.when, today) + '</span>' : '') + '</span>' +
      '<span class="cal-heads" aria-hidden="true">' + o.flowers.slice(0, 3).map((id) => '<i>' + img(id) + '</i>').join('') + '</span>' +
      CHEV + '</summary><div class="cal-item-body">' + detail(o) + '</div></details></li>';
  }

  // Lo que se puede buscar de cada fecha: nombre, otras formas de decirla, el porqué, la nota, el día y las flores.
  function haystack(o, today) {
    const occ = FL.occasion(o.id);
    return U.norm([o.name, o.why, o.note, o.when ? whenLabel(o.when, today) : 'sin dia fijo']
      .concat((occ && occ.words) || [], o.flowers.map((id) => (FL.item(id) || {}).name || '')).join(' '));
  }

  // Con una búsqueda, una sola lista con lo que coincide (todas las palabras, sin importar tildes); si es una, abierta.
  function results(all, today) {
    const found = all.filter((o) => U.matches(haystack(o, today), query));
    if (!found.length) {
      return '<p class="cal-empty">Nada con «' + U.esc(query.trim()) + '». Prueba con un mes, una ocasión o una flor.</p>';
    }
    const html = found.map((o) => item(o, today)).join('');
    return '<section aria-labelledby="calFound"><h3 class="cal-group" id="calFound">' +
      (found.length === 1 ? '1 fecha' : found.length + ' fechas') + '</h3><ul class="cal-list">' +
      (found.length === 1 ? html.replace('<details>', '<details open>') : html) + '</ul></section>';
  }

  function paint() {
    const today = new Date();
    const all = C.list(today);
    if (query.trim()) { $('calBody').innerHTML = results(all, today); return; }
    const dated = all.filter((o) => o.when);
    const open = all.filter((o) => !o.when);
    const next = dated[0];
    // Al cambiar de año, el año queda marcado en la lista.
    let year = today.getFullYear();
    const rows = dated.slice(1).map((o) => {
      const y = o.when.getFullYear(), mark = y !== year ? '<li class="cal-year">' + y + '</li>' : '';
      year = y;
      return mark + item(o, today);
    }).join('');
    $('calBody').innerHTML = (next ? hero(next, today) : '') +
      '<section aria-labelledby="calYear"><h3 class="cal-group" id="calYear">Durante el año</h3><ul class="cal-list">' + rows + '</ul></section>' +
      '<section aria-labelledby="calOpen"><h3 class="cal-group" id="calOpen">Sin día fijo</h3><ul class="cal-list cal-list--grid">' +
      open.map((o) => item(o, today)).join('') + '</ul></section>';
  }
})();
