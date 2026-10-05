/* Florilegio — qué siente y qué pide el texto. R.parse lee lo que se pide (tamaño, cantidad, flores, colores, ocasión);
   FL.intent.read lee lo que se siente: una mezcla de los diez significados, con negaciones, intensidad, contraste,
   destinatarios y duelo. Sin IA ni servidor: el vocabulario vive en data/taxonomy.json («intents», «recipients»,
   «neutral», «names», «modifiers») y aquí va la mecánica del idioma. Se carga después de js/meaning.js. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u, R = FL.reading, I = (FL.intent = {});

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
  // «doce flores», «dos docenas de flores», «media docena de tallos».
  const COUNT_TOTAL = new RegExp(B0 + NUM + '(?:\\s+sol[oa]s?)?(?:\\s+de)?\\s+(?:flor(?:es)?|tallos?|varas?)' + B1);
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
  // Cada ocasión con su copia «g», para revisar todas sus menciones (una negada no cuenta, otra sí).
  let occCache = null;
  const occasionRes = () => occCache || (occCache = FL.taxonomy.occasions.map((o) => {
    const src = [o.name].concat(o.words || []).map((w) => phraseRe(w, false)).join('|');
    return { id: o.id, re: new RegExp(src), g: new RegExp(src, 'g') };
  }));

  // Un nombre propio («mi amiga Margarita», «para Rosa») no es una flor.
  const isName = (raw, i) => {
    const c = raw.charAt(i);
    if (c === c.toLowerCase() || raw === raw.toUpperCase()) return false;
    const before = raw.slice(0, i).trimEnd();
    return before.length > 0 && !/[.!?¡¿:;"«(\n]$/.test(before);
  };
  // Al comenzar la oración, con mayúscula y seguido de un verbo de tercera persona, también es un nombre: «Rosa cumple 80», «Paz está mal».
  const VERB3 = /^\s+(?:cumple|cumplio|cumplira|esta|estuvo|anda|se|tiene|tuvo|sigue|necesita|va|viene|llega|termino|perdio)(?![a-z])/;
  // …o seguido de una aposición: «Rosa, mi abuela, cumple 85», «Paz, mi mejor amiga, se gradúa».
  const APPOS = /^\s*,\s*(?:mi|tu|su|nuestr[oa])\s+/;
  const nameLike = (raw, t, s, e) => {
    if (isName(raw, s)) return true;
    const c = raw.charAt(s), before = raw.slice(0, s).trimEnd();
    return c !== c.toLowerCase() && raw !== raw.toUpperCase() && (!before || /[.!?¡¿:;"«(\n]$/.test(before)) &&
      (VERB3.test(t.slice(e)) || (APPOS.test(t.slice(e)) && !/s$/.test(t.slice(s, e))));
  };
  const lastEnd = (re, s) => { let m, e = 0; re.lastIndex = 0; while ((m = re.exec(s))) e = m.index + m[0].length; return e; };
  const wipe = (s, a, b, ch) => s.slice(0, a) + (ch || ' ').repeat(b - a) + s.slice(b);
  // «Q.E.P.D.» → «q e p d»: los puntos de una sigla, con el mismo largo.
  const abbr = (t) => t.replace(/(?<![a-z])(?:[a-z]\.){2,}/g, (x) => x.replace(/\./g, ' '));
  // Irse lejos no es morir: «se nos fue a vivir a Australia», «su partida a Canadá», «ya no está con nosotros en la empresa».
  const DEPART = /^(?:se nos fue|su partida|ya no estas? con nosotros|que ya no estas?|nos dejo \S+|partio \S+)$/;
  const MOVED = /^\s*,?\s*(?:(?:a|para)\s+(?:vivir|trabajar|estudiar)|de\s+viaje|viviendo|trabajando|estudiando|al\s+extranjero|a\s+otr[oa]s?\s|(?:en|de)\s+(?:la|el|esta|este)\s+(?:empresa|trabajo|oficina|pega|equipo|colegio|curso|pais|ciudad)|del\s+(?:trabajo|pais|equipo|colegio|curso))/;
  // Un lugar con mayúscula («a Australia», «en Santiago»), no un mes, una fiesta, un día ni Dios: «se nos fue en Navidad» es morir.
  const NOT_PLACE = /^(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|lunes|martes|miercoles|jueves|viernes|sabado|domingo|navidad|nochebuena|ano\s+nuevo|pascua|semana\s+santa|dios|el\s+senor|senor|jesus|cristo|cielo)(?![a-z])/;
  const moved = (raw, t, e) => {
    if (MOVED.test(t.slice(e, e + 40))) return true;
    const m = /^\s*,?\s*(?:a|al|para|hacia|en)\s+(?=\p{Lu})/u.exec(raw.slice(e, e + 20));
    return !!m && !NOT_PLACE.test(t.slice(e + m[0].length, e + m[0].length + 14));
  };
  // «no es mi cumpleaños, es el de mi hermana»: la ocasión se corrige, no se niega.
  const REASSIGN = /^\s*,?\s*(?:sino|es)\s+(?:el|la|los|las)\s+de(?![a-z])/;

  /* ---------- Negación de una mención, dentro de su frase ---------- */
  // 'avoid': se niega algo del ramo («no de forma romántica», «nada triste», «no es para pedir perdón»): el ramo no debe decirlo.
  // 'drop': se niega un estado («no estoy enojada», «no te pido perdón»): solo no se cuenta.
  // Entre la negación y la mención caben palabras de relleno: «no quiero que sea un ramo de funeral», «no tan romántico».
  const AVOID_PRE = /(?<![a-z])(?:(?:sin|nada|ningun[oa]?)(?:\s+de)?|(?:no|nunca|jamas|tampoco)(?=\s+(?:quiero|queremos|busco|necesito|es|sea|sean|se\s+vea|parezca|suene|tenga|lleve|en\s+plan|tipo|por|para|tan|muy|de\s+(?:forma|manera|modo|estilo|tono))))\s+(?:(?:quiero|queremos|busco|necesito)\s+(?:que\s+)?|(?:es|sea|sean|se\s+vea|parezca|suene|tenga|lleve|en\s+plan|tipo|tan|muy|algo|un|una|el|la|por|para|como|ramo|ramito|arreglo|regalo|detalle|flores|cosa|de\s+(?:forma|manera|modo|estilo|tono)|de|del)\s+)*$/;
  // Antes de mirar si el «ni» va solo se saltan los artículos: «ni una disculpa».
  const ARTW = new Set(['un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'algo', 'tipo']);
  // Inicio de la cláusula: puntuación o conectores («y», «pero», «que»…).
  const CUT = /[.,;:!?¡¿\n()]|(?<![a-z])(?:y|e|o|u|pero|aunque|sino|mas bien|en cambio|porque|que)(?![a-z])/g;
  const NEGW = new Set(['no', 'nunca', 'jamas', 'tampoco', 'sin', 'nada']);
  const SIN_NADA = /(?<![a-z])(?:sin|nada)(?![a-z])/;
  const POST_AVOID = /^\s*,?\s*no(?=\s*(?:[.,;!?]|$))/;
  // nw: el texto plegado con las frases que no niegan («no sé», «no sabes cuánto») en blanco.
  // prev: estado de la mención negada anterior en la misma oración (para el «ni» suelto), o null.
  function negState(nw, s, e, prev) {
    if (AVOID_PRE.test(nw.slice(Math.max(0, s - 60), s))) return 'avoid';
    const cs = lastEnd(CUT, nw.slice(0, s));
    // «no muy grande de condolencias»: «no muy/no tan» niega solo el adjetivo que sigue (salvo que sea la mención: «no tan romántico»).
    const win = nw.slice(cs, s).replace(/(?<![a-z])no\s+(?:tan|muy)\s+[a-z]+/g, (x) => ' '.repeat(x.length)).trim().split(/\s+/).filter(Boolean).slice(-4);
    // «no estoy enojada ni triste» (descarta), «nada rojo ni romántico» (evita): el «ni» sigue a la negación anterior.
    const wn = win.slice();
    while (wn.length > 1 && ARTW.has(wn[wn.length - 1])) wn.pop();
    if (wn[wn.length - 1] === 'ni') return prev || (SIN_NADA.test(nw.slice(cs, s)) ? 'avoid' : 'drop');
    if (win.some((w) => NEGW.has(w))) return 'drop';
    if (POST_AVOID.test(nw.slice(e, e + 14))) return 'avoid';
    return null;
  }

  // → { size, count, include[{ ids, n, label }], exclude[], excludeLabels[], colors[], avoidColors[], only, sober, occasion, mourning, occasions[] }
  R.parse = function (text) {
    const raw = String(text || '').slice(0, 1000), t = fold(raw);
    const out = { size: null, count: null, include: [], exclude: [], excludeLabels: [], colors: [], avoidColors: [], only: false, sober: false, occasion: null, mourning: false, occasions: [] };
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
        // «para mi abuela Blanca», «Margarita cumple 90»: un nombre no es una flor ni un color.
        if (nameLike(raw, t, start, end)) continue;
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
    // «sería» (verbo) no es «seria» (sobria).
    out.sober = SOBER.test(t.replace(/(?<![a-z])en serio(?![a-z])/g, ' ').replace(/(?<![a-z])seria(?![a-z])/g, (x, i) => (/í/i.test(raw.slice(i, i + 5)) ? '     ' : x)));

    // 4. Ocasión: el duelo manda; si no, la primera según el orden de la taxonomía. Una mención negada
    //    no cuenta («no te pido perdón» no es pedir perdón), ni una frase hecha («se me murió el celular»,
    //    «perdón por la molestia»), ni irse lejos («se nos fue a vivir a Australia»).
    const qt = abbr(t), sp = cueScan(qt);
    let ot = qt, nw = qt.replace(NOT_NEG, (x) => ' '.repeat(x.length));
    sp.neutral.forEach(([s, e]) => { ot = wipe(ot, s, e); nw = wipe(nw, s, e); });
    sp.selfNeg.forEach(([s, e]) => { nw = wipe(nw, s, e); });
    out.occasions = occasionRes().filter((o) => {
      o.g.lastIndex = 0;
      let m;
      while ((m = o.g.exec(ot))) {
        const s = m.index, e = s + m[0].length;
        if (MOURN.includes(o.id) && DEPART.test(m[0]) && moved(raw, qt, e)) continue;
        const st = negState(nw, s, e, null);
        if (st !== 'drop' && st !== 'avoid') return true;
        if (st === 'drop' && REASSIGN.test(qt.slice(e, e + 30))) return true;
      }
      return false;
    }).map((o) => o.id);
    const mourn = out.occasions.find((id) => MOURN.includes(id));
    out.occasion = mourn || out.occasions[0] || null;
    out.mourning = !!mourn;
    return out;
  };

  /* ---------- Qué siente el texto: léxico de data/taxonomy.json, compilado una vez ---------- */
  // Una señal con su propia negación («no te rindas», «nunca te olvidaré», «sin rencor») no niega lo que sigue.
  const SELF_NEG = /(?<![a-z])(?:no|ni|nunca|jamas|sin|nada|tampoco)(?![a-z])/;
  const words = (p) => fold(p).trim().split(/\s+/).map(reEsc).join('\\s+');
  let cueCache = null;
  function lex() {
    if (cueCache) return cueCache;
    const T = FL.taxonomy, M = T.modifiers || {}, cues = [], emoji = [], who = [];
    const ent = (p, o) => Object.assign({ re: new RegExp(phraseRe(p, false), 'g'), len: p.length, key: p.replace(/\*/g, ''), single: !/\s/.test(p.trim()), selfNeg: SELF_NEG.test(p) }, o);
    (T.neutral || []).forEach((p) => cues.push(ent(p, { kind: 'neutral' })));
    (T.intents || []).forEach((e) => {
      (e.strong || []).forEach((p) => cues.push(ent(p, { kind: 'strong', intent: e })));
      (e.words || []).forEach((p) => cues.push(ent(p, { kind: 'words', intent: e })));
      (e.emoji || []).forEach((p) => emoji.push({ re: new RegExp(reEsc(p), 'g'), kind: 'emoji', intent: e, len: p.length, key: p, single: true, selfNeg: false }));
    });
    (T.recipients || []).forEach((r) => (r.words || []).forEach((p) => who.push(ent(p, { kind: 'who', recipient: r }))));
    const byLen = (a, c) => c.len - a.len;
    const alt = (l) => '(?:' + l.map(words).join('|') + ')';
    const intens = M.intensifiers || [];
    return (cueCache = {
      cues: cues.sort(byLen), emoji: emoji.sort(byLen), who: who.sort(byLen),
      names: new Set(T.names || []),
      emphatic: (M.emphatic || []).length ? new RegExp(B0 + alt(M.emphatic) + B1, 'g') : null,
      intens1: new Set(intens.filter((w) => !/\s/.test(w))),
      intensN: intens.some((w) => /\s/.test(w)) ? new RegExp(B0 + alt(intens.filter((w) => /\s/.test(w))) + '\\s+$') : null,
      after: (M.after || []).length ? new RegExp('^\\s+' + alt(M.after) + '(?![a-z])') : null,
      soft: (M.softeners || []).length ? new RegExp(B0 + alt(M.softeners) + '\\s+$') : null
    });
  }
  I.warm = () => { lex(); };

  // Frases de cortesía al saludar («hola, disculpa», «buenas, perdón»): no piden perdón.
  // También al abrir la oración con una consulta a la florería: «disculpe, ¿hacen envíos?», «perdón, quería saber si tienen rosas».
  const SORRY = '(?:disculp(?:a|e|en)|perdon(?:a|e|en)?)';
  const SHOP_Q = '(?:una\\s+(?:consulta|pregunta)|consulta|pregunta|hacen|tienen|tendran|venden|quisiera|queria|necesito|necesitaria|' +
    'me\\s+podri[a-z]*|podri[a-z]*|puedo|se\\s+puede|hay|cuanto|cuanta|donde|hasta\\s+que\\s+hora)';
  const COURTESY = new RegExp('(?<![a-z])(?:hola|buenas(?:\\s+(?:tardes|noches))?|buenos\\s+dias|oye|oiga)\\s*,?\\s*' + SORRY + '(?![a-z])' +
    '|(?<=(?:^|[.!?¡\\n])\\s*)' + SORRY + '(?=\\s*,?\\s*(?:¿|' + SHOP_Q + '(?![a-z])))', 'g');
  // Señales del texto plegado: la frase más larga gana y se tapa, para que nada calce dentro de ella
  // («lo siento mucho por tu pérdida» antes que «lo siento»). skip(a, s, e, m0) descarta una mención (un nombre propio).
  // → { hits[{a, s, e}], neutral[[s, e]], selfNeg[[s, e]] }
  function cueScan(t, skip) {
    const L = lex();
    let work = t;
    const hits = [], neutral = [], selfNeg = [];
    let c;
    COURTESY.lastIndex = 0;
    while ((c = COURTESY.exec(t))) { work = wipe(work, c.index, c.index + c[0].length, '_'); neutral.push([c.index, c.index + c[0].length]); }
    const run = (list) => list.forEach((a) => {
      a.re.lastIndex = 0;
      let m;
      while ((m = a.re.exec(work))) {
        const s = m.index, e = s + m[0].length;
        if (e === s) { a.re.lastIndex++; continue; }
        work = wipe(work, s, e, '_');
        if (a.kind === 'neutral') { neutral.push([s, e]); continue; }
        if (a.selfNeg) selfNeg.push([s, e]);
        if (skip && skip(a, s, e, m[0])) continue;
        hits.push({ a, s, e });
      }
    });
    run(L.cues);
    run(L.emoji);
    return { hits, neutral, selfNeg };
  }

  // «para mí», «para mí misma»: el ramo es para quien escribe.
  const SELF = /(?<![a-z])para mi(?:\s+mism[oa])?(?=\s*(?:$|[.,;:!?]|y\s|porque\s|que\s))/;
  const SENT = /[.;:!?\n]/g;
  const SENT_PS = /[.;:!?\n]|(?<![a-z])(?:pero|sino)(?![a-z])/g;
  const AUNQUE = /(?<![a-z])aunque(?![a-z])/g;
  const ADJ = '(?:querid[oa]s?|mejor(?:es)?|gran|futur[oa]s?|nuev[oa]s?|ex|lind[oa]|hermos[oa])';
  const DETS = '(?:mi|mis|tu|tus|su|sus|la|el|los|las|un|una|unos|unas|nuestr[oa]s?)';
  const PARA = new RegExp('(?<![a-z])(?:para|pa|a|al)\\s+(?:' + DETS + '\\s+)?(?:' + ADJ + '\\s+)*$');
  const MINE = /(?<![a-z])(?:mi|mis|nuestr[oa]s?)\s+(?:(?:querid[oa]s?|mejor(?:es)?|gran|futur[oa]s?|nuev[oa]s?|ex)\s+)*$/;
  const THIRD = new Set(['su', 'sus', 'el', 'la', 'los', 'las', 'del', 'de', 'un', 'una', 'unos', 'unas', 'este', 'esta', 'ese', 'esa', 'otro', 'otra', 'ser']);
  const POSS = new RegExp('(?<![a-z])(' + DETS + ')\\s+(?:' + ADJ + '\\s+)*$');
  const DETIN = new RegExp('^(' + DETS + ')\\s+');
  // «la mamá de mi polola»: la polola es de quien se habla, no para quien es el ramo.
  const OWNER = new RegExp('^\\s*(?:de|del)\\s+(?:(?:mi|mis|tu|tus|su|sus|la|el|los|las|nuestr[oa]s?)\\s+)?(?:' + ADJ + '\\s+)*$');
  // «no es para mi novia, es para mi mamá»: la novia queda fuera.
  // También «no son para…», «no va para…», «las flores no eran para…».
  const NEG_PARA = new RegExp('(?<![a-z])(?:no|ni|nunca|tampoco)\\s+(?:(?:es|son|sea|sean|era|eran|sera|seran|seria|serian|va|van|iba|iban)\\s+)?(?:para|pa|a|al)\\s+(?:' + DETS + '\\s+)?(?:' + ADJ + '\\s+)*$');
  // «perdió a su mamá», «gracias por cuidar a mi papá»: esa «a» marca a quien se perdió o se cuidó, no para quién es el ramo.
  const OBJ_A = new RegExp('(?<![a-z])(?:perdi(?:o|ste|mos|eron)?|cuid[a-z]*)\\s+(?:a|al)\\s+(?:' + DETS + '\\s+)?(?:' + ADJ + '\\s+)*$');
  // Quien manda el ramo junto a quien escribe no lo recibe: «mi novia y yo», «de parte de mi esposo», «con mi novio le queremos regalar».
  const COSEND_PRE = new RegExp('(?<![a-z])(de\\s+parte\\s+de|y\\s+de|junto\\s+(?:a|con)|con)\\s+(?:mi|mis|nuestr[oa]s?)\\s+(?:' + ADJ + '\\s+)*$');
  const COSEND_POST = /^\s+y\s+yo(?![a-z])/;
  // Duelo por alguien que no es una persona de la lista: un bebé, una mascota.
  const BEING = '(?:bebe|bebes|guagua|guaguita|perr[oa]|perrit[oa]|gat[oa]|gatit[oa]|mascota|mascotita|regalon[a]?)';
  const OF_BEING = new RegExp('(?<![a-z])' + BEING + '\\s+(?:de|del)\\s+(?:' + DETS + '\\s+)?(?:' + ADJ + '\\s+)*$');
  // Señales del duelo de quien recibe («está de duelo», «perdió a su bebé», «en su dolor»): no nombran a quien partió,
  // salvo la persona que va dentro de la señal («perdió a su mamá»).
  const SUFFER = /perdi|aborto|gestacional|dolor|^(?:de\s+|en\s+)?(?:duelo|luto)$/;
  // Sujeto después del verbo: «se murió su perrito», «que en paz descanse su esposo», «falleció el papá de…».
  const POSTSUBJ = /^\s+(?:su|sus|el|la|los|las|mi|mis|tu|tus|nuestr[oa]s?)\s+(?:querid[oa]s?\s+)?([a-z]+)/;
  const CLOSING = /^[\s,]*(?:y\s+)?(?:(?:muchas|mil|muchisimas|de\s+antemano)\s+)?gracias(?:\s+(?:de\s+antemano|desde\s+ya|por\s+adelantado))?[\s!.]*(?:(?:saludos|slds|bendiciones|atte)[\s!.]*)?$/;
  const WE = /(?<![a-z])(?:queremos|quisieramos|vamos|enviamos|mandamos|regalamos|saludamos|(?:le|les)\s+(?:queremos|vamos|regalamos|enviamos|mandamos))(?![a-z])/;
  // «gracias por ser la mejor amiga», «eres el mejor papá»: se le habla a esa persona.
  const ADDR = new RegExp('(?<![a-z])(?:por\\s+ser|eres|seas|fuiste|has\\s+sido)\\s+(?:(?:la|el|una?|mi)\\s+)?(?:' + ADJ + '\\s+)*$');
  // «que tengas un feliz día» es un deseo de todos los días, no el día de alguien.
  const DAY = /(?<![a-z])(?:(?:en|por)\s+su\s+dia|(?<!(?<![a-z])un\s+)feliz\s+dia)(?![a-z])/;
  const ROMANTIC = ['san-valentin', 'aniversario', 'boda'];
  const KIND_W = { strong: 2, words: 1, emoji: 1.5 };
  // Una muerte de hace tiempo, contada junto a una fiesta para otra persona, es contexto y no duelo:
  // «mi papá falleció en marzo… mi mamá cumple 70, queremos algo alegre».
  // Solo meses o años: «hace unas horas», «hace dos días», «hace poco» siguen siendo un duelo.
  const PAST = /(?<![a-z])(?:el\s+ano\s+pasado|el\s+otro\s+ano|este\s+ano|hace\s+(?:(?:un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|unos|unas|varios|varias|muchos|algunos|mas\s+de\s+(?:un|una|\d+)|\d+)\s+)?(?:anos?|mes(?:es)?)|hace\s+(?:mucho\s+)?tiempo|hace\s+mucho|en\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)|el\s+(?:mes|verano|invierno|otono)\s+pasado|(?:anos|tiempo)\s+atras)(?![a-z])/;
  const FESTIVE = ['cumpleanos', 'aniversario', 'boda', 'graduacion', 'navidad', 'nacimiento', 'dia-madre', 'dia-padre', 'dia-profesor', 'dia-mujer', 'san-valentin', 'amistad', 'flores-amarillas', 'porque-si'];
  // Una fiesta que solo dice cuándo: «en Navidad», «el día de su cumpleaños», «antes de Navidad».
  const WHEN = /(?<![a-z])(?:en|durante|(?:antes|despues|cerca)\s+de|el\s+dia\s+de)\s+(?:(?:la|el|su|sus|mi|esta|este|pleno|plena)\s+)?$/;
  const FESTIVE_CUES =['alegria', 'felicitar', 'sorpresa', 'logro', 'entusiasmo'];
  // Palabras singulares que terminan en s: «tu miss».
  const SING_S = new Set(['miss']);
  const plural = (noun) => /s$/i.test(noun) && !SING_S.has(fold(noun).toLowerCase());

  // Cómo nombra el texto al destinatario, dicho a quien escribe: «a mi hermana» → «tu hermana»; «tu mamá» (la de quien recibe) → «su mamá».
  const SWAP = { mi: 'tu', mis: 'tus', tu: 'su', tus: 'sus' };
  function swapPoss(s) {
    const m = /^(\S+)(\s+[\s\S]*)$/.exec(s);
    if (!m) return s;
    const w = SWAP[fold(m[1]).toLowerCase()];
    return w ? w + m[2] : s;
  }
  function recipientText(raw, t, s, e) {
    const pm = POSS.exec(t.slice(Math.max(0, s - 40), s));
    let txt;
    if (pm) txt = swapPoss(raw.slice(s - pm[0].length, e));
    else if (DETIN.test(t.slice(s, e))) txt = swapPoss(raw.slice(s, e));
    else { const n = raw.slice(s, e); txt = (plural(n) ? 'tus ' : 'tu ') + n; }
    return txt.replace(/\s+/g, ' ').toLowerCase();
  }
  // «el papá de mi mejor amigo» → «su papá»; «mi abuela» → «tu abuela»; «lo de tu papá» → «su papá».
  function memoryText(raw, t, rec) {
    const inner = DETIN.exec(t.slice(rec.s, rec.e));
    const outer = inner ? null : POSS.exec(t.slice(Math.max(0, rec.s - 40), rec.s));
    const det = inner ? inner[1] : outer ? outer[1] : '';
    const noun = raw.slice(rec.s + (inner ? inner[0].length : 0), rec.e).replace(/\s+/g, ' ').toLowerCase();
    const pl = plural(noun);
    const mine = /^(?:mi|mis|nuestr)/.test(det) || (!det && rec.role0 !== 'third');
    return (mine ? (pl ? 'tus ' : 'tu ') : (pl ? 'sus ' : 'su ')) + noun;
  }

  const zero = () => Object.fromEntries(FL.meanings.map((m) => [m, 0]));
  const order = (sc) => FL.meanings.filter((m) => sc[m] > 0).sort((a, c) => sc[c] - sc[a] || FL.meanings.indexOf(a) - FL.meanings.indexOf(c));
  // Se quitan las notas sueltas (< 12 % del máximo), quedan hasta cuatro y se reparten en proporciones.
  function shares(sc) {
    const ids = order(sc), max = ids.length ? sc[ids[0]] : 0;
    const keep = ids.filter((m) => sc[m] >= 0.12 * max).slice(0, 4);
    const sum = keep.reduce((a, m) => a + sc[m], 0);
    const target = {};
    keep.forEach((m) => { target[m] = sc[m] / sum; });
    return { target, ranked: keep.map((id) => ({ id, w: +target[id].toFixed(3) })) };
  }
  // Sin romance, el amor no encabeza: «te quiero mucho, hermanita» es cariño. Un ❤️ solo, sin nada más que pese, sigue siendo amor.
  function capAmor(sc) {
    if (!(sc['Amor'] > 0)) return;
    const other = Math.max(...FL.meanings.filter((m) => m !== 'Amor').map((m) => sc[m]));
    if (sc['Amor'] >= other && other >= 0.12 * sc['Amor'] && other > 0) sc['Amor'] = 0.9 * other;
  }
  // «mi vida», «mi rey», «mi cielo» también se les dicen a los hijos o son frases hechas («la amiga de mi vida»).
  const ENDEAR = (x) => x.r.group === 'pareja' && /^mi\s/.test(x.a.key) && !/^mi (?:mujer|marido|senora)$/.test(x.a.key);
  // Lo que «no niega» para las señales: como NOT_NEG, pero «no tan romántico» y «no muy alegre» sí niegan.
  const NOT_NEG_CUE = new RegExp(B0 + '(?:no se|no importa|no solo|no mas|nada mas|al menos|a lo menos|por lo menos|sin importar|sin falta)' + B1, 'g');

  /* ---------- La lectura ---------- */
  // opts: { feelings[], occasion (la del selector), ask (lo que devuelve R.parse) } → Det (ver la forma en el diseño).
  I.read = function (text, opts) {
    opts = opts || {};
    const T = FL.taxonomy, L = lex();
    const raw = String(text || '').slice(0, 1000), t = abbr(fold(raw));
    const ask = opts.ask || R.parse(raw);
    const feelings = (opts.feelings || []).filter((m) => FL.meanings.includes(m));
    const intentById = (id) => (T.intents || []).find((e) => e.id === id);
    const clauseOf = (i) => lastEnd(CUT, t.slice(0, i));
    const sentOf = (i) => lastEnd(SENT, t.slice(0, i));
    // «para mi papá que está en el cielo», «para mi abuela que falleció»: la relativa que sigue a la persona habla de ella.
    const relTo = (x, h) => h.s >= x.e && ((h.s - x.e <= 2 && /^que\s/.test(t.slice(h.s, h.e))) ||
      /^\s*,?\s*que\s+(?:ya\s+|se\s+|nos\s+|lamentablemente\s+)?$/.test(t.slice(x.e, h.s)));

    // 1. Destinatarios: lectura aparte, con sus propias frases tapadas. No son personas «en la oficina», «quedé en pana»
    //    ni «la amiga de mi vida».
    let wk = t;
    let recs = [];
    L.who.forEach((a) => {
      a.re.lastIndex = 0;
      let m;
      while ((m = a.re.exec(wk))) {
        const s = m.index, e = s + m[0].length;
        wk = wipe(wk, s, e, '_');
        recs.push({ a, r: a.recipient, s, e, quote: raw.slice(s, e) });
      }
    });
    recs.sort((x, y) => x.s - y.s);
    recs = recs.filter((x) => {
      const near = t.slice(Math.max(0, x.s - 12), x.s);
      if (!/^mi\s/.test(x.a.key) && /(?<![a-z])en\s+(?:(?:el|la|los|las)\s+)?$/.test(near)) return false;
      return !(ENDEAR(x) && /(?<![a-z])(?:de|en)\s+$/.test(near));
    });
    if (recs.some((x) => x.r.group !== 'pareja')) recs = recs.filter((x) => !ENDEAR(x));
    recs.forEach((x, k) => {
      const pre = t.slice(Math.max(clauseOf(x.s), x.s - 40), x.s);
      const tok = pre.trim().split(/\s+/).pop() || '';
      const prev = recs[k - 1];
      x.head = prev && OWNER.test(t.slice(prev.e, x.s)) ? prev : null;
      if (x.head) { x.head.owned = true; x.head.owner = x; }
      x.negated = NEG_PARA.test(pre);
      x.addr = !x.head && ADDR.test(pre);
      x.role0 = OBJ_A.test(pre) ? 'third' : PARA.test(pre) ? 'para' : MINE.test(pre) || /^mi\s/.test(x.a.key) || x.addr ? 'mine' : THIRD.has(tok) ? 'third' : 'mine';
      x.role = x.head || x.negated ? 'third' : x.role0;
      x.memory = false;
    });
    // La pareja que manda el ramo junto a quien escribe, si hay otra persona a quien darlo.
    recs.forEach((x) => {
      if (x.r.group !== 'pareja' || !recs.some((y) => y !== x && y.r.group !== 'pareja' && !y.negated)) return;
      const cm = COSEND_PRE.exec(t.slice(Math.max(0, x.s - 30), x.s));
      if (COSEND_POST.test(t.slice(x.e)) || (cm && (cm[1] !== 'con' || WE.test(t)))) x.role = 'third';
    });
    // «el bebé de mi prima», «el perrito de mi mamá»: quien partió no es una persona de la lista; su dueña recibe el ramo.
    recs.forEach((x) => { x.ofBeing = !x.head && OF_BEING.test(t.slice(Math.max(0, x.s - 40), x.s)); });

    // 2. Señales. Un nombre propio no es un sentimiento: «para mi amiga Paz», «PARA MI AMIGA PAZ», «Paz está mal».
    const scan = cueScan(t, (a, s, e, m0) => a.single && a.kind !== 'emoji' && L.names.has(m0) &&
      (nameLike(raw, t, s, e) || recs.some((x) => x.e <= s && /^\s+$/.test(t.slice(x.e, s)))));
    // La cita llega hasta la palabra que sigue a un artículo o posesivo final: «no fui a tu cumpleaños», no «no fui a tu».
    const quoteEnd = (h) => {
      if (!/(?<![a-z])(?:a|al|de|del|el|la|mi|tu|su)$/.test(t.slice(h.s, h.e))) return h.e;
      const m = /^\s+[a-z0-9]+/.exec(t.slice(h.e));
      return m ? h.e + m[0].length : h.e;
    };
    // Un «Muchas gracias!» que cierra el pedido es cortesía con la florería, no gratitud.
    const closing = (h) => h.a.intent.id === 'gratitud' && sentOf(h.s) > 0 && CLOSING.test(t.slice(sentOf(h.s))) &&
      (recs.length > 0 || (ask.occasions || []).length > 0 || scan.hits.some((o) => o.s < h.s && o.a.intent.id !== 'gratitud'));
    const hits = scan.hits.filter((h) => !closing(h)).map((h) => Object.assign(h, { quote: raw.slice(h.s, quoteEnd(h)) }));
    const sm = SELF.exec(t);
    if (sm && !hits.some((h) => h.a.intent && h.a.intent.self) && intentById('para-mi')) {
      hits.push({ a: { kind: 'words', intent: intentById('para-mi') }, s: sm.index, e: sm.index + sm[0].length, quote: raw.slice(sm.index, sm.index + sm[0].length) });
    }
    hits.sort((x, y) => x.s - y.s);
    // Duelo que no es duelo: irse lejos («se nos fue a vivir a Australia») es la distancia; «lo siento por tu papá»
    // junto a una enfermedad es pena, no pésame.
    const demoted = [];
    const ill = hits.some((h) => h.a.intent.id === 'recuperacion');
    hits.forEach((h) => {
      if (!h.a.intent.mourning) return;
      const said = t.slice(h.s, h.e);
      const to = DEPART.test(said) && moved(raw, t, h.e) ? 'distancia' : ill && /^lo siento/.test(said) ? 'tristeza' : null;
      if (to && intentById(to)) { h.a = Object.assign({}, h.a, { intent: intentById(to) }); demoted.push(h); }
    });

    // 3. Texto para negar: sin frases neutras, sin señales que traen su propia negación, sin enfáticas ni «no sé».
    let nw = t;
    scan.neutral.concat(scan.selfNeg).forEach(([s, e]) => { nw = wipe(nw, s, e); });
    if (L.emphatic) { L.emphatic.lastIndex = 0; let m; while ((m = L.emphatic.exec(t))) nw = wipe(nw, m.index, m.index + m[0].length); }
    nw = nw.replace(NOT_NEG_CUE, (x) => ' '.repeat(x.length));

    // Negación de cada señal, en orden; un «ni» suelto hereda la de la anterior en la misma oración.
    let last = null;
    hits.forEach((h) => {
      const sentence = lastEnd(SENT_PS, t.slice(0, h.s));
      const prev = last && last.s >= sentence ? last.neg : null;
      h.neg = h.a.kind === 'emoji' ? null : negState(nw, h.s, h.e, prev);
      if (h.neg) last = h;
    });
    // Una muerte pasada (en marzo, el año pasado) junto a una fiesta para otra persona: contexto, no duelo.
    let occs = (ask.occasions || (ask.occasion ? [ask.occasion] : [])).slice();
    const festive = FESTIVE.includes(opts.occasion) || occs.some((id) => FESTIVE.includes(id)) || hits.some((h) => !h.neg && FESTIVE_CUES.includes(h.a.intent.id));
    hits.forEach((h) => {
      if (h.neg || !h.a.intent.mourning || h.a.kind === 'emoji' || !festive) return;
      const end = t.slice(h.s).search(/[.;:!?\n]/), sent = t.slice(sentOf(h.s), end < 0 ? t.length : h.s + end);
      // Otra persona: no la que nombra la relativa («para mi abuelita que se murió hace un año» habla de ella).
      if (PAST.test(sent) && recs.some((x) => !x.negated && x.role !== 'third' && clauseOf(x.s) !== clauseOf(h.s) && !relTo(x, h))) { h.past = true; demoted.push(h); }
    });
    // De quien partió hace tiempo se habla: no es para quien es el ramo.
    hits.filter((h) => h.past).forEach((h) => recs.forEach((x) => { if (x.role !== 'para' && clauseOf(x.s) === clauseOf(h.s)) x.role = 'third'; }));
    const live = hits.filter((h) => !h.neg && !h.past);

    // 4. Duelo: solo con palabras de duelo (no un emoji) o una ocasión de duelo (no basta que domine el recuerdo).
    //    Si la ocasión de duelo solo venía de una mención que no era duelo, se va con ella.
    if (demoted.length) {
      occs = occs.filter((id) => {
        if (!MOURN.includes(id)) return true;
        const o = occasionRes().find((x) => x.id === id);
        o.g.lastIndex = 0;
        let m;
        while ((m = o.g.exec(t))) { const s = m.index, e = s + m[0].length; if (!demoted.some((h) => s >= h.s && e <= h.e)) return true; }
        return false;
      });
    }
    const mournCue = live.some((h) => h.a.kind !== 'emoji' && h.a.intent.mourning);
    const mourning = mournCue || MOURN.includes(opts.occasion) || occs.some((id) => MOURN.includes(id));

    // 5. Quién partió: el destinatario más cercano a una palabra de duelo de la misma oración (uno con «para…» solo si
    //    la palabra de duelo lo nombra: «para mi papá en el cielo»). Si es el dueño de otro («el abuelo de mi novia»), es el otro.
    if (mourning) {
      // «mi amiga perdió a su bebé», «está de duelo»: quien sufre la pérdida recibe el ramo, no se la recuerda.
      let best = null, bestD = Infinity, bestH = null;
      live.filter((h) => h.a.kind !== 'emoji' && h.a.intent.mourning).forEach((h) => {
        const said = t.slice(h.s, h.e), suffer = SUFFER.test(said), sh = sentOf(h.s);
        const ps = POSTSUBJ.exec(t.slice(h.e, h.e + 40));
        if (ps) {
          const at = h.e + ps[0].length - ps[1].length, x = recs.find((r) => r.s === at && !r.negated);
          if (x) { if (bestD >= 0) { best = x; bestD = -1; bestH = h; } return; }
          if (new RegExp('^' + BEING + '$').test(ps[1])) return;
        }
        recs.forEach((x) => {
          if (x.negated || x.ofBeing || sentOf(x.s) !== sh) return;
          const inside = x.s >= h.s && x.e <= h.e;
          if (suffer && !inside) return;
          const d = h.s >= x.e ? h.s - x.e : x.s >= h.e ? x.s - h.e : 0;
          // Un «para…» solo si la señal lo nombra o va en su relativa.
          if (x.role === 'para' && !inside && !relTo(x, h)) return;
          if (d < bestD) { best = x; bestD = d; bestH = h; }
        });
      });
      // «el papá de mi amigo que falleció»: partió el papá. No una familia ni unos papás con el verbo en singular:
      // «la familia de mi amigo que falleció» recuerda al amigo.
      if (best && best.head && bestD >= 0) {
        const hn = fold(best.head.quote).toLowerCase(), pv = /(?:ron|descansen)$/.test(t.slice(bestH.s, bestH.e));
        if (!/^familia/.test(hn) && plural(hn) === pv) best = best.head;
      }
      if (best) best.memory = true;
      // «el papá de mi mejor amigo»: si el papá partió, el amigo vuelve a ser para quien es el ramo.
      recs.forEach((x) => { if (x.head && x.head.memory && !x.negated) x.role = x.role0; });
    }
    const cand = recs.filter((x) => !x.memory);
    const main = cand.find((x) => x.role === 'para') || cand.find((x) => x.role === 'mine') || null;
    const group = main ? main.r.group : null;
    const mem = recs.find((x) => x.memory) || null;

    // 6. Ocasión: la del selector manda; luego la del texto (en un duelo, la fiesta o la disculpa se dejan de lado); luego «en su día».
    //    Una fiesta elegida a mano tampoco envuelve un duelo que el texto dice ahora: «mi abuela falleció» no va como cumpleaños.
    let occasion = null, occasionSource = null, droppedOccasion = null;
    const festivePick = mournCue && FESTIVE.includes(opts.occasion);
    if (opts.occasion && FL.occasion(opts.occasion) && !festivePick) { occasion = opts.occasion; occasionSource = 'select'; }
    else if (mourning && (occs.length || mournCue)) {
      const mo = occs.find((id) => MOURN.includes(id));
      if (festivePick) droppedOccasion = opts.occasion;
      if (!mo) { droppedOccasion = droppedOccasion || occs[0] || null; occasion = 'condolencias'; }
      else { droppedOccasion = droppedOccasion || occs.find((id) => !MOURN.includes(id)) || null; occasion = mo; }
      occasionSource = 'text';
      // «se nos fue en Navidad», «murió el día de su cumpleaños»: la fiesta dice cuándo, no se pidió; no hay nada que dejar de lado.
      if (droppedOccasion && droppedOccasion !== opts.occasion) {
        const o = occasionRes().find((x) => x.id === droppedOccasion);
        let m, when = !!o;
        if (o) { o.g.lastIndex = 0; while ((m = o.g.exec(t))) if (!WHEN.test(t.slice(Math.max(0, m.index - 30), m.index))) when = false; }
        if (when) droppedOccasion = null;
      }
    } else if (occs.length) { occasion = occs[0]; occasionSource = 'text'; }
    if (!occasion && main && main.r.day && DAY.test(t) && FL.occasion(main.r.day)) { occasion = main.r.day; occasionSource = 'day'; }
    const occ = occasion ? FL.occasion(occasion) : null;

    // 7. Aporte de cada señal: tipo × intensidad × contraste; repetir una intención suma cada vez menos (1, ½, ¼…).
    const sc = zero(), avoid = new Set(), avoidSilent = new Set();
    const cuesOut = [];
    const byIntent = new Map();
    hits.forEach((h) => {
      // En un duelo, «bebé» o «primer día» no son una llegada ni un nuevo comienzo («el bebé de mi prima falleció»).
      if (h.past || (mourning && h.a.intent.quietInMourning)) return;
      const E = h.a.intent, w = KIND_W[h.a.kind];
      let x = 1;
      if (!h.neg) {
        const before = t.slice(0, h.s);
        const toks = t.slice(clauseOf(h.s), h.s).trim().split(/\s+/).filter(Boolean).slice(-2);
        if (toks.some((k) => L.intens1.has(k)) || (L.intensN && L.intensN.test(before))) x *= 1.5;
        if (L.after && L.after.test(t.slice(h.e))) x *= 1.5;
        if (/isim[oa]s?(?![a-z])/.test(t.slice(h.s, h.e))) x *= 1.5;
        if (L.soft && L.soft.test(before)) x *= 0.6;
        x = U.clamp(x, 0.4, 2);
        // Contraste en la oración: lo que sigue a «pero» pesa más; lo que sigue a «aunque» (sin coma de por medio), menos.
        const sent = t.slice(sentOf(h.s), h.s);
        let k = 1;
        if (/(?<![a-z])(?:pero|sino|mas bien)(?![a-z])/.test(sent)) k *= 1.3;
        const au = lastEnd(AUNQUE, sent);
        if (au && !sent.slice(au).includes(',')) k *= 0.7;
        const list = byIntent.get(E.id) || [];
        list.push(w * x * k);
        byIntent.set(E.id, list);
      } else if (h.neg === 'avoid') {
        (E.negate != null ? E.negate : Object.keys(E.mix).filter((m) => E.mix[m] >= 0.4)).forEach((m) => avoid.add(m));
      }
      cuesOut.push({ intent: E.id, label: E.label, quote: h.quote, kind: h.a.kind, at: h.s, w, x, neg: h.neg || null });
    });
    byIntent.forEach((amounts, id) => {
      const E = intentById(id);
      const mix = mourning && E.inMourning && intentById(E.inMourning) ? intentById(E.inMourning).mix : (group && E.with && E.with[group]) || E.mix;
      const total = amounts.sort((a, c) => c - a).reduce((a, v, i) => a + v * Math.pow(0.5, i), 0);
      Object.entries(mix).forEach(([m, v]) => { if (m in sc) sc[m] += total * v; });
      (E.avoid || []).forEach((m) => avoidSilent.add(m));
    });

    // Destinatarios: el principal pesa 1; otro cercano («mi…»), ½; un tercero o quien partió, nada. En un duelo, todo ×¼.
    recs.forEach((x) => {
      const k = x.memory || x.role === 'third' ? 0 : x === main ? 1 : 0.5;
      if (k) Object.entries(x.r.mix).forEach(([m, v]) => { if (m in sc) sc[m] += v * k * (mourning ? 0.25 : 1); });
    });
    if (main) (main.r.avoid || []).forEach((m) => avoidSilent.add(m));
    if (occ) occ.meanings.forEach((m, i) => { if (m in sc) sc[m] += 1.5 - i * 0.3; });

    // 8. Romance: la propia pareja como destinatario (no «el pololo de mi hija»); una ocasión de pareja, las palabras de
    //    amor y el sentimiento Amor marcado, solo si el ramo no es para otra persona: «te amo mamá», «te adoro abuelita»,
    //    el Amor marcado para un hijo o «nos casamos, para mi abuela» son cariño, no una declaración.
    //    Solo decide quien recibe el ramo: «mi novia y yo queremos regalarle a mi mamá» es para la mamá. En un duelo
    //    («mi mamá falleció, la amo», el pésame a la polola) no hay declaración, salvo por la pareja que partió.
    const isPartner = (x) => !!x && x.r.group === 'pareja' && !x.owned;
    const partner = isPartner(main);
    const romance = mourning ? isPartner(mem) && (!main || partner) && (live.some((h) => h.a.kind !== 'emoji' && h.a.intent.romance) || feelings.includes('Amor'))
      : partner || ((!main || group === 'pareja') &&
        (ROMANTIC.includes(occasion) || live.some((h) => h.a.kind !== 'emoji' && h.a.intent.romance) || feelings.includes('Amor')));

    // 9. Mezcla final.
    if (mourning) {
      sc['Recuerdo'] += 4;
      sc['Alegría'] *= 0.2; sc['Perdón'] *= 0.1;
      ['Admiración', 'Amistad', 'Amor', 'Nuevos comienzos'].forEach((m) => { sc[m] *= 0.5; });
    }
    feelings.forEach((m) => { sc[m] += 2; });
    avoid.forEach((m) => { if (!feelings.includes(m) && m in sc) sc[m] = 0; });
    avoidSilent.forEach((m) => { if (!feelings.includes(m) && m in sc) sc[m] = 0; });
    // El Amor marcado a mano se respeta (se leerá «cariño» si no hay romance).
    if (!romance && !feelings.includes('Amor')) capAmor(sc);
    const rawSc = Object.assign({}, sc);
    let { target, ranked } = shares(sc);
    let guessed = false;
    if (!ranked.length) {
      // 10. Sin sentimientos: lo que dicen las flores nombradas con su color (la misma unidad que la lectura) y los
      //     colores pedidos; si no, alegría. De un grupo como «rosas», la roja solo con romance.
      guessed = true;
      const g = zero();
      (ask.include || []).forEach((w, i) => {
        const it = FL.item(w.ids.find((id) => id !== 'rosa-roja' || romance) || w.ids[0]);
        if (!it) return;
        const u = R.unit(it);
        FL.meanings.forEach((m, j) => { g[m] += u[j] * (i === 0 ? 1 : 0.8); });
      });
      if ((ask.include || []).length) (ask.colors || []).forEach((c) => ((FL.color(c) || {}).meanings || []).forEach((m) => { if (m in g) g[m] += 0.5; }));
      if (!romance) capAmor(g);
      ({ target, ranked } = shares(g));
      if (!ranked.length) { target = { 'Alegría': 1 }; ranked = [{ id: 'Alegría', w: 1 }]; }
    }

    // «la mamá de mi polola» → «la mamá de tu polola».
    // «gracias por ser la mejor amiga» → «tu mejor amiga».
    const textOf = (x) => (x.addr ? recipientText(raw, t, x.s, x.e).replace(/^(?:la|el|una?|mi)\s/, 'tu ') : recipientText(raw, t, x.s, x.e)) +
      (x.owner && !x.owner.memory ? ' de ' + recipientText(raw, t, x.owner.s, x.owner.e) : '');
    const recipients = recs.map((x) => ({ id: x.r.id, group: x.r.group, quote: x.quote, text: textOf(x), role: x.role, memory: x.memory, at: x.s }));
    return {
      target, ranked, raw: rawSc, guessed,
      cues: cuesOut,
      recipients,
      recipient: main ? recipients[recs.indexOf(main)] : null,
      memoryText: mem ? memoryText(raw, t, mem) : null,
      occasion: occ, occasionSource, droppedOccasion,
      mourning, romance,
      sober: !!(ask.sober || (main && main.r.sober)),
      forSelf: live.some((h) => h.a.intent.self),
      avoid: FL.meanings.filter((m) => avoid.has(m)),
      avoidSilent: FL.meanings.filter((m) => avoidSilent.has(m))
    };
  };

  // Lo que siente el pedido del taller: { text, feelings[], occasion } → Det.
  R.detect = (req, ask) => I.read((req || {}).text, { feelings: (req || {}).feelings, occasion: (req || {}).occasion, ask });

  Object.assign(I, { fold, reEsc, phraseRe, isName, B0, B1 });
})();
