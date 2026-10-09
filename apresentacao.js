'use strict';
/* ===== Editor de apresentações (apresentacao.html) ===== */
const esc = escH;
const getp = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
function setp(o, p, v) { const ks = p.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }
const swap = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };

function toast(msg, acao, ms) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.append(msg);
  if (acao) { const b = document.createElement('button'); b.textContent = acao.rotulo; b.onclick = () => { acao.fn(); t.remove(); }; t.append(b); }
  $('toasts').append(t); setTimeout(() => t.remove(), ms || (acao ? 8000 : 3500));
}
const setStatus = (t, erro) => { const s = $('save-status'); s.textContent = t; s.classList.toggle('err', !!erro); };
let avisouErro = false;
function save() {
  const d = D(); if (d) d.atualizado = Date.now();
  persistir().then(ok => {
    if (ok) return setStatus('✓ Salvo automaticamente');
    setStatus('⚠ Não foi possível salvar', true);
    if (!avisouErro) { avisouErro = true; toast('O navegador não conseguiu salvar. Use Opções › Salvar cópia de segurança para não perder o trabalho.', null, 12000); }
  });
}

/* ---- desfazer (alterações de estrutura: remover, mover, colar…) ---- */
const pilha = [];
function snapshot() { pilha.push(JSON.stringify(D())); if (pilha.length > 8) pilha.shift(); $('btn-undo').disabled = false; }
function desfazer() {
  const j = pilha.pop(); if (!j) return;
  const i = state.decks.findIndex(x => x.id === atualId); state.decks[i] = JSON.parse(j);
  sel = Math.min(sel, state.decks[i].slides.length - 1); $('btn-undo').disabled = !pilha.length; save(); renderTudo();
}

let sel = 0, formAberto = {};
const S = () => D().slides[sel];

/* ---- imagens ---- */
function compress(file, max = 1920) {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d'); if (!/png/.test(file.type)) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL(/png/.test(file.type) ? 'image/png' : 'image/jpeg', .85)); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}

/* ---- miniatura / palco ---- */
function encaixar(html, largura) { // slide reduzido a uma largura (px)
  const k = largura / SW;
  return `<div class="sl-fit" style="width:${largura}px;height:${Math.round(SH * k)}px"><div style="transform:scale(${k});transform-origin:0 0;position:absolute;left:0;top:0">${html}</div></div>`;
}
function desenharPalco() {
  const box = $('stage-box'), s = S(); if (!s) { box.innerHTML = ''; return; }
  const a = $('stage'), cs = getComputedStyle(a), W = a.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), H = a.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const w = Math.max(200, Math.min(W, H * 16 / 9));
  box.innerHTML = encaixar(slideHTML(D(), s), Math.floor(w)); direto.preparar(box);
  $('page-count').textContent = `Slide ${sel + 1} de ${D().slides.length}`;
  const av = opsDoSlide(D(), s).aviso; $('stage-aviso').hidden = !av; $('stage-aviso').textContent = av || '';
}
const nomeSlide = s => { const t = s.titulo || s.tituloA || (s.tipo === 'capa' ? 'Relatório ' + (s.numero || '') : ''); return String(t || LAYOUTS[s.tipo].nome).replace(/\*\*/g, ''); };
function itemHTML(s, i) {
  return `<div class="sitem${i === sel ? ' on' : ''}" data-i="${i}" draggable="true"><span class="n">${i + 1}</span>${encaixar(slideHTML(D(), s), 184)}<span class="tp">${esc(nomeSlide(s))}</span>
    <div class="sa"><button class="ico" data-act="s-up" title="Mover para cima" aria-label="Mover para cima">↑</button><button class="ico" data-act="s-dn" title="Mover para baixo" aria-label="Mover para baixo">↓</button><button class="ico" data-act="s-dup" title="Duplicar este slide" aria-label="Duplicar">⧉</button><button class="ico danger" data-act="s-del" title="Remover este slide" aria-label="Remover">✕</button></div></div>`;
}
function desenharLista() { $('strip-list').innerHTML = D().slides.map((s, i) => itemHTML(s, i)).join(''); }
function atualizarMiniatura() { const el = $('strip-list').children[sel]; if (el) el.outerHTML = itemHTML(S(), sel); }

/* ---- formulário ---- */
const corBt = (alvo, cor) => `<button type="button" class="cor-bt" data-act="cor-tema" data-alvo="${alvo}" title="Escolher a cor na roda de cores" aria-label="Escolher a cor na roda de cores"><i style="background:${cor}"></i></button>`;
const OPC_PERS = v => `<option value="pers"${v === 'pers' ? ' selected' : ''}>Outra cor (roda de cores)…</option>`;
const opts = o => Object.entries(o).map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join('');
const selHTML = (path, o, val) => `<select data-p="${path}" data-rr>${Object.entries(o).map(([v, n]) => `<option value="${v}"${String(val ?? '') === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
function campoHTML(path, c, val) {
  const lab = c.l ? `<span class="lb">${esc(c.l)}</span>` : '', aj = c.h ? `<span class="help">${esc(c.h)}</span>` : '';
  switch (c.t) {
    case 'text': return `<label class="f">${lab}${aj}<input type="text" data-p="${path}" value="${esc(val)}" placeholder="${esc(c.p || '')}"></label>`;
    case 'area': return `<label class="f"><span class="lbrow">${lab}${c.neg === false ? '' : `<button type="button" class="mini" data-act="negrito" title="Deixa o trecho selecionado em negrito">N</button>`}</span>${aj}<textarea data-p="${path}" rows="5">${esc(val)}</textarea></label>`;
    case 'check': return `<label class="chk"><input type="checkbox" data-p="${path}" ${val ? 'checked' : ''}> ${esc(c.l)}</label>`;
    case 'select': return `<label class="f">${lab}${aj}${selHTML(path, c.o, val)}</label>`;
    case 'image': return `<div class="f">${lab}${aj}<div class="f-img">${val ? `<img src="${val}" alt="">` : ''}<button type="button" class="mini" data-act="img" data-p="${path}">${val ? 'Trocar imagem' : 'Escolher imagem'}</button>${val ? `<button type="button" class="mini danger" data-act="img-clear" data-p="${path}">Remover</button>` : ''}</div></div>`;
    case 'lines': return `<div class="f">${lab}${aj}${(val || []).map((v, i) => `<div class="lrow"><input type="text" data-p="${path}.${i}" value="${esc(v)}" aria-label="${esc(c.item || 'Item')}"><button type="button" class="ico" data-act="line-up" data-p="${path}" data-i="${i}" title="Subir" aria-label="Subir">↑</button><button type="button" class="ico danger" data-act="line-del" data-p="${path}" data-i="${i}" title="Remover" aria-label="Remover">✕</button></div>`).join('')}${c.max && (val || []).length >= c.max ? '' : `<button type="button" class="mini" data-act="line-add" data-p="${path}">+ Adicionar ${esc(c.item || 'item')}</button>`}</div>`;
    case 'list': return `<div class="f">${lab}${aj}${(val || []).map((it, i) => `<div class="sub"><div class="sub-h"><span>${esc(c.item || 'Item')} ${i + 1}</span><span><button type="button" class="ico" data-act="list-up" data-p="${path}" data-i="${i}" aria-label="Subir">↑</button><button type="button" class="ico danger" data-act="list-del" data-p="${path}" data-i="${i}" aria-label="Remover">✕</button></span></div>${c.sub.map(sc => campoHTML(`${path}.${i}.${sc.k}`, sc, it[sc.k])).join('')}</div>`).join('')}${c.max && (val || []).length >= c.max ? '' : `<button type="button" class="mini" data-act="list-add" data-p="${path}" data-k="${c.k}">+ Adicionar ${esc(c.item || 'item')}</button>`}</div>`;
    case 'botao': return `<button type="button" class="btn-f" data-act="${c.a}">${esc(c.l)}</button>`;
  }
  return '';
}
function gridHTML(s, base) {
  const cols = s.colunas || [], rows = (s.linhas || []).map(l => { const p = l.split('|').map(x => x.trim()); while (p.length < cols.length) p.push(''); return p; });
  return `<div class="f"><span class="lb">Tabela</span><span class="help">Cada linha tem uma célula por coluna.</span><div class="grid-wrap"><table class="grid" data-grid="${base}"><thead><tr>${cols.map((c, j) => `<th><div class="gh"><input type="text" data-gc="${j}" value="${esc(c)}" aria-label="Título da coluna ${j + 1}"><button type="button" class="ico danger" data-act="col-del" data-j="${j}" title="Remover coluna" aria-label="Remover coluna">✕</button></div></th>`).join('')}<th class="act"></th></tr></thead><tbody>${rows.map((r, i) => `<tr>${cols.map((_, j) => `<td><textarea data-gr="${i}" data-gj="${j}" rows="2">${esc(r[j] || '')}</textarea></td>`).join('')}<td class="act"><button type="button" class="ico danger" data-act="row-del" data-i="${i}" title="Remover linha" aria-label="Remover linha">✕</button></td></tr>`).join('')}</tbody></table></div><div class="row"><button type="button" class="mini" data-act="row-add">+ Linha</button><button type="button" class="mini" data-act="col-add">+ Coluna</button></div></div>`;
}
/* slide livre: um cartão por bloco, como os tópicos do relatório */
let seletorBlocos = false, focoBloco = null;
const campoBloco = (b, base, d, s) => c => c.t === 'grid' ? gridHTML(b, base) : c.t === 'graf' ? DadosGrafico.html(b, base, i => temaDe(d, s).serie[i % 6]) : campoHTML(`${base}.${c.k}`, c, b[c.k]);
function blocosHTML(d, s, base) {
  const bl = s.blocos || [], n = bl.length;
  const cartao = (b, i) => { const T = BLOCOS_SL[b.tipo], bb = `${base}.blocos.${i}`; return `<div class="item bloco-sl" data-bl="${i}"><div class="item-h"><span class="ic" aria-hidden="true">${T.ic}</span><span>${esc(T.nome)}</span><span class="sp"></span>
    <button type="button" class="ico" data-act="bl-up" data-i="${i}" title="Mover para cima" aria-label="Mover bloco para cima" ${i ? '' : 'disabled'}>↑</button>
    <button type="button" class="ico" data-act="bl-dn" data-i="${i}" title="Mover para baixo" aria-label="Mover bloco para baixo" ${i < n - 1 ? '' : 'disabled'}>↓</button>
    <button type="button" class="ico" data-act="bl-dup" data-i="${i}" title="Duplicar bloco" aria-label="Duplicar bloco">⧉</button>
    <button type="button" class="ico danger" data-act="bl-del" data-i="${i}" title="Remover bloco" aria-label="Remover bloco">✕</button></div>
    ${T.campos.filter(c => !c.se || c.se(b)).map(campoBloco(b, bb, d, s)).join('')}
    ${i < n - 1 ? `<label class="chk"><input type="checkbox" data-p="${bb}.lado" ${b.lado ? 'checked' : ''} data-rr> Colocar ao lado do próximo bloco (duas colunas)</label>` : ''}</div>`; };
  const picker = `<div class="picker"><div class="picker-h"><b>O que você quer adicionar?</b><button type="button" class="mini" data-act="bl-picker-fechar">Cancelar</button></div><div class="picker-g">${ORDEM_BLOCOS.map(k => `<button type="button" class="pk" data-act="bl-add" data-tipo="${k}"><span class="ic" aria-hidden="true">${BLOCOS_SL[k].ic}</span><b>${esc(BLOCOS_SL[k].nome)}</b><small>${esc(BLOCOS_SL[k].desc)}</small></button>`).join('')}</div></div>`;
  return `<div class="blocos-t">Conteúdo do slide</div><p class="help">O slide divide o espaço entre os blocos sozinho. Clique num texto do slide para editá-lo ali mesmo.</p>
    ${n ? bl.map(cartao).join('') : '<p class="vazio-s">Este slide ainda não tem conteúdo.</p>'}
    ${seletorBlocos ? picker : '<button type="button" class="add-big" data-act="bl-picker">+ Adicionar conteúdo</button>'}`;
}
function desenharForm() {
  const d = D(), s = S(), f = $('form'); if (!s) { f.innerHTML = ''; return; }
  const L = LAYOUTS[s.tipo], base = `slides.${sel}`;
  f.innerHTML = `
  <div class="card"><div class="f-t"><b>Esta apresentação</b></div>
    <label class="f"><span class="lb">Nome</span><input type="text" data-p="titulo" value="${esc(d.titulo)}"></label>
    <div class="f"><label class="lb" for="sel-tema-deck">Cores padrão dos slides</label><div class="cor-linha"><select id="sel-tema-deck" data-p="tema" data-rr>${Object.entries(TEMAS_SL).map(([k, t]) => `<option value="${k}"${d.tema === k ? ' selected' : ''}>${esc(t.nome)}</option>`).join('')}${OPC_PERS(d.tema)}</select>${corBt('deck', temaObj(d)?.main || TEMAS_SL.verde.main)}</div></div></div>
  <div class="card"><div class="f-t"><b>Slide ${sel + 1} · ${esc(L.nome)}</b></div>
    <label class="f"><span class="lb">Tipo de slide</span><select data-tipo>${ORDEM_LAYOUTS.map(k => `<option value="${k}"${s.tipo === k ? ' selected' : ''}>${esc(LAYOUTS[k].nome)}</option>`).join('')}</select></label>
    <div class="f"><label class="lb" for="sel-tema-sl">Cores deste slide</label><div class="cor-linha"><select id="sel-tema-sl" data-p="${base}.tema" data-rr><option value="">Mesmas da apresentação</option>${Object.entries(TEMAS_SL).map(([k, t]) => `<option value="${k}"${s.tema === k ? ' selected' : ''}>${esc(t.nome)}</option>`).join('')}${OPC_PERS(s.tema)}</select>${corBt('slide', temaDe(d, s).main)}</div></div>
    ${L.campos.filter(c => !c.se || c.se(s)).map(c => c.t === 'grid' ? gridHTML(s, base) : c.t === 'graf' ? DadosGrafico.html(s, base, i => temaDe(d, s).serie[i % 6]) : campoHTML(`${base}.${c.k}`, c, s[c.k])).join('')}
    ${s.tipo === 'livre' ? blocosHTML(d, s, base) : ['capa', 'divisor'].includes(s.tipo) ? '' : `<div class="tip livre-tip"><b>Quer pôr mais coisas neste slide?</b><span>Transforme-o em <b>conteúdo livre</b>: o que já está aqui vira blocos, e você pode adicionar textos, gráficos, tabelas, indicadores e imagens.</span><button type="button" class="mini primary" data-act="para-livre">Transformar em conteúdo livre</button></div>`}
    <label class="f"><span class="lbrow"><span class="lb">Anotações do apresentador (opcional)</span></span><span class="help">Vão para as anotações do PowerPoint; não aparecem no slide.</span><textarea data-p="${base}.notas" rows="3">${esc(s.notas || '')}</textarea></label></div>`;
  if (focoBloco != null) { const i = focoBloco; focoBloco = null; requestAnimationFrame(() => { const c = f.querySelector(`[data-bl="${i}"]`); if (!c) return; c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.querySelector('input[type=text],textarea')?.focus({ preventScroll: true }); c.classList.add('flash'); setTimeout(() => c.classList.remove('flash'), 1700); }); }
}
function renderTudo() { desenharLista(); desenharPalco(); desenharForm(); }

let tRef; // redesenho do slide enquanto digita
const refresh = () => { clearTimeout(tRef); tRef = setTimeout(() => { desenharPalco(); atualizarMiniatura(); }, 140); };

/* ---- eventos do formulário ---- */
const form = $('form');
function ler(el) { return el.type === 'checkbox' ? el.checked : el.value; }
form.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.p) { setp(D(), el.dataset.p, ler(el)); if (el.dataset.p === 'titulo') tituloBarra(); save(); if (el.dataset.rr === undefined) refresh(); }
  else if (el.dataset.gc !== undefined || el.dataset.gr !== undefined) { gridLer(el.closest('table')); save(); refresh(); }
});
form.addEventListener('change', e => {
  const el = e.target;
  if (el.hasAttribute('data-tipo')) { // trocar o modelo mantém os campos que têm o mesmo nome
    if (el.value === 'livre') return converterLivre();
    snapshot(); const s = S(), novo = { ...LAYOUTS[el.value].novo() }; Object.keys(novo).forEach(k => { if (k in s && typeof s[k] === typeof novo[k] && (s[k] !== '' || typeof s[k] !== 'string')) novo[k] = s[k]; });
    const antigo = { id: s.id, tema: s.tema, notas: s.notas }; D().slides[sel] = { ...novo, ...antigo, tipo: el.value }; save(); renderTudo(); return;
  }
  if (el.dataset.p && el.dataset.rr !== undefined) { const ant = getp(D(), el.dataset.p); setp(D(), el.dataset.p, ler(el)); save(); renderTudo(); if (el.value === 'pers' && /(^|\.)tema$/.test(el.dataset.p)) abrirCorTema(el.dataset.p === 'tema' ? 'deck' : 'slide', ant); }
  else if (el.type === 'file') { /* tratado abaixo */ }
});
function gridLer(t) {
  const s = getp(D(), t.dataset.grid), cols = [...t.querySelectorAll('[data-gc]')].map(i => i.value), rows = {};
  t.querySelectorAll('[data-gr]').forEach(i => { (rows[i.dataset.gr] ||= [])[+i.dataset.gj] = i.value; });
  s.colunas = cols; s.linhas = Object.keys(rows).sort((a, b) => a - b).map(k => rows[k].map(c => String(c ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | '));
}
const arq = document.createElement('input'); arq.type = 'file'; arq.accept = 'image/*'; arq.hidden = true; document.body.append(arq);
let imgPath = null;
arq.addEventListener('change', async () => {
  const f = arq.files[0]; arq.value = ''; if (!f || !imgPath) return;
  const url = await compress(f); setp(D(), imgPath, url); save(); renderTudo();
});
function negrito(ta) {
  const a = ta.selectionStart, b = ta.selectionEnd;
  if (a === b) { toast('Primeiro selecione o trecho que deseja deixar em negrito.'); ta.focus(); return; }
  ta.setRangeText('**' + ta.value.slice(a, b) + '**', a, b, 'select'); ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ---- edição direta no slide: clicar no texto e digitar ---- */
let tMini;
const celula = (s, el) => { const p = String(getp(s, el.dataset.ed) ?? '').split('|').map(x => x.trim()); return [p, +el.dataset.cell]; };
const direto = EdicaoDireta.ligar({
  raiz: $('stage-box'), trocarAoEditar: true, ativo: () => !!S(),
  valor(el) {
    const s = S(), m = el.dataset.em;
    if (el.dataset.cell != null) { const [p, j] = celula(s, el); return p[j] || ''; }
    const v = getp(s, el.dataset.ed);
    return m === 'L' ? [...(v || [])] : String(v ?? '');
  },
  gravar(el, v) {
    const s = S(), path = el.dataset.ed;
    if (el.dataset.cell != null) {
      const [p, j] = celula(s, el), dono = getp(s, path.replace(/\.?linhas\.\d+$/, '')) || s; while (p.length < (dono.colunas || []).length) p.push('');
      p[j] = String(v).replace(/\|/g, '/'); setp(s, path, p.join(' | '));
      const i = path.split('.').pop(), base = path.replace(/\.?linhas\.\d+$/, ''), c = form.querySelector(`table.grid[data-grid="slides.${sel}${base ? '.' + base : ''}"] [data-gr="${i}"][data-gj="${j}"]`); if (c) c.value = p[j];
    } else {
      setp(s, path, v);
      const c = form.querySelector(`[data-p="slides.${sel}.${path}"]`); if (c && typeof v === 'string') c.value = v;
      const g = /^(?:(.*)\.)?colunas\.(\d+)$/.exec(path); if (g) { const h = form.querySelector(`table.grid[data-grid="slides.${sel}${g[1] ? '.' + g[1] : ''}"] [data-gc="${g[2]}"]`); if (h) h.value = v; }
    }
    save(); clearTimeout(tMini); tMini = setTimeout(atualizarMiniatura, 300);
  },
  concluir(el) {
    const s = S(); if (el.dataset.em === 'L') setp(s, el.dataset.ed, (getp(s, el.dataset.ed) || []).filter(x => x.trim()));
    desenharPalco(); atualizarMiniatura(); save();
    setTimeout(() => { if (!form.contains(document.activeElement)) desenharForm(); }, 0); // não tira o foco de quem passou a digitar no formulário
  },
  painel: { rotulo: 'Ver no formulário', dica: 'Mostra este campo no formulário à direita', abrir: el => focarCampo(el.dataset.ed) },
});
/* leva ao campo correspondente do formulário (textos montados a partir de vários campos, como "nº 02/26 | Órgão") */
function focarCampo(path) {
  if (matchMedia('(max-width:900px)').matches) { document.body.dataset.v = 'edit'; document.querySelectorAll('#mtabs button').forEach(x => x.classList.toggle('on', x.dataset.v === 'edit')); }
  const base = `slides.${sel}.`, ps = path.split('.'); let alvo = form.querySelector(`[data-p="${base}${path}"]`);
  const gm = /^(?:(.*)\.)?(dados|series)(?:\.(\d+))?$/.exec(path);
  if (!alvo && gm) { const g = form.querySelector(`[data-graf="slides.${sel}${gm[1] ? '.' + gm[1] : ''}"]`); if (g) alvo = gm[2] === 'series' ? g.querySelectorAll('[data-gds]')[+gm[3] || 0] || g.querySelector('[data-gdn]') : g.querySelector(`tbody tr:nth-child(${(+gm[3] || 0) + 1}) [data-gdv]`) || g.querySelector('[data-gdn]'); }
  for (let n = ps.length - 1; !alvo && n > 0; n--) alvo = form.querySelector(`[data-p^="${base}${ps.slice(0, n).join('.')}."]`);
  alvo ||= form.querySelector('[data-grid]');
  if (!alvo) return;
  alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }); alvo.focus({ preventScroll: true });
  const f = alvo.closest('.f, .chk, .sub') || alvo; f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash'); setTimeout(() => f.classList.remove('flash'), 1700);
}
$('stage-box').addEventListener('click', e => {
  if (e.target.closest('[data-ed]')) return;
  const f = e.target.closest('[data-edf]'); if (f) return focarCampo(f.dataset.edf);
  const im = e.target.closest('[data-img]'); if (im) { imgPath = `slides.${sel}.${im.dataset.img}`; arq.click(); }
});

/* ---- dados dos gráficos em forma de planilha (grafico-dados.js) ---- */
DadosGrafico.ligar(form, { item: p => getp(D(), p), mudou: () => { save(); refresh(); }, corPadrao: (it, i) => temaDe(D(), S()).serie[i % 6], antesDeRemover: snapshot });

/* ---- transformar um slide de modelo fixo em conteúdo livre ---- */
function converterLivre() {
  const s = S(); if (s.tipo === 'livre') return;
  snapshot(); const n = paraLivre(s);
  D().slides[sel] = { id: s.id, tipo: 'livre', tema: s.tema, cor: s.cor, notas: s.notas || '', ...n }; save(); renderTudo();
  toast('Slide transformado em conteúdo livre. Agora é só adicionar blocos.', { rotulo: 'Desfazer', fn: desfazer });
}

/* ---- roda de cores: tema da apresentação / do slide ---- */
function abrirCorTema(alvo, temaAntes) {
  const o = alvo === 'deck' ? D() : S(), antes = { tema: temaAntes !== undefined ? temaAntes : o.tema, cor: o.cor }, b = form.querySelector(`[data-act=cor-tema][data-alvo=${alvo}]`);
  const aplica = h => { o.tema = 'pers'; o.cor = h; b.firstElementChild.style.background = h; };
  RodaCores.abrir(b, o.cor || temaDe(D(), alvo === 'deck' ? {} : S()).main, {
    aoMudar(h) { aplica(h); desenharPalco(); atualizarMiniatura(); },
    aoConfirmar(h) { aplica(h); save(); renderTudo(); },
    aoCancelar() { Object.assign(o, antes); renderTudo(); },
  });
}

/* ---- ações ---- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, d = D(), s = d && S(), p = b.dataset.p, i = +b.dataset.i;
  switch (a) {
    case 'vista': document.body.dataset.v = b.dataset.v; document.querySelectorAll('#mtabs button').forEach(x => x.classList.toggle('on', x === b)); if (b.dataset.v === 'prev') desenharPalco(); return;
    case 'novo-slide': return abrirNovo();
    case 'dlg-close': return b.closest('dialog').close();
    case 'prev': return irPara(sel - 1);
    case 'next': return irPara(sel + 1);
    case 's-up': e.stopPropagation(); snapshot(); if (swap(d.slides, sel, -1)) { sel--; save(); renderTudo(); } return;
    case 's-dn': e.stopPropagation(); snapshot(); if (swap(d.slides, sel, 1)) { sel++; save(); renderTudo(); } return;
    case 's-dup': { e.stopPropagation(); snapshot(); const c = JSON.parse(JSON.stringify(s)); c.id = uid(); d.slides.splice(sel + 1, 0, c); sel++; save(); renderTudo(); return toast('Slide duplicado.'); }
    case 's-del': {
      e.stopPropagation(); if (d.slides.length === 1) return toast('A apresentação precisa ter pelo menos um slide.');
      snapshot(); d.slides.splice(sel, 1); sel = Math.min(sel, d.slides.length - 1); save(); renderTudo(); return toast('Slide removido.', { rotulo: 'Desfazer', fn: desfazer });
    }
    case 'undo': return desfazer();
    case 'cor-tema': return abrirCorTema(b.dataset.alvo);
    case 'negrito': return negrito(b.closest('label').querySelector('textarea'));
    case 'img': imgPath = p; return arq.click();
    case 'img-clear': setp(d, p, ''); save(); return renderTudo();
    case 'line-add': { getp(d, p).push(''); save(); renderTudo(); const l = form.querySelectorAll(`[data-p^="${p}."]`); l[l.length - 1]?.focus(); return; }
    case 'line-del': snapshot(); getp(d, p).splice(i, 1); save(); return renderTudo();
    case 'line-up': if (swap(getp(d, p), i, -1)) { save(); renderTudo(); } return;
    case 'list-add': { const mb = /\.blocos\.(\d+)\./.exec(p), campos = mb ? BLOCOS_SL[s.blocos[+mb[1]].tipo].campos : LAYOUTS[s.tipo].campos, c = campos.find(x => x.k === b.dataset.k); getp(d, p).push(c.novo()); save(); renderTudo(); return; }
    case 'list-del': snapshot(); getp(d, p).splice(i, 1); save(); return renderTudo();
    case 'list-up': if (swap(getp(d, p), i, -1)) { save(); renderTudo(); } return;
    case 'row-add': case 'row-del': case 'col-add': case 'col-del': {
      const tb = b.closest('.f').querySelector('table[data-grid]'), o = getp(d, tb.dataset.grid); gridLer(tb);
      if (a === 'row-add') o.linhas.push(o.colunas.map(() => '').join(' | '));
      else if (a === 'col-add') { o.colunas.push('Coluna ' + (o.colunas.length + 1)); o.linhas = o.linhas.map(l => l + ' | '); }
      else if (a === 'row-del') { snapshot(); o.linhas.splice(i, 1); }
      else { if (o.colunas.length < 2) return toast('A tabela precisa de pelo menos uma coluna.'); snapshot(); const j = +b.dataset.j; o.colunas.splice(j, 1); o.linhas = o.linhas.map(l => l.split('|').map(x => x.trim()).filter((_, k) => k !== j).join(' | ')); }
      save(); return renderTudo();
    }
    case 'para-livre': return converterLivre();
    case 'bl-picker': seletorBlocos = true; desenharForm(); form.querySelector('.picker')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return;
    case 'bl-picker-fechar': seletorBlocos = false; return desenharForm();
    case 'bl-add': { snapshot(); (s.blocos ||= []).push(novoBloco(b.dataset.tipo)); seletorBlocos = false; focoBloco = s.blocos.length - 1; save(); return renderTudo(); }
    case 'bl-up': case 'bl-dn': { snapshot(); if (swap(s.blocos, i, a === 'bl-up' ? -1 : 1)) { focoBloco = i + (a === 'bl-up' ? -1 : 1); save(); renderTudo(); } return; }
    case 'bl-dup': { snapshot(); const c = JSON.parse(JSON.stringify(s.blocos[i])); c.id = uid(); s.blocos.splice(i + 1, 0, c); focoBloco = i + 1; save(); renderTudo(); return toast('Bloco duplicado.'); }
    case 'bl-del': { snapshot(); s.blocos.splice(i, 1); save(); renderTudo(); return toast('Bloco removido.', { rotulo: 'Desfazer', fn: desfazer }); }
    case 'agenda-auto': { const t = d.slides.filter(x => x.tipo === 'divisor' && x.titulo.trim()).map(x => x.titulo.replace(/\s*\n\s*/g, ' ')); if (!t.length) return toast('Nenhum divisor de seção na apresentação ainda.'); snapshot(); s.itens = t; save(); return renderTudo(); }
    case 'trazer': document.getElementById('menu-deck').open = false; return abrirTrazer();
    case 'trazer-go': return trazerConfirmar();
    case 'deck-dup': { const c = JSON.parse(JSON.stringify(d)); c.id = uid(); c.titulo += ' (cópia)'; c.atualizado = Date.now(); c.slides.forEach(x => { x.id = uid(); }); state.decks.splice(state.decks.indexOf(d) + 1, 0, c); await persistir(); document.getElementById('menu-deck').open = false; location.href = 'apresentacao.html?id=' + c.id; return; }
    case 'exportar': { document.getElementById('menu-deck').open = false; const u = document.createElement('a'); u.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })); u.download = `apresentacao-${nomeArquivo(d.titulo)}.json`; u.click(); return toast('Cópia de segurança baixada.'); }
    case 'pptx': return baixarPPTX(b);
    case 'apresentar': return apresentar();
    case 'show-sair': return sairShow();
  }
});
const nomeArquivo = t => String(t || 'apresentacao').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'apresentacao';

async function baixarPPTX(b) {
  if (typeof PptxGenJS === 'undefined') return toast('Não foi possível carregar o gerador de PowerPoint (arquivo assets/pptxgen.bundle.js).', null, 8000);
  const ro = b.textContent; b.disabled = true;
  try {
    await (document.fonts?.ready || Promise.resolve());
    await exportarPPTX(D(), nomeArquivo(D().titulo) + '.pptx', (n, t) => { b.textContent = `Gerando ${n}/${t}…`; });
    toast('PowerPoint gerado. Para ficar idêntico à tela, instale as fontes Bebas Neue, Inter e Space Grotesk (gratuitas).', null, 9000);
  } catch (err) { console.error(err); toast('Não foi possível gerar o PowerPoint: ' + (err.message || err), null, 9000); }
  b.disabled = false; b.textContent = ro;
}

/* ---- seleção, ordenação por arrastar ---- */
function irPara(n) { if (n < 0 || n >= D().slides.length) return; if (n !== sel) seletorBlocos = false; sel = n; renderTudo(); $('strip-list').children[sel]?.scrollIntoView({ block: 'nearest' }); }
$('strip-list').addEventListener('click', e => { const it = e.target.closest('.sitem'); if (it && !e.target.closest('button')) irPara(+it.dataset.i); });
let arrastando = null;
$('strip-list').addEventListener('dragstart', e => { const it = e.target.closest('.sitem'); if (!it) return; arrastando = +it.dataset.i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(arrastando)); });
$('strip-list').addEventListener('dragover', e => { const it = e.target.closest('.sitem'); if (arrastando == null || !it) return; e.preventDefault(); $('strip-list').querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); it.classList.add('drop'); });
$('strip-list').addEventListener('drop', e => {
  const it = e.target.closest('.sitem'); if (arrastando == null || !it) return; e.preventDefault();
  const para = +it.dataset.i, de = arrastando; arrastando = null; if (de === para) return renderTudo();
  snapshot(); const [x] = D().slides.splice(de, 1); D().slides.splice(para, 0, x); sel = para; save(); renderTudo();
});
$('strip-list').addEventListener('dragend', () => { arrastando = null; $('strip-list').querySelectorAll('.drop').forEach(x => x.classList.remove('drop')); });

document.addEventListener('keydown', e => {
  const campo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (!$('show').hidden) { if (e.key === 'Escape') sairShow(); else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); passoShow(1); } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); passoShow(-1); } return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !campo) { e.preventDefault(); desfazer(); }
  else if (!campo && !document.querySelector('dialog[open]')) { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); irPara(sel + 1); } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); irPara(sel - 1); } }
});

/* ---- novo slide ---- */
function abrirNovo() {
  $('novo-grid').innerHTML = ORDEM_LAYOUTS.map(k => { const s = { id: 'x', tipo: k, tema: LAYOUTS[k].tema0 || '', ...LAYOUTS[k].novo() }; return `<button type="button" data-tipo-novo="${k}">${encaixar(slideHTML(D(), s), 176)}<b>${esc(LAYOUTS[k].nome)}</b><small>${esc(LAYOUTS[k].desc)}</small></button>`; }).join('');
  $('dlg-novo').showModal();
}
$('novo-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-tipo-novo]'); if (!b) return;
  snapshot(); const n = novoSlide(b.dataset.tipoNovo); D().slides.splice(sel + 1, 0, n); sel++; $('dlg-novo').close(); save(); renderTudo();
  if (document.body.dataset.v === 'lista') document.body.dataset.v = 'edit';
});

/* ---- criar slides a partir de relatório ---- */
function abrirTrazer() {
  const rs = state.reports;
  $('tz-lista').innerHTML = rs.length ? rs.map((r, i) => `<label class="tz-i"><input type="radio" name="tz-rel" value="${r.id}"><span><b>${esc(r.meta.sigla)} — nº ${esc(r.meta.numero)}</b><small>${esc(r.meta.setor)} · ${r.secoes.length} tópico${r.secoes.length === 1 ? '' : 's'}</small></span></label>`).join('') : '<p class="tz-vazio">Ainda não há relatórios para usar.</p>';
  $('tz-go').disabled = true; $('dlg-trazer').showModal();
}
$('tz-lista').addEventListener('change', () => { $('tz-go').disabled = !$('tz-lista').querySelector('input:checked'); });
function trazerConfirmar() {
  const id = $('tz-lista').querySelector('input:checked')?.value, r = state.reports.find(x => x.id === id); if (!r) return;
  snapshot(); const novos = $('tz-modo').value === 'resumo' ? slidesResumoDeRelatorio(r) : slidesDeRelatorio(r); D().slides.push(...novos); sel = D().slides.length - novos.length; $('dlg-trazer').close(); save(); renderTudo(); toast(`${novos.length} slides criados a partir de ${r.meta.sigla} ${r.meta.numero}.`, { rotulo: 'Desfazer', fn: desfazer });
}

/* ---- apresentar em tela cheia ---- */
let showI = 0;
function desenharShow() {
  const d = D(), s = d.slides[showI], w = Math.min(innerWidth, innerHeight * 16 / 9);
  $('show-box').innerHTML = encaixar(slideHTML(d, s), Math.floor(w)).replace('class="sl-fit"', 'class="sl-fit show"');
}
function apresentar() { showI = sel; $('show').hidden = false; desenharShow(); try { $('show').requestFullscreen?.()?.catch(() => {}); } catch {} }
function sairShow() { $('show').hidden = true; if (document.fullscreenElement) document.exitFullscreen?.(); sel = showI; renderTudo(); }
function passoShow(d) { const n = showI + d; if (n < 0) return; if (n >= D().slides.length) return sairShow(); showI = n; desenharShow(); }
$('show').addEventListener('click', e => { if (!e.target.closest('button')) passoShow(1); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !$('show').hidden) sairShow(); });
addEventListener('resize', () => { if (!$('show').hidden) desenharShow(); else if (!direto.editando()) desenharPalco(); });

const tituloBarra = () => { $('deck-nome').textContent = D().titulo; document.title = 'Editando ' + D().titulo; };
aoMudarEmOutraAba(() => { if (D()) { sel = Math.min(sel, D().slides.length - 1); renderTudo(); } });
carregar().then(function init() {
  atualId = new URLSearchParams(location.search).get('id');
  if (!D()) { document.body.innerHTML = '<main style="padding:40px"><h1>Apresentação não encontrada</h1><p><a href="index.html">Voltar para a lista</a></p></main>'; return; }
  document.body.dataset.v = 'prev'; tituloBarra(); setStatus('✓ Salvo automaticamente'); renderTudo();
  document.fonts?.ready.then(() => { renderTudo(); });
});
