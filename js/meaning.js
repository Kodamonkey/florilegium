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

  /* ---------- Qué ramo dice lo que sientes ---------- */
  // req: { text, feelings[], occasion, season, hemisphere, petSafe, exclude[] }
  R.detect = function (req) {
    const T = FL.taxonomy, text = U.norm(req.text || '');
    const sc = Object.fromEntries(FL.meanings.map((m) => [m, 0]));
    // Palabras fuertes (falleció, perdón, te amo…) pesan más que las de contexto (mamá, amiga…).
    T.meanings.forEach((m) => {
      m.lexicon.forEach((w) => { if (text.includes(U.norm(w))) sc[m.id] += 1; });
      (m.strong || []).forEach((w) => { if (text.includes(U.norm(w))) sc[m.id] += 2; });
    });
    (req.feelings || []).forEach((m) => { if (m in sc) sc[m] += 2; });
    let occ = req.occasion ? FL.occasion(req.occasion) : null;
    if (!occ && text) occ = T.occasions.find((o) => text.includes(U.norm(o.name))) || null;
    if (occ) occ.meanings.forEach((m, i) => { sc[m] += 1.5 - i * 0.3; });
    const ranked = Object.entries(sc).filter(([, v]) => v > 0).sort((a, c) => c[1] - a[1]).map(([id, v]) => ({ id, w: v }));
    return { ranked, occasion: occ };
  };

  R.compose = function (req) {
    req = req || {};
    const T = FL.taxonomy;
    const hemi = req.hemisphere || FL.hemisphere();
    const season = req.season || FL.seasonOf(new Date(), hemi);
    const det = R.detect(req);
    const guessed = !det.ranked.length;
    const ranked = guessed ? [{ id: 'Alegría', w: 1 }] : det.ranked;
    const total = ranked.reduce((a, m) => a + m.w, 0);
    const wOf = Object.fromEntries(ranked.map((m) => [m.id, m.w / total]));
    const mourning = ranked[0].id === 'Recuerdo' || (det.occasion && ['condolencias', 'todos-santos'].includes(det.occasion.id));
    const text = U.norm(req.text || '');
    const exclude = new Set(req.exclude || []);
    const seed = U.hash((req.text || '') + '|' + (req.feelings || []).join(',') + '|' + (det.occasion ? det.occasion.id : ''));
    const jitter = (id) => (U.hash(seed + id) % 1000) / 20000;

    const score = (it) => {
      if (exclude.has(it.id) || !it.bouquet.florist) return -1;
      if (req.petSafe && toxic(it, ['media', 'alta'])) return -1;
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
      return s + jitter(it.id);
    };
    const pool = (roles) => FL.items.filter((it) => roles.includes(it.bouquet.role)).map((it) => ({ it, s: score(it) })).filter((x) => x.s >= 0).sort((a, c) => c.s - a.s);

    // La flor líder carga el sentimiento principal; las acompañantes suman los demás.
    const top = ranked[0].id;
    const leadPool = pool(['focal', 'secondary', 'spike']).map((x) => ({ it: x.it, s: x.s + (x.it.meanings.includes(top) ? 0.6 : 0) + (x.it.meanings[0] === top ? 0.2 : 0) + (x.it.bouquet.role === 'focal' ? 0.1 : 0) })).sort((a, c) => c.s - a.s);
    const lead = leadPool[0];
    const covered = new Set(lead ? lead.it.meanings : []);
    const seconds = [];
    pool(['focal', 'secondary', 'spike']).forEach((x) => {
      if (seconds.length >= 2 || x.s < 0.15 || (lead && x.it.id === lead.it.id)) return;
      const adds = x.it.meanings.some((m) => wOf[m] && !covered.has(m));
      if (seconds.length === 0 || adds) { seconds.push(x); x.it.meanings.forEach((m) => covered.add(m)); }
    });
    const filler = pool(['filler'])[0];
    const green = pool(['greenery'])[0];

    const single = /\buna sola\b|\buna flor\b|\bsolo una\b/.test(text);
    const dozen = !single && lead && lead.it.id === 'rosa-roja' && top === 'Amor' && det.occasion && ['san-valentin', 'aniversario'].includes(det.occasion.id);
    const stems = [];
    const leadW = lead ? ROLE_W[lead.it.bouquet.role] : 1;
    if (lead) stems.push({ item: lead.it.id, n: single ? 1 : dozen ? 12 : lead.it.bouquet.role === 'focal' ? 5 : 7 });
    if (!single) {
      // Que ninguna acompañante pese más que la líder.
      seconds.forEach((x, i) => stems.push({ item: x.it.id, n: U.clamp(Math.round((i === 0 ? 4 : 3) * leadW / ROLE_W[x.it.bouquet.role]), 2, 4) }));
      if (filler && !dozen) stems.push({ item: filler.it.id, n: 3 });
      if (green) stems.push({ item: green.it.id, n: 3 });
    } else if (green) stems.push({ item: green.it.id, n: 1 });
    // Si aun así la lectura se inclina hacia otro sentimiento, la líder gana tallos.
    if (lead && !single && !dozen && lead.it.meanings[0] === top) {
      for (let k = 0; k < 2; k++) {
        const r0 = R.interpret({ stems, layoutSeed: seed });
        if (!r0.meanings.length || r0.meanings[0].id === top) break;
        stems[0].n = Math.min(FL.limits.stemsPerItem, stems[0].n + 2);
      }
    }
    // En Europa del Este, los números pares de flores se reservan para funerales: en regalos, impar.
    const flowerN = stems.reduce((a, s) => a + (FL.item(s.item).type === 'flower' ? s.n : 0), 0);
    if (!mourning && flowerN > 1 && flowerN % 2 === 0) {
      const target = stems.find((s, i) => i > 0 && FL.item(s.item).type === 'flower') || (dozen ? null : stems[0]);
      if (target) target.n += target === stems[0] ? 1 : -1;
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
      return { item: it.id, name: it.name, n: s.n, why: hits.length ? 'aporta ' + list(hits.map(phrase)) + ' (' + role + ')' : 'da ' + (it.bouquet.role === 'greenery' ? 'marco y frescura' : 'volumen y aire') + ' (' + role + ')' };
    });
    const leadText = guessed
      ? 'No encontré sentimientos claros en lo que escribiste, así que propongo un ramo alegre. Prueba contar para quién es o qué quieres decir.'
      : 'Leí en lo que escribiste ' + list(ranked.slice(0, 3).map((m) => phrase(m.id))) + '.' +
        (det.occasion ? ' Ocasión: ' + det.occasion.name.toLowerCase() + '.' : '') +
        ' Prioricé flores de ' + season + ' en el hemisferio ' + (hemi === 'S' ? 'sur' : 'norte') + (req.petSafe ? ' y dejé fuera las tóxicas para mascotas' : '') + '.';
    return { bouquet, rationale: { lead: leadText, items: why }, reading, detected: { meanings: ranked, occasion: det.occasion ? det.occasion.id : null, guessed } };
  };

  function B() { return FL.bouquet; }
})();
