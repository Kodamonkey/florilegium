/* Florilegio — composición sin solapes: separa cabezas florales (elipses) para que cada flor se vea entera.
   Lo usan el jardín y el taller de ramos. Sin dependencias del DOM: se puede probar aparte. */
(function () {
  'use strict';
  const FL = (window.FL = window.FL || {});
  const L = (FL.layout = {});

  /*
   * nodes: [{ x, y, rx, ry, z, band, minX, maxX, minY, maxY, pin }]
   *   x, y: centro de la cabeza; rx, ry: semiejes; z: orden de dibujo (mayor = delante).
   *   band: fila (mismo valor = misma fila); los límites acotan el movimiento; pin: no se mueve;
   *   allow (opcional): solape propio tolerado, para follajes y rellenos que pueden quedar detrás.
   * opts: { iterations, gap, allow, avoid: [{x0, y0, x1, y1}], verticalBias }
   *   gap: espacio mínimo (px) entre cabezas de la misma fila.
   *   allow: fracción de solape tolerada cuando una cabeza queda delante de otra de otra fila.
   */
  L.relax = function (nodes, opts = {}) {
    const iters = opts.iterations || 120, gap = opts.gap != null ? opts.gap : 6;
    const allow = opts.allow != null ? opts.allow : 0.12, avoid = opts.avoid || [];
    const vb = opts.verticalBias != null ? opts.verticalBias : 1;
    const n = nodes.length;
    const clamp = (nd) => {
      nd.x = Math.max(nd.minX != null ? nd.minX : -Infinity, Math.min(nd.maxX != null ? nd.maxX : Infinity, nd.x));
      nd.y = Math.max(nd.minY != null ? nd.minY : -Infinity, Math.min(nd.maxY != null ? nd.maxY : Infinity, nd.y));
    };
    for (let it = 0; it < iters; it++) {
      const step = 0.6 * (1 - it / (iters * 1.25));
      let moved = 0;
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j];
          const same = a.band === b.band;
          const sx = a.rx + b.rx + (same ? gap : 0), sy = a.ry + b.ry + (same ? gap : 0);
          let dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx / sx, dy / sy);
          const target = same ? 1 : 1 - Math.max(allow, a.allow || 0, b.allow || 0);
          if (d >= target) continue;
          if (d < 1e-6) { dx = (i % 2 ? 1 : -1) * 0.5; dy = 0; }
          const nx = dx / sx, ny = dy / sy, m = Math.hypot(nx, ny) || 1;
          const push = (target - d) * step;
          let px = (nx / m) * push * sx, py = (ny / m) * push * sy;
          // En la misma fila se separan hacia los lados; entre filas, la de atrás sube y la de adelante baja.
          const back = a.z < b.z ? a : b;
          if (same) py *= 0.25;
          else py = py * vb + (back === a ? 1 : -1) * Math.abs(px) * 0.35;
          const wa = a.pin ? 0 : b.pin ? 1 : same ? 0.5 : a === back ? 0.65 : 0.35;
          const wb = b.pin ? 0 : a.pin ? 1 : 1 - wa;
          a.x -= px * wa; a.y -= py * wa;
          b.x += px * wb; b.y += py * wb;
          clamp(a); clamp(b);
          moved++;
        }
        // Zonas reservadas (por ejemplo, el título): la cabeza sale por el lado más corto.
        for (const z of avoid) {
          if (a.pin) continue;
          const ox = Math.min(a.x + a.rx, z.x1) - Math.max(a.x - a.rx, z.x0);
          const oy = Math.min(a.y + a.ry, z.y1) - Math.max(a.y - a.ry, z.y0);
          if (ox <= 0 || oy <= 0) continue;
          const right = z.x1 - (a.x - a.rx), down = z.y1 - (a.y - a.ry), left = (a.x + a.rx) - z.x0;
          const best = Math.min(right, down, left);
          if (best === down) a.y += down * step;
          else if (best === right) a.x += right * step;
          else a.x -= left * step;
          clamp(a);
          moved++;
        }
      }
      if (!moved) break;
    }
    return nodes;
  };

  // Fracción visible de cada cabeza: muestrea puntos dentro de la elipse y cuenta los que tapa una cabeza de delante.
  L.visibility = function (nodes, samples = 64) {
    const pts = [];
    const ring = Math.max(2, Math.round(Math.sqrt(samples / 3)));
    for (let k = 1; k <= ring; k++) {
      const rr = (k - 0.5) / ring, m = Math.round((samples * (2 * k - 1)) / (ring * ring));
      for (let q = 0; q < m; q++) {
        const a = ((q + (k % 2) * 0.5) / m) * Math.PI * 2;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
    }
    return nodes.map((a) => {
      let hidden = 0;
      for (const [u, v] of pts) {
        const px = a.x + u * a.rx, py = a.y + v * a.ry;
        for (const b of nodes) {
          if (b === a || b.z <= a.z) continue;
          const ex = (px - b.x) / b.rx, ey = (py - b.y) / b.ry;
          if (ex * ex + ey * ey < 1) { hidden++; break; }
        }
      }
      return 1 - hidden / pts.length;
    });
  };
})();
