'use strict';
/* ===== Roda de cores: escolher qualquer cor (matiz e saturação na roda, brilho no controle abaixo) =====
   RodaCores.abrir(botão, '#276645', { aoMudar(hex), aoConfirmar(hex), aoCancelar() }) */
const RodaCores = (() => {
  const PALETA = ['#276645', '#007F3E', '#38C47C', '#004A80', '#4D82A4', '#6685A2', '#D0A010', '#F1B80E', '#F1C232', '#A3382A', '#95A8A0', '#202020'];
  const CHAVE = 'relatorios-cores-recentes', T = 196; // tamanho da roda (px)
  const hexOk = h => /^#?[0-9a-f]{6}$/i.test(String(h || '').trim());
  const norm = h => '#' + String(h).trim().replace('#', '').toUpperCase();
  function hsv2hex(h, s, v) {
    const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return '#' + [f(5), f(3), f(1)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function hex2hsv(hex) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(norm(hex).substr(i, 2), 16) / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
  }
  const recentes = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch { return []; } };
  const lembrar = h => { try { localStorage.setItem(CHAVE, JSON.stringify([h, ...recentes().filter(x => x !== h)].slice(0, 8))); } catch { /* opcional */ } };

  let pop, cv, cx, hsv = { h: 0, s: 0, v: 1 }, cb = {}, ancora = null, inicial = '#000000';
  function criar() {
    pop = document.createElement('div'); pop.id = 'roda'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Escolher cor');
    pop.innerHTML = `<div class="rd-topo"><b>Escolher cor</b><span class="rd-amostra" aria-hidden="true"><i class="rd-antes" title="Cor anterior"></i><i class="rd-agora" title="Nova cor"></i></span></div>
      <div class="rd-roda"><canvas width="${T * 2}" height="${T * 2}" style="width:${T}px;height:${T}px" tabindex="0" aria-label="Roda de cores: setas mudam matiz e saturação"></canvas><span class="rd-mira" aria-hidden="true"></span></div>
      <label class="rd-lum"><span>Brilho</span><input type="range" min="0" max="100" step="1" aria-label="Brilho"></label>
      <label class="rd-hex"><span>Código</span><input type="text" maxlength="7" spellcheck="false" aria-label="Código hexadecimal da cor" placeholder="#RRGGBB"></label>
      <div class="rd-sec">Cores da Terracap</div><div class="rd-pal" data-pal></div>
      <div class="rd-sec rd-rec-t">Usadas recentemente</div><div class="rd-pal" data-rec></div>
      <div class="rd-b"><button type="button" class="mini" data-rd="cancelar">Cancelar</button><button type="button" class="mini primary" data-rd="ok">Aplicar</button></div>`;
    document.body.append(pop);
    cv = pop.querySelector('canvas'); cx = cv.getContext('2d');
    // roda: matiz no ângulo, saturação no raio (brilho máximo; o controle escurece)
    const W = cv.width, R = W / 2, img = cx.createImageData(W, W);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const dx = x - R, dy = y - R, d = Math.hypot(dx, dy), i = (y * W + x) * 4; if (d > R) continue;
      const hx = hsv2hex((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, d / R, 1);
      img.data[i] = parseInt(hx.substr(1, 2), 16); img.data[i + 1] = parseInt(hx.substr(3, 2), 16); img.data[i + 2] = parseInt(hx.substr(5, 2), 16); img.data[i + 3] = d > R - 1.5 ? Math.round((R - d) / 1.5 * 255) : 255;
    }
    cx.putImageData(img, 0, 0);
    const pegar = e => { const r = cv.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, rr = r.width / 2; hsv.h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; hsv.s = Math.min(1, Math.hypot(dx, dy) / rr); if (hsv.v < .15) hsv.v = 1; mudou(); };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); cv.focus(); pegar(e); const mv = ev => pegar(ev), up = () => { cv.removeEventListener('pointermove', mv); cv.removeEventListener('pointerup', up); }; cv.addEventListener('pointermove', mv); cv.addEventListener('pointerup', up); });
    cv.addEventListener('keydown', e => {
      const d = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, .05], ArrowDown: [0, -.05] }[e.key]; if (!d) return;
      e.preventDefault(); hsv.h = (hsv.h + d[0] + 360) % 360; hsv.s = Math.max(0, Math.min(1, hsv.s + d[1])); mudou();
    });
    pop.querySelector('.rd-lum input').addEventListener('input', e => { hsv.v = +e.target.value / 100; mudou(); });
    pop.querySelector('.rd-hex input').addEventListener('input', e => { if (hexOk(e.target.value)) { hsv = hex2hsv(e.target.value); mudou(true); } });
    pop.querySelector('.rd-hex input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fechar(true); } });
    pop.addEventListener('click', e => {
      const sw = e.target.closest('[data-cor]'); if (sw) { hsv = hex2hsv(sw.dataset.cor); mudou(); return; }
      const b = e.target.closest('[data-rd]'); if (b) fechar(b.dataset.rd === 'ok');
    });
    pop.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(false); } });
    document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && e.target !== ancora && !ancora?.contains(e.target)) fechar(true); }, true);
    addEventListener('resize', () => { if (!pop.hidden) posicionar(); });
  }
  const atual = () => hsv2hex(hsv.h, hsv.s, hsv.v);
  function desenhar(semHex) {
    const h = atual(), rr = T / 2, a = hsv.h * Math.PI / 180;
    Object.assign(pop.querySelector('.rd-mira').style, { left: rr + Math.cos(a) * hsv.s * rr + 'px', top: rr + Math.sin(a) * hsv.s * rr + 'px', background: hsv2hex(hsv.h, hsv.s, 1) });
    cv.style.filter = `brightness(${Math.max(.08, hsv.v)})`;
    const lum = pop.querySelector('.rd-lum input'); lum.value = Math.round(hsv.v * 100); lum.style.setProperty('--rd-c', hsv2hex(hsv.h, hsv.s, 1));
    if (!semHex) pop.querySelector('.rd-hex input').value = h;
    pop.querySelector('.rd-agora').style.background = h;
    pop.querySelectorAll('[data-cor]').forEach(x => x.setAttribute('aria-pressed', x.dataset.cor === h));
  }
  function mudou(semHex) { desenhar(semHex); cb.aoMudar?.(atual()); }
  function posicionar() {
    const r = ancora?.getBoundingClientRect() || { left: innerWidth / 2 - 130, bottom: 120, top: 120 }, w = pop.offsetWidth, h = pop.offsetHeight;
    let top = r.bottom + 8; if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
    pop.style.left = Math.round(Math.max(8, Math.min(innerWidth - w - 8, r.left))) + 'px'; pop.style.top = Math.round(top) + 'px';
  }
  function abrir(el, cor, opcoes = {}) {
    if (!pop) criar();
    if (!pop.hidden) fechar(false);
    ancora = el; cb = opcoes; inicial = hexOk(cor) ? norm(cor) : '#276645'; hsv = hex2hsv(inicial);
    const sw = c => `<button type="button" class="rd-sw" data-cor="${c}" style="background:${c}" title="${c}" aria-label="Cor ${c}"></button>`;
    pop.querySelector('[data-pal]').innerHTML = (opcoes.paleta || PALETA).map(sw).join('');
    const rec = recentes(); pop.querySelector('[data-rec]').innerHTML = rec.map(sw).join(''); pop.querySelector('.rd-rec-t').hidden = !rec.length;
    pop.querySelector('.rd-antes').style.background = inicial;
    pop.hidden = false; desenhar(); posicionar(); cv.focus({ preventScroll: true });
  }
  function fechar(confirmar) {
    if (!pop || pop.hidden) return;
    pop.hidden = true; const h = atual(), c = cb; cb = {};
    if (confirmar) { if (h !== inicial) lembrar(h); c.aoConfirmar?.(h); }
    else { c.aoMudar?.(inicial); c.aoCancelar?.(); }
    ancora?.focus?.({ preventScroll: true }); ancora = null;
  }
  return { abrir, fechar, hexOk, norm, aberta: () => !!pop && !pop.hidden };
})();
