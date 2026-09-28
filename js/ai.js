/* Florilegio — cliente del agente de IA (server/). Si no hay servidor, la página sigue con la lectura local. */
(function () {
  'use strict';
  const FL = window.FL;
  const AI = (FL.ai = { available: false });

  const timeout = (ms) => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

  AI.check = async function () {
    if (!/^https?:$/.test(location.protocol)) return false;
    try {
      const r = await fetch('api/health', { signal: timeout(2500), cache: 'no-store' });
      const j = r.ok ? await r.json() : {};
      AI.available = !!j.ai;
    } catch (e) {
      AI.available = false;
    }
    document.body.classList.toggle('ai-on', AI.available);
    if (FL.atelier && FL.atelier.aiChanged) FL.atelier.aiChanged(AI.available);
    return AI.available;
  };

  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: timeout(120000) });
    let j = null;
    try { j = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) throw new Error((j && j.detail && (j.detail.message || j.detail)) || 'error ' + r.status);
    return j;
  }

  // Lectura de un ramo: { summary, tone, meanings[], per_item[], cultural_notes[], warnings[], suggestions[] }
  AI.interpret = function (bouquet) {
    const { id, reading, ...rest } = bouquet;
    return post('api/bouquet/interpret', { bouquet: rest });
  };

  // Propuesta: { bouquet, rationale: { lead, items[] }, reading }
  AI.compose = function (req) {
    return post('api/bouquet/compose', req);
  };
})();
