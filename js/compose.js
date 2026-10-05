/* Florilegio — qué ramo dice lo que sientes (compose): búsqueda exacta entre todas las combinaciones válidas de
   protagonista × acompañantes × relleno × follaje × cantidades. Puntúa con el mismo vector que la lectura (R.unit, R.weight):
   lo que el buscador elige es lo que la lectura dirá. Sin azar ni reloj en lo que decide: misma entrada, mismo ramo. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u, R = FL.reading;
  const RIBBON = {
    'Amor': '#a3182b', 'Amistad': '#e7c25c', 'Admiración': '#7d69bb', 'Gratitud': '#b54470', 'Recuerdo': '#f4f0e4',
    'Esperanza': '#4d6647', 'Perdón': '#7d69bb', 'Nuevos comienzos': '#f4f0e4', 'Alegría': '#e7c25c', 'Calma': '#6f97e0'
  };
  const FOCAL = ['focal', 'secondary', 'spike'];
  const MOURN = ['condolencias', 'todos-santos'];
  // Flores (sin follaje ni rellenos que no son flor) y follaje para cada tamaño pedido.
  const SIZES = { 'pequeño': { flowers: 6, green: 2 }, 'grande': { flowers: 21, green: 5 } };
  const NMAX = 25; // cantidades 1..24 por ítem
  // Margen visible del sentimiento principal (sobre la masa total), castigos y regularizador de cantidades.
  const DELTA = 0.04, TABOO = 0.5, AVOID = 1, LAMBDA = 0.004, REF_L = 7, REF_C = 3, LEAD_FOCAL = 0.02, RED_SHARE = 0.3, RED_PEN = 1;
  // Ocasiones de fiesta: ahí el recuerdo pesa el doble como tabú, y si un duelo las deja de lado se dice «no como una fiesta».
  const FESTIVE = ['cumpleanos', 'aniversario', 'boda', 'graduacion', 'navidad', 'nacimiento', 'san-valentin', 'amistad', 'flores-amarillas', 'porque-si', 'dia-madre', 'dia-padre', 'dia-profesor', 'dia-mujer'];
  const toxic = (it) => ['cats', 'dogs'].some((k) => ['media', 'alta'].includes(it.care.toxicity[k]));
  const inSeason = (it, s) => !it.seasons.length || it.seasons.includes(s) || it.seasons.length >= 4;
  // Hasta que el catálogo traiga la marca, el crisantemo es la flor reservada al duelo.
  const mourningOnly = (it) => (it.bouquet.mourningOnly != null ? !!it.bouquet.mourningOnly : it.id === 'crisantemo');
  const fmtInt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const tones = (c) => c + (/[aeiou]$/.test(c) ? 's' : 'es');
  // «a, b ni c» para lo que se niega o se deja fuera.
  const listNi = (arr) => (arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' ni ' + arr[arr.length - 1]);
  const clock = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
  // «ranúnculos» va en plural; «iris» y «lisianthus», no (los nombres del catálogo están en singular).
  let SING = null;
  const manyOf = (label) => {
    const w = FL.intent.fold(String(label || '').toLowerCase()).trim();
    if (!SING) SING = new Set(FL.items.map((it) => FL.intent.fold(it.name.toLowerCase())).concat(Object.keys(FL.taxonomy.aliases || {})));
    return /s$/.test(w) && !SING.has(w);
  };
  const cartesian = (k, vals) => { let acc = [[]]; for (let i = 0; i < k; i++) acc = acc.flatMap((a) => vals.map((x) => a.concat([x]))); return acc; };

  // Tablas fijas del catálogo: unidad y masa de cada ítem y, por cantidad, su peso y su vector pesado. Una para los duelos
  // (los colores dicen lo del duelo: el blanco, recuerdo) y otra para lo demás, como la lectura (R.unit).
  const TABS = {};
  function table(mourn) {
    const key = mourn ? 'duelo' : 'fiesta';
    if (TABS[key]) return TABS[key];
    const K = FL.meanings.length, NI = FL.items.length;
    const UNIT = new Float64Array(NI * K), MASS = new Float64Array(NI), WT = new Float64Array(NI * NMAX), VEC = new Float64Array(NI * NMAX * K);
    // Para la regla del rojo (R.phraseFor): rojo que dice amor y masa de color (sin el verde) de cada ítem.
    const REDA = new Float64Array(NI), HUED = new Float64Array(NI);
    FL.items.forEach((it, i) => {
      const u = R.unit(it, mourn);
      UNIT.set(u, i * K);
      MASS[i] = u.reduce((a, x) => a + x, 0);
      HUED[i] = it.colors[0] && it.colors[0] !== 'verde' ? 1 : 0;
      REDA[i] = it.colors[0] === 'rojo' && it.meanings.includes('Amor') ? 1 : 0;
      for (let n = 1; n < NMAX; n++) {
        const w = R.weight(it, n);
        WT[i * NMAX + n] = w;
        for (let m = 0; m < K; m++) VEC[(i * NMAX + n) * K + m] = w * u[m];
      }
    });
    return (TABS[key] = { K, NI, UNIT, MASS, WT, VEC, REDA, HUED, idx: new Map(FL.items.map((it, i) => [it.id, i])) });
  }

  // req: { text, feelings[], occasion, season, hemisphere, petSafe, exclude[], avoidLeads[] }; opts: { exhaustive, budget }
  R.compose = function (req, opts) {
    req = req || {};
    opts = opts || {};
    const t0 = clock();

    /* 1. Contexto */
    const hemi = req.hemisphere || FL.hemisphere();
    const season = req.season || FL.seasonOf(null, hemi);
    const ask = R.parse(req.text);
    const det = R.detect(req, ask);
    const occId = det.occasion ? det.occasion.id : null;
    // La misma tabla con que la lectura leerá el ramo (por su ocasión).
    const X = table(MOURN.includes(occId)), K = X.K, M = FL.meanings, items = FL.items, L = FL.limits;
    const UNIT = X.UNIT, MASS = X.MASS, WT = X.WT, VEC = X.VEC;
    const seed = U.hash((req.text || '') + '|' + (req.feelings || []).join(',') + '|' + (occId || ''));
    const mourning = !!det.mourning, petSafe = !!req.petSafe;
    const avoid = det.avoid || [], sober = !!(ask.sober || det.sober);

    /* 2. Lo que se quiere decir */
    const q = new Float64Array(K);
    M.forEach((m, i) => { q[i] = (det.target && det.target[m]) || 0; });
    const argmax = () => { let t = 0; for (let m = 1; m < K; m++) if (q[m] > q[t]) t = m; return t; };
    let top = argmax();

    /* 3. Reglas duras. H1–H3 valen para todo; H4–H8 no tocan lo que la persona nombró. */
    const exclude = new Set((req.exclude || []).concat(ask.exclude));
    const avoidColor = (it) => ask.avoidColors.length > 0 && it.colors.every((c) => ask.avoidColors.includes(c));
    const base = (it) => it.bouquet.florist && !exclude.has(it.id) && !(petSafe && toxic(it));
    const allowed = (it) => base(it) && !avoidColor(it) && !(mourningOnly(it) && !mourning) && it.care.form !== 'potted' &&
      !(it.id === 'rosa-roja' && !det.romance) && !avoid.includes(it.meanings[0]);

    /* 4. Lo que la persona nombró: entra sí o sí (de un grupo como «rosas», la búsqueda elige cuál). */
    const notes = [], wanted = [], left = [], toxicOut = [];
    ask.include.forEach((w) => {
      const all = w.ids.map(FL.item).filter((it) => it && !exclude.has(it.id));
      // De un grupo («rosas»), las variantes siguen las reglas de siempre (nada rojo, sin rosa roja sin romance) si queda alguna.
      const ok0 = all.filter(base), okA = ok0.filter(allowed);
      const ok = all.length > 1 && okA.length ? okA : ok0;
      if (!ok.length) {
        const it = all[0];
        if (!it) return;
        if (it.bouquet.florist) toxicOut.push(it);
        else notes.push(R.cap(R.article(it.name) + ' ' + it.name.toLowerCase()) + ' no se consigue en florería: quedó fuera.');
        return;
      }
      const ids = ok.map((it) => X.idx.get(it.id));
      const had = wanted.find((x) => x.ids.length === ids.length && x.ids.every((i, k) => i === ids[k]));
      const role = ok[0].bouquet.role;
      if (had) { if (w.n) had.n = had.asked = (had.n || 0) + w.n; return; }
      // Un ramo lleva un relleno y un follaje, y a lo más once flores distintas (con el relleno) más el follaje, que tiene su puesto.
      const dup = (role === 'filler' || role === 'greenery') && wanted.some((x) => x.role === role);
      const full = role !== 'greenery' && wanted.filter((x) => x.role !== 'greenery').length >= L.items - 1;
      if (dup || full) left.push({ label: w.label, role, full: !dup });
      else wanted.push({ ids, n: w.n, asked: w.n, label: w.label, role });
    });
    const out = (arr) => R.list(arr.map((x) => x.label.toLowerCase())) + (arr.length > 1 || manyOf(arr[0].label) ? ' quedaron fuera.' : ' quedó fuera.');
    const lw = (role, full) => left.filter((x) => !!x.full === full && (role ? x.role === role : FOCAL.includes(x.role) || x.full));
    if (lw('filler', false).length) notes.push('Usé un solo relleno: ' + out(lw('filler', false)));
    if (lw('greenery', false).length) notes.push('Usé un solo follaje: ' + out(lw('greenery', false)));
    if (lw(null, true).length) notes.push('Un ramo admite hasta ' + (L.items - 1) + ' flores distintas más el follaje: ' + out(lw(null, true)));
    // Un relleno nombrado que no cupo no se cambia por otro sin nombrar.
    const fillCut = left.some((x) => x.full && x.role === 'filler');
    wanted.forEach((x) => { if (x.n > L.stemsPerItem) { notes.push('Cada flor admite hasta ' + L.stemsPerItem + ' tallos en el ramo.'); x.n = L.stemsPerItem; } });
    // Si las cantidades pedidas suman más de lo que admite un ramo, se reparten en proporción.
    const askedN = wanted.reduce((a, x) => a + (x.n || 0), 0);
    if (askedN > L.stems) {
      wanted.forEach((x) => { if (x.n) x.n = Math.max(1, Math.floor((x.n * L.stems) / askedN)); });
      notes.push('Un ramo admite hasta ' + L.stems + ' tallos: ajusté las cantidades en proporción.');
    }
    const wFlowers = wanted.filter((x) => FOCAL.includes(x.role));
    const wFill = wanted.filter((x) => x.role === 'filler'), wGreen = wanted.filter((x) => x.role === 'greenery');
    const fixedN = (i) => { const w = wanted.find((x) => x.ids.includes(i)); return w && w.n ? w.n : 0; };

    /* 5. Tamaño: qué clase de plantillas de cantidad se prueba. */
    const single = ask.size === 'una';
    const exact = wanted.some((x) => x.n) && ask.count == null && !SIZES[ask.size];
    const sizeT = ask.count != null ? Math.min(ask.count, L.stems - 4) : SIZES[ask.size] ? SIZES[ask.size].flowers : null;
    const maxC = single || ask.only || exact ? 0 : sizeT == null ? 2 : sizeT <= 3 ? 0 : sizeT <= 7 ? 1 : 2;
    const RED = X.idx.get('rosa-roja');
    const avoidLeads = new Set(req.avoidLeads || []);
    // Con colores pedidos, cada puesto se queda con los de esos colores si hay: primero los que se ven de ese color
    // (su color principal), mientras alguno diga el sentimiento principal; si no, los que vienen en ese color.
    const hue = (it) => it.colors.some((c) => ask.colors.includes(c));
    const hue0 = (it) => ask.colors.includes(it.colors[0]);
    // hueAny: segundo intento (ver el paso 12), con todas las que vienen en esos colores.
    let hueAny = false;
    const tint = (list) => {
      if (!ask.colors.length) return list;
      const carry = (l) => l.some((i) => UNIT[i * K + top] > 0);
      const t0 = list.filter((i) => hue0(items[i])), t1 = list.filter((i) => hue(items[i]));
      return !hueAny && carry(t0) ? t0 : t1.length ? t1 : list;
    };
    const ofRole = (roles) => items.map((_, i) => i).filter((i) => roles.includes(items[i].bouquet.role) && allowed(items[i]));
    // La docena roja: no si se pidió otro color que la rosa roja no tiene, ni si «Otra opción» ya la mostró.
    const dozen = !single && sizeT == null && !exact && M[top] === 'Amor' && !!det.romance && ['san-valentin', 'aniversario'].includes(occId) &&
      RED != null && allowed(items[RED]) && (!wFlowers.length || wFlowers.some((x) => x.ids.includes(RED))) &&
      (!ask.colors.length || hue(items[RED]) || !ofRole(FOCAL).some((i) => hue(items[i]))) && !avoidLeads.has('rosa-roja');
    const useFiller = !single && !dozen && !ask.only && !exact && (sizeT == null || sizeT >= 9);
    // En Europa del Este, los números pares se reservan para funerales: en un regalo, impar (salvo cantidades pedidas o la docena).
    const parityFree = dozen || wanted.some((x) => x.n) || ask.count != null || (mourning && MOURN.includes(occId));
    const cls = single ? 'single' : dozen ? 'dozen' : exact ? 'exact' : sizeT != null ? 'size' : 'default';

    /* 6. Puestos del ramo y sus candidatas (con colores pedidos, teñidas). */
    let focal = tint(ofRole(FOCAL));
    let fillPool = useFiller ? tint(ofRole(['filler'])) : [];
    let greenPool = ofRole(['greenery']);
    // Los follajes sin significado (helecho, ruscus) dicen lo mismo: queda uno, el ruscus con mascotas, si no lo elige la semilla.
    const plainGreens = greenPool.filter((i) => !items[i].meanings.length);
    if (plainGreens.length > 1) {
      const ruscus = plainGreens.find((i) => items[i].id === 'ruscus');
      const keep = petSafe && ruscus != null ? ruscus : plainGreens[U.hash(seed + 'g') % plainGreens.length];
      greenPool = greenPool.filter((i) => items[i].meanings.length || i === keep);
    }
    const named = [].concat(...wanted.map((w) => w.ids));

    /* 7. Si ninguna flor permitida dice el sentimiento principal (perdón sin tóxicas para mascotas),
       se apunta a sus significados cercanos (taxonomy.meanings[].near) y el texto lo explica. */
    let fallback = null;
    {
      const usable = focal.concat(fillPool, greenPool, named, dozen ? [RED] : []);
      const near = (FL.meaning(M[top]) || {}).near;
      if (!usable.some((i) => UNIT[i * K + top] > 0) && near) {
        const from = M[top], w = q[top], has = new Set(usable);
        // Solo hacia los cercanos que alguna flor permitida dice (si ninguno, hacia todos).
        const said = (m) => usable.some((i) => UNIT[i * K + M.indexOf(m)] > 0);
        const pairs = Object.entries(near).map(([m, k], o) => ({ m, k, o })).filter((x) => M.indexOf(x.m) >= 0);
        const aim = pairs.some((x) => said(x.m)) ? pairs.filter((x) => said(x.m)) : pairs;
        const sum = aim.reduce((a, x) => a + x.k, 0) || 1;
        q[top] = 0;
        aim.forEach((x) => { q[M.indexOf(x.m)] += (w * x.k) / sum; });
        top = argmax();
        const blocked = items.filter((it, i) => it.bouquet.florist && it.meanings.includes(from) && !has.has(i));
        // Cada flor que lo diría quedó fuera por una regla; la razón es la de la mayoría (y solo se nombran esas).
        const why = (it) => (petSafe && toxic(it) ? 'mascotas' : exclude.has(it.id) ? 'excluidas'
          : avoidColor(it) || (ask.colors.length > 0 && !hue(it)) ? 'colores' : 'catalogo');
        const count = {};
        blocked.forEach((it) => { count[why(it)] = (count[why(it)] || 0) + 1; });
        const reason = ['mascotas', 'excluidas', 'colores', 'catalogo'].reduce((a, r) => ((count[r] || 0) > (count[a] || 0) ? r : a));
        const to = aim.slice().sort((a, c) => c.k - a.k || a.o - c.o).map((x) => x.m);
        fallback = { from, to, reason, blockers: blocked.filter((it) => why(it) === reason).map((it) => it.id) };
      }
    }
    const TOP = M[top];

    /* 8. La protagonista lleva el sentimiento principal (si alguna permitida lo dice). «Otra opción» evita las ya vistas. */
    const carries = (i) => items[i].meanings.includes(TOP);
    let cycled = false;
    // «Otra opción»: fuera las protagonistas ya vistas (skipped); si no queda ninguna, se vuelve a empezar (cycled).
    function candidates(avoidSet) {
      let skipped = false;
      const fresh = (list, idOf) => {
        if (!avoidSet.size) return list;
        const f = list.filter((c) => !avoidSet.has(items[idOf(c)].id));
        if (f.length) { if (f.length < list.length) skipped = true; return f; }
        if (list.length) cycled = true;
        return list;
      };
      let lead = [], wide = null;
      if (wFlowers.length) {
        // La protagonista es una de las flores que nombraste; las demás nombradas van de acompañantes.
        const picks = groupChoices(wFlowers);
        picks.forEach((pick) => pick.forEach((Li, gi) => lead.push({ L: Li, forced: pick.filter((_, k) => k !== gi) })));
        if (dozen) lead = lead.filter((c) => c.L === RED);
        else {
          lead = fresh(lead, (c) => c.L);
          // Si con las que dicen el sentimiento no se arma ningún ramo (cantidades pedidas), se prueba con todas las nombradas.
          if (lead.some((c) => carries(c.L)) && !lead.every((c) => carries(c.L))) { wide = lead; lead = lead.filter((c) => carries(c.L)); }
        }
      } else if (dozen) lead = [{ L: RED, forced: [] }];
      else {
        const pool = fresh(focal.some(carries) ? focal.filter(carries) : focal, (i) => i);
        lead = pool.map((i) => ({ L: i, forced: [] }));
        // Si ninguna protagonista que lo dice logra que la lectura coincida, se prueba con todas.
        if (focal.some(carries) && focal.some((i) => !carries(i))) wide = fresh(focal, (i) => i).map((i) => ({ L: i, forced: [] }));
      }
      return { lead, wide, skipped };
    }
    function groupChoices(groups) {
      let acc = [[]];
      groups.forEach((g) => { acc = acc.flatMap((a) => g.ids.filter((i) => !a.includes(i)).map((i) => a.concat([i]))); });
      return acc;
    }

    /* 9. Plantillas de cantidad: [líder, acompañantes…], relleno, follaje y un castigo pequeño por alejarse de la referencia. */
    const fillN = sizeT == null ? 3 : U.clamp(Math.round(sizeT / 6), 2, 4);
    const leadN = single ? [1] : dozen ? [12] : [7, 8, 6, 9, 5, 10, 11];
    const compN = sizeT == null ? [3, 2, 4] : Array.from(new Set([5, 7, 4].map((d) => Math.max(1, Math.round(sizeT / d)))));
    const Fset = single ? [1] : ask.count != null ? [sizeT] : sizeT != null ? [sizeT - 1, sizeT, sizeT + 1] : null;
    const greenN = single ? 1 : SIZES[ask.size] && ask.count == null ? SIZES[ask.size].green : sizeT != null || exact ? null : 3;
    const shapes = new Map();
    // Último recurso si con el tamaño pedido no se arma ningún ramo (pocas flores en esos colores, una sola flor con un relleno
    // nombrado): hasta ese número de flores libres, lo más cerca posible, y el texto lo dice.
    const ALL_N = Array.from({ length: L.stemsPerItem }, (_, k) => k + 1), maxF = Fset ? Math.max(...Fset) : 0, RELAX = 0.005;
    let relaxed = false;
    // fx: cantidades fijas (lo que se pidió con número) de [líder, acompañantes…, relleno, follaje]; 0 = libre; follaje −1 = sin follaje.
    function shape(nC, kind, fx) {
      const key = nC + '|' + kind + '|' + fx.join(',') + (relaxed ? '|r' : '');
      let out = shapes.get(key);
      if (out) return out;
      out = [];
      const combos = nC <= 2 ? cartesian(nC, compN) : [Array(nC).fill(compN[0])];
      combos.forEach((cn0) => {
        const cn = cn0.map((n, k) => fx[1 + k] || n);
        const fN = kind >= 0 ? fx[1 + nC] || fillN : 0;
        const rest = cn.reduce((a, n) => a + n, 0) + (kind === 1 ? fN : 0);
        const loose = relaxed && Fset;
        const fixedSum = fx.slice(0, 1 + nC).reduce((a, n) => a + (n || 0), 0) + (kind === 1 ? fx[1 + nC] || 0 : 0);
        const leads = fx[0] ? [fx[0]] : loose ? ALL_N : Fset ? Fset.map((F) => F - rest) : leadN;
        leads.forEach((nL) => {
          const flowers = rest + nL;
          if (nL < 1 || nL > L.stemsPerItem || cn.some((n) => n < 1 || n > L.stemsPerItem)) return;
          if (loose ? flowers - fixedSum > maxF : Fset && !fx[0] && !Fset.includes(flowers)) return;
          if (!parityFree && flowers > 1 && flowers % 2 === 0) return;
          const g = fx[2 + nC] < 0 ? 0 : fx[2 + nC] || (greenN != null ? greenN : U.clamp(Math.round(flowers / 3), 1, 4));
          if (flowers + (kind === 0 ? fN : 0) + g > L.stems) return;
          const pen = loose ? RELAX * (maxF - (flowers - fixedSum))
            : cls === 'default' ? LAMBDA * (Math.abs(nL - REF_L) + cn.reduce((a, n) => a + Math.abs(n - REF_C), 0)) : 0;
          out.push({ ns: [nL].concat(cn), fN, g, pen });
        });
      });
      out.sort((a, c) => a.pen - c.pen);
      shapes.set(key, out);
      return out;
    }
    const kindOf = (f) => (f < 0 ? -1 : items[f].type === 'flower' ? 1 : 0);
    // Relleno y follaje: si con ellos no cabe ningún ramo (muchas flores o muchas nombradas), se prueba sin ellos (12).
    let fills = wFill.length ? wFill[0].ids : fillPool.length && !fillCut ? fillPool : [-1];
    let greens = wGreen.length ? [wGreen[0].ids[0]] : greenPool.length ? greenPool : [-1];
    let gFix = greens[0] >= 0 ? fixedN(greens[0]) : -1;
    const fxOf = (core) => core.map(fixedN);
    const tplOf = (nC, f, fx) => shape(nC, kindOf(f), fx.concat([f >= 0 ? fixedN(f) : 0, gFix]));

    /* 10. Términos del puntaje por ítem: temporada y blanco (duelo o pedido sobrio), y una variación mínima por semilla. */
    const beta = new Float64Array(X.NI), JIT = new Float64Array(X.NI * NMAX).fill(-1), jitMax = new Float64Array(X.NI);
    items.forEach((it, i) => {
      const white = it.colors.includes('blanco');
      beta[i] = (inSeason(it, season) ? 0.05 : 0) + (mourning && white ? 0.08 : sober && !ask.colors.length && white ? 0.05 : 0);
    });
    const jit = (i, n) => {
      const k = i * NMAX + n;
      if (JIT[k] < 0) JIT[k] = (U.hash(seed + items[i].id + ':' + n) % 1000) / 2e6;
      return JIT[k];
    };
    items.forEach((_, i) => { for (let n = 1; n < NMAX; n++) jitMax[i] = Math.max(jitMax[i], jit(i, n)); });
    const qIdx = [];
    for (let m = 0; m < K; m++) if (q[m] > 0) qIdx.push(m);
    // Tabú (si no se pidieron): recuerdo y perdón fuera de un duelo, el recuerdo con doble peso en una fiesta;
    // perdón y alegría en un duelo.
    const party = FESTIVE.includes(occId);
    const taboo = (mourning ? ['Perdón', 'Alegría'] : ['Recuerdo', 'Perdón'])
      .map((m) => M.indexOf(m)).filter((m) => m >= 0 && !(q[m] > 0));
    const tabooW = taboo.map((m) => (party && M[m] === 'Recuerdo' ? 2 : 1) * TABOO);
    // Sin romance, que el rojo de las flores de amor no domine el ramo: la lectura diría «amor declarado».
    const redCap = !det.romance;
    // Lo que se pidió evitar (dicho o por defecto del destinatario), salvo lo que igual se quiere decir.
    const avoidIdx = Array.from(new Set(avoid.concat(det.avoidSilent || []))).map((m) => M.indexOf(m)).filter((m) => m >= 0 && !(q[m] > 0));
    const leadBonus = (Li) => (items[Li].bouquet.role === 'focal' ? LEAD_FOCAL : 0);

    // Evaluar un ramo: mismo vector que interpret.
    // (Es el bucle caliente: tablas locales, la variación ya calculada en JIT y la intersección solo sobre lo que se quiere decir.)
    const v = new Float64Array(K), REDA = X.REDA, HUED = X.HUED, nQ = qIdx.length;
    let scored = 0, lastOK = 0, lastS = 0;
    function evaluate(ids, ns, len, delta) {
      scored++;
      v.fill(0);
      let w = 0, b = 0, j = 0, tot = 0, rw = 0, cw = 0;
      for (let s = 0; s < len; s++) {
        const i = ids[s], n = ns[s], k = i * NMAX + n, r = k * K, wi = WT[k];
        for (let m = 0; m < K; m++) v[m] += VEC[r + m];
        w += wi; b += wi * beta[i]; j += JIT[k]; rw += wi * REDA[i]; cw += wi * HUED[i];
      }
      for (let m = 0; m < K; m++) tot += v[m];
      let ok = tot > 0 ? 1 : 0;
      const need = delta * tot > 1e-9 ? delta * tot : 1e-9, vt = v[top];
      for (let m = 0; m < K && ok; m++) if (m !== top && vt - v[m] < need) ok = 0;
      let S = 0, tb = 0, av = 0;
      if (tot > 0) {
        const inv = 1 / tot;
        for (let s = 0; s < nQ; s++) { const m = qIdx[s], p = v[m] * inv; S += p < q[m] ? p : q[m]; }
        for (let k = 0; k < taboo.length; k++) tb += (tabooW[k] / TABOO) * v[taboo[k]] * inv;
        for (let k = 0; k < avoidIdx.length; k++) av += v[avoidIdx[k]] * inv;
      }
      lastOK = ok; lastS = S;
      return 4 * ok + S + (w ? b / w : 0) + j - TABOO * tb - AVOID * av - (redCap && cw > 0 && rw >= RED_SHARE * cw ? RED_PEN : 0);
    }

    /* 11. Núcleos (protagonista + acompañantes) y la cota de lo mejor que cada uno puede llegar a ser. */
    let nodes = [];
    const build = (cands) => {
      nodes = [];
      const seenCore = new Set();
      cands.forEach(({ L: Li, forced }) => buildLead(Li, forced, seenCore));
    };
    function buildLead(Li, forced, seenCore) {
      const room = Math.max(0, maxC - forced.length);
      const minC = forced.length ? 0 : Math.min(1, maxC);
      const cands = focal.filter((i) => i !== Li && !forced.includes(i));
      const add = (C) => {
        if (C.length < minC && cands.length) return;
        if (wFlowers.length) {
          const key = Li + ':' + C.slice().sort((a, c) => a - c).join(',');
          if (seenCore.has(key)) return;
          seenCore.add(key);
        }
        nodes.push({ L: Li, C, core: [Li].concat(C), ub: 0, top: false });
      };
      add(forced.slice());
      if (room >= 1) cands.forEach((a) => add(forced.concat([a])));
      if (room >= 2) cands.forEach((a, x) => cands.slice(x + 1).forEach((c) => add(forced.concat([a, c]))));
    }

    // Complementos (relleno × follaje): lo máximo que pueden sumar a cada significado y lo mínimo que pesan.
    let gNs = [];
    const addMax = new Float64Array(K), addTop = new Float64Array(K);
    let addMass = 0, addB = 0, addJ = 0, onAddMax = 0, offAddMin = 0;
    const ON = new Float64Array(X.NI);
    for (let i = 0; i < X.NI; i++) qIdx.forEach((m) => { ON[i] += UNIT[i * K + m]; });
    function prepare() {
      gNs = gFix > 0 ? [gFix] : greenN != null ? [greenN] : [1, 2, 3, 4];
      ranges.clear();
      addMax.fill(0); addB = 0;
      const fMax = new Float64Array(K), gMax = new Float64Array(K);
      let fMass = Infinity, gMass = Infinity, fJ = 0, gJ = 0, fOn = 0, gOn = 0, fOff = Infinity, gOff = Infinity;
      fills.forEach((f) => {
        if (f < 0) { fMass = 0; fOff = 0; return; }
        const w = WT[f * NMAX + (fixedN(f) || fillN)];
        for (let m = 0; m < K; m++) fMax[m] = Math.max(fMax[m], w * UNIT[f * K + m]);
        fMass = Math.min(fMass, w * MASS[f]); addB = Math.max(addB, beta[f]); fJ = Math.max(fJ, jitMax[f]);
        fOn = Math.max(fOn, w * ON[f]); fOff = Math.min(fOff, w * (MASS[f] - ON[f]));
      });
      greens.forEach((g) => gNs.forEach((n) => {
        if (g < 0) { gMass = 0; gOff = 0; return; }
        const w = WT[g * NMAX + n];
        for (let m = 0; m < K; m++) gMax[m] = Math.max(gMax[m], w * UNIT[g * K + m]);
        gMass = Math.min(gMass, w * MASS[g]); addB = Math.max(addB, beta[g]); gJ = Math.max(gJ, jitMax[g]);
        gOn = Math.max(gOn, w * ON[g]); gOff = Math.min(gOff, w * (MASS[g] - ON[g]));
      }));
      for (let m = 0; m < K; m++) addMax[m] = fMax[m] + gMax[m];
      addMass = fMass + gMass; addJ = fJ + gJ; onAddMax = fOn + gOn; offAddMin = fOff + gOff;
    }
    // Lo máximo que el relleno y el follaje pueden sumar a «principal − rival − δ·masa» (depende de δ).
    function complementsTop(delta) {
      const best = (list, ws) => {
        const out = new Float64Array(K).fill(-Infinity);
        list.forEach((i) => ws(i).forEach((w) => {
          for (let m = 0; m < K; m++) {
            const x = i < 0 ? 0 : w * (UNIT[i * K + top] - UNIT[i * K + m] - delta * MASS[i]);
            if (x > out[m]) out[m] = x;
          }
        }));
        return out;
      };
      const f = best(fills, (i) => [i < 0 ? 0 : WT[i * NMAX + (fixedN(i) || fillN)]]);
      const g = best(greens, (i) => (i < 0 ? [0] : gNs.map((n) => WT[i * NMAX + n])));
      for (let m = 0; m < K; m++) addTop[m] = f[m] + g[m];
    }

    // Rango de cantidades de la líder y de cada acompañante en las plantillas (según la forma y lo pedido con número).
    const ranges = new Map();
    prepare();
    function rangeOf(core) {
      const nC = core.length - 1, fx = fxOf(core);
      const key = nC + '|' + fx.join(',');
      if (ranges.has(key)) return ranges.get(key);
      let lo = Infinity, hi = 0;
      const clo = Array(nC).fill(Infinity), chi = Array(nC).fill(0);
      fills.forEach((f) => tplOf(nC, f, fx).forEach((t) => {
        lo = Math.min(lo, t.ns[0]); hi = Math.max(hi, t.ns[0]);
        for (let k = 0; k < nC; k++) { clo[k] = Math.min(clo[k], t.ns[k + 1]); chi[k] = Math.max(chi[k], t.ns[k + 1]); }
      }));
      const r = hi > 0 ? { lo, hi, clo, chi } : null;
      ranges.set(key, r);
      return r;
    }
    const CI = new Int32Array(16), VAR = new Int32Array(16), LO = new Float64Array(16), HI = new Float64Array(16), WV = new Float64Array(16);
    // Caja de pesos posibles de cada flor del núcleo; null si la forma no tiene plantillas.
    function box(nd) {
      const r = rangeOf(nd.core);
      if (!r) return -1;
      let nv = 0;
      for (let k = 0; k < nd.core.length; k++) {
        const i = nd.core[k];
        CI[k] = i;
        LO[k] = WT[i * NMAX + (k === 0 ? r.lo : r.clo[k - 1])];
        HI[k] = WT[i * NMAX + (k === 0 ? r.hi : r.chi[k - 1])];
        if (HI[k] > LO[k]) VAR[nv++] = k;
      }
      return nv;
    }
    // ¿Puede el sentimiento principal quedar arriba con margen δ? Para cada rival, el mejor caso lineal en la caja.
    function topPossible(n, delta) {
      for (let m = 0; m < K; m++) {
        if (m === top) continue;
        let d = addTop[m];
        for (let k = 0; k < n; k++) {
          const i = CI[k], x = UNIT[i * K + top] - UNIT[i * K + m] - delta * MASS[i];
          d += x * (x > 0 ? HI[k] : LO[k]);
        }
        if (d < -1e-9) return 0;
      }
      return 1;
    }
    // Todo término nuevo del puntaje necesita su cota aquí; los términos que solo restan se acotan con 0.
    function coreBound(n, nv, topOK) {
      // Por significado: la mayor proporción posible en la caja (razón de sumas lineales: se alcanza en un vértice).
      const verts = 1 << nv;
      let S = 0;
      for (let s = 0; s < qIdx.length; s++) {
        const m = qIdx[s];
        let bestR = 0;
        for (let vtx = 0; vtx < verts; vtx++) {
          let a = addMax[m], b = addMass;
          for (let k = 0; k < n; k++) WV[k] = LO[k];
          for (let j = 0; j < nv; j++) if ((vtx >> j) & 1) WV[VAR[j]] = HI[VAR[j]];
          for (let k = 0; k < n; k++) { a += WV[k] * UNIT[CI[k] * K + m]; b += WV[k] * MASS[CI[k]]; }
          if (b > 0 && a / b > bestR) bestR = a / b;
        }
        S += bestR < q[m] ? bestR : q[m];
      }
      // Segunda cota: lo que el ramo dice fuera de la intención nunca baja de cierto mínimo.
      let offMin = 1;
      for (let vtx = 0; vtx < verts; vtx++) {
        let on = onAddMax, off = offAddMin;
        for (let k = 0; k < n; k++) WV[k] = LO[k];
        for (let j = 0; j < nv; j++) if ((vtx >> j) & 1) WV[VAR[j]] = HI[VAR[j]];
        for (let k = 0; k < n; k++) { on += WV[k] * ON[CI[k]]; off += WV[k] * (MASS[CI[k]] - ON[CI[k]]); }
        const r = on + off > 0 ? off / (on + off) : 0;
        if (r < offMin) offMin = r;
      }
      if (1 - offMin < S) S = 1 - offMin;
      let bmax = addB, j = addJ;
      for (let k = 0; k < n; k++) { if (beta[CI[k]] > bmax) bmax = beta[CI[k]]; j += jitMax[CI[k]]; }
      return 4 * topOK + S + bmax + j + leadBonus(CI[0]);
    }

    /* 12. Búsqueda: núcleos de mayor a menor cota; se para en el primero cuya cota no alcanza al mejor ramo encontrado.
       Es exacta: ningún núcleo descartado podía superar al elegido. Dos pisos: primero los núcleos que pueden dejar arriba
       el sentimiento principal; los demás solo si ninguno lo logra. «exhaustive» abre todos (para comprobar la poda). */
    const budget = opts.exhaustive ? Infinity : opts.budget || 3000;
    let opened = 0, exactRun = true;
    const idsBuf = new Int32Array(16), nsBuf = new Int32Array(16);
    function search(delta, withRest) {
      complementsTop(delta);
      const tier = [], rest = [];
      nodes.forEach((nd) => {
        const nv = box(nd);
        if (nv < 0) { nd.ub = -Infinity; return; }
        nd.top = !!topPossible(nd.core.length, delta);
        nd.nv = nv;
        (nd.top ? tier : rest).push(nd);
      });
      let best = null, bestScore = -Infinity;
      const run = (list) => {
        list.forEach((nd) => { box(nd); nd.ub = coreBound(nd.core.length, nd.nv, nd.top ? 1 : 0); });
        list.sort((a, c) => c.ub - a.ub);
        for (const nd of list) {
          if (!opts.exhaustive && nd.ub < bestScore - 1e-9) break;
          if (opened >= budget) { exactRun = false; break; }
          opened++;
          const core = nd.core, nC = nd.C.length, fx = fxOf(core);
          fills.forEach((f) => greens.forEach((g) => {
            tplOf(nC, f, fx).forEach((t) => {
              const wL = WT[nd.L * NMAX + t.ns[0]];
              for (let k = 1; k < core.length; k++) if (WT[core[k] * NMAX + t.ns[k]] > wL + 1e-12) return;
              let len = 0;
              for (let k = 0; k < core.length; k++) { idsBuf[len] = core[k]; nsBuf[len++] = t.ns[k]; }
              if (f >= 0) { idsBuf[len] = f; nsBuf[len++] = t.fN; }
              if (g >= 0) { idsBuf[len] = g; nsBuf[len++] = t.g; }
              if (len > L.items) return;
              const tot = evaluate(idsBuf, nsBuf, len, delta) + leadBonus(nd.L) - t.pen;
              if (tot > bestScore) { bestScore = tot; best = { ids: Array.from(idsBuf.subarray(0, len)), ns: Array.from(nsBuf.subarray(0, len)), core: core.length, ok: lastOK, S: lastS }; }
            });
          }));
        }
      };
      run(tier);
      if (withRest && (!best || !best.ok)) run(rest);
      return best;
    }
    let delta = DELTA;
    const runAll = () => {
      delta = DELTA;
      let b = search(DELTA, false);
      if (!b || !b.ok) { delta = 0; b = search(0, true) || b; }
      return b;
    };
    let fills0 = fills;
    const greens0 = greens, gFix0 = gFix;
    function solve(c) {
      let wide = c.wide, b = null;
      // Sin ramo posible: con todas las nombradas como protagonista; luego sin relleno; luego sin follaje; luego con menos flores.
      for (let pass = 0; pass < (Fset ? 2 : 1) && !b; pass++) {
        relaxed = pass > 0; fills = fills0; greens = greens0; gFix = gFix0; wide = c.wide; prepare();
        build(c.lead);
        b = runAll();
        if (!b && wide) { build(wide); wide = null; b = runAll(); }
        if (!b && fills[0] >= 0 && !wFill.length) { fills = [-1]; prepare(); b = runAll(); }
        if (!b && greens[0] >= 0 && !wGreen.length) { greens = [-1]; gFix = -1; prepare(); b = runAll(); }
      }
      return { b, wide };
    }
    // «Otra opción» sin protagonistas nuevas (o sin ninguna que arme un ramo que lo diga): se vuelve a la primera propuesta,
    // tal cual (la docena incluida), y se avisa (cycled). Nunca un ramo vacío si la primera tenía flores.
    const first = () => { const r = R.compose(Object.assign({}, req, { avoidLeads: [] }), opts); r.search.cycled = true; return r; };
    const cands = candidates(avoidLeads);
    if (cycled && avoidLeads.size) return first();
    let { b: best, wide } = solve(cands);
    const keep = () => ({ nodes, delta, best, fills, greens, gFix, relaxed });
    const restore = (k) => { ({ nodes, delta, best, fills, greens, gFix, relaxed } = k); prepare(); };
    if ((!best || !best.ok) && cands.skipped) {
      const r = first();
      if (r.bouquet.stems.length && (r.search.agree || !best)) return r;
    }
    // Si la lectura no coincide, se prueba con todas las protagonistas permitidas, no solo las que dicen el sentimiento.
    if (best && !best.ok && wide) {
      const k = keep();
      build(wide);
      const b = runAll();
      if (b && b.ok) best = b;
      else restore(k);
    }
    // Con colores pedidos, si con las flores que se ven de esos colores la lectura no coincide, se prueba con todas las que
    // vienen en esos colores (el texto nombra el color solo en las que lo muestran).
    if (best && !best.ok && ask.colors.length) {
      hueAny = true;
      const f1 = tint(ofRole(FOCAL)), p1 = useFiller ? tint(ofRole(['filler'])) : [];
      if (f1.length !== focal.length || p1.length !== fillPool.length) {
        const k = keep(), save = [focal, fillPool, fills0, cycled];
        focal = f1; fillPool = p1;
        fills0 = wFill.length ? wFill[0].ids : fillPool.length && !fillCut ? fillPool : [-1];
        const again = solve(candidates(avoidLeads));
        let b = again.b;
        if (b && !b.ok && again.wide) { build(again.wide); const w = runAll(); if (w && w.ok) b = w; }
        cycled = save[3];
        if (b && b.ok) best = b;
        else { [focal, fillPool, fills0] = save; restore(k); }
      }
    }
    const agree = !!(best && best.ok);

    let combos = 0;
    const perShape = new Map();
    nodes.forEach((nd) => {
      const fx = fxOf(nd.core), key = nd.C.length + '|' + fx.join(',');
      if (!perShape.has(key)) { let c = 0; fills.forEach((f) => { c += tplOf(nd.C.length, f, fx).length; }); perShape.set(key, c * greens.length); }
      combos += perShape.get(key);
    });

    /* 13. El ramo: protagonista, acompañantes de mayor a menor peso, relleno y follaje. */
    const stems = best ? best.ids.map((i, s) => ({ item: items[i].id, n: best.ns[s] })) : [];
    if (best) {
      const comps = stems.slice(1, best.core).sort((a, c) => R.weight(FL.item(c.item), c.n) - R.weight(FL.item(a.item), a.n));
      stems.splice(1, comps.length, ...comps);
    }
    const wrap = mourning ? { style: 'ninguno' } : TOP === 'Amor' && det.romance ? { style: 'seda', color: '#2f3a2c' } : { style: 'kraft' };
    const bouquet = FL.bouquet.create({
      stems, wrap, ribbon: { color: RIBBON[TOP] || FL.taxonomy.ribbons[0] },
      occasion: occId || undefined,
      intent: { text: req.text || '', feelings: req.feelings || [] },
      layoutSeed: seed
    });
    const target = {};
    M.forEach((m, i) => { if (q[i] > 0) target[m] = q[i]; });
    const reading = R.interpret(bouquet, { petSafe, exclude: Array.from(exclude), romance: !!det.romance, target, colors: ask.colors, avoidColors: ask.avoidColors, top: TOP });
    const rationale = explain({
      req, ask, det, bouquet, reading, wanted, notes, season, hemi, petSafe, mourning, sober, seed, single, q, top, fallback, agree, combos,
      fit: best ? best.S : 0, toxicOut, short: relaxed && !!best && !single ? sizeT : null
    });
    return {
      bouquet, reading, rationale,
      detected: {
        meanings: det.ranked, occasion: occId, guessed: !!det.guessed, ask, target, top: TOP,
        cues: det.cues || [], recipient: det.recipient || null, mourning, romance: !!det.romance, avoid, fallback
      },
      search: { combos, cores: nodes.length, opened, scored, exact: exactRun, delta, agree, cycled, ms: Math.round((clock() - t0) * 10) / 10 }
    };
  };

  /* ---------- Por qué este ramo ---------- */
  // Concordancia: «nuevos comienzos quedan», «amor declarado queda», «un pedido de perdón queda».
  const many = (ph) => /s$/.test(ph) && !/^una?\s/.test(ph);
  const listO = (arr) => (arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' o ' + arr[arr.length - 1]);
  // Si un duelo deja de lado la ocasión del texto, se dice qué no fue: una fiesta, una celebración, un pedido de perdón.
  const DROPPED = { disculpa: 'un pedido de perdón', recuperacion: 'un deseo de pronta recuperación' };
  const droppedAs = (id) => DROPPED[id] || (id === 'nacimiento' || !FESTIVE.includes(id) ? '' : /^dia-/.test(id) ? 'una celebración' : 'una fiesta');
  function explain(x) {
    const { req, ask, det, bouquet, reading, wanted, q, fallback } = x;
    const M = FL.meanings, items = FL.items;
    // Sin romance, el amor se dice «cariño» aunque el ramo lleve rojo; «nada romántico» deja fuera el romance, no el cariño.
    const say = (id) => R.phraseFor(bouquet, id, !!det.romance);
    const ph = (id) => (id === 'Amor' && !det.romance ? say(id) : R.phrase(id));
    const qOf = (m) => q[M.indexOf(m)] || 0;
    const T = M[x.top];
    const rd = reading.meanings;
    const inReading = (m) => rd.some((r) => r.id === m && r.weight > 0);
    const queda = (ph) => (many(ph) ? ' quedan' : ' queda');
    const aparece = (ph) => (many(ph) ? 'aparecen' : 'aparece');
    const built = FL.bouquet.flowerCount(bouquet);

    // Lo que se entendió del pedido (tamaño, flores, colores, estilo).
    // Lo nombrado y tóxico, en una sola nota: «Dejé fuera la amapola y el jacinto: son tóxicos para mascotas». Si el paso 6
    // ya habló de las mascotas, no se repite (ni se vuelve a nombrar lo que ya nombró): «Dejé fuera el lirio: también es tóxico.»
    const petFb = fallback && fallback.reason === 'mascotas';
    const heard = [], notes = x.notes.slice();
    const tox = x.toxicOut.filter((it) => !(petFb && fallback.blockers.includes(it.id)));
    if (tox.length) {
      const masc = tox.some((it) => R.article(it.name) === 'el');
      notes.unshift('Dejé fuera ' + R.list(tox.map((it) => R.article(it.name) + ' ' + it.name.toLowerCase())) + ': ' + (petFb ? 'también ' : '') +
        (tox.length > 1 ? 'son ' + (masc ? 'tóxicos' : 'tóxicas') : 'es ' + (masc ? 'tóxico' : 'tóxica')) + (petFb ? '.' : ' para mascotas.'));
    }
    if (x.single) heard.push('una sola flor');
    else if (ask.count != null) {
      // Más de lo que cabe: no se repite un número que no es ni el pedido (el lector lo acota) ni el armado.
      const over = ask.count > FL.limits.stems - 4 && !wanted.some((w) => w.n);
      heard.push(over ? 'tantas flores como admite un ramo' : FL.countWords(Math.min(ask.count, 99)) + ' flores');
      if (over && !x.short) notes.push('Un ramo admite hasta ' + FL.limits.stems + ' tallos contando el follaje: armé ' + built + ' flores.');
    } else if (SIZES[ask.size]) heard.push('un ramo ' + ask.size);
    // Sin ramo del tamaño pedido (pocas flores en esos colores o con esas reglas): se armó uno más chico y se dice.
    if (x.short && built < x.short - 1) notes.push('Con lo que pediste no alcanzan las flores para ' + (ask.count != null ? FL.countWords(x.short) : 'un ramo ' + ask.size) + ': armé uno de ' + built + ' flores.');
    // Lo nombrado, con la cantidad que se pidió («una hortensia», «13 rosas»); si se ajustó, lo dice una nota.
    // En palabras solo si la etiqueta va en plural («cinco margaritas»); «9 jazmín» se cita tal cual.
    const qty = (w) => (!w.asked ? '' : w.asked === 1 ? (R.article(w.label) === 'la' ? 'una ' : 'un ')
      : w.asked <= 20 && manyOf(w.label) ? FL.countWords(w.asked) + ' ' : w.asked + ' ');
    if (wanted.length) heard.push('con ' + R.list(wanted.map((w) => qty(w) + w.label.toLowerCase())));
    if (ask.excludeLabels.length) heard.push('sin ' + listNi(ask.excludeLabels.map((l) => l.toLowerCase())));
    if (ask.colors.length) heard.push('en tonos ' + R.list(ask.colors.map(tones)));
    if (ask.avoidColors.length) heard.push('nada ' + listNi(ask.avoidColors));
    if (ask.sober) heard.push('un estilo sobrio');

    // 1. Qué se leyó: las intenciones que más pesaron, con las palabras de quien escribe.
    const cues = (det.cues || []).filter((c) => !c.neg);
    const chips = (req.feelings || []).filter((m) => M.includes(m));
    const who = det.recipient && !det.recipient.memory && det.recipient.text ? det.recipient : null;
    const occName = det.occasion ? (/^(Día|San|Navidad|Todos)\b/.test(det.occasion.name) ? det.occasion.name : R.lowerFirst(det.occasion.name)) : '';
    let lead, occSaid = false;
    if (det.guessed) {
      // Sin sentimientos: se dice de dónde salió el ramo (lo pedido, las flores nombradas aunque quedaran fuera, o la alegría).
      lead = heard.length ? 'Armé el ramo con lo que pediste.'
        : ask.include.length ? 'No encontré sentimientos claros en lo que escribiste, así que partí de las flores que nombraste.'
          : 'No encontré sentimientos claros en lo que escribiste, así que propongo un ramo ' + (T === 'Alegría' ? 'alegre' : 'de ' + say(T)) +
            '. Prueba contar para quién es o qué quieres decir.';
    } else if (cues.length) {
      const by = new Map();
      cues.forEach((c) => {
        const a = (c.w || 1) * (c.x || 1);
        const g = by.get(c.intent) || { label: c.label, sum: 0, best: -1, quote: '', at: c.at, intent: c.intent };
        g.sum += a;
        if (a > g.best) { g.best = a; g.quote = c.quote; }
        by.set(c.intent, g);
      });
      const top3 = Array.from(by.values()).sort((a, c) => c.sum - a.sum || a.at - c.at).slice(0, 3);
      const cut = (s) => { s = String(s || '').trim(); return s.length > 40 ? s.slice(0, 39).trimEnd() + '…' : s; };
      // «cariño («cariño»)» dice lo mismo dos veces: basta la etiqueta.
      const echo = (g) => { const a = FL.intent.fold(g.label).toLowerCase(), b = FL.intent.fold(g.quote).toLowerCase().trim(); return a.includes(b) || b.includes(a); };
      const ctx = [];
      if (who) ctx.push('para ' + who.text);
      if (det.forSelf && !top3.some((g) => g.intent === 'para-mi')) ctx.push('para ti');
      if (det.memoryText) ctx.push('en memoria de ' + det.memoryText);
      lead = 'Leí en lo que escribiste ' + R.list(top3.map((g) => g.label + (echo(g) ? '' : ' («' + cut(g.quote) + '»)'))) + (ctx.length ? ', ' + ctx.join(', ') : '') + '.';
    } else if (who) lead = 'Leí que es para ' + who.text + '.';
    else if (chips.length) lead = 'Partí de lo que marcaste: ' + R.list(chips.map((m) => m.toLowerCase())) + '.';
    else if (det.occasion) { lead = 'Partí de la ocasión: ' + occName + '.'; occSaid = true; }
    else lead = 'Partí de la ocasión.';

    // 2–5. Duelo, ocasión, negaciones y lo que se pidió evitar.
    const dropped = x.mourning && det.droppedOccasion ? droppedAs(det.droppedOccasion) : '';
    if (dropped) lead += ' Lo leí como un recuerdo, no como ' + dropped + '.';
    if (det.occasion && !occSaid) lead += ' Ocasión: ' + occName + '.';
    const negated = Array.from(new Set((det.cues || []).filter((c) => c.neg === 'drop').map((c) => '«' + c.quote + '»'))).slice(0, 3);
    if (negated.length) lead += ' No conté ' + listNi(negated) + (negated.length > 1 ? ' porque los negaste.' : ' porque lo negaste.');
    if ((det.avoid || []).length) lead += ' Dejé fuera lo que sonara a ' + listO(det.avoid.map((m, i) => (i ? 'a ' : '') + (m === 'Amor' ? 'romance' : R.phrase(m)))) + '.';

    // 6. Sin flores que lo digan: a qué se apuntó y por qué (solo las que quedaron fuera por esa razón).
    if (fallback) {
      let why;
      if (fallback.reason === 'mascotas') {
        const tox = fallback.blockers.map(FL.item).filter((it) => it && toxic(it));
        const names = tox.map((it) => R.article(it.name) + ' ' + it.name.toLowerCase());
        why = R.list(names) + (tox.length > 1 ? ' son tóxic' + (tox.some((it) => R.article(it.name) === 'el') ? 'os' : 'as')
          : ' es tóxic' + (tox[0] && R.article(tox[0].name) === 'la' ? 'a' : 'o')) + ' para ellas';
      } else if (fallback.reason === 'excluidas') why = 'las que lo dicen quedaron fuera por lo que pediste';
      else if (fallback.reason === 'colores') why = 'no vienen en esos colores';
      else why = 'el catálogo no tiene flores de florería que lo digan';
      const near = (FL.meaning(fallback.from) || {}).near || {};
      const to = fallback.to.filter((m) => (near[m] || 0) >= 0.15 && inReading(m));
      lead += ' Ninguna flor ' + (fallback.reason === 'mascotas' ? 'segura para mascotas' : 'disponible') + ' habla de ' + ph(fallback.from) + ': ' + why +
        '.' + (to.length ? ' Busqué flores de ' + R.list(to.map(say)) + ', que van con ese gesto.' : ' Busqué flores que fueran con ese gesto.');
    }

    // 7. Cómo se eligió, sin porcentajes: qué queda primero en la lectura del ramo (y nunca se dice que aparece lo que no está).
    const RT = rd[0] ? rd[0].id : T, R2 = rd[1] ? rd[1].id : null;
    const stems = bouquet.stems.map((s) => ({ it: FL.item(s.item), n: s.n })).filter((s) => s.it);
    const among = x.combos >= 100 ? ' Entre ' + fmtInt(x.combos) + ' combinaciones posibles elegí la' : ' Elegí la combinación';
    if (!stems.length) {
      const excluded = (req.exclude || []).length || ask.exclude.length || ask.avoidColors.length || x.petSafe;
      lead += excluded ? ' Con lo que quedó fuera no alcanzan las flores para armar un ramo: prueba sacar alguna exclusión.'
        : ' No encontré una combinación que respete todo lo pedido: prueba con menos flores o sin cantidades fijas.';
    } else if (x.agree || RT === T) {
      const top3 = rd.slice(0, 3).map((m) => m.id);
      const second = x.agree && M.map((m) => ({ m, w: qOf(m) })).filter((o) => o.m !== T && o.w >= 0.15 && top3.includes(o.m)).sort((a, c) => c.w - a.w)[0];
      const tie = !x.agree && R2 ? ', a la par de ' + say(R2) : '';
      lead += among + ' que mejor lo dice: en su lectura, ' + say(T) + queda(say(T)) + (tie ? ' primero' + tie : ' en primer lugar') +
        (x.combos >= 100 && second ? ' y también ' + aparece(say(second.m)) + ' ' + say(second.m) : '') + '.';
    } else {
      const tail = !inReading(T) ? '; no logré que dijera ' + ph(T)
        : ' y ' + say(T) + (R2 === T ? ' en segundo lugar' : ' también ' + aparece(say(T)));
      lead += among + ' que más se acerca: en su lectura, ' + say(RT) + queda(say(RT)) + ' primero' + tail + '.';
    }
    // Lo que se marcó y el ramo no alcanzó a decir.
    const lost = chips.filter((m) => m !== (fallback && fallback.from) && !inReading(m));
    if (stems.length && lost.length) lead += ' No encontré cómo sumar ' + R.list(lost.map(ph)) + ' sin desdibujar lo principal.';

    // 8. Temporada: solo se dice que se priorizó si la protagonista o la mayor parte de las flores lo están.
    let fw = 0, sw = 0;
    stems.forEach(({ it, n }) => { if (it.bouquet.role === 'greenery') return; const w = R.weight(it, n); fw += w; if (inSeason(it, x.season)) sw += w; });
    const leadIn = stems[0] && inSeason(stems[0].it, x.season);
    // Lo de las mascotas se dice una vez: no si ya lo dijo el paso 6 o una nota («Dejé fuera el lirio: es tóxico…»).
    const pets = x.petSafe && !(fallback && fallback.reason === 'mascotas') && !notes.some((n) => /mascotas/.test(n));
    if (stems.length && (leadIn || (fw > 0 && sw / fw >= 0.5))) {
      lead += ' Prioricé flores de ' + x.season + ' en el hemisferio ' + (x.hemi === 'S' ? 'sur' : 'norte') + (pets ? ' y dejé fuera las tóxicas para mascotas' : '') + '.';
    } else if (stems.length) {
      // «Pocas flores de temporada» solo si es cierto (menos de un tercio de las flores de florería); si no, por qué la protagonista.
      const pool = items.filter((it) => it.type === 'flower' && it.bouquet.florist && FOCAL.includes(it.bouquet.role));
      const few = pool.filter((it) => inSeason(it, x.season)).length * 3 < pool.length;
      const it0 = stems[0].it, fem = R.article(it0.name) === 'la';
      const named = wanted.some((w) => w.ids.some((i) => items[i].id === it0.id));
      lead += few ? ' En ' + x.season + ' hay pocas flores de temporada en el catálogo: elegí las que mejor lo dicen.'
        : ' ' + R.cap(R.article(it0.name) + ' ' + it0.name.toLowerCase()) + ' no es flor de ' + x.season +
          (named ? ', pero ' + (fem ? 'la' : 'lo') + ' pediste.' : ', pero es ' + (fem ? 'la' : 'el') + ' que mejor lo dice.');
      if (pets) lead += ' Dejé fuera las flores tóxicas para mascotas.';
    }

    // 9–10. Lo que se tomó en cuenta del pedido y los avisos de siempre.
    if (heard.length) lead += ' Tomé en cuenta: ' + heard.join('; ') + '.';
    if (notes.length) lead += ' ' + notes.join(' ');
    // Un párrafo largo se acorta por lo prescindible: primero el número de combinaciones, luego la lista de cercanos.
    const LONG = 450;
    if (lead.length > LONG && x.combos >= 100) lead = lead.replace(among, ' Elegí la combinación');
    if (lead.length > LONG) lead = lead.replace(/ Busqué flores de [^.]*, que van con ese gesto\./, ' Busqué flores que fueran con ese gesto.');
    // Si aún es largo y la ocasión salió del texto (ya está en lo que se leyó), no se repite; tampoco la temporada escasa.
    if (lead.length > LONG && det.occasion && det.occasionSource === 'text' && cues.length) lead = lead.replace(' Ocasión: ' + occName + '.', '');
    if (lead.length > LONG) lead = lead.replace(' En ' + x.season + ' hay pocas flores de temporada en el catálogo: elegí las que mejor lo dicen.', '');

    // Qué aporta cada flor: su papel en este ramo, lo que suma a la intención y, a lo más, una razón práctica.
    const said = new Set();
    let seasonSaid = false;
    const list = (ms) => R.list(ms.map(say));
    const rationaleItems = bouquet.stems.map((s, k) => {
      const it = FL.item(s.item), role = it.bouquet.role, fem = R.article(it.name) === 'la';
      const hits = it.meanings.filter((m) => qOf(m) > 0).sort((a, c) => qOf(c) - qOf(a));
      const fresh = hits.filter((m) => !said.has(m));
      hits.forEach((m) => said.add(m));
      const w = wanted.find((g) => g.ids.some((i) => items[i].id === it.id));
      const asked = w ? (manyOf(w.label) ? (fem ? 'las' : 'los') : fem ? 'la' : 'lo') + ' pediste; ' : '';
      let why;
      if (k === 0 && FOCAL.includes(role)) why = 'lleva la voz principal' + (hits.length ? ': ' + list(hits) : '');
      else if (role === 'greenery') why = hits.length ? 'enmarca y suma ' + list(hits) : 'da marco y frescura';
      else if (role === 'filler') why = hits.length ? 'da aire y suma ' + list(hits) : 'da aire y volumen entre las flores';
      else why = fresh.length ? ['suma', 'aporta', 'trae'][U.hash(x.seed + it.id) % 3] + ' ' + list(fresh) : hits.length ? 'refuerza ' + list(hits) : 'acompaña y da volumen';
      // El color pedido solo se nombra si es el que la flor muestra (su color principal).
      const asColor = role !== 'greenery' && ask.colors.includes(it.colors[0]) ? it.colors[0] : null;
      let reason = '';
      if (x.mourning && it.colors[0] === 'blanco') reason = (fem ? 'blanca' : 'blanco') + ', como se acostumbra en el duelo';
      else if (asColor) reason = 'en ' + asColor + ', como pediste';
      else if (!seasonSaid && it.seasons.length && it.seasons.length < 4 && it.seasons.includes(x.season)) { reason = 'está en temporada'; seasonSaid = true; }
      // El papel que cumple en este ramo: la primera es la protagonista; las demás flores, acompañantes (las espigas, espigas).
      const slot = !FOCAL.includes(role) ? role : role === 'spike' ? 'spike' : k === 0 ? 'focal' : 'secondary';
      return { item: it.id, name: it.name, n: s.n, why: asked + why + (reason ? '; ' + reason : '') + ' (' + FL.role(slot).name.toLowerCase() + ')' };
    });
    return { lead, items: rationaleItems, fit: +x.fit.toFixed(3) };
  }
})();
