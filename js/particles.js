/* Florilegio — partículas: pétalos que flotan, polen, semillas de diente de león y aromas */
(function () {
  'use strict';
  const FL = window.FL;
  const TAU = Math.PI * 2;

  // Tamaño de un lienzo a pantalla completa: ancho y alto en px CSS y densidad (con tope, el polen no pide más).
  const sizeOf = (c) => ({ w: c.clientWidth || window.innerWidth, h: c.clientHeight || window.innerHeight, d: Math.min(1.5, window.devicePixelRatio || 1) });

  // size: { w, h, d } para un lienzo sin documento (OffscreenCanvas en un worker); si falta, se mide el elemento.
  class Particles {
    constructor(canvas, size) {
      this.c = canvas;
      this.x = canvas.getContext('2d');
      this.ps = [];
      this.T = 0;
      this.resize(size);
    }
    resize(size) {
      const { w, h, d } = size || sizeOf(this.c);
      this.c.width = Math.round(w * d);
      this.c.height = Math.round(h * d);
      this.x.setTransform(d, 0, 0, d, 0, 0);
      this.w = w;
      this.h = h;
    }
    add(p) {
      this.ps.push(Object.assign({ t: 0, life: 10, rot: Math.random() * TAU, vr: 0, s: 1, ph: Math.random() * TAU, a: 1, vx: 0, vy: 0 }, p));
    }
    count(type) {
      let n = 0;
      for (const p of this.ps) if (p.type === type) n++;
      return n;
    }
    clear() {
      this.ps.length = 0;
      this.x.clearRect(0, 0, this.w, this.h);
    }
    step(dt, T) {
      this.T = T;
      const x = this.x;
      if (!this.ps.length) {
        if (this.dirty) { x.clearRect(0, 0, this.w, this.h); this.dirty = false; }
        return;
      }
      this.dirty = true;
      x.clearRect(0, 0, this.w, this.h);
      for (let i = this.ps.length - 1; i >= 0; i--) {
        const p = this.ps[i];
        p.t += dt;
        const k = p.t / p.life;
        if (k >= 1 || p.y > this.h + 60 || p.x > this.w + 80 || p.x < -80 || p.y < -120) { this.ps.splice(i, 1); continue; }
        const fade = Math.min(1, p.t / (p.fin || 0.6)) * Math.min(1, (1 - k) / 0.25);
        const e = Math.min(1, dt * (p.drag || 0.8));
        switch (p.type) {
          case 'petal':
            p.vx += ((p.wind != null ? p.wind : 14) + Math.sin(T * 0.7 + p.ph) * 18 - p.vx) * e;
            p.vy += ((p.fall || 22) + Math.cos(T * 1.1 + p.ph) * 8 - p.vy) * e;
            p.rot += p.vr * dt;
            this.petal(p, fade);
            break;
          case 'seed':
            p.vx += ((p.wind != null ? p.wind : 22) + Math.sin(T * 0.6 + p.ph) * 10 - p.vx) * e;
            p.vy += (-7 + Math.cos(T * 0.9 + p.ph) * 7 - p.vy) * e;
            p.rot += (Math.atan2(p.vx, 40) * 0.3 - p.rot) * e;
            this.seed(p, fade);
            break;
          case 'mote':
            p.vx += (Math.sin(T * 0.8 + p.ph) * 9 - p.vx) * e;
            p.vy += ((p.rise || -14) - p.vy) * e;
            this.dot(p, fade * (0.55 + 0.45 * Math.sin(T * 3 + p.ph)));
            break;
          default: // polen y chispas
            p.vx += (Math.sin(T * 0.31 + p.ph) * 7 - p.vx) * e * 0.5;
            p.vy += (Math.cos(T * 0.23 + p.ph * 1.3) * 5 - 2 - p.vy) * e * 0.5;
            this.dot(p, fade * (0.45 + 0.55 * Math.abs(Math.sin(T * 1.4 + p.ph))));
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    petal(p, a) {
      const x = this.x;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.rot);
      const flip = 0.3 + 0.7 * Math.abs(Math.cos(this.T * (p.fs || 1.5) + p.ph));
      x.scale(p.s, p.s * flip);
      x.globalAlpha = a * p.a;
      x.fillStyle = p.col;
      x.beginPath();
      x.moveTo(0, 7);
      x.bezierCurveTo(7, 3, 6.5, -5, 1.6, -7);
      x.quadraticCurveTo(0, -5.2, -1.6, -7);
      x.bezierCurveTo(-6.5, -5, -7, 3, 0, 7);
      x.fill();
      if (p.col2) {
        x.globalAlpha = a * p.a * 0.55;
        x.fillStyle = p.col2;
        x.beginPath();
        x.ellipse(-1, -0.5, 2.1, 4.2, 0.25, 0, TAU);
        x.fill();
      }
      x.restore();
    }
    seed(p, a) {
      const x = this.x;
      x.save();
      x.translate(p.x, p.y);
      x.rotate(p.rot);
      x.scale(p.s, p.s);
      x.globalAlpha = a * p.a;
      x.strokeStyle = p.col;
      x.lineWidth = 0.7;
      x.beginPath();
      x.moveTo(0, 10);
      x.lineTo(0, -5);
      x.stroke();
      x.fillStyle = p.col2 || p.col;
      x.beginPath();
      x.ellipse(0, 11, 1, 2.4, 0, 0, TAU);
      x.fill();
      x.lineWidth = 0.5;
      x.beginPath();
      for (let j = 0; j < 11; j++) {
        const ang = -Math.PI / 2 + (j / 10 - 0.5) * 2.7;
        x.moveTo(0, -5);
        x.lineTo(Math.cos(ang) * 8, -5 + Math.sin(ang) * 8);
      }
      x.stroke();
      x.restore();
    }
    dot(p, a) {
      const x = this.x;
      x.globalAlpha = a * p.a * 0.28;
      x.fillStyle = p.col;
      x.beginPath();
      x.arc(p.x, p.y, p.s * 3.2, 0, TAU);
      x.fill();
      x.globalAlpha = a * p.a;
      x.beginPath();
      x.arc(p.x, p.y, p.s * 1.1, 0, TAU);
      x.fill();
      x.globalAlpha = 1;
    }
  }
  FL.Particles = Particles;

  // Deriva de fondo del jardín: pétalos que cruzan de vez en cuando y polen suspendido. st guarda el reloj de aparición.
  const DRIFT = ['#f8cbd8', '#fbe3ea', '#fff4f7', '#f3d27a', '#f2e8df', '#e9a3b8', '#d9d0ef'];
  function drift(sys, dt, st) {
    const small = sys.w < 700;
    st.spawnT -= dt;
    if (st.spawnT <= 0 && sys.count('petal') < (small ? 4 : 7)) {
      st.spawnT = 2.2 + Math.random() * 3;
      const col = DRIFT[(Math.random() * DRIFT.length) | 0];
      const fromTop = Math.random() < 0.7;
      sys.add({
        type: 'petal', x: fromTop ? Math.random() * sys.w * 0.8 : -20, y: fromTop ? -20 : Math.random() * sys.h * 0.5,
        vx: 12, vy: 14, vr: (Math.random() - 0.5) * 1.6, s: 0.7 + Math.random() * 0.8, life: 30, col, col2: '#ffffff', wind: 14 + Math.random() * 10, fall: 16 + Math.random() * 12
      });
    }
    while (sys.count('pollen') < (small ? 10 : 20)) {
      sys.add({ type: 'pollen', x: Math.random() * sys.w, y: Math.random() * sys.h, s: 0.5 + Math.random() * 0.8, life: 14 + Math.random() * 12, fin: 2, col: '#e9c25c', a: 0.8 });
    }
  }

  // Cuerpo del worker de la deriva (se arma como texto en FL.Ambient, junto con Particles y drift).
  function ambientWorker() {
    let sys = null, on = false, reduce = false, raf = 0, last = 0, T = 0;
    const st = { spawnT: 0 };
    const next = self.requestAnimationFrame ? (fn) => self.requestAnimationFrame(fn) : (fn) => setTimeout(() => fn(performance.now()), 16);
    const frame = (now) => {
      raf = 0;
      if (!on || !sys) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      T += dt;
      if (!reduce) drift(sys, dt, st);
      sys.step(dt, T);
      // Sin deriva (movimiento reducido) y sin partículas, el worker descansa hasta que llegue otra.
      if (!reduce || sys.ps.length || sys.dirty) raf = next(frame);
    };
    self.onmessage = (e) => {
      const m = e.data;
      if (m.t === 'init') { sys = new Particles(m.canvas, m.size); reduce = m.reduce; on = m.on; }
      else if (m.t === 'size') sys.resize(m.size);
      else if (m.t === 'add') sys.add(m.p);
      else if (m.t === 'run') on = m.on;
      if (on && sys && !raf) { last = performance.now(); raf = next(frame); }
    };
  }

  /*
   * La deriva del jardín se pinta en un worker, sobre un OffscreenCanvas: el hilo principal no tiene que pedir un
   * cuadro tras otro, y sin cuadros pedidos las flores se mecen solo en la GPU, sin recalcular estilos en cada uno.
   * Sin worker (navegadores viejos, la página abierta con doble clic) se pinta aquí y el bucle principal la mueve.
   * Devuelve { add, resize, run, step, on }: step(dt, T) solo trabaja sin worker y dice si hace falta otro cuadro.
   */
  FL.Ambient = function (canvas) {
    const A = { on: true, local: null };
    const st = { spawnT: 0 };
    let wk = null, moved = false;
    const local = () => {
      if (wk) { wk.terminate(); wk = null; }
      // Un lienzo ya entregado al worker no admite otro contexto: se cambia por uno nuevo.
      if (moved) { const c = canvas.cloneNode(false); canvas.replaceWith(c); canvas = c; moved = false; }
      A.local = new Particles(canvas);
      if (FL.wake) FL.wake();
    };
    try {
      if (!canvas.transferControlToOffscreen || typeof Worker === 'undefined') throw new Error('sin OffscreenCanvas');
      const src = 'const TAU=Math.PI*2;const DRIFT=' + JSON.stringify(DRIFT) + ';const Particles=' + Particles + ';const drift=' + drift + ';(' + ambientWorker + ')();';
      wk = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      const off = canvas.transferControlToOffscreen();
      moved = true;
      wk.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); local(); };
      wk.postMessage({ t: 'init', canvas: off, size: sizeOf(canvas), reduce: !!FL.reduce, on: A.on }, [off]);
    } catch (e) {
      local();
    }
    A.add = (p) => { if (wk) wk.postMessage({ t: 'add', p }); else A.local.add(p); };
    A.resize = () => { if (wk) wk.postMessage({ t: 'size', size: sizeOf(canvas) }); else A.local.resize(); };
    A.run = (on) => {
      if (on === A.on) return;
      A.on = on;
      if (wk) wk.postMessage({ t: 'run', on });
    };
    A.step = (dt, T) => {
      if (!A.local || !A.on) return false;
      if (!FL.reduce) drift(A.local, dt, st);
      A.local.step(dt, T);
      return !FL.reduce || A.local.ps.length > 0 || !!A.local.dirty;
    };
    return A;
  };

  // Pequeña explosión de pétalos y polen alrededor de un punto (flor que entra en foco).
  FL.burst = function (sys, cx, cy, cols, n = 16, spread = 120) {
    if (FL.reduce) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = 40 + Math.random() * 90;
      sys.add({
        type: 'petal', x: cx + Math.cos(a) * spread * 0.4, y: cy + Math.sin(a) * spread * 0.4,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, vr: (Math.random() - 0.5) * 3,
        s: 0.8 + Math.random() * 0.9, life: 5 + Math.random() * 4, col: cols[i % cols.length], col2: '#ffffff', wind: 10, fall: 26, drag: 0.9
      });
    }
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = 20 + Math.random() * 60;
      sys.add({ type: 'pollen', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: 0.6 + Math.random() * 0.9, life: 3 + Math.random() * 3, col: '#f3cf6b', drag: 1.2 });
    }
  };
})();
