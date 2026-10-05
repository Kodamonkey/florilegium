/* Florilegio — qué dice un ramo (interpret): lectura local, sin servidor. El vector de significados se comparte con compose.js. */
(function () {
  'use strict';
  const FL = window.FL;
  const R = (FL.reading = {});
  const ROLE_W = (R.ROLE_W = { focal: 1, secondary: 0.8, spike: 0.7, filler: 0.4, greenery: 0.25 });
  const TONE = {
    'Amor': 'romántico', 'Amistad': 'cercano', 'Admiración': 'admirativo', 'Gratitud': 'agradecido', 'Recuerdo': 'sereno y respetuoso',
    'Esperanza': 'esperanzador', 'Perdón': 'conciliador', 'Nuevos comienzos': 'luminoso', 'Alegría': 'alegre', 'Calma': 'sereno'
  };
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
  const firstSentence = (t) => { const s = strip(t).trim(); const m = s.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : s).trim(); };
  const lowerFirst = (R.lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1));
  const cap = (R.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1));
  // Artículo según el nombre: «la gerbera», «la flor de cerezo», pero «el girasol», «el iris».
  const article = (R.article = (name) => (/^flor\b/i.test(name) || /a$/i.test(name.split(' ')[0]) ? 'la' : 'el'));
  const phrase = (R.phrase = (id) => (FL.meaning(id) || { phrase: id.toLowerCase() }).phrase);
  // «a, b y c»; «e» ante el sonido i: «lirio e iris», «calma e hinojo».
  const list = (R.list = (arr) => (arr.length < 2 ? arr.join('')
    : arr.slice(0, -1).join(', ') + (/^h?[ií](?![aeoáéó])/i.test(arr[arr.length - 1]) ? ' e ' : ' y ') + arr[arr.length - 1]));
  const toxic = (it, lv) => ['cats', 'dogs'].some((k) => lv.includes(it.care.toxicity[k]));

  /* ---------- El vector de significados (el mismo para leer y para buscar) ---------- */
  // Peso de un tallo: su papel en el ramo y, con rendimiento decreciente, cuántos hay.
  const weightOf = (R.weight = (it, n) => (ROLE_W[it.bouquet.role] || 0.5) * (1 + Math.log2(n)));
  // Lo que dice un ítem por unidad de peso: 1 su primer significado, 0,8 los demás y 0,35 cada significado de su color
  // principal (salvo el verde). En el orden de FL.meanings. En un duelo (mourn), el color dice lo de su «mourning» si lo
  // tiene: el blanco, solo recuerdo («blanca, como se acostumbra en el duelo»), no un comienzo.
  const units = new Map();
  R.unit = function (it, mourn) {
    const key = it.id + (mourn ? '|duelo' : '');
    let u = units.get(key);
    if (u) return u;
    u = new Float64Array(FL.meanings.length);
    const at = (m) => FL.meanings.indexOf(m);
    it.meanings.forEach((m, i) => { if (at(m) >= 0) u[at(m)] += i === 0 ? 1 : 0.8; });
    const col = (it.colors[0] && it.colors[0] !== 'verde' && FL.color(it.colors[0])) || { meanings: [] };
    ((mourn && col.mourning) || col.meanings).forEach((m) => { if (at(m) >= 0) u[at(m)] += 0.35; });
    units.set(key, u);
    return u;
  };
  // Ocasiones de duelo: ahí el ramo se lee con los colores del duelo.
  const MOURN = (R.MOURN = ['condolencias', 'todos-santos']);
  // Σ peso·unidad sobre los tallos, sin normalizar.
  R.vector = function (stems, mourn) {
    const v = new Float64Array(FL.meanings.length);
    stems.forEach((s) => {
      const it = FL.item(s.item);
      if (!it) return;
      const w = weightOf(it, s.n), u = R.unit(it, mourn);
      for (let m = 0; m < v.length; m++) v[m] += w * u[m];
    });
    return v;
  };
  // Peso de cada color principal (sin el verde): da la frase del color dominante y cuánto rojo lleva el ramo.
  // «amor» guarda aparte el rojo de las flores que dicen amor: una amapola roja habla de recuerdo, no de pasión.
  function colorMass(b) {
    const colorW = {};
    let amor = 0;
    b.stems.forEach((s) => {
      const it = FL.item(s.item);
      if (!it || !it.colors[0] || it.colors[0] === 'verde') return;
      const w = weightOf(it, s.n);
      colorW[it.colors[0]] = (colorW[it.colors[0]] || 0) + w;
      if (it.colors[0] === 'rojo' && it.meanings.includes('Amor')) amor += w;
    });
    Object.defineProperty(colorW, 'amor', { value: amor, enumerable: false });
    return colorW;
  }
  const redShare = (colorW) => { const cw = Object.values(colorW).reduce((a, v) => a + v, 0); return cw ? (colorW.amor || 0) / cw : 0; };
  // El amor se lee como declaración solo si el pedido es de pareja y pesa el rojo de las flores de amor: un ramo de familia
  // dice «cariño» aunque lleve amapolas o tulipanes rojos. Sin pedido (un ramo armado a mano), decide solo el rojo.
  const tender = () => (FL.meaning('Amor') || {}).tender || 'cariño';
  const phraseIn = (red, id, romance) => (id === 'Amor' && (romance === false || red < 0.3) ? tender() : phrase(id));
  // Lo que pedía el ramo (su intención guardada): romance, la mezcla buscada y los colores; null si no hay pedido.
  const asks = new Map();
  const askOf = (b) => {
    const it = b && b.intent;
    if (!it || !(it.text || (it.feelings || []).length) || !R.detect || !R.parse) return null;
    const key = (it.text || '') + '|' + (it.feelings || []).join(',') + '|' + (b.occasion || '');
    if (!asks.has(key)) {
      if (asks.size > 200) asks.clear();
      const ask = R.parse(it.text || ''), d = R.detect({ text: it.text || '', feelings: it.feelings || [], occasion: b.occasion || '' }, ask);
      asks.set(key, { romance: !!d.romance, target: d.target || {}, colors: ask.colors, avoidColors: ask.avoidColors });
    }
    return asks.get(key);
  };
  // ¿El pedido del ramo es de pareja? true/false si se sabe (opts.romance o su intención guardada); null si no hay pedido.
  const romanceOf = (R.romanceOf = function (b, romance) {
    if (typeof romance === 'boolean') return romance;
    const a = askOf(b);
    return a ? a.romance : null;
  });
  R.phraseFor = (b, id, romance) => phraseIn(redShare(colorMass(b)), id, romanceOf(b, romance));

  /* ---------- Qué dice un ramo ---------- */
  // opts: { petSafe, exclude[] } para no sugerir una flor tóxica o que se pidió dejar fuera; { romance, target, colors[],
  // avoidColors[], top } si ya se saben (si no, salen de la intención guardada del ramo).
  R.interpret = function (b, opts) {
    opts = opts || {};
    const T = FL.taxonomy;
    const romance = romanceOf(b, opts.romance);
    const a = askOf(b), want = opts.target || (a && a.target) || null;
    const mourning = MOURN.includes(b.occasion);
    const colors = opts.colors || (a ? a.colors : []), avoidColors = opts.avoidColors || (a ? a.avoidColors : []);
    const aim = opts.top || (want ? Object.keys(want).filter((m) => want[m] > 0).sort((x, y) => want[y] - want[x])[0] : null);
    // Lo que el pedido no quería decir no se nombra como nota: perdón o recuerdo fuera de su lugar; en un duelo, alegría o
    // un comienzo («Este ramo habla de recuerdo, con notas de calma», no «y nuevos comienzos»).
    const hush = new Set((mourning ? ['Perdón', 'Alegría', 'Nuevos comienzos'] : want ? ['Recuerdo', 'Perdón'] : []).filter((m) => !(want && want[m] > 0)));
    const perItem = [];
    const items = [];
    b.stems.forEach((s) => {
      const it = FL.item(s.item);
      if (!it) return;
      items.push({ it, n: s.n });
      perItem.push({
        item: it.id, name: it.name, n: s.n, role: it.bouquet.role,
        says: it.type === 'flower' ? firstSentence(it.culture.gift) : firstSentence(it.symbol)
      });
    });
    // Lo mismo que optimiza el buscador: Σ peso·unidad (el término del color es lineal, va dentro de la unidad).
    const v = R.vector(b.stems, mourning), score = {};
    FL.meanings.forEach((m, i) => { score[m] = v[i]; });
    const colorW = colorMass(b), red = redShare(colorW);
    const say = (id) => phraseIn(red, id, romance);
    const sum = Object.values(score).reduce((a, x) => a + x, 0) || 1;
    const meanings = Object.entries(score).filter(([, x]) => x > 0).sort((a, c) => c[1] - a[1]).map(([id, x]) => ({ id, weight: +(x / sum).toFixed(3) }));

    const flowers = B().flowerCount(b), total = B().total(b);
    const parts = [];
    const top = meanings.slice(0, 3);
    if (!top.length) parts.push('Es un ramo sobre todo de forma y color: sus elementos no cargan un significado tradicional marcado.');
    else if (top.length === 1 || top[0].weight > 0.5) parts.push('Este ramo habla sobre todo de ' + say(top[0].id) + '.');
    else {
      const rest = top.slice(1).filter((m) => m.weight > 0.1 && !hush.has(m.id)).map((m) => say(m.id));
      parts.push('Este ramo habla de ' + say(top[0].id) + (rest.length ? ', con notas de ' + list(rest) : '') + '.');
    }

    const lead = items.slice().sort((a, c) => weightOf(c.it, c.n) - weightOf(a.it, a.n))[0];
    if (lead && lead.it.type === 'flower') {
      const nm = lead.it.name.toLowerCase(), gift = firstSentence(lead.it.culture.gift);
      // Sin romance (o en un duelo), la tradición de la rosa roja («declarar amor») no se le atribuye al ramo; ni la
      // disculpa del jacinto a un ramo que no la pedía («te extraño, de color morado»), salvo en un duelo («lo siento»).
      const quiet = ((romance === false || mourning) && /declar\S*\s+(de\s+)?amor/i.test(gift)) ||
        (!mourning && hush.has('Perdón') && /lo siento|disculpa|perd[oó]n/i.test(gift));
      // «Las flores de cerezo» (no «de flor de cerezo»); un solo «:» por oración: «honrar algo (un comienzo, una unión…).»
      const says = lowerFirst(gift).replace(/:\s+(.*?)([.!?]?)$/, ' ($1)$2');
      parts.push((lead.n > 1 ? 'Las flores de ' + nm.replace(/^flor de /, '') + ' llevan' : cap(article(lead.it.name) + ' ' + nm) + ' lleva') + ' la voz principal' + (quiet ? '.' : ': ' + says));
    }
    // La docena de una misma flor protagonista es la tradición occidental: no se le pide que sea impar. Como declaración
    // solo se nombra si la docena lleva la voz principal, es de una flor que dice amor y el ramo puede ser de pareja
    // (no en un duelo): doce hortensias por un «te amo» no son la docena de la tradición.
    const dozen = items.some((x) => x.n === 12 && x.it.bouquet.role === 'focal');
    const declared = dozen && !!lead && lead.n === 12 && lead.it.bouquet.role === 'focal' && lead.it.meanings.includes('Amor') && romance !== false && !mourning;
    if (flowers === 1) parts.push(T.numbers.single);
    else if (declared) parts.push(T.numbers.dozen);
    else if (total >= 24) parts.push(T.numbers.abundance);
    const domColor = Object.entries(colorW).sort((a, c) => c[1] - a[1])[0];
    const cw = Object.values(colorW).reduce((a, v) => a + v, 0);
    const dc = (domColor && FL.color(domColor[0])) || {};
    const colorText = domColor && domColor[1] / cw > 0.55 ? (mourning && dc.mourningText) || dc.text || '' : '';
    if (colorText && !((romance === false || mourning) && /amor declarado/.test(colorText))) parts.push(colorText);

    const suggestions = [];
    if (b.occasion) {
      const occ = FL.occasion(b.occasion);
      if (occ) {
        const hit = occ.meanings.filter((m) => top.some((t) => t.id === m));
        // «San Valentín», «Navidad», «Día de la Madre» llevan mayúscula; «cumpleaños», «boda», no.
        const nm = /^(Día|San|Navidad|Todos)\b/.test(occ.name) ? occ.name : occ.name.toLowerCase();
        if (hit.length) parts.push('Encaja con la ocasión: ' + nm + '.');
        else {
          const cand = bestFor(occ.meanings, { exclude: b.stems.map((s) => s.item).concat(opts.exclude || []), roles: ['focal', 'secondary'], petSafe: opts.petSafe, colors, avoidColors });
          if (cand) {
            parts.push('Para ' + forOcc(occ, nm) + ', podrías sumar ' + cand.name.toLowerCase() + ', que habla de ' + say(occ.meanings[0]) + '.');
            suggestions.push({ action: 'add', item: cand.id, n: 3, why: 'Aporta ' + say(occ.meanings[0]) + ', propio de la ocasión.' });
          }
        }
      }
    }

    const notes = [];
    items.forEach(({ it }) => { if (it.type === 'flower' && it.culture.note) notes.push(it.name + ': ' + strip(it.culture.note)); });

    const warnings = [];
    const cats = items.filter(({ it }) => it.care.toxicity.cats === 'alta').map(({ it }) => it.name.toLowerCase());
    if (cats.length) warnings.push('Si hay gatos en casa, cuidado: ' + list(cats) + (cats.length > 1 ? ' son muy tóxicos' : ' es muy tóxico') + ' para ellos.');
    const pets = items.filter(({ it }) => toxic(it, ['media'])).map(({ it }) => it.name.toLowerCase());
    if (pets.length) warnings.push('Tóxicos para mascotas si los muerden: ' + list(pets) + '.');
    items.forEach(({ it }) => { if (it.bouquet.caution && it.care.toxicity.cats !== 'alta') warnings.push(it.name + ': ' + it.bouquet.caution); });
    const even = flowers > 1 && flowers % 2 === 0 && !dozen && !mourning;
    if (even) warnings.push(T.numbers.even);

    const room = total < FL.limits.stems && b.stems.length < FL.limits.items;
    if (room && total >= 3 && !items.some(({ it }) => it.bouquet.role === 'greenery')) {
      suggestions.push({ action: 'add', item: opts.petSafe ? 'ruscus' : 'eucalipto', n: 3, why: 'Un poco de follaje le daría marco y frescura.' });
    }
    // La protagonista sugerida refuerza lo que se quería decir (si se sabe) y respeta los colores pedidos.
    if (total >= 5 && !items.some(({ it }) => it.bouquet.role === 'focal') && top.length) {
      const goal = aim || top[0].id;
      const cand = bestFor([goal], { exclude: b.stems.map((s) => s.item).concat(opts.exclude || []), roles: ['focal'], petSafe: opts.petSafe, colors, avoidColors });
      if (cand && room) suggestions.push({ action: 'add', item: cand.id, n: 3, why: 'Una flor protagonista reforzaría ' + say(goal) + '.' });
    }
    if (even && total < FL.limits.stems) {
      const most = items.filter(({ it, n }) => it.type === 'flower' && n < FL.limits.stemsPerItem && !(n === 12 && it.bouquet.role === 'focal')).sort((a, c) => c.n - a.n)[0];
      if (most) suggestions.push({ action: 'add', item: most.it.id, n: 1, why: 'Con un tallo más quedaría en número impar.' });
    }

    return {
      source: 'local',
      summary: parts.filter(Boolean).join(' '),
      tone: !top.length ? 'neutro' : top[0].id === 'Amor' && (romance === false || red < 0.3) ? 'tierno' : TONE[top[0].id],
      meanings, perItem, notes, warnings, suggestions
    };
  };

  // Lo que se muestra de un ramo: la lectura local, con lo que dice cada flor, los avisos y las sugerencias.
  // La usan el taller y la lámina descargable.
  R.display = function (b, opts) {
    const r = R.interpret(b, opts);
    return { source: 'local', summary: r.summary, meanings: r.meanings.slice(0, 5), notes: r.notes, warnings: r.warnings, perItem: r.perItem, suggestions: r.suggestions || [] };
  };

  // «Para una boda», «para el Día de la Madre», «para pedir perdón»: la ocasión con su artículo (o su verbo).
  const FOR = { cumpleanos: 'un cumpleaños', aniversario: 'un aniversario', boda: 'una boda', nacimiento: 'un nacimiento', graduacion: 'una graduación',
    condolencias: 'dar el pésame', recuperacion: 'desear una pronta recuperación', amistad: 'celebrar una amistad', 'porque-si': 'regalar porque sí',
    'flores-amarillas': 'el día de las flores amarillas' };
  const forOcc = (occ, nm) => FOR[occ.id] || (/^Día\b/.test(occ.name) ? 'el ' + nm : /^[A-ZÁÉÍÓÚ]/.test(nm) ? nm : nm.toLowerCase());

  // Mejor ítem del catálogo para unos significados (con filtros básicos).
  function bestFor(meanings, o = {}) {
    let best = null, bestS = 0;
    FL.items.forEach((it) => {
      if ((o.exclude || []).includes(it.id) || (o.roles && !o.roles.includes(it.bouquet.role)) || !it.bouquet.florist) return;
      if (o.petSafe && toxic(it, ['media', 'alta'])) return;
      if ((o.colors || []).length && !it.colors.some((c) => o.colors.includes(c))) return;
      if ((o.avoidColors || []).length && it.colors.every((c) => o.avoidColors.includes(c))) return;
      let s = 0;
      meanings.forEach((m, i) => { if (it.meanings.includes(m)) s += (it.meanings[0] === m ? 1.2 : 1) / (i + 1); });
      if (s > bestS) { best = it; bestS = s; }
    });
    return best;
  }

  function B() { return FL.bouquet; }
})();
