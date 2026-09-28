/* Florilegio — lectura local de ramos: qué dice un ramo (interpret) y qué ramo dice lo que sientes (compose).
   Funciona sin servidor; cuando el agente de IA está disponible, esta lectura queda como respaldo. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const R = (FL.reading = {});
  const ROLE_W = { focal: 1, secondary: 0.8, spike: 0.7, filler: 0.4, greenery: 0.25 };
  const TONE = {
    'Amor': 'romántico', 'Amistad': 'cercano', 'Admiración': 'admirativo', 'Gratitud': 'agradecido', 'Recuerdo': 'sereno y respetuoso',
    'Esperanza': 'esperanzador', 'Perdón': 'conciliador', 'Nuevos comienzos': 'luminoso', 'Alegría': 'alegre', 'Calma': 'sereno'
  };
  const RIBBON = {
    'Amor': '#a3182b', 'Amistad': '#e7c25c', 'Admiración': '#7d69bb', 'Gratitud': '#b54470', 'Recuerdo': '#f4f0e4',
    'Esperanza': '#4d6647', 'Perdón': '#7d69bb', 'Nuevos comienzos': '#f4f0e4', 'Alegría': '#e7c25c', 'Calma': '#6f97e0'
  };
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, '');
  const firstSentence = (t) => { const s = strip(t).trim(); const m = s.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : s).trim(); };
  const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // Artículo según el nombre: «la gerbera», «la flor de cerezo», pero «el girasol», «el iris».
  const article = (name) => (/^flor\b/i.test(name) || /a$/i.test(name.split(' ')[0]) ? 'la' : 'el');
  const phrase = (id) => (FL.meaning(id) || { phrase: id.toLowerCase() }).phrase;
  const list = (arr) => (arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1]);
  const weightOf = (it, n) => (ROLE_W[it.bouquet.role] || 0.5) * (1 + Math.log2(n));
  const toxic = (it, lv) => ['cats', 'dogs'].some((k) => lv.includes(it.care.toxicity[k]));

  /* ---------- Qué dice un ramo ---------- */
  R.interpret = function (b) {
    const T = FL.taxonomy;
    const score = Object.fromEntries(FL.meanings.map((m) => [m, 0]));
    const colorW = {}, perItem = [];
    const items = [];
    b.stems.forEach((s) => {
      const it = FL.item(s.item);
      if (!it) return;
      items.push({ it, n: s.n });
      const w = weightOf(it, s.n);
      it.meanings.forEach((m, i) => { score[m] += w * (i === 0 ? 1 : 0.8); });
      if (it.colors[0] && it.colors[0] !== 'verde') colorW[it.colors[0]] = (colorW[it.colors[0]] || 0) + w;
      perItem.push({
        item: it.id, name: it.name, n: s.n, role: it.bouquet.role,
        says: it.type === 'flower' ? firstSentence(it.culture.gift) : firstSentence(it.symbol)
      });
    });
    Object.entries(colorW).forEach(([c, w]) => { (FL.color(c) || { meanings: [] }).meanings.forEach((m) => { score[m] += w * 0.35; }); });
    const sum = Object.values(score).reduce((a, v) => a + v, 0) || 1;
    const meanings = Object.entries(score).filter(([, v]) => v > 0).sort((a, c) => c[1] - a[1]).map(([id, v]) => ({ id, weight: +(v / sum).toFixed(3) }));

    const flowers = B().flowerCount(b), total = B().total(b);
    const parts = [];
    const top = meanings.slice(0, 3);
    if (!top.length) parts.push('Es un ramo sobre todo de forma y color: sus elementos no cargan un significado tradicional marcado.');
    else if (top.length === 1 || top[0].weight > 0.5) parts.push('Este ramo habla sobre todo de ' + phrase(top[0].id) + '.');
    else {
      const rest = top.slice(1).filter((m) => m.weight > 0.1).map((m) => phrase(m.id));
      parts.push('Este ramo habla de ' + phrase(top[0].id) + (rest.length ? ', con notas de ' + list(rest) : '') + '.');
    }

    const lead = items.slice().sort((a, c) => weightOf(c.it, c.n) - weightOf(a.it, a.n))[0];
    if (lead && lead.it.type === 'flower') {
      const nm = lead.it.name.toLowerCase();
      parts.push((lead.n > 1 ? 'Las flores de ' + nm + ' llevan' : cap(article(lead.it.name) + ' ' + nm) + ' lleva') + ' la voz principal: ' + lowerFirst(firstSentence(lead.it.culture.gift)));
    }
    // La docena de una misma flor protagonista es la tradición occidental: no se le pide que sea impar.
    const dozen = items.some((x) => x.n === 12 && x.it.bouquet.role === 'focal');
    if (flowers === 1) parts.push(T.numbers.single);
    else if (dozen) parts.push(T.numbers.dozen);
    else if (total >= 24) parts.push(T.numbers.abundance);
    const domColor = Object.entries(colorW).sort((a, c) => c[1] - a[1])[0];
    const cw = Object.values(colorW).reduce((a, v) => a + v, 0);
    if (domColor && domColor[1] / cw > 0.55) parts.push((FL.color(domColor[0]) || {}).text || '');

    const suggestions = [];
    if (b.occasion) {
      const occ = FL.occasion(b.occasion);
      if (occ) {
        const hit = occ.meanings.filter((m) => top.some((t) => t.id === m));
        if (hit.length) parts.push('Encaja con la ocasión: ' + occ.name.toLowerCase() + '.');
        else {
          const cand = bestFor(occ.meanings, { exclude: b.stems.map((s) => s.item), roles: ['focal', 'secondary'] });
          if (cand) {
            parts.push('Para ' + occ.name.toLowerCase() + ', podrías sumar ' + cand.name.toLowerCase() + ', que habla de ' + phrase(occ.meanings[0]) + '.');
            suggestions.push({ action: 'add', item: cand.id, n: 3, why: 'Aporta ' + phrase(occ.meanings[0]) + ', propio de la ocasión.' });
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
    const mourning = ['condolencias', 'todos-santos'].includes(b.occasion);
    const even = flowers > 1 && flowers % 2 === 0 && !dozen && !mourning;
    if (even) warnings.push(T.numbers.even);

    const room = total < FL.limits.stems && b.stems.length < FL.limits.items;
    if (room && total >= 3 && !items.some(({ it }) => it.bouquet.role === 'greenery')) {
      suggestions.push({ action: 'add', item: 'eucalipto', n: 3, why: 'Un poco de follaje le daría marco y frescura.' });
    }
    if (total >= 5 && !items.some(({ it }) => it.bouquet.role === 'focal') && top.length) {
      const cand = bestFor([top[0].id], { exclude: b.stems.map((s) => s.item), roles: ['focal'] });
      if (cand && room) suggestions.push({ action: 'add', item: cand.id, n: 3, why: 'Una flor protagonista reforzaría ' + phrase(top[0].id) + '.' });
    }
    if (even && total < FL.limits.stems) {
      const most = items.filter(({ it, n }) => it.type === 'flower' && n < FL.limits.stemsPerItem && !(n === 12 && it.bouquet.role === 'focal')).sort((a, c) => c.n - a.n)[0];
      if (most) suggestions.push({ action: 'add', item: most.it.id, n: 1, why: 'Con un tallo más quedaría en número impar.' });
    }

    return {
      source: 'local',
      summary: parts.filter(Boolean).join(' '),
      tone: top.length ? TONE[top[0].id] : 'neutro',
      meanings, perItem, notes, warnings, suggestions
    };
  };

  // Mejor ítem del catálogo para unos significados (con filtros básicos).
  function bestFor(meanings, o = {}) {
    let best = null, bestS = 0;
    FL.items.forEach((it) => {
      if ((o.exclude || []).includes(it.id) || (o.roles && !o.roles.includes(it.bouquet.role)) || !it.bouquet.florist) return;
      let s = 0;
      meanings.forEach((m, i) => { if (it.meanings.includes(m)) s += (it.meanings[0] === m ? 1.2 : 1) / (i + 1); });
      if (s > bestS) { best = it; bestS = s; }
    });
    return best;
  }

  /* ---------- Qué pide el texto: tamaño, cantidad, flores, colores y ocasión ---------- */
  // El vocabulario del catálogo vive en data/taxonomy.json (alias de flores y «words» de ocasiones y
  // colores, en minúsculas sin tildes; «*» al final acepta cualquier terminación: gradu* → graduación).
  // Aquí va la mecánica del idioma: números, negaciones y tamaños.

  // Minúsculas sin tildes y con el mismo largo que el original: así se puede mirar la mayúscula del texto real.
  const fold = (s) => Array.from(String(s || ''), (c) => { const f = U.norm(c); return f.length === c.length ? f : c; }).join('');
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const B0 = '(?<![a-z0-9])', B1 = '(?![a-z0-9])';
  const LINK = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y']);
  // «rosa roja» calza también «rosas rojas» (plural en cada palabra); «gradu*» calza «graduación».
  function phraseRe(p, plural) {
    return B0 + fold(p).trim().split(/\s+/).map((w) => (w.endsWith('*') ? reEsc(w.slice(0, -1)) + '[a-z]*'
      : reEsc(w) + (plural && !LINK.has(w) && !/s$/.test(w) ? '(?:es|s)?' : ''))).join('\\s+') + B1;
  }

  const NUMS = {
    'dos docenas': 24, 'media docena': 6, docena: 12, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
    ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
    diecinueve: 19, veinte: 20, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, treinta: 30,
    cuarenta: 40, cincuenta: 50, cien: 100
  };
  const NUM = '(\\d{1,3}|' + Object.keys(NUMS).join('|').replace(/ /g, '\\s+') + ')';
  const numOf = (s) => (/^\d/.test(s) ? parseInt(s, 10) : NUMS[s.replace(/\s+/g, ' ')]);
  const COUNT_BEFORE = new RegExp(B0 + NUM + '(?:\\s+sol[oa]s?)?(?:\\s+de)?\\s*$');
  const COUNT_TOTAL = new RegExp(B0 + NUM + '(?:\\s+sol[oa]s?)?\\s+(?:flor(?:es)?|tallos?|varas?)' + B1);
  const ONLY = new RegExp(B0 + '(?:solo|sola|solamente|unicamente|puras?|puros?|nada mas que|todo de)\\s+(?:de\\s+)?(?:(?:las|los|unas|unos)\\s+)?(?:' + NUM + '\\s+)?(?:sol[oa]s?\\s+)?$');

  // Negaciones: «sin rosas», «nada de lirios», «no le gustan las margaritas», «rosas no».
  const NEG = new RegExp(B0 + '(?:sin|nada|ni|no|nunca|jamas|evit[a-z]*|excepto|salvo|menos|odi[a-z]*|detest[a-z]*|alergi[a-z]*|tampoco|fuera)' + B1);
  const NOT_NEG = new RegExp(B0 + '(?:no se|no importa|no tan|no solo|no mas|no muy|nada mas|al menos|a lo menos|por lo menos|sin importar|sin falta)' + B1, 'g');
  const GLUE = /^(?:\s|,|(?<![a-z])(?:y|e|o|u|ni|los|las|el|la|tampoco|ningun[oa]?)(?![a-z]))*$/;
  const POST_NEG = /^[\s,]*(?:no|tampoco)(?![a-z])(?!\s+mas(?![a-z]))/;
  const POST_POS = /^[\s,]*si(?![a-z])/;
  const HARD = /[.;:!?\n()]|(?<![a-z])(?:pero|aunque|sino|mas bien|en cambio)(?![a-z])/g;
  const SOFT = /,|(?<![a-z])(?:y|e)(?![a-z])/g;
  // «color rosa», «tonos lavanda» hablan de color; «una rosa», «la rosa» hablan de la flor.
  const COLOR_CTX = /(?:color(?:es)?|tonos?|tonalidad(?:es)?|de color|todo)\s+$/;
  const DET = /(?:(?<![a-z])(?:una?|la|mi|tu|su|esa|esta|cada|sola|solo|con)|\d)\s+$/;

  const ADV = '(?:\\s+(?:muy|bien|mas|super|re|un\\s+poco))?';
  const CTX = B0 + '(?:ramo|ramito|arreglo|bouquet|algo|uno|sea|sean|flores|detalle)' + ADV + '\\s+';
  const SIZE_RE = [
    ['una', B0 + '(?:una\\s+sola|un\\s+solo(?!\\s+(?:color|tono|tipo)' + B1 + ')|sol[oa]\\s+una?(?!\\s+(?:ramo|poco|detalle|arreglo|bouquet)' + B1 + ')|solamente\\s+una?|una\\s+unica|un\\s+unico)' + B1],
    ['pequeño', CTX + '(?:pequen[oa]s?|pequenit[oa]s?|chic[oa]s?|chiquit[oa]s?|sencill[oa]s?|simples?|modest[oa]s?|mini)' + B1 +
      '|' + B0 + '(?:ramito|detallito|pocas\\s+flores|no\\s+(?:muy|tan)\\s+grande|pequeno\\s+ramo|mini\\s+ramo)' + B1],
    ['grande', CTX + '(?:grandes?|grandote|enormes?|gigantes?|inmens[oa]s?|abundantes?|generos[oa]s?|espectacular(?:es)?|llen[oa]s?|frondos[oa]s?|voluminos[oa]s?|xl)' + B1 +
      '|' + B0 + '(?:gran\\s+ramo|ramazo|ramote|muchas\\s+flores|muchisimas\\s+flores|a\\s+lo\\s+grande|enorme\\s+ramo)' + B1],
    ['mediano', CTX + '(?:median[oa]s?|normal)' + B1]
  ].map(([k, re]) => [k, new RegExp(re)]);
  const SOBER = new RegExp(B0 + '(?:sobri[oa]s?|elegantes?|formal(?:es)?|discret[oa]s?|clasic[oa]s?|minimalistas?|neutr[oa]s?|seri[oa]s?)' + B1);
  const MOURN = ['condolencias', 'todos-santos'];

  // Flores (nombre y alias) y colores, de la frase más larga a la más corta: «rosa roja» gana a «rosa».
  let lexCache = null;
  function lexicon() {
    if (lexCache) return lexCache;
    const T = FL.taxonomy, out = [];
    const add = (phrase, e, plural) => out.push(Object.assign({ re: new RegExp(phraseRe(phrase, plural), 'g'), key: fold(phrase), len: phrase.length }, e));
    FL.items.forEach((it) => add(it.name, { ids: [it.id] }, true));
    Object.entries(T.aliases || {}).forEach(([p, ids]) => add(p, { ids }, true));
    T.colors.forEach((c) => (c.words || []).forEach((w) => add(w, { color: c.id }, false)));
    return (lexCache = out.sort((a, c) => c.len - a.len));
  }
  let occCache = null;
  const occasionRes = () => occCache || (occCache = FL.taxonomy.occasions.map((o) => ({ id: o.id, re: new RegExp([o.name].concat(o.words || []).map((w) => phraseRe(w, false)).join('|')) })));

  // Un nombre propio («mi amiga Margarita», «para Rosa») no es una flor.
  const isName = (raw, i) => {
    const c = raw.charAt(i);
    if (c === c.toLowerCase() || raw === raw.toUpperCase()) return false;
    const before = raw.slice(0, i).trimEnd();
    return before.length > 0 && !/[.!?¡¿:;"«(\n]$/.test(before);
  };
  const lastEnd = (re, s) => { let m, e = 0; re.lastIndex = 0; while ((m = re.exec(s))) e = m.index + m[0].length; return e; };

  // → { size, count, include[{ ids, n, label }], exclude[], excludeLabels[], colors[], avoidColors[], only, sober, occasion, mourning }
  R.parse = function (text) {
    const raw = String(text || '').slice(0, 1000), t = fold(raw);
    const out = { size: null, count: null, include: [], exclude: [], excludeLabels: [], colors: [], avoidColors: [], only: false, sober: false, occasion: null, mourning: false };
    if (!t.trim()) return out;

    // 1. Menciones de flores y colores (lo ya encontrado se tapa para que «rosa» no vuelva a calzar dentro de «rosa roja»).
    let work = t;
    const ms = [];
    lexicon().forEach((a) => {
      a.re.lastIndex = 0;
      let m;
      while ((m = a.re.exec(work))) {
        const start = m.index, end = start + m[0].length;
        work = work.slice(0, start) + ' '.repeat(end - start) + work.slice(end);
        if (a.color == null && isName(raw, start)) continue;
        ms.push({ a, start, end });
      }
    });

    // 2. Cada mención, en orden: ¿color o flor?, ¿negada?, ¿con cantidad?
    const hard = [];
    let hm;
    HARD.lastIndex = 0;
    while ((hm = HARD.exec(t))) hard.push(hm.index + hm[0].length);
    let prev = null;
    ms.sort((x, y) => x.start - y.start).forEach((m) => {
      const cs = hard.filter((h) => h <= m.start).pop() || 0;
      const from = Math.max(cs, prev && prev.end > cs ? prev.end : 0);
      const gap = t.slice(from, m.start), before = t.slice(cs, m.start), after = t.slice(m.end, m.end + 24);
      let color = m.a.color;
      if (color == null && COLOR_CTX.test(before)) color = m.a.key === 'rosa' ? 'rosa' : FL.item(m.a.ids[0]).colors[0];
      else if (color == null && m.a.key === 'rosa' && !/s$/.test(t.slice(m.start, m.end)) && !DET.test(before)) color = 'rosa';

      const win = t.slice(Math.max(from, cs + lastEnd(SOFT, before)), m.start).replace(NOT_NEG, ' ').trim().split(/\s+/).slice(-6).join(' ');
      let neg = NEG.test(win) || (!!prev && prev.end > cs && prev.negPre && GLUE.test(gap));
      m.negPre = neg;
      if (POST_NEG.test(after)) neg = true;
      else if (POST_POS.test(after)) neg = false;
      prev = m;

      const label = raw.slice(m.start, m.end);
      if (color != null) { (neg ? out.avoidColors : out.colors).push(color); return; }
      if (neg) { out.exclude.push(...m.a.ids); out.excludeLabels.push(label); return; }
      const c = COUNT_BEFORE.exec(gap);
      out.include.push({ ids: m.a.ids.slice(), n: c ? numOf(c[1]) : undefined, label });
      if (ONLY.test(gap)) out.only = true;
    });
    ['exclude', 'excludeLabels', 'colors', 'avoidColors'].forEach((k) => { out[k] = Array.from(new Set(out[k])); });
    out.colors = out.colors.filter((c) => !out.avoidColors.includes(c));

    // 3. Cantidad total, tamaño y estilo.
    const tc = COUNT_TOTAL.exec(t);
    if (tc) out.count = U.clamp(numOf(tc[1]), 1, FL.limits.stems);
    const sz = SIZE_RE.find(([, re]) => re.test(t));
    if (sz) out.size = sz[0];
    if (out.count === 1) out.size = 'una';
    else if (!out.size && out.count == null && out.include.length === 1 && out.include[0].n === 1) out.size = 'una';
    out.sober = SOBER.test(t.replace(/(?<![a-z])en serio(?![a-z])/g, ' '));

    // 4. Ocasión: el duelo manda; si no, la primera según el orden de la taxonomía.
    const occ = occasionRes().filter((o) => o.re.test(t));
    const mourn = occ.find((o) => MOURN.includes(o.id));
    out.occasion = (mourn || occ[0] || {}).id || null;
    out.mourning = !!mourn;
    return out;
  };

  /* ---------- Qué ramo dice lo que sientes ---------- */
  // req: { text, feelings[], occasion, season, hemisphere, petSafe, exclude[] }
  R.detect = function (req, ask) {
    const T = FL.taxonomy, text = U.norm(req.text || '');
    ask = ask || R.parse(req.text);
    const sc = Object.fromEntries(FL.meanings.map((m) => [m, 0]));
    // Palabras fuertes (falleció, perdón, te amo…) pesan más que las de contexto (mamá, amiga…).
    T.meanings.forEach((m) => {
      m.lexicon.forEach((w) => { if (text.includes(U.norm(w))) sc[m.id] += 1; });
      (m.strong || []).forEach((w) => { if (text.includes(U.norm(w))) sc[m.id] += 2; });
    });
    (req.feelings || []).forEach((m) => { if (m in sc) sc[m] += 2; });
    const occ = (req.occasion && FL.occasion(req.occasion)) || (ask.occasion && FL.occasion(ask.occasion)) || null;
    if (occ) occ.meanings.forEach((m, i) => { sc[m] += 1.5 - i * 0.3; });
    // El duelo manda: «falleció el papá de mi mejor amigo» habla de recuerdo antes que de amistad.
    if (ask.mourning || (occ && MOURN.includes(occ.id))) sc['Recuerdo'] += 4;
    const ranked = Object.entries(sc).filter(([, v]) => v > 0).sort((a, c) => c[1] - a[1]).map(([id, v]) => ({ id, w: v }));
    return { ranked, occasion: occ };
  };

  // Flores (sin contar follaje ni rellenos) y follaje para cada tamaño pedido.
  const SIZES = { 'pequeño': { flowers: 6, green: 2 }, 'grande': { flowers: 21, green: 5 } };
  const FOCAL_ROLES = ['focal', 'secondary', 'spike'];
  const isFlower = (s) => FL.item(s.item).type === 'flower';
  const tones = (c) => c + (/[aeiou]$/.test(c) ? 's' : 'es');

  // Reparte «target» flores entre las que no traen cantidad fija, en proporción a lo que ya tenían.
  // Si son pocas flores para tantas acompañantes, se quitan desde la última (la líder queda).
  function fitFlowers(stems, target, fixed) {
    const L = FL.limits;
    const fixedN = stems.filter((s) => isFlower(s) && fixed.has(s.item)).reduce((a, s) => a + s.n, 0);
    const flex = stems.filter((s) => isFlower(s) && !fixed.has(s.item));
    const rest = target - fixedN;
    while (flex.length > Math.max(rest, 0)) stems.splice(stems.indexOf(flex.pop()), 1);
    if (!flex.length) return;
    const base = flex.reduce((a, s) => a + s.n, 0);
    flex.forEach((s) => { s.n = U.clamp(Math.round(s.n * rest / base), 1, L.stemsPerItem); });
    let diff = rest - flex.reduce((a, s) => a + s.n, 0);
    for (let k = 0; diff !== 0 && k < 500; k++) {
      const s = diff > 0 ? flex[k % flex.length] : flex.reduce((m, x) => (x.n > m.n ? x : m));
      if (diff > 0 && s.n < L.stemsPerItem) { s.n++; diff--; } else if (diff < 0 && s.n > 1) { s.n--; diff++; } else if (diff < 0) break;
    }
  }

  R.compose = function (req) {
    req = req || {};
    const T = FL.taxonomy, L = FL.limits;
    const hemi = req.hemisphere || FL.hemisphere();
    const season = req.season || FL.seasonOf(new Date(), hemi);
    const ask = R.parse(req.text);
    const det = R.detect(req, ask);
    const guessed = !det.ranked.length;
    const ranked = guessed ? [{ id: 'Alegría', w: 1 }] : det.ranked;
    const total = ranked.reduce((a, m) => a + m.w, 0);
    const wOf = Object.fromEntries(ranked.map((m) => [m.id, m.w / total]));
    const mourning = ranked[0].id === 'Recuerdo' || (det.occasion && MOURN.includes(det.occasion.id));
    const exclude = new Set((req.exclude || []).concat(ask.exclude));
    const seed = U.hash((req.text || '') + '|' + (req.feelings || []).join(',') + '|' + (det.occasion ? det.occasion.id : ''));
    const jitter = (id) => (U.hash(seed + id) % 1000) / 20000;

    const score = (it) => {
      if (exclude.has(it.id) || !it.bouquet.florist) return -1;
      if (req.petSafe && toxic(it, ['media', 'alta'])) return -1;
      // «Nada rojo»: queda fuera lo que solo viene en colores que no quieren.
      if (ask.avoidColors.length && it.colors.every((c) => ask.avoidColors.includes(c))) return -1;
      let s = 0;
      ranked.forEach((m) => {
        if (it.meanings.includes(m.id)) s += wOf[m.id] * (it.meanings[0] === m.id ? 1.25 : 1);
        const col = FL.color(it.colors[0]);
        if (col && col.meanings.includes(m.id)) s += wOf[m.id] * 0.3;
      });
      if (!it.seasons.length || it.seasons.includes(season) || it.seasons.length >= 4) s += 0.12;
      if (!mourning && it.id === 'crisantemo') s -= 0.8;
      if (mourning && (it.colors.includes('blanco'))) s += 0.25;
      if (it.care.form === 'potted') s -= 0.3;
      if (ask.colors.length && it.bouquet.role !== 'greenery' && it.colors.some((c) => ask.colors.includes(c))) s += 0.45;
      else if (ask.sober && !ask.colors.length && it.colors.includes('blanco')) s += 0.25;
      return s + jitter(it.id);
    };
    // Si pidieron colores, en cada grupo van primero las flores de esos colores; dentro, decide el puntaje.
    const hue = (it) => (ask.colors.length && it.bouquet.role !== 'greenery' && it.colors.some((c) => ask.colors.includes(c)) ? 1 : 0);
    const byHue = (a, c) => hue(c.it) - hue(a.it) || c.s - a.s;
    const pool = (roles) => FL.items.filter((it) => roles.includes(it.bouquet.role)).map((it) => ({ it, s: score(it) })).filter((x) => x.s >= 0).sort(byHue);
    const top = ranked[0].id;
    const leadScore = (it, s) => s + (it.meanings.includes(top) ? 0.6 : 0) + (it.meanings[0] === top ? 0.2 : 0) + (it.bouquet.role === 'focal' ? 0.1 : 0);

    // Lo que la persona nombró: de un grupo («rosas») se elige la que mejor calza; lo tóxico o lo que no se vende queda fuera con aviso.
    const notes = [], wanted = [];
    ask.include.forEach((w) => {
      const all = w.ids.map(FL.item).filter((it) => it && !exclude.has(it.id));
      const ok = all.filter((it) => it.bouquet.florist && !(req.petSafe && toxic(it, ['media', 'alta'])));
      if (!ok.length) {
        const it = all[0];
        if (!it) return;
        const nm = article(it.name) + ' ' + it.name.toLowerCase();
        notes.push(!it.bouquet.florist ? cap(nm) + ' no se consigue en florería: quedó fuera.'
          : 'Dejé fuera ' + nm + ': es ' + (article(it.name) === 'la' ? 'tóxica' : 'tóxico') + ' para mascotas.');
        return;
      }
      const it = ok.map((x) => ({ it: x, s: score(x) })).sort((a, c) => c.s - a.s)[0].it;
      const had = wanted.find((x) => x.it.id === it.id);
      if (had) { if (w.n) had.n = (had.n || 0) + w.n; } else if (wanted.length < L.items - 1) wanted.push({ it, n: w.n, label: w.label });
    });
    wanted.forEach((x) => { if (x.n > L.stemsPerItem) { notes.push('Cada flor admite hasta ' + L.stemsPerItem + ' tallos en el ramo.'); x.n = L.stemsPerItem; } });
    const askedIds = new Set(wanted.map((x) => x.it.id));
    const roleOf = (x) => x.it.bouquet.role;

    const single = ask.size === 'una';
    // Con cantidades por flor y sin tamaño ni total, el ramo es exactamente eso (más follaje).
    const exact = wanted.some((x) => x.n) && ask.count == null && !SIZES[ask.size];
    const target = ask.count != null ? Math.min(ask.count, L.stems - 4) : SIZES[ask.size] ? SIZES[ask.size].flowers : null;
    const maxSeconds = ask.only || exact ? 0 : target == null ? 2 : target <= 3 ? 0 : target <= 7 ? 1 : 2;

    // La flor líder carga el sentimiento principal (si nombraron flores, una de esas); las acompañantes suman los demás.
    const wFlowers = wanted.filter((x) => FOCAL_ROLES.includes(roleOf(x)));
    const leadPool = pool(FOCAL_ROLES).map((x) => ({ it: x.it, s: leadScore(x.it, x.s) })).sort(byHue);
    const lead = wFlowers.length ? wFlowers.slice().sort((a, c) => leadScore(c.it, score(c.it)) - leadScore(a.it, score(a.it)))[0]
      : leadPool[0] ? { it: leadPool[0].it } : null;
    const seconds = wFlowers.filter((x) => x !== lead);
    const covered = new Set(lead ? lead.it.meanings : []);
    seconds.forEach((x) => x.it.meanings.forEach((m) => covered.add(m)));
    let room = Math.max(0, maxSeconds - seconds.length);
    const cands = pool(FOCAL_ROLES), hueOnly = cands.some((x) => hue(x.it) && (!lead || x.it.id !== lead.it.id));
    cands.forEach((x) => {
      if (!room || x.s < 0.15 || (lead && x.it.id === lead.it.id) || askedIds.has(x.it.id) || (hueOnly && !hue(x.it))) return;
      const adds = x.it.meanings.some((m) => wOf[m] && !covered.has(m));
      if (seconds.length === 0 || adds) { seconds.push({ it: x.it }); x.it.meanings.forEach((m) => covered.add(m)); room--; }
    });
    const wFill = wanted.filter((x) => roleOf(x) === 'filler'), wGreen = wanted.filter((x) => roleOf(x) === 'greenery');
    const useFiller = !ask.only && !exact && (target == null || target >= 9);
    const fillers = wFill.length ? wFill : useFiller && pool(['filler'])[0] ? [pool(['filler'])[0]] : [];
    const greens = wGreen.length ? wGreen : pool(['greenery'])[0] ? [pool(['greenery'])[0]] : [];

    const dozen = !single && target == null && !exact && lead && lead.it.id === 'rosa-roja' && top === 'Amor' && det.occasion && ['san-valentin', 'aniversario'].includes(det.occasion.id);
    const stems = [];
    const leadW = lead ? ROLE_W[lead.it.bouquet.role] : 1;
    if (lead) stems.push({ item: lead.it.id, n: lead.n || (single ? 1 : dozen ? 12 : lead.it.bouquet.role === 'focal' ? 5 : 7) });
    if (!single) {
      // Que ninguna acompañante pese más que la líder.
      seconds.forEach((x, i) => stems.push({ item: x.it.id, n: x.n || U.clamp(Math.round((i === 0 ? 4 : 3) * leadW / ROLE_W[x.it.bouquet.role]), 2, 4) }));
      if (!dozen) fillers.forEach((x) => stems.push({ item: x.it.id, n: x.n || 3 }));
      greens.forEach((x) => stems.push({ item: x.it.id, n: x.n || 3 }));
    } else if (greens.length) stems.push({ item: greens[0].it.id, n: 1 });

    const fixed = new Set(wanted.filter((x) => x.n).map((x) => x.it.id));
    if (!single && target != null) fitFlowers(stems, target, fixed);
    // Follaje a la medida: poco en un ramo chico o exacto, más en uno grande.
    const flowerNow = stems.reduce((a, s) => a + (isFlower(s) ? s.n : 0), 0);
    const greenN = single ? null : SIZES[ask.size] && ask.count == null ? SIZES[ask.size].green
      : target != null || exact ? U.clamp(Math.round(flowerNow / 3), 1, 4) : null;
    if (greenN != null) stems.forEach((s) => { if (FL.item(s.item).bouquet.role === 'greenery' && !fixed.has(s.item)) s.n = greenN; });

    // Si aun así la lectura se inclina hacia otro sentimiento, la líder gana tallos.
    if (lead && !single && !dozen && target == null && !exact && !lead.n && lead.it.meanings[0] === top) {
      for (let k = 0; k < 2; k++) {
        const r0 = R.interpret({ stems, layoutSeed: seed });
        if (!r0.meanings.length || r0.meanings[0].id === top) break;
        stems[0].n = Math.min(L.stemsPerItem, stems[0].n + 2);
      }
    }
    // En Europa del Este, los números pares de flores se reservan para funerales: en regalos, impar.
    // Si la persona pidió una cantidad, se respeta (la lectura igual avisa).
    const flowerN = stems.reduce((a, s) => a + (isFlower(s) ? s.n : 0), 0);
    if (!mourning && ask.count == null && !fixed.size && flowerN > 1 && flowerN % 2 === 0) {
      const odd = stems.find((s, i) => i > 0 && isFlower(s)) || (dozen ? null : stems[0]);
      if (odd) odd.n += odd === stems[0] ? 1 : -1;
    }

    const wrap = mourning ? { style: 'ninguno' } : ranked[0].id === 'Amor' ? { style: 'seda', color: '#2f3a2c' } : { style: 'kraft' };
    const bouquet = FL.bouquet.create({
      stems, wrap, ribbon: { color: RIBBON[ranked[0].id] || T.ribbons[0] },
      occasion: det.occasion ? det.occasion.id : undefined,
      intent: { text: req.text || '', feelings: req.feelings || [] },
      layoutSeed: seed
    });
    const reading = R.interpret(bouquet);
    const why = bouquet.stems.map((s) => {
      const it = FL.item(s.item);
      const hits = it.meanings.filter((m) => wOf[m]);
      const role = FL.role(it.bouquet.role).name.toLowerCase();
      const asked = askedIds.has(it.id) ? (article(it.name) === 'la' ? 'la' : 'lo') + ' pediste; ' : '';
      return { item: it.id, name: it.name, n: s.n, why: asked + (hits.length ? 'aporta ' + list(hits.map(phrase)) + ' (' + role + ')' : 'da ' + (it.bouquet.role === 'greenery' ? 'marco y frescura' : 'volumen y aire') + ' (' + role + ')') };
    });

    // Lo que se entendió del texto, para que se vea qué se tomó en cuenta.
    const heard = [];
    if (single) heard.push('una sola flor');
    else if (ask.count != null) heard.push(FL.countWords(Math.min(ask.count, 99)) + ' flores');
    else if (SIZES[ask.size]) heard.push('un ramo ' + ask.size);
    if (wanted.length) heard.push('con ' + list(wanted.map((w) => (w.n ? w.n + ' ' : '') + w.label)));
    if (ask.excludeLabels.length) heard.push('sin ' + list(ask.excludeLabels));
    if (ask.colors.length) heard.push('en tonos ' + list(ask.colors.map(tones)));
    if (ask.avoidColors.length) heard.push('nada ' + list(ask.avoidColors));
    if (ask.sober) heard.push('un estilo sobrio');
    const leadText = (guessed
      ? (heard.length ? 'Armé el ramo con lo que pediste.'
        : 'No encontré sentimientos claros en lo que escribiste, así que propongo un ramo alegre. Prueba contar para quién es o qué quieres decir.')
      : 'Leí en lo que escribiste ' + list(ranked.slice(0, 3).map((m) => phrase(m.id))) + '.' +
        (det.occasion ? ' Ocasión: ' + det.occasion.name.toLowerCase() + '.' : '') +
        ' Prioricé flores de ' + season + ' en el hemisferio ' + (hemi === 'S' ? 'sur' : 'norte') + (req.petSafe ? ' y dejé fuera las tóxicas para mascotas' : '') + '.') +
      (heard.length ? ' Tomé en cuenta: ' + heard.join('; ') + '.' : '') + (notes.length ? ' ' + notes.join(' ') : '');
    return { bouquet, rationale: { lead: leadText, items: why }, reading, detected: { meanings: ranked, occasion: det.occasion ? det.occasion.id : null, guessed, ask } };
  };

  function B() { return FL.bouquet; }
})();
