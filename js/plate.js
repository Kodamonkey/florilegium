/* Florilegio — lámina de un ramo para descargar como imagen (PNG) o PDF, con todos sus detalles: el dibujo, la tarjeta,
   de qué está hecho, qué dice y cómo cuidarlo. Se pinta en un canvas con los colores del tema claro (es papel, aunque la
   página esté en modo oscuro). El PDF se arma aquí mismo, una página A4 por imagen, sin bibliotecas. */
(function () {
  'use strict';
  const FL = window.FL, U = FL.u;
  const Pl = (FL.plate = {});

  // Unidades lógicas: la lámina mide 720 de ancho y se pinta al doble. Una página A4 mide 595,28 × 841,89 puntos.
  const W = 720, M = 64, CW = W - 2 * M, TOP = 60, FOOT = 76;
  const A4 = [595.28, 841.89], PAGE_H = (W * A4[1]) / A4[0];
  const SCALE = 2;
  // Safari en iOS deja en blanco un canvas de más de ~16,7 millones de píxeles: una lámina muy larga baja de escala.
  const MAX_PX = 16e6;
  const BQ_W = 380, BQ_H = (BQ_W * 520) / 400;
  // La luz de las flores en el tema claro (--lit-o en :root).
  const LIT = '0.4';
  const C = {
    paper: '#fbf8f1', card: '#f4efe4', ink: '#2b3127', ink2: '#505847', ink3: '#7f8573', line: 'rgba(43, 49, 39, 0.16)',
    sage: '#7f9474', bar: '#bdb066', warn: '#c0602a', sun: 'rgba(255, 226, 164, 0.55)', sunOff: 'rgba(255, 226, 164, 0)'
  };
  const ORDER = ['focal', 'secondary', 'spike', 'filler', 'greenery'];

  /* ---------- Texto ---------- */
  // Estilos: familia (d: títulos, b: lectura, u: rótulos), tamaño, interlínea (lh), espaciado (ls) y color.
  const S = {
    eyebrow: { fam: 'u', size: 11, weight: 500, ls: 2.8, upper: true, color: 'ink3', lh: 20 },
    title: { fam: 'd', size: 50, style: 'italic', color: 'ink', lh: 56 },
    meta: { fam: 'u', size: 10.5, ls: 1.9, upper: true, color: 'ink3', lh: 18 },
    label: { fam: 'u', size: 10.5, weight: 500, ls: 2.6, upper: true, color: 'ink3', lh: 16 },
    quote: { fam: 'd', size: 24, style: 'italic', color: 'ink', lh: 31 },
    from: { fam: 'd', size: 19, color: 'ink2', lh: 26 },
    summary: { fam: 'd', size: 23, style: 'italic', color: 'ink', lh: 30 },
    name: { fam: 'b', size: 17, color: 'ink', lh: 22 },
    sub: { fam: 'b', size: 15, weight: 500, color: 'ink', lh: 22 },
    body: { fam: 'b', size: 14.5, color: 'ink2', lh: 22 },
    small: { fam: 'u', size: 10, ls: 1.1, upper: true, color: 'ink3', lh: 14 },
    count: { fam: 'u', size: 11.5, ls: 1, color: 'ink2', lh: 16 },
    bar: { fam: 'u', size: 12, color: 'ink2', lh: 24 }
  };
  let FAM = null;
  const families = () => FAM || (FAM = (() => {
    const cs = getComputedStyle(document.documentElement), v = (k, d) => cs.getPropertyValue(k).trim() || d;
    return { d: v('--f-display', 'Georgia, serif'), b: v('--f-body', 'Georgia, serif'), u: v('--f-ui', 'system-ui, sans-serif') };
  })());
  const spec = (st) => (st.style || 'normal') + ' ' + (st.weight || 400) + ' ' + st.size + 'px ' + families()[st.fam];
  const canSpace = typeof CanvasRenderingContext2D !== 'undefined' && 'letterSpacing' in CanvasRenderingContext2D.prototype;
  function font(g, st, color) {
    g.font = spec(st);
    g.fillStyle = C[color || st.color];
    if (canSpace) g.letterSpacing = (st.ls || 0) + 'px';
  }
  const caps = (st, s) => (st.upper ? s.toLocaleUpperCase('es') : s);
  // Línea base para centrar el texto en su interlínea.
  const base = (st, y) => y + st.lh / 2 + st.size * 0.34;

  // Corta un texto en líneas de hasta maxW: respeta los saltos de línea y parte las palabras más anchas que la línea.
  function wrap(g, text, maxW) {
    const fits = (s) => g.measureText(s).width <= maxW;
    const out = [];
    String(text).split(/\r\n|[\r\n\u2028\u2029]/).forEach((para) => {
      let line = '';
      para.split(/\s+/).filter(Boolean).forEach((word) => {
        const next = line ? line + ' ' + word : word;
        if (fits(next)) { line = next; return; }
        if (line) out.push(line);
        let ch = Array.from(word);
        while (ch.length > 1 && !fits(ch.join(''))) {
          let k = ch.length - 1;
          while (k > 1 && !fits(ch.slice(0, k).join(''))) k--;
          out.push(ch.slice(0, k).join(''));
          ch = ch.slice(k);
        }
        line = ch.join('');
      });
      out.push(line);
    });
    return out;
  }
  // Una sola línea: lo que no cabe termina en «…».
  function clip(g, s, maxW) {
    if (g.measureText(s).width <= maxW) return s;
    const ch = Array.from(s);
    while (ch.length && g.measureText(ch.join('') + '…').width > maxW) ch.pop();
    return ch.join('').trimEnd() + '…';
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
  }

  /* ---------- Filas ---------- */
  // La lámina es una lista de filas { h, gap, keep, draw(g, y) }: gap es el aire de arriba (se omite al comienzo de una
  // página) y keep pide no quedar solo al pie de una página, separado de la fila siguiente (los títulos).

  // Un texto, una fila por línea: así una página puede cortar un párrafo entre líneas.
  // o: align ('left' | 'center'), indent, gap, marker (viñeta de la primera línea) y markerColor.
  function text(g, s, st, o = {}) {
    font(g, st);
    const indent = o.indent || 0, x = o.align === 'center' ? W / 2 : M + indent;
    return wrap(g, caps(st, s), CW - indent).map((line, i) => ({
      h: st.lh, gap: i ? 0 : o.gap || 0,
      draw(c, y) {
        font(c, st);
        c.textAlign = o.align || 'left';
        c.fillText(line, x, base(st, y));
        if (i || !o.marker) return;
        font(c, st, o.markerColor);
        c.fillText(o.marker, M + indent - 20, base(st, y));
      }
    }));
  }
  // Lista con viñetas (o numerada, con o.number). o.gap: aire antes del primer ítem.
  const bullets = (g, list, o = {}) => list.flatMap((s, i) => text(g, s, S.body, {
    indent: o.indent || 20, gap: i ? 6 : o.gap != null ? o.gap : 10,
    marker: o.number ? i + 1 + '.' : o.marker || '•', markerColor: o.markerColor
  }));

  // Título de sección con una línea fina arriba, como en la vista de regalo.
  const heading = (title) => ({
    h: 34, gap: 36, keep: true,
    draw(c, y) {
      c.fillStyle = C.line;
      c.fillRect(M, y, CW, 1);
      font(c, S.label);
      c.textAlign = 'left';
      c.fillText(caps(S.label, title), M, y + 26);
    }
  });
  const subhead = (g, title, st) => text(g, title, st || S.label, { gap: 18 }).map((r) => Object.assign(r, { keep: true }));

  function bouquetRow(img) {
    return {
      h: BQ_H, gap: 14,
      draw(c, y) {
        const cy = y + BQ_H * 0.4, glow = c.createRadialGradient(W / 2, cy, 10, W / 2, cy, BQ_W * 0.72);
        glow.addColorStop(0, C.sun);
        glow.addColorStop(1, C.sunOff);
        c.fillStyle = glow;
        c.fillRect(0, y - 30, W, BQ_H + 60);
        c.drawImage(img, (W - BQ_W) / 2, y, BQ_W, BQ_H);
      }
    };
  }

  // La tarjeta en un recuadro, como en la vista de regalo; no se corta entre páginas.
  function cardRows(g, card) {
    const msg = (card.message || '').trim(), from = (card.from || '').trim();
    if (!msg && !from) return [];
    const cw = Math.min(CW, 500), pad = 26;
    font(g, S.quote);
    const lines = msg ? wrap(g, msg, cw - 2 * pad) : [];
    font(g, S.from);
    const by = from ? wrap(g, '— ' + from, cw - 2 * pad) : [];
    const h = 2 * pad + lines.length * S.quote.lh + (lines.length && by.length ? 8 : 0) + by.length * S.from.lh;
    return [{
      h, gap: 24,
      draw(c, y) {
        const x = (W - cw) / 2;
        c.fillStyle = C.card;
        c.strokeStyle = C.line;
        c.lineWidth = 1;
        roundRect(c, x + 0.5, y + 0.5, cw - 1, h - 1, [4, 22, 4, 22]);
        c.fill();
        c.stroke();
        let yy = y + pad;
        font(c, S.quote);
        c.textAlign = 'left';
        lines.forEach((ln) => { c.fillText(ln, x + pad, base(S.quote, yy)); yy += S.quote.lh; });
        if (lines.length && by.length) yy += 8;
        font(c, S.from);
        c.textAlign = 'right';
        by.forEach((ln) => { c.fillText(ln, x + cw - pad, base(S.from, yy)); yy += S.from.lh; });
      }
    }];
  }

  // Un tipo de flor o follaje: miniatura, nombre, papel y significados, y cuántos tallos lleva.
  function itemRow(it, n, thumb) {
    const role = FL.role(it.bouquet.role), about = [role ? role.name : '', it.meanings.join(', ')].filter(Boolean).join(' · ');
    return {
      h: 54, gap: 0,
      draw(c, y) {
        if (thumb) c.drawImage(thumb, M, y + 5, 44, 44);
        font(c, S.name);
        c.textAlign = 'left';
        c.fillText(clip(c, it.name, CW - 150), M + 60, y + 24);
        font(c, S.small);
        c.fillText(clip(c, caps(S.small, about), CW - 150), M + 60, y + 42);
        font(c, S.count);
        c.textAlign = 'right';
        c.fillText(n + (n === 1 ? ' tallo' : ' tallos'), M + CW, y + 24);
      }
    };
  }

  // Barras de los significados, como en el taller.
  function barRows(meanings) {
    const top = Math.max(...meanings.map((m) => m.weight), 0.01), x = M + 150, room = (CW - 150) * 0.9;
    return meanings.map((m, i) => ({
      h: S.bar.lh, gap: i ? 0 : 8,
      draw(c, y) {
        font(c, S.bar);
        c.textAlign = 'left';
        c.fillText(clip(c, m.id, 140), M, base(S.bar, y));
        const w = Math.max(6, (room * m.weight) / top), fill = c.createLinearGradient(x, 0, x + w, 0);
        fill.addColorStop(0, C.sage);
        fill.addColorStop(1, C.bar);
        c.fillStyle = fill;
        roundRect(c, x, y + S.bar.lh / 2 - 3, w, 6, 3);
        c.fill();
      }
    }));
  }

  /* ---------- Contenido ---------- */
  function rows(g, b, art) {
    const card = b.card || {}, occ = b.occasion ? FL.occasion(b.occasion) : null;
    const total = FL.bouquet.total(b), r = FL.reading.display(b), care = FL.care.plan(b);
    const out = [];
    const add = (x) => { out.push(...(Array.isArray(x) ? x : [x])); };

    // Encabezado, como lo ve quien recibe el ramo.
    add(text(g, card.to ? 'Para ' + card.to : 'Un ramo para ti', S.eyebrow, { align: 'center' }));
    add(text(g, b.name || (occ ? occ.name : 'Flores que dicen algo'), S.title, { align: 'center', gap: 6 }));
    add(text(g, [b.name && occ ? occ.name : '', total + (total === 1 ? ' tallo' : ' tallos')].filter(Boolean).join(' · '), S.meta, { align: 'center', gap: 10 }));
    add(bouquetRow(art.bouquet));
    add(cardRows(g, card));

    add(heading('De qué está hecho'));
    const stems = b.stems.map((s) => ({ it: FL.item(s.item), n: s.n })).filter((x) => x.it)
      .sort((a, c) => ORDER.indexOf(a.it.bouquet.role) - ORDER.indexOf(c.it.bouquet.role) || c.n - a.n);
    stems.forEach((x, i) => add(Object.assign(itemRow(x.it, x.n, art.thumbs[x.it.id]), { gap: i ? 0 : 8 })));
    const wrapStyle = FL.taxonomy.wraps.find((w) => w.id === b.wrap.style);
    const dress = !wrapStyle || wrapStyle.id === 'ninguno' ? 'Sin envoltorio'
      : 'Envoltorio: ' + wrapStyle.name.toLowerCase() + (b.wrap.color ? ', ' + FL.swatchName(b.wrap.color) : '');
    add(text(g, dress + ' · cinta ' + FL.swatchName(b.ribbon.color) + '.', S.body, { gap: 10 }));

    add(heading('Qué dice este ramo'));
    add(text(g, r.summary, S.summary, { gap: 6 }));
    if (r.meanings.length) add(barRows(r.meanings));
    add(subhead(g, 'Lo que dice cada flor'));
    add(bullets(g, r.perItem.map((x) => x.name + ': ' + x.says)));
    if (r.notes.length) { add(subhead(g, 'Notas culturales')); add(bullets(g, r.notes)); }
    if (r.warnings.length) { add(subhead(g, 'Ten en cuenta')); add(bullets(g, r.warnings, { marker: '!', markerColor: 'warn' })); }

    add(heading('Cómo cuidarlo'));
    const life = FL.care.lifeLine(care);
    if (life) add(text(g, life, S.body, { gap: 8 }));
    if (care.general.length) add(bullets(g, care.general, { number: true, indent: 24 }));
    care.specific.forEach((s) => {
      add(subhead(g, s.name + (s.form === 'potted' ? ' (en maceta)' : ''), S.sub));
      add(bullets(g, s.steps, { gap: 4 }));
    });
    if (care.cats.length || care.dogs.length) {
      add(subhead(g, 'Mascotas'));
      add(bullets(g, [(care.cats.length ? 'Tóxicas para gatos: ' + care.cats.join(', ') + '. ' : '') +
        (care.dogs.length ? 'Para perros: ' + care.dogs.join(', ') + '. ' : '') + 'Ubica el ramo fuera de su alcance.'], { marker: '!', markerColor: 'warn' }));
    }
    return out;
  }

  /* ---------- Páginas ---------- */
  // Reparte las filas en páginas de alto pageH (Infinity: una sola, tan larga como haga falta).
  function paginate(list, pageH) {
    const bottom = pageH - FOOT, pages = [];
    let page = null, y = 0;
    const open = () => { page = []; pages.push(page); y = TOP; };
    open();
    list.forEach((r, i) => {
      let need = r.h;
      for (let j = i; list[j].keep && list[j + 1]; j++) need += list[j + 1].gap + list[j + 1].h;
      if (page.length && y + r.gap + need > bottom) open();
      if (page.length) y += r.gap;
      page.push({ r, y });
      y += r.h;
    });
    return { pages, end: y };
  }

  function paint(placed, h, scale, foot) {
    const cv = document.createElement('canvas');
    cv.width = Math.round(W * scale);
    cv.height = Math.round(h * scale);
    const g = cv.getContext('2d');
    g.scale(cv.width / W, cv.height / h);
    g.fillStyle = C.paper;
    g.fillRect(0, 0, W, h);
    placed.forEach(({ r, y }) => { g.save(); r.draw(g, y); g.restore(); });
    const fy = h - FOOT + 30;
    g.fillStyle = C.line;
    g.fillRect(M, fy, CW, 1);
    font(g, S.small);
    g.textAlign = 'left';
    g.fillText('FLORILEGIO', M, fy + 24);
    g.textAlign = 'right';
    g.fillText(caps(S.small, foot), M + CW, fy + 24);
    return cv;
  }

  /* ---------- Imágenes y tipografías ---------- */
  function image(svg) {
    return new Promise((ok, fail) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => fail(new Error('no se pudo dibujar el ramo'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  // El ramo con cada cabeza en línea (un SVG dibujado en un canvas no carga imágenes de URL blob) y miniaturas de cada tipo.
  async function artOf(b) {
    const svg = FL.bouquetArt.render(b, { standalone: true, lit: LIT }).svg
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="' + BQ_W * SCALE + '" height="' + Math.round(BQ_H * SCALE) + '" ');
    const thumbs = {};
    await Promise.all(b.stems.map(async (s) => {
      const it = FL.item(s.item);
      if (!it) return;
      const head = FL.headSVG(it, { open: true, pad: 0.12, lit: LIT }).svg.replace('<svg ', '<svg width="96" height="96" ');
      thumbs[it.id] = await image(head).catch(() => null);
    }));
    return { bouquet: await image(svg), thumbs };
  }
  // Las tipografías de la página se cargan solo cuando algo las usa: se piden antes de pintar (sin conexión, se sigue con las de respaldo).
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const all = Promise.all(Array.from(new Set(Object.values(S).map(spec)), (s) => document.fonts.load(s).catch(() => null)));
    return Promise.race([all, new Promise((done) => setTimeout(done, 3000))]);
  }
  const blobOf = (cv, type, q) => new Promise((ok, fail) => cv.toBlob((bl) => (bl ? ok(bl) : fail(new Error('el navegador no pudo crear la imagen'))), type, q));
  const today = () => new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });

  async function layout(b) {
    const [art] = await Promise.all([artOf(b), fontsReady()]);
    return rows(document.createElement('canvas').getContext('2d'), b, art);
  }

  // La lámina entera en una sola imagen, larga como haga falta.
  Pl.png = async function (b) {
    const { pages, end } = paginate(await layout(b), Infinity);
    const h = Math.ceil(end + 28 + FOOT);
    return blobOf(paint(pages[0], h, Math.min(SCALE, Math.sqrt(MAX_PX / (W * h))), today()), 'image/png');
  };

  // La lámina en páginas A4.
  Pl.pdfBlob = async function (b) {
    const { pages } = paginate(await layout(b), PAGE_H);
    const out = [];
    for (let i = 0; i < pages.length; i++) {
      const cv = paint(pages[i], PAGE_H, SCALE, today() + (pages.length > 1 ? ' · ' + (i + 1) + ' / ' + pages.length : ''));
      out.push({ jpeg: new Uint8Array(await (await blobOf(cv, 'image/jpeg', 0.9)).arrayBuffer()), w: cv.width, h: cv.height });
      cv.width = cv.height = 0;
    }
    return new Blob([Pl.pdf(out, { title: b.name || 'Un ramo de Florilegio' })], { type: 'application/pdf' });
  };

  /* ---------- PDF ---------- */
  // Texto de un PDF en UTF-16BE (admite tildes, eñes y emojis en el título).
  const pdfText = (s) => '<FEFF' + Array.from({ length: s.length }, (_, i) => s.charCodeAt(i).toString(16).padStart(4, '0')).join('').toUpperCase() + '>';
  const pdfDate = (d) => 'D:' + [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('');

  // PDF 1.4 mínimo: cada imagen JPEG llena una página A4. pages: [{ jpeg: Uint8Array, w, h }]. Devuelve los bytes.
  Pl.pdf = function (pages, meta = {}) {
    const enc = new TextEncoder(), parts = [], at = [];
    let size = 0;
    const put = (x) => { const bytes = typeof x === 'string' ? enc.encode(x) : x; parts.push(bytes); size += bytes.length; };
    const obj = (id, ...body) => { at[id] = size; put(id + ' 0 obj\n'); body.forEach(put); put('\nendobj\n'); };
    // 1: catálogo, 2: páginas, 3: información; por cada página, 3 objetos: la página, su imagen y su contenido.
    const pageId = (i) => 4 + 3 * i, total = 4 + 3 * pages.length;
    const draw = 'q ' + A4[0] + ' 0 0 ' + A4[1] + ' 0 0 cm /Im Do Q';
    put('%PDF-1.4\n');
    put(new Uint8Array([37, 226, 227, 207, 211, 10])); // comentario con bytes altos: avisa que el archivo es binario
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Count ' + pages.length + ' /Kids [' + pages.map((_, i) => pageId(i) + ' 0 R').join(' ') + '] >>');
    obj(3, '<< /Title ' + pdfText(meta.title || '') + ' /Creator (Florilegio) /CreationDate (' + pdfDate(meta.date || new Date()) + ') >>');
    pages.forEach((p, i) => {
      const id = pageId(i);
      obj(id, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4.join(' ') + '] /Resources << /XObject << /Im ' + (id + 1) + ' 0 R >> >> /Contents ' + (id + 2) + ' 0 R >>');
      obj(id + 1, '<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n', p.jpeg, '\nendstream');
      obj(id + 2, '<< /Length ' + draw.length + ' >>\nstream\n' + draw + '\nendstream');
    });
    const xref = size;
    put('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (let id = 1; id < total; id++) put(String(at[id]).padStart(10, '0') + ' 00000 n \n');
    put('trailer\n<< /Size ' + total + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    const out = new Uint8Array(size);
    let o = 0;
    parts.forEach((x) => { out.set(x, o); o += x.length; });
    return out;
  };

  /* ---------- Descargar ---------- */
  // kind: 'png' | 'pdf'. El ramo se copia: si cambia mientras se prepara la lámina, sale como estaba al pedirla.
  Pl.download = async function (b, kind) {
    const copy = FL.bouquet.clone(b);
    const blob = kind === 'pdf' ? await Pl.pdfBlob(copy) : await Pl.png(copy);
    U.save(blob, 'florilegio-' + U.slug(copy.name, 'ramo') + '.' + kind);
  };

  // Conecta los botones de imagen y PDF de una vista. current(): el ramo a descargar; say(texto, fijo): avisa.
  Pl.bind = function (pngBtn, pdfBtn, current, say) {
    const btns = [pngBtn, pdfBtn];
    const go = async (kind) => {
      const b = current();
      if (!b || !b.stems.length) { say('El ramo está vacío.'); return; }
      btns.forEach((x) => { x.disabled = true; });
      say(kind === 'pdf' ? 'Preparando el PDF…' : 'Preparando la imagen…', true);
      try {
        await Pl.download(b, kind);
        say((kind === 'pdf' ? 'PDF descargado' : 'Imagen descargada') + ': el ramo, la tarjeta, lo que dice y cómo cuidarlo.');
      } catch (e) {
        say('No se pudo preparar la descarga (' + ((e && e.message) || 'error') + ').');
      } finally {
        btns.forEach((x) => { x.disabled = false; });
      }
    };
    pngBtn.addEventListener('click', () => go('png'));
    pdfBtn.addEventListener('click', () => go('pdf'));
  };
})();
