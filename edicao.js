'use strict';
/* ===== Edição direta: clicar no texto da página/slide e digitar ali mesmo =====
   Elementos editáveis levam data-ed="caminho" e data-em="modo":
     t  uma linha, sem formatação          r  uma linha com **negrito**
     b  várias linhas (Enter = nova linha)  p  parágrafos (Enter = novo parágrafo, Shift+Enter = nova linha)
     L  lista: cada linha é um item         n  número
   Cada tela informa como ler/gravar o valor no modelo (opções de EdicaoDireta.ligar). */
const EdicaoDireta = (() => {
  const escT = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const negr = s => escT(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const comNegrito = m => m === 'r' || m === 'b' || m === 'p';
  const umaLinha = m => m === 't' || m === 'r' || m === 'n';
  const chave = el => el ? el.dataset.ed + (el.dataset.cell != null ? '#' + el.dataset.cell : '') : null;

  /* HTML editável → texto do modelo */
  function ler(el, modo) {
    const tk = []; // {t, b} | 'BR' | 'P'
    const BLOCO = /^(P|DIV|LI|UL|OL|H[1-6]|BLOCKQUOTE)$/;
    const andar = (n, b) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) tk.push({ t: c.data.replace(/ /g, ' ').replace(/[\r\n]+/g, ' '), b });
        else if (c.nodeType !== 1) continue;
        else if (c.tagName === 'BR') tk.push('BR');
        else {
          const nb = b || /^(B|STRONG)$/.test(c.tagName) || parseInt(c.style?.fontWeight) >= 600;
          if (BLOCO.test(c.tagName)) { tk.push('P'); andar(c, nb); tk.push('P'); } else andar(c, nb);
        }
      }
    };
    andar(el, false);
    // blocos → linhas → trechos
    const blocos = []; let bl = null;
    tk.forEach(x => {
      if (x === 'P') { if (bl) blocos.push(bl); bl = null; return; }
      bl ||= [[]];
      if (x === 'BR') bl.push([]); else bl[bl.length - 1].push(x);
    });
    if (bl) blocos.push(bl);
    blocos.forEach(b => { if (b.length > 1 && !b[b.length - 1].length) b.pop(); }); // <br> final do navegador
    const linha = runs => {
      if (!comNegrito(modo)) return runs.map(r => r.t).join('');
      const m = []; runs.forEach(r => { const u = m[m.length - 1]; if (u && u.b === r.b) u.t += r.t; else m.push({ ...r }); });
      return m.map(r => { if (!r.b || !r.t.trim()) return r.t; const [, a, meio, z] = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.t); return `${a}**${meio}**${z}`; }).join('');
    };
    const ls = blocos.map(b => b.map(linha));
    if (umaLinha(modo)) { const t = ls.flat().join(' ').replace(/\s+/g, ' ').trim(); return modo === 'n' ? t.replace(/[^\d,.\-]/g, '') : t; }
    if (modo === 'L') return ls.map(b => b.join(' ').replace(/\s+/g, ' ').trim());
    if (modo === 'p') return ls.map(b => b.map(l => l.replace(/\s+$/, '')).join('\n').trim()).filter(Boolean).join('\n\n');
    return ls.flat().map(l => l.replace(/\s+$/, '')).join('\n').replace(/^\n+|\n+$/g, '');
  }

  /* texto do modelo → HTML editável (usado quando a tela mostra o texto transformado, como nos slides) */
  function html(v, modo) {
    if (modo === 'L') return (v || []).map(x => `<div>${negr(x) || '<br>'}</div>`).join('') || '<div><br></div>';
    if (modo === 'b' || modo === 'p') return String(v ?? '').split('\n').map(l => `<div>${negr(l) || '<br>'}</div>`).join('');
    return comNegrito(modo) ? negr(v) : escT(v);
  }

  /* barra flutuante com Negrito / Concluir */
  let barra = null;
  function criarBarra(op) {
    barra = document.createElement('div'); barra.id = 'ed-barra'; barra.hidden = true; barra.setAttribute('role', 'toolbar'); barra.setAttribute('aria-label', 'Edição do texto');
    barra.innerHTML = `<button type="button" class="mini" data-ed-act="negrito" title="Negrito (Ctrl+B)"><b>N</b></button><span class="ed-dica"></span>${op.painel ? `<button type="button" class="mini" data-ed-act="painel" title="${escT(op.painel.dica)}">${escT(op.painel.rotulo)}</button>` : ''}<button type="button" class="mini primary" data-ed-act="ok" title="Concluir (Esc cancela)">Concluir</button>`;
    barra.addEventListener('mousedown', e => e.preventDefault()); // não tira o foco do texto
    document.body.append(barra);
  }
  function posicionar(el) {
    if (!barra || barra.hidden || !el) return;
    const r = el.getBoundingClientRect(), bh = barra.offsetHeight || 40, bw = barra.offsetWidth || 300;
    let top = r.top - bh - 8; if (top < 60) top = Math.min(innerHeight - bh - 8, r.bottom + 8);
    barra.style.top = Math.round(top) + 'px'; barra.style.left = Math.round(Math.max(8, Math.min(innerWidth - bw - 8, r.left))) + 'px';
  }

  function caretNoPonto(el, x, y) {
    let rg = null;
    if (x != null) {
      if (document.caretRangeFromPoint) rg = document.caretRangeFromPoint(x, y);
      else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { rg = document.createRange(); rg.setStart(p.offsetNode, p.offset); } }
      if (rg && !el.contains(rg.startContainer)) rg = null;
    }
    if (!rg) { rg = document.createRange(); rg.selectNodeContents(el); rg.collapse(false); }
    const s = getSelection(); s.removeAllRanges(); s.addRange(rg);
  }

  /* op: { raiz, ativo(), valor(el), gravar(el, v), concluir(el, mudou) → Promise, novoItem?(el), removerItem?(el), trocarAoEditar?, painel? } */
  function ligar(op) {
    const raiz = op.raiz; let atual = null, orig = null, origHTML = '', ponto = null, cancelando = false, pendente = false;
    criarBarra(op);
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* opcional */ }
    const soltar = el => { atual = null; barra.hidden = true; el.classList.remove('ed-on'); el.spellcheck = false; };
    const achar = k => [...raiz.querySelectorAll('[data-ed]')].find(x => chave(x) === k);

    raiz.addEventListener('pointerdown', e => { ponto = { x: e.clientX, y: e.clientY }; }, true);
    raiz.addEventListener('focusin', e => {
      const el = e.target.closest?.('[data-ed]'); if (!el || el === atual || pendente || !op.ativo()) return;
      atual = el; orig = op.valor(el); origHTML = el.innerHTML; el.spellcheck = true; el.classList.add('ed-on');
      if (op.trocarAoEditar) { // mostra o texto original (sem as quebras e maiúsculas automáticas) e recoloca o cursor onde o usuário clicou
        el.innerHTML = html(orig, el.dataset.em || 't');
        const p = ponto; requestAnimationFrame(() => { if (atual === el) caretNoPonto(el, p?.x, p?.y); });
      }
      const m = el.dataset.em || 't';
      barra.querySelector('[data-ed-act=negrito]').hidden = !comNegrito(m);
      barra.querySelector('.ed-dica').textContent = el.dataset.li != null ? 'Enter: novo item' : m === 'p' ? 'Enter: novo parágrafo' : m === 'b' || m === 'L' ? 'Enter: nova linha' : 'Enter: concluir';
      barra.hidden = false; posicionar(el);
    });
    raiz.addEventListener('focusout', e => {
      const el = e.target.closest?.('[data-ed]'); if (!el || el !== atual) return;
      const novo = ler(el, el.dataset.em || 't'), mudou = JSON.stringify(novo) !== JSON.stringify(orig), canc = cancelando;
      cancelando = false; soltar(el);
      const vazio = el.dataset.li != null && !String(novo).trim();
      if (!mudou && !op.trocarAoEditar && !vazio) return;
      if (!canc && mudou) op.gravar(el, novo);
      const prox = e.relatedTarget?.closest?.('[data-ed]'), k = chave(prox), p = ponto;
      pendente = true; // o texto clicado em seguida será redesenhado: só ganha o foco depois
      Promise.resolve(op.concluir(el, mudou || vazio)).finally(() => setTimeout(() => {
        pendente = false; if (!k) return;
        const alvo = achar(k); if (!alvo) return;
        alvo.focus({ preventScroll: true }); requestAnimationFrame(() => caretNoPonto(alvo, p?.x, p?.y));
      }, 0));
    });
    raiz.addEventListener('input', e => {
      const el = e.target.closest?.('[data-ed]'); if (!el || el !== atual) return;
      op.gravar(el, ler(el, el.dataset.em || 't')); posicionar(el);
    });
    raiz.addEventListener('keydown', e => {
      const el = e.target.closest?.('[data-ed]'); if (!el || el !== atual) return;
      const m = el.dataset.em || 't', k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') { e.preventDefault(); cancelando = true; op.gravar(el, orig); el.innerHTML = origHTML; el.blur(); return; }
      if (mod && ['i', 'u'].includes(k)) { e.preventDefault(); return; } // só há negrito
      if (mod && k === 'b') { e.preventDefault(); if (comNegrito(m)) document.execCommand('bold'); return; }
      if (e.key === 'Enter' && !e.shiftKey) {
        if (el.dataset.li != null && op.novoItem) { e.preventDefault(); op.gravar(el, ler(el, m)); soltar(el); el.blur(); op.novoItem(el); return; }
        if (umaLinha(m)) { e.preventDefault(); el.blur(); return; }
        if (m === 'b' || m === 'L') { if (op.trocarAoEditar) return; e.preventDefault(); document.execCommand('insertLineBreak'); }
        return;
      }
      if (e.key === 'Enter' && e.shiftKey && (umaLinha(m) || m === 'L')) { e.preventDefault(); return; }
      if (e.key === 'Backspace' && el.dataset.li != null && op.removerItem && !el.textContent.trim()) { e.preventDefault(); soltar(el); el.blur(); op.removerItem(el); }
    });
    raiz.addEventListener('paste', e => {
      const el = e.target.closest?.('[data-ed]'); if (!el) return;
      e.preventDefault(); let t = e.clipboardData.getData('text/plain') || '';
      if (umaLinha(el.dataset.em || 't')) t = t.replace(/\s*[\r\n]+\s*/g, ' ');
      document.execCommand('insertText', false, t.replace(/\r/g, ''));
    });
    raiz.addEventListener('drop', e => { if (e.target.closest?.('[data-ed]')) e.preventDefault(); });
    barra.addEventListener('click', e => {
      const b = e.target.closest('[data-ed-act]'); if (!b || !atual) return;
      if (b.dataset.edAct === 'negrito') {
        if (getSelection().isCollapsed) return toastSeHouver('Primeiro selecione o trecho que deseja deixar em negrito.');
        document.execCommand('bold'); atual.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (b.dataset.edAct === 'painel') { const el = atual; el.blur(); op.painel.abrir(el); }
      else atual.blur();
    });
    const repos = () => posicionar(atual);
    addEventListener('scroll', repos, true); addEventListener('resize', repos);
    return {
      editando: () => !!atual,
      /* liga contenteditable nos editáveis depois de cada redesenho */
      preparar(el) {
        const on = op.ativo();
        el.querySelectorAll('[data-ed]').forEach(x => { x.contentEditable = on ? 'true' : 'false'; x.spellcheck = false; if (on && !x.title) x.title = 'Clique para editar'; });
      },
      /* põe o cursor no fim do editável com essa chave (ex.: item recém-criado) */
      focar(k) {
        const alvo = achar(k); if (!alvo) return;
        alvo.focus(); requestAnimationFrame(() => caretNoPonto(alvo));
      },
    };
  }
  const toastSeHouver = m => { if (typeof toast === 'function') toast(m); };

  return { ligar, ler, html, chave };
})();
