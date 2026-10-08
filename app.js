'use strict';
/* ===== Tipos de bloco ===== */

const TIPOS = {
  texto:      { ic: 'TXT', nome: 'Texto', desc: 'Um ou mais parágrafos de texto corrido', campos: [{ k: 'texto', t: 'area', l: 'Texto', h: 'Pule uma linha para começar um novo parágrafo.' }], novo: () => ({ texto: '' }) },
  destaque:   { ic: 'DST', nome: 'Caixa de destaque', desc: 'Texto em caixa bege, com um título em negrito', campos: [{ k: 'rotulo', t: 'text', l: 'Título em negrito (opcional)', p: 'Ex.: Impacto no negócio:' }, { k: 'texto', t: 'area', l: 'Texto' }], novo: () => ({ rotulo: '', texto: '' }) },
  subtitulo:  { ic: 'SUB', nome: 'Subtítulo', desc: 'Uma linha de título para separar partes', campos: [{ k: 'texto', t: 'text', l: 'Subtítulo' }], novo: () => ({ texto: '' }) },
  resultados: { ic: 'RES', nome: 'Lista de resultados', desc: 'Caixa com um título e itens, um embaixo do outro', campos: [{ k: 'titulo', t: 'text', l: 'Título da caixa', p: 'Ex.: Resultados:' }, { k: 'linhas', t: 'lines', l: 'Itens da lista', item: 'item' }], novo: () => ({ titulo: 'Resultados:', linhas: [] }) },
  lista:      { ic: 'QDR', nome: 'Quadro de itens', desc: 'Quadro dourado com uma lista, como a de POPs', campos: [{ k: 'titulo', t: 'text', l: 'Título no topo (opcional)' }, { k: 'linhas', t: 'lines', l: 'Itens do quadro', item: 'item' }], novo: () => ({ titulo: '', linhas: [] }) },
  barra:      { ic: 'BAR', nome: 'Barra de progresso', desc: 'Mostra uma porcentagem, ex.: 100% entregue', campos: [{ k: 'titulo', t: 'text', l: 'Título (opcional)' }, { k: 'percentual', t: 'number', l: 'Porcentagem concluída (0 a 100)', min: 0, max: 100 }, { k: 'legenda', t: 'text', l: 'Texto abaixo da barra', p: 'Ex.: ENTREGUES' }], novo: () => ({ titulo: '', percentual: 100, legenda: '' }) },
  kpis:       { ic: 'KPI', nome: 'Indicadores em destaque', desc: 'Cartões com números grandes, ex.: 99,83%', campos: [{ k: 'horizontal', t: 'check', l: 'Colocar os cartões lado a lado', h: 'Desligado: um cartão embaixo do outro.' }, { k: 'cards', t: 'list', l: 'Cartões', item: 'cartão', novo: () => ({ rotulo: '', valor: '', legenda: '' }), sub: [{ k: 'rotulo', t: 'text', l: 'Nome do indicador', p: 'Ex.: Chamados atendidos' }, { k: 'valor', t: 'text', l: 'Número (ex.: 99,83%)' }, { k: 'legenda', t: 'text', l: 'Observação (opcional)' }] }], novo: () => ({ horizontal: false, cards: [{ rotulo: '', valor: '', legenda: '' }] }) },
  tabela:     { ic: 'TAB', nome: 'Tabela', desc: 'Linhas e colunas, com cabeçalho colorido', campos: [{ k: 'colunas', t: 'grid' }, { k: 'simples', t: 'check', l: 'Primeira coluna sem negrito' }], novo: () => ({ colunas: ['Coluna 1', 'Coluna 2'], linhas: [' | '] }) },
  grafico:    { ic: 'GRF', nome: 'Gráfico', desc: 'Colunas, barras, barras empilhadas ou pizza, a partir dos números', campos: [{ k: 'titulo', t: 'text', l: 'Título do gráfico (opcional)' }, { k: 'modo', t: 'select', l: 'Tipo de gráfico', o: { colunas: 'Colunas', barras: 'Barras (horizontais)', empilhadas: 'Barras empilhadas', pizza: 'Pizza' } }, { k: 'series', t: 'lines', l: 'Legenda (uma linha por série, na ordem das colunas de números)', item: 'série' }, { k: 'dados', t: 'lines', l: 'Dados (formato: Nome | número | número…)', item: 'linha de dados' }, { k: 'fonte', t: 'text', l: 'Fonte / observação (opcional)' }], novo: () => ({ titulo: '', modo: 'colunas', series: ['Série 1'], dados: ['Item A | 10', 'Item B | 6'], fonte: '' }) },
  imagem:     { ic: 'IMG', nome: 'Imagem', desc: 'Uma foto ou figura, com legenda opcional', campos: [{ k: 'src', t: 'image', l: 'Imagem' }, { k: 'altura', t: 'range', l: 'Altura da imagem', min: 80, max: 600, step: 10 }, { k: 'sangria', t: 'check', l: 'Usar a largura total da página', h: 'A imagem vai de uma borda à outra, sem margens.' }, { k: 'legenda', t: 'text', l: 'Legenda (opcional)' }], novo: () => ({ src: '', altura: 320, sangria: false, legenda: '' }) },
};


/* ===== Salvar ===== */
let saveWarned = false;
function save() {
  const r = R(); if (r) r.atualizado = Date.now();
  agendarVersao();
  persistir().then(ok => {
    if (ok) return setStatus('✓ Salvo automaticamente');
    setStatus('⚠ Não foi possível salvar', true);
    if (!saveWarned) { saveWarned = true; toast('O navegador não conseguiu salvar. Use Opções › Salvar cópia de segurança para não perder o trabalho.', null, 12000); }
  });
}
const setStatus = (t, erro) => { const s = $('save-status'); s.textContent = t; s.classList.toggle('err', !!erro); };

/* ===== Utilidades ===== */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const paras = s => String(s || '').split(/\n\s*\n/).filter(x => x.trim()).map(p => `<p>${rich(p).replace(/\n/g, '<br>')}</p>`).join('');
const getp = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
function setp(o, p, v) { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }

function toast(msg, acao, ms) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.append(msg);
  if (acao) { const b = document.createElement('button'); b.textContent = acao.rotulo; b.onclick = () => { acao.fn(); t.remove(); }; t.append(b); }
  $('toasts').append(t); setTimeout(() => t.remove(), ms || (acao ? 8000 : 3500));
}

/* Desfazer: guarda um retrato do estado antes de ações que removem coisas */
const historico = [];
function snapshot() { historico.push(JSON.stringify(state)); if (historico.length > 5) historico.shift(); $('btn-undo').disabled = false; }
function desfazer() {
  const s = historico.pop(); $('btn-undo').disabled = !historico.length;
  if (!s) return toast('Não há nada para desfazer.');
  state = JSON.parse(s); save(); renderEditor(); renderPreview(); toast('Ação desfeita.');
}
const removido = msg => toast(msg, { rotulo: 'Desfazer', fn: desfazer });

/* ===== Interface do editor ===== */
const ed = $('ed-body');
const tituloBarra = () => { const m = R().meta; $('rel-nome').textContent = `${m.sigla} — nº ${m.numero}`; document.title = `Editando ${m.sigla} ${m.numero}`; };
const ABAS = [['info', 'Informações'], ['resumo', 'Resumo'], ['ativ', 'Atividades'], ['extras', 'Capa e extras']];
let aba = 'info';
let seletorAberto = null; // índice do tópico com o seletor de blocos aberto
let foco = null;          // o que destacar/focar após redesenhar o editor
const dicaFechada = () => { try { return localStorage.getItem(KEY + '-dica') === '1'; } catch { return false; } };

/* Enquadramento da foto da capa: arrastar para reposicionar + zoom */
/* posição atual já em pixels (converte o formato antigo em %) */
function normPos(box) {
  const img = box.querySelector('img'), p = posDe(box.dataset.enq), r = fotoRect(p, img.naturalWidth, img.naturalHeight);
  return { z: p.z, ox: r.x0 - (595 - r.W) / 2, oy: r.y0 - (842 - r.H) / 2 };
}
const posDe = path => getp(R(), path + 'Pos') || { ox: 0, oy: 0, z: 1 };
const enqHTML = (path, src) => `<div class="enq" data-enq="${path}"><div class="enq-box" title="Arraste a foto para reposicionar"><img src="${src}" alt="Enquadramento da foto" draggable="false" onload="layoutEnq(this.closest('.enq'))"></div>
  <div class="enq-ctl"><label>Zoom <input type="range" min="0.5" max="3" step="0.05" value="${posDe(path).z}" data-enq-z></label><button type="button" class="mini" data-act="enq-reset" data-path="${path}">Centralizar</button></div>
  <small class="help">Arraste a foto para qualquer lado. Com zoom abaixo de 1 ela fica menor que a página.</small></div>`;
function layoutEnq(box) {
  const img = box.querySelector('img'); if (!img.naturalWidth) return;
  const r = fotoRect(posDe(box.dataset.enq), img.naturalWidth, img.naturalHeight);
  Object.assign(img.style, { width: r.W / 595 * 100 + '%', height: r.H / 842 * 100 + '%', left: r.x0 / 595 * 100 + '%', top: r.y0 / 842 * 100 + '%' });
}
function gravarPos(box, p) {
  const img = box.querySelector('img');
  setp(R(), box.dataset.enq + 'Pos', { ox: p.ox, oy: p.oy, z: p.z, w: img.naturalWidth, h: img.naturalHeight });
  layoutEnq(box); save(); refresh();
}

function fieldHTML(path, f, val) {
  const a = `data-path="${path}"`;
  const help = f.h ? `<small class="help">${f.h}</small>` : '';
  const ph = f.p ? ` placeholder="${esc(f.p)}"` : '';
  switch (f.t) {
    case 'text': return `<label class="f"><span class="lb">${f.l}</span>${help}<input type="text" ${a} value="${esc(val)}"${ph}></label>`;
    case 'number': return `<label class="f"><span class="lb">${f.l}</span>${help}<input type="number" inputmode="numeric" ${a} value="${esc(val)}"${f.min != null ? ` min="${f.min}" max="${f.max}"` : ''}></label>`;
    case 'range': return `<label class="f"><span class="lb">${f.l}<output class="rv">${esc(val)}</output></span>${help}<input type="range" ${a} min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${esc(val)}"></label>`;
    case 'area': return `<div class="f"><div class="lbrow"><span class="lb">${f.l}</span><button type="button" class="mini" data-act="bold" data-path="${path}" title="Selecione um trecho do texto e clique aqui (ou Ctrl+B)"><b>N</b>&nbsp;Negrito</button></div>${help}<textarea ${a}>${esc(val)}</textarea></div>`;
    case 'lines': return `<div class="f"><span class="lb">${f.l}</span>${help}<div data-lines="${path}">${(val?.length ? val : ['']).map(lineRow).join('')}</div><button type="button" class="mini" data-act="line-add">+ Adicionar ${f.item || 'linha'}</button></div>`;
    case 'select': return `<label class="f"><span class="lb">${f.l}</span><select ${a}>${Object.entries(f.o).map(([k, v]) => `<option value="${k}" ${val === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
    case 'check': return `<label class="sw f"><input type="checkbox" ${a} ${val ? 'checked' : ''}><span class="trk" aria-hidden="true"></span><span class="sl"><b>${f.l}</b>${f.h ? `<small>${f.h}</small>` : ''}</span></label>`;
    case 'image': return `<div class="f"><span class="lb">${f.l}</span>${help}${f.enq && val ? enqHTML(path, val) : ''}<div class="img-f">${val && !f.enq ? `<img class="thumb" src="${val}" alt="Miniatura da imagem escolhida">` : ''}<label class="btn">${val ? 'Trocar imagem' : 'Escolher imagem…'}<input type="file" accept="image/*" data-img="${path}" hidden></label>${val ? `<button type="button" class="mini danger" data-act="img-clear" data-path="${path}">Remover</button>` : ''}</div></div>`;
    case 'list': return `<div class="f"><span class="lb">${f.l}</span>${(val || []).map((it, j) => `<div class="sub"><div class="sub-h"><span>${f.item[0].toUpperCase() + f.item.slice(1)} ${j + 1}</span><button type="button" class="mini danger" data-act="list-del" data-path="${path}" data-idx="${j}">Remover</button></div>${f.sub.map(s => fieldHTML(`${path}.${j}.${s.k}`, s, it[s.k])).join('')}</div>`).join('')}<button type="button" class="mini" data-act="list-add" data-path="${path}" data-tipo="${f.__tipo || ''}" data-campo="${f.k}">+ Adicionar ${f.item}</button></div>`;
  }
  return '';
}
const lineRow = v => `<div class="lrow"><input type="text" data-lp value="${esc(v)}" aria-label="Item"><button type="button" class="ico danger" data-act="line-del" title="Remover este item" aria-label="Remover este item">✕</button></div>`;

/* Tabela: o modelo continua sendo colunas[] + linhas[] ("a | b | c"), mas o usuário edita numa grade */
function gridHTML(base, it) {
  const cols = it.colunas || [];
  const rows = (it.linhas || []).map(l => { const c = l.split('|').map(s => s.trim()); while (c.length < cols.length) c.push(''); return c; });
  return `<div class="f"><span class="lb">Tabela</span><small class="help">Escreva direto nas células. A primeira linha (colorida) é o cabeçalho. Use <b>**duas estrelas**</b> em volta de uma palavra para negrito.</small>
  <div class="grid-wrap"><table class="grid" data-grid="${base}"><thead><tr>${cols.map((c, i) => `<th><div class="gh"><input type="text" data-g="h" value="${esc(c)}" placeholder="Coluna ${i + 1}" aria-label="Título da coluna ${i + 1}"><button type="button" class="ico danger" data-act="g-delcol" data-i="${i}" title="Remover esta coluna" aria-label="Remover coluna ${i + 1}">✕</button></div></th>`).join('')}<th class="act"></th></tr></thead>
  <tbody>${rows.map((r, i) => `<tr>${r.map((c, j) => `<td><textarea data-g="c" rows="2" aria-label="Linha ${i + 1}, coluna ${j + 1}">${esc(c)}</textarea></td>`).join('')}<td class="act"><button type="button" class="ico danger" data-act="g-delrow" data-i="${i}" title="Remover esta linha" aria-label="Remover linha ${i + 1}">✕</button></td></tr>`).join('')}</tbody></table></div>
  <div class="row"><button type="button" class="mini" data-act="g-addrow" data-path="${base}">+ Adicionar linha</button><button type="button" class="mini" data-act="g-addcol" data-path="${base}">+ Adicionar coluna</button></div></div>`;
}
function gridRead(t) {
  return {
    cols: [...t.querySelectorAll('[data-g=h]')].map(i => i.value),
    rows: [...t.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('[data-g=c]')].map(i => i.value.replace(/\|/g, '/'))),
  };
}
function gridWrite(base, cols, rows) { const it = getp(R(), base); it.colunas = cols; it.linhas = rows.map(r => r.join(' | ')); }

function itemHTML(si, ii, it, total) {
  const T = TIPOS[it.tipo]; const base = `secoes.${si}.itens.${ii}`;
  const campos = T.campos.map(c => ({ ...c, __tipo: it.tipo }));
  return `<div class="item"><div class="item-h"><span class="ic" aria-hidden="true">${T.ic}</span><span>${T.nome}</span><span class="sp"></span>
    <button type="button" class="ico" data-act="item-up" data-path="${base}" title="Mover para cima" aria-label="Mover bloco para cima" ${ii === 0 ? 'disabled' : ''}>↑</button>
    <button type="button" class="ico" data-act="item-down" data-path="${base}" title="Mover para baixo" aria-label="Mover bloco para baixo" ${ii === total - 1 ? 'disabled' : ''}>↓</button>
    <button type="button" class="ico danger" data-act="del" data-path="${base}" title="Remover este bloco" aria-label="Remover este bloco">✕</button></div>
    ${campos.map(c => c.t === 'grid' ? gridHTML(base, it) : fieldHTML(`${base}.${c.k}`, c, it[c.k])).join('')}
    ${ii < total - 1 ? fieldHTML(`${base}.lado`, { t: 'check', l: 'Mostrar ao lado do próximo bloco', h: 'Os dois blocos dividem a largura da página, em duas colunas.' }, it.lado) : ''}</div>`;
}
function pickerHTML(si) {
  return `<div class="picker"><div class="picker-h"><b>O que você quer adicionar?</b><button type="button" class="mini" data-act="picker-close">Cancelar</button></div><div class="picker-g">${Object.entries(TIPOS).map(([k, v]) => `<button type="button" class="pk" data-act="item-add" data-si="${si}" data-tipo="${k}"><span class="ic" aria-hidden="true">${v.ic}</span><b>${v.nome}</b><small>${v.desc}</small></button>`).join('')}</div></div>`;
}
function secaoHTML(s, si, n) {
  const nb = s.itens.length;
  if (s.capa) return `<details class="secao" ${s._aberta ? 'open' : ''} data-si="${si}">
    <summary><span class="num">${si + 1}</span><span class="tt">Capa — ${esc(s.setor)}<small class="orig">trazida de ${esc(s.origem)}</small></span><span class="cnt">capa</span>
      <span class="acts"><button type="button" class="ico" data-act="item-up" data-path="secoes.${si}" title="Mover para cima" aria-label="Mover capa para cima" ${si === 0 ? 'disabled' : ''}>↑</button><button type="button" class="ico" data-act="item-down" data-path="secoes.${si}" title="Mover para baixo" aria-label="Mover capa para baixo" ${si === n - 1 ? 'disabled' : ''}>↓</button><button type="button" class="ico danger" data-act="del" data-path="secoes.${si}" title="Remover capa" aria-label="Remover capa">✕</button></span><span class="chev" aria-hidden="true"></span></summary>
    <div class="secao-body">${fieldHTML(`secoes.${si}.setor`, { t: 'text', l: 'Nome do setor na capa' }, s.setor)}${fieldHTML(`secoes.${si}.foto`, { t: 'image', enq: 1, l: 'Foto da capa' }, s.foto)}</div></details>`;
  return `<details class="secao" ${s._aberta ? 'open' : ''} data-si="${si}">
    <summary><span class="num">${si + 1}</span><span class="tt">${esc(s.titulo || 'Tópico sem título')}${s.origem ? `<small class="orig">trazido de ${esc(s.origem)}</small>` : ''}</span><span class="cnt">${nb} bloco${nb === 1 ? '' : 's'}</span>
      <span class="acts"><button type="button" class="ico" data-act="item-up" data-path="secoes.${si}" title="Mover tópico para cima" aria-label="Mover tópico para cima" ${si === 0 ? 'disabled' : ''}>↑</button><button type="button" class="ico" data-act="item-down" data-path="secoes.${si}" title="Mover tópico para baixo" aria-label="Mover tópico para baixo" ${si === n - 1 ? 'disabled' : ''}>↓</button><button type="button" class="ico danger" data-act="del" data-path="secoes.${si}" title="Remover tópico" aria-label="Remover tópico">✕</button></span><span class="chev" aria-hidden="true"></span></summary>
    <div class="secao-body">
      ${fieldHTML(`secoes.${si}.titulo`, { t: 'text', l: 'Título do tópico', p: 'Ex.: Renegociação de dívidas 100% digital' }, s.titulo)}
      ${fieldHTML(`secoes.${si}.quebra`, { t: 'check', l: 'Começar numa nova página', h: 'Desligado: o tópico continua logo abaixo do anterior, se couber.' }, s.quebra)}
      <div class="blocos-t">Conteúdo do tópico</div>
      ${nb ? s.itens.map((it, ii) => itemHTML(si, ii, it, nb)).join('') : '<p class="vazio-s">Este tópico ainda não tem conteúdo. Adicione um texto, uma imagem, uma tabela…</p>'}
      ${seletorAberto === si ? pickerHTML(si) : `<button type="button" class="add-big" data-act="picker-open" data-si="${si}">+ Adicionar conteúdo</button>`}
    </div></details>`;
}

const PANES = {
  info(r, m) {
    return `${dicaFechada() ? '' : `<div class="tip"><span class="eyebrow">Como funciona</span><ol><li>Preencha as <b>4 etapas</b> acima, uma por vez.</li><li>O relatório aparece ao lado e se atualiza enquanto você digita.</li><li>Quando terminar, clique em <b>Baixar PDF</b>.</li></ol><button type="button" class="mini" data-act="dica-fechar">Entendi, fechar</button></div>`}
    <p class="lead">Comece pelos dados do seu setor. Tudo é salvo automaticamente neste computador.</p>
    <div class="card"><h2>Identificação</h2>
      ${fieldHTML('meta.setor', { t: 'text', l: 'Nome do setor', h: 'Aparece na página de abertura e no título do resumo.' }, m.setor)}
      <div class="row">${fieldHTML('meta.sigla', { t: 'text', l: 'Sigla (topo das páginas)' }, m.sigla)}
      ${fieldHTML('meta.numero', { t: 'text', l: 'Nº do relatório', p: 'Ex.: 02/26' }, m.numero)}</div>
      ${fieldHTML('meta.paginaInicial', { t: 'number', l: 'Número da primeira página', h: 'Use se o seu setor não começa na página 1 do relatório geral.' }, m.paginaInicial)}
    </div>
    <div class="card"><h2>Aparência</h2>
      <div class="f"><span class="lb">Cor do setor</span><div class="swatches">${Object.entries(TEMAS).map(([k, v]) => `<button type="button" class="swatch ${m.tema === k ? 'on' : ''}" data-act="tema" data-v="${k}" aria-pressed="${m.tema === k}"><i style="background:${COR[k]}"></i>${v}</button>`).join('')}</div></div>
      ${fieldHTML('meta.capa', { t: 'image', enq: 1, l: 'Foto da página de abertura', h: 'Opcional. Se não escolher, a página fica só com a cor.' }, m.capa)}
    </div>
    <div class="nav-b"><span></span><button type="button" class="primary" data-act="aba" data-v="resumo">Próximo: Resumo →</button></div>`;
  },
  resumo(r) {
    return `<p class="lead">É a página que apresenta o trimestre. Escreva em poucos parágrafos o que o seu setor entregou.</p>
    <div class="card"><h2>Resumo do trimestre</h2>
      ${fieldHTML('resumo', { t: 'area', l: 'Texto do resumo', h: 'Pule uma linha para começar um novo parágrafo. Para destacar uma palavra, selecione-a e clique em Negrito.' }, r.resumo)}
    </div>
    <div class="card"><h2>Imagem no pé da página</h2>
      ${fieldHTML('resumoImagem', { t: 'image', l: 'Imagem (opcional)', h: 'Ocupa a largura inteira, no fim da página.' }, r.resumoImagem)}
      ${r.resumoImagem ? fieldHTML('resumoAltura', { t: 'range', l: 'Altura da imagem', min: 100, max: 600, step: 10 }, r.resumoAltura) : ''}
    </div>
    <div class="nav-b"><button type="button" data-act="aba" data-v="info">← Voltar</button><button type="button" class="primary" data-act="aba" data-v="ativ">Próximo: Atividades →</button></div>`;
  },
  ativ(r) {
    const n = r.secoes.length;
    return `<p class="lead">Cada <b>tópico</b> é uma atividade ou entrega do trimestre. Dentro dele você monta o conteúdo com textos, números, tabelas e imagens.</p>
    <div class="sec-t"><h2>${n ? `${n} tópico${n === 1 ? '' : 's'}` : 'Tópicos'}</h2><span class="sec-b"><button type="button" class="mini" data-act="trazer" title="Copia tópicos de outros relatórios para este">⇩ Trazer de outro relatório</button>${n ? '<button type="button" class="mini" data-act="secao-add">+ Novo tópico</button>' : ''}</span></div>
    ${n ? r.secoes.map((s, si) => secaoHTML(s, si, n)).join('') : `<div class="vazio"><b>Nenhum tópico ainda</b>Comece criando o primeiro tópico do relatório.<br><br><button type="button" class="primary" data-act="secao-add">+ Criar primeiro tópico</button> <button type="button" data-act="trazer">⇩ Trazer de outro relatório</button></div>`}
    <div class="nav-b"><button type="button" data-act="aba" data-v="resumo">← Voltar</button><button type="button" class="primary" data-act="aba" data-v="extras">Próximo: Capa e extras →</button></div>`;
  },
  extras(r, m) {
    return `<p class="lead">Tudo aqui é opcional. Use quando este PDF for o <b>relatório completo</b>, e não só a parte do seu setor.</p>
    <div class="optbox">${fieldHTML('meta.capaGeral', { t: 'check', l: 'Capa geral do relatório', h: 'Primeira página, verde, com o título “Relatório Trimestral”.' }, m.capaGeral)}
      <div class="nested" ${m.capaGeral ? '' : 'hidden'}>${fieldHTML('meta.orgao', { t: 'text', l: 'Nome do órgão na capa', p: 'Ex.: Controladoria Interna' }, m.orgao)}${fieldHTML('meta.capaGeralFoto', { t: 'image', enq: 1, l: 'Foto da capa geral' }, m.capaGeralFoto)}</div></div>
    <div class="optbox">${fieldHTML('meta.sumario', { t: 'check', l: 'Sumário automático', h: 'Índice azul com os títulos e o número de cada página.' }, m.sumario)}
      <div class="nested" ${m.sumario ? '' : 'hidden'}>${fieldHTML('meta.sumarioModo', { t: 'select', l: 'O que o sumário lista', o: { tudo: 'Todas as atividades (e as capas dos setores)', capas: 'Somente as capas dos setores' } }, m.sumarioModo || 'tudo')}<small class="help">“Somente as capas” serve para o relatório geral: o sumário mostra cada setor trazido de outro relatório, sem detalhar as atividades.</small></div></div>
    <div class="optbox">${fieldHTML('meta.contracapa', { t: 'check', l: 'Contracapa', h: 'Última página, verde, de encerramento.' }, m.contracapa)}</div>
    <div class="nav-b"><button type="button" data-act="aba" data-v="ativ">← Voltar</button><button type="button" class="primary" data-act="pdf">Baixar PDF</button></div>`;
  },
};

function renderEditor(op = {}) {
  const r = R(); const m = r.meta; const keep = ed.scrollTop;
  tituloBarra();
  $('tabs').innerHTML = ABAS.map(([k, n], i) => `<button type="button" role="tab" class="tab ${k === aba ? 'on' : ''}" aria-selected="${k === aba}" data-act="aba" data-v="${k}"><span class="n">${i + 1}</span>${n}</button>`).join('');
  ed.innerHTML = PANES[aba](r, m);
  ed.scrollTop = op.top ? 0 : keep;
  if (foco) {
    const f = foco; foco = null;
    requestAnimationFrame(() => {
      const d = ed.querySelector(`details[data-si="${f.si}"]`); if (!d) return;
      if (f.item) {
        const its = d.querySelectorAll('.item'); const last = its[its.length - 1];
        last?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        last?.querySelector('input:not([type=file]):not([type=checkbox]):not([type=range]),textarea')?.focus({ preventScroll: true });
      } else {
        d.scrollIntoView({ block: 'start', behavior: 'smooth' });
        if (f.titulo) d.querySelector('input[type=text]')?.focus({ preventScroll: true });
      }
      if (f.flash) { d.classList.add('flash'); setTimeout(() => d.classList.remove('flash'), 1700); }
    });
  }
}

/* ===== Eventos do editor ===== */
let t0;
const refresh = () => { clearTimeout(t0); t0 = setTimeout(() => { renderPreview(); }, 250); };

ed.addEventListener('input', e => {
  const el = e.target;
  const grid = el.closest('[data-grid]');
  if (grid && el.dataset.g) { const { cols, rows } = gridRead(grid); gridWrite(grid.dataset.grid, cols, rows); save(); refresh(); return; }
  if (el.hasAttribute('data-lp')) { const c = el.closest('[data-lines]'); setp(R(), c.dataset.lines, [...c.querySelectorAll('[data-lp]')].map(i => i.value).filter(x => x.trim())); save(); refresh(); return; }
  if (!el.dataset.path) return;
  let v = el.value;
  if (el.type === 'checkbox') { v = el.checked; const nb = el.closest('.optbox')?.querySelector('.nested'); if (nb) nb.hidden = !v; }
  else if (el.type === 'number' || el.type === 'range') {
    v = parseFloat(v) || 0;
    if (el.type === 'number' && el.max !== '') v = Math.max(+el.min, Math.min(+el.max, v));
    if (el.type === 'range') el.closest('label').querySelector('.rv').textContent = v;
  }
  setp(R(), el.dataset.path, v);
  if (/^secoes\.\d+\.titulo$/.test(el.dataset.path)) el.closest('details').querySelector('.tt').textContent = v || 'Tópico sem título';
  if (/^meta\.(sigla|numero)$/.test(el.dataset.path)) { const m = R().meta; tituloBarra(); }
  save(); refresh();
});
/* Enquadramento: zoom e arraste */
ed.addEventListener('input', e => { const z = e.target.closest?.('[data-enq-z]'); if (!z) return; const box = z.closest('.enq'); gravarPos(box, { ...normPos(box), z: +z.value }); });
ed.addEventListener('pointerdown', e => {
  const bx = e.target.closest('.enq-box'); if (!bx) return;
  const box = bx.closest('.enq'), img = bx.querySelector('img'); if (!img.naturalWidth) return;
  e.preventDefault(); bx.setPointerCapture(e.pointerId);
  const p0 = normPos(box), r0 = fotoRect(p0, img.naturalWidth, img.naturalHeight);
  const k = 595 / bx.clientWidth, x0 = e.clientX, y0 = e.clientY, m = 80; // sempre sobra um pedaço da foto visível
  const lim = (v, W, tam) => Math.max(m - W - (tam - W) / 2, Math.min(tam - m - (tam - W) / 2, v));
  const mv = ev => gravarPos(box, { z: p0.z, ox: lim(p0.ox + (ev.clientX - x0) * k, r0.W, 595), oy: lim(p0.oy + (ev.clientY - y0) * k, r0.H, 842) });
  const up = () => { bx.removeEventListener('pointermove', mv); bx.removeEventListener('pointerup', up); bx.removeEventListener('pointercancel', up); };
  bx.addEventListener('pointermove', mv); bx.addEventListener('pointerup', up); bx.addEventListener('pointercancel', up);
});
ed.addEventListener('toggle', e => { const d = e.target; if (d.dataset?.si != null) R().secoes[d.dataset.si]._aberta = d.open; }, true);
ed.addEventListener('change', async e => {
  const el = e.target; if (!el.dataset.img || !el.files[0]) return;
  setp(R(), el.dataset.img, await compress(el.files[0])); setp(R(), el.dataset.img + 'Pos', undefined);
  save(); renderEditor(); renderPreview(); toast('Imagem adicionada.');
});
ed.addEventListener('keydown', e => {
  const el = e.target;
  if (el.hasAttribute('data-lp')) { // Enter = novo item; Backspace em item vazio = remove
    const row = el.closest('.lrow');
    if (e.key === 'Enter') { e.preventDefault(); row.insertAdjacentHTML('afterend', lineRow('')); row.nextElementSibling.querySelector('input').focus(); }
    else if (e.key === 'Backspace' && !el.value && row.parentElement.children.length > 1) { e.preventDefault(); const prev = row.previousElementSibling || row.nextElementSibling; row.remove(); const pi = prev.querySelector('input'); pi.focus(); pi.dispatchEvent(new Event('input', { bubbles: true })); }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && el.tagName === 'TEXTAREA') { e.preventDefault(); negrito(el); }
});
function negrito(ta) {
  const s = ta.selectionStart, f = ta.selectionEnd;
  if (s === f) { toast('Primeiro selecione o trecho que deseja deixar em negrito.'); ta.focus(); return; }
  ta.setRangeText('**' + ta.value.slice(s, f) + '**', s, f, 'select'); ta.focus();
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}
function compress(file, max = 1600) {
  return new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d'); if (!/png/.test(file.type)) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL(/png/.test(file.type) ? 'image/png' : 'image/jpeg', .82)); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
function swap(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }
function parentOf(path) { const ks = path.split('.'); const idx = +ks.pop(); return [getp(R(), ks.join('.')), idx]; }

/* Zoom da visualização */
let zoomModo = 'fit', zoomVal = 1.2, zoomAtual = 1.2;
function aplicarZoom() {
  let z = zoomVal;
  if (zoomModo === 'fit') z = Math.max(.4, Math.min(1.8, ($('preview').clientWidth - 48) / 595));
  z = Math.round(z * 100) / 100; zoomAtual = z;
  $('pages').style.setProperty('--z', z); $('zoom-lbl').textContent = Math.round(z * 100) + '%';
}
function mudarZoom(d) { zoomModo = 'num'; zoomVal = Math.max(.4, Math.min(1.8, zoomAtual + d)); aplicarZoom(); guardarZoom(); }
function guardarZoom() { try { localStorage.setItem(KEY + '-z', zoomModo === 'fit' ? 'fit' : zoomVal); } catch {} }
window.addEventListener('resize', () => { if (zoomModo === 'fit') aplicarZoom(); });

function irPara(vista) { document.body.classList.toggle('ver-previa', vista === 'prev'); document.querySelectorAll('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.v === vista)); if (vista === 'prev') aplicarZoom(); }

document.addEventListener('click', e => {
  const menu = $('menu-rel'); if (menu.open && !e.target.closest('#menu-rel')) menu.open = false;
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, p = b.dataset.path; const r = R();
  if (b.closest('summary')) e.preventDefault();
  if (b.closest('#menu-rel')) menu.open = false;
  switch (a) {
    case 'pdf': return imprimir();
    case 'pdf-go': { $('dlg-pdf').close(); if ($('pdf-naomostrar').checked) { try { localStorage.setItem(KEY + '-pdfok', '1'); } catch {} } return imprimir(true); }
    case 'dlg-close': return $('dlg-pdf').close();
    case 'juntar': desenharJuntar(); return $('dlg-juntar').showModal();
    case 'juntar-fechar': return $('dlg-juntar').close();
    case 'juntar-add': return $('file-juntar').click();
    case 'juntar-go': return juntarGerar();
    case 'jn-up': case 'jn-down': { const i = +b.dataset.i; swap(anexos, i, a === 'jn-up' ? -1 : 1); return desenharJuntar(); }
    case 'jn-del': anexos.splice(+b.dataset.i, 1); return desenharJuntar();
    case 'undo': return desfazer();
    case 'hist': return abrirHistorico();
    case 'hist-sair': return sairHistorico();
    case 'hist-salvar': return salvarVersaoNomeada();
    case 'hist-ver': return verVersao(b.dataset.id);
    case 'hist-restaurar': return restaurarVersao();
    case 'vista': return irPara(b.dataset.v);
    case 'zoom-in': return mudarZoom(.1);
    case 'zoom-out': return mudarZoom(-.1);
    case 'zoom-fit': zoomModo = 'fit'; aplicarZoom(); return guardarZoom();
    case 'trazer': return abrirTrazer();
    case 'trazer-go': return trazerConfirmar();
    case 'trazer-fechar': return $('dlg-trazer').close();
    case 'trazer-todos': { const d = b.closest('.tz-rel'); const marcar = !d.querySelector('input:not(:checked)'); d.querySelectorAll('input').forEach(i => { i.checked = !marcar; }); return trazerResumo(); }
    case 'aba': aba = b.dataset.v; save(); renderEditor({ top: true }); return;
    case 'dica-fechar': try { localStorage.setItem(KEY + '-dica', '1'); } catch {} return renderEditor();
    case 'tema': r.meta.tema = b.dataset.v; save(); renderEditor(); renderPreview(); return;
    case 'bold': return negrito(ed.querySelector(`textarea[data-path="${p}"]`));
    case 'line-add': { const c = b.previousElementSibling; c.insertAdjacentHTML('beforeend', lineRow('')); c.lastElementChild.querySelector('input').focus(); return; }
    case 'line-del': { const row = b.closest('.lrow'), c = row.parentElement; if (c.children.length > 1) { const nxt = row.nextElementSibling || row.previousElementSibling; row.remove(); nxt.querySelector('input').focus(); } else row.querySelector('input').value = ''; c.querySelector('[data-lp]').dispatchEvent(new Event('input', { bubbles: true })); return; }
    case 'g-addrow': case 'g-addcol': case 'g-delrow': case 'g-delcol': {
      const t = b.closest('[data-grid]') || ed.querySelector(`[data-grid="${p}"]`); const base = t.dataset.grid; const g = gridRead(t); const i = +b.dataset.i;
      if (a === 'g-addrow') g.rows.push(g.cols.map(() => ''));
      else if (a === 'g-addcol') { g.cols.push(''); g.rows.forEach(x => x.push('')); }
      else { snapshot(); if (a === 'g-delrow') g.rows.splice(i, 1); else if (g.cols.length > 1) { g.cols.splice(i, 1); g.rows.forEach(x => x.splice(i, 1)); } else return toast('A tabela precisa ter ao menos uma coluna.'); }
      gridWrite(base, g.cols, g.rows); save(); renderEditor(); renderPreview(); return;
    }
    case 'rel-dup': { const n = JSON.parse(JSON.stringify(r)); n.id = uid(); n.meta.numero += ' (cópia)'; state.reports.push(n); persistir().then(() => { location.href = 'editor.html?id=' + n.id; }); return; }
    case 'exportar': { const blob = new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' }); const u = document.createElement('a'); u.href = URL.createObjectURL(blob); u.download = `relatorio-${r.meta.sigla}-${r.meta.numero.replace('/', '-')}.json`; u.click(); toast('Cópia de segurança baixada.'); return; }
    case 'secao-add': { r.secoes.push({ id: uid(), titulo: '', quebra: false, itens: [], _aberta: true }); aba = 'ativ'; foco = { si: r.secoes.length - 1, titulo: true }; break; }
    case 'picker-open': seletorAberto = +b.dataset.si; r.secoes[seletorAberto]._aberta = true; renderEditor(); return;
    case 'picker-close': seletorAberto = null; renderEditor(); return;
    case 'item-add': { const si = +b.dataset.si, s = r.secoes[si], tp = b.dataset.tipo; s.itens.push({ id: uid(), tipo: tp, ...TIPOS[tp].novo() }); s._aberta = true; seletorAberto = null; foco = { si, item: true }; break; }
    case 'del': snapshot(); { const [arr, i] = parentOf(p); arr.splice(i, 1); } removido('Removido.'); break;
    case 'item-up': case 'item-down': { const [arr, i] = parentOf(p); swap(arr, i, a === 'item-up' ? -1 : 1); break; }
    case 'list-add': { const T = TIPOS[b.dataset.tipo]; getp(r, p).push(T.campos.find(c => c.k === b.dataset.campo).novo()); break; }
    case 'list-del': snapshot(); getp(r, p).splice(+b.dataset.idx, 1); removido('Cartão removido.'); break;
    case 'enq-reset': { const b = document.querySelector(`.enq[data-enq="${p}"]`); gravarPos(b, { ox: 0, oy: 0, z: 1 }); b.querySelector('[data-enq-z]').value = 1; return; }
    case 'img-clear': snapshot(); setp(r, p, ''); setp(r, p + 'Pos', undefined); removido('Imagem removida.'); break;
    default: return;
  }
  save(); renderEditor(); renderPreview();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('menu-rel').open) $('menu-rel').open = false;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !emHist && !e.shiftKey && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName) && historico.length) { e.preventDefault(); desfazer(); }
});
// Clicar na página do relatório leva ao trecho correspondente no editor
$('pages').addEventListener('click', e => {
  if (emHist) return;
  const pg = e.target.closest('.page'); if (!pg) return;
  const blk = e.target.closest('[data-si]');
  if (blk) { const si = +blk.dataset.si; aba = 'ativ'; R().secoes[si]._aberta = true; foco = { si, flash: true }; }
  else if (/\b(geral|back|sumario)\b/.test(pg.className)) aba = 'extras';
  else if (pg.classList.contains('capa')) aba = 'info';
  else if (pg.classList.contains('intro')) aba = 'resumo';
  else return;
  save(); renderEditor({ top: !blk }); irPara('edit');
});

/* ===== Renderização do relatório (595 x 842, medidas do Figma) ===== */
const pad2 = n => String(n).padStart(2, '0');
const swoosh = (d, rule = '') => `<svg class="full" viewBox="0 0 595 842"><path ${rule} d="${d}" fill="#fff" fill-opacity="0.1"/></svg>`;
const fotoSVG = (src, pos) => {
  const id = 'pc' + uid();
  return `<svg class="full" viewBox="0 0 595 842"><defs><clipPath id="${id}"><path d="${SHAPES.photoClip}"/></clipPath></defs>${src
    ? fotoImagem(src, pos, id)
    : `<rect width="595" height="842" fill="#fff" fill-opacity=".18" clip-path="url(#${id})"/>`}</svg>`;
};
const FOOT = `<svg class="full" viewBox="0 0 595 842"><path d="${SHAPES.footGrey}" fill="#959595"/><path d="${SHAPES.footGold}" style="fill:var(--main)"/></svg>`;

/* Gráficos desenhados em HTML/CSS a partir dos números (sem biblioteca) */
const CORES_GRAF = ['var(--main)', '#6685A2', '#004A80', '#38C57F', '#F1C232', '#95A8A0'];
function graficoHTML(it) {
  const series = it.series || [];
  const rows = (it.dados || []).map(l => { const p = l.split('|').map(x => x.trim()); return { n: p[0] || '', v: p.slice(1).map(x => parseFloat(String(x).replace(/\./g, '').replace(',', '.')) || 0), t: p.slice(1) }; });
  if (!rows.length) return '';
  const nomeS = i => String(series[i] || '').replace(/\s*#[0-9a-fA-F]{6}\s*$/, '');
  const cor = i => (/#[0-9a-fA-F]{6}\s*$/.exec(series[i] || '') || [])[0]?.trim() || CORES_GRAF[i % CORES_GRAF.length]; // "Nome #RRGGBB" escolhe a cor da série
  const nS = Math.max(1, ...rows.map(r => r.v.length));
  const leg = nS > 1 || series.length ? `<div class="g-leg">${(series.length ? series : rows[0].v.map((_, i) => 'Série ' + (i + 1))).map((s, i) => `<span><i style="background:${cor(i)}"></i>${esc(nomeS(i) || s)}</span>`).join('')}</div>` : '';
  const tit = it.titulo ? `<div class="g-tit">${esc(it.titulo)}</div>` : '';
  const fonte = it.fonte ? `<div class="g-fonte">${rich(it.fonte)}</div>` : '';
  let corpo = '';
  if (it.modo === 'pizza') {
    const tot = rows.reduce((a, r) => a + (r.v[0] || 0), 0) || 1; let acc = 0;
    const fat = rows.map((r, i) => { const a = acc / tot * 100; acc += r.v[0] || 0; return `${cor(i)} ${a}% ${acc / tot * 100}%`; });
    corpo = `<div class="g-pizza"><div class="pz" style="background:conic-gradient(${fat.join(',')})"></div><div class="g-leg v">${rows.map((r, i) => `<span><i style="background:${cor(i)}"></i>${esc(r.n)} — <b>${esc(r.t[0] || '')}${/%/.test(r.t[0] || '') ? '' : ' (' + Math.round((r.v[0] || 0) / tot * 100) + '%)'}</b></span>`).join('')}</div></div>`;
    return `<div class="grafico">${tit}${corpo}${fonte}</div>`;
  }
  const max = Math.max(1, ...rows.map(r => it.modo === 'empilhadas' ? r.v.reduce((a, b) => a + b, 0) : Math.max(...r.v, 0)));
  if (it.modo === 'barras' || it.modo === 'empilhadas') {
    corpo = `<div class="g-barras">${rows.map(r => `<div class="g-row"><span class="rot">${esc(r.n)}</span><span class="trilho">${r.v.map((v, i) => v ? `<span class="seg" style="width:${v / max * 100}%;background:${cor(it.modo === 'barras' ? 0 : i)}"><b>${esc(r.t[i])}</b></span>` : '').join('')}</span></div>`).join('')}</div>`;
  } else {
    corpo = `<div class="g-colunas">${rows.map(r => `<div class="grp"><div class="cols">${r.v.map((v, i) => r.t[i] === '' ? '' : `<div class="col"><b>${esc(r.t[i])}</b><span style="height:${Math.max(4, v / max * 100)}px;background:${cor(i)}"></span></div>`).join('')}</div><div class="rot">${esc(r.n)}</div></div>`).join('')}</div>`;
  }
  return `<div class="grafico">${tit}${corpo}${leg}${fonte}</div>`;
}
function blocoHTML(it) {
  switch (it.tipo) {
    case 'texto': return `<div class="t-texto">${paras(it.texto)}</div>`;
    case 'subtitulo': return `<h3 class="h2">${esc(it.texto)}</h3>`;
    case 'destaque': return `<div class="destaque">${it.rotulo ? `<b>${esc(it.rotulo)}</b> ` : ''}${rich(it.texto).replace(/\n/g, '<br>')}</div>`;
    case 'resultados': return `<div class="resultados">${it.titulo ? `<div class="h2">${esc(it.titulo)}</div>` : ''}${(it.linhas || []).map(l => `<div class="ln">${rich(l)}</div>`).join('')}</div>`;
    case 'lista': return `<div class="lista"><div class="cap">${esc(it.titulo)}</div>${(it.linhas || []).map(l => `<div class="ln">${rich(l)}</div>`).join('')}<div class="rod"></div></div>`;
    case 'tabela': return `<table class="tabela${it.simples ? ' simples' : ''}"><thead><tr>${(it.colunas || []).map(c => `<th>${rich(c)}</th>`).join('')}</tr></thead><tbody>${(it.linhas || []).map(l => `<tr>${l.split('|').map(c => `<td>${rich(c.trim()).replace(/\n/g, '<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    case 'barra': { const p = Math.max(0, Math.min(100, +it.percentual || 0)); return `<div class="barra" style="--p:${p}%">${it.titulo ? `<div class="h2 tt">${esc(it.titulo)}</div>` : ''}<div class="fill" style="width:${p}%">${p}%</div>${it.legenda ? `<div class="leg"><i></i>${esc(it.legenda)}</div>` : ''}</div>`; }
    case 'kpis': { const g = (it.cards || []).length === 1; return `<div class="kpis ${it.horizontal ? 'h' : 'v'}">${(it.cards || []).map(c => `<div class="card"><div class="l ${g ? 'g' : ''}">${esc(c.rotulo)}</div><div class="v">${esc(c.valor)}</div>${c.legenda ? `<div class="s">${esc(c.legenda)}</div>` : ''}</div>`).join('')}</div>`; }
    case 'grafico': return graficoHTML(it);
    case 'imagem': return it.src ? `<div class="imagem ${it.sangria ? 'sangra' : ''}" style="--h:${+it.altura || 200}px"><img src="${it.src}">${it.legenda ? `<div class="cap">${esc(it.legenda)}</div>` : ''}</div>` : '';
  }
  return '';
}
// agrupa blocos marcados "ao lado do próximo" em duas colunas
function blocosDe(itens) {
  const out = [];
  for (let i = 0; i < itens.length; i++) {
    const a = blocoHTML(itens[i]); if (!a) continue;
    const b = itens[i].lado && itens[i + 1] ? blocoHTML(itens[i + 1]) : '';
    if (b) { out.push(`<div class="linha">${a}${b}</div>`); i++; } else out.push(a);
  }
  return out;
}
function htmlNode(h) { const d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; }

let renderTok = 0;
async function renderPreview() {
  const tok = ++renderTok; const r = versaoVista || R(); const m = r.meta; const host = document.getElementById('pages');
  // carrega de fato as fontes usadas (senão a medição das páginas usa a fonte reserva e a paginação sai errada)
  await Promise.all(["400 20px 'Bebas Neue'", "300 10px Inter", "400 10px Inter", "600 10px Inter", "700 10px Inter", "400 22px 'Space Grotesk'"].map(f => document.fonts.load(f).catch(() => {})));
  await document.fonts.ready; if (tok !== renderTok) return;
  host.innerHTML = '';
  const tema = m.tema || 'dourado';
  const pages = []; const sumEntries = [];
  const add = (cls, inner, extra = '') => { const p = htmlNode(`<section class="page ${cls}" ${extra}>${inner}<div class="pn"></div></section>`); host.append(p); pages.push(p); return p; };
  const ctxPadrao = { tema, sigla: m.sigla, numero: m.numero };
  const internas = (extra = '', style = '', c = ctxPadrao) => add(`t-${c.tema} ${extra}`, `<img class="bgc" src="assets/bg-conteudo.png">${FOOT}<div class="hd-txt">Relatório Trimestral nº ${esc(c.numero)} ${esc(c.sigla)}</div><img class="hd-logo" src="assets/logo-escuro.png"><div class="body"></div>`, `style="${style}" data-tema="${c.tema}"`);

  // Capa geral (opcional) — verde, como a capa do relatório consolidado
  if (m.capaGeral) add('t-verde capa geral', `${fotoSVG(m.capaGeralFoto, m.capaGeralFotoPos)}${swoosh(SHAPES.swooshCover, 'fill-rule="evenodd" clip-rule="evenodd"')}<img class="logo-c" src="assets/logo.png"><h1>Relatório<br>Trimestral</h1><div class="pill">nº ${esc(m.numero)} | ${esc(m.orgao)}</div>`);
  // Relatório consolidado: a capa de abertura vem dos outros relatórios, então a do próprio setor não é gerada.
  // Abre o relatório a capa geral; sem ela, a primeira capa trazida (se for o primeiro item); senão, a do próprio setor.
  const capaTrazida = s => add(`t-${(s.ctx || ctxPadrao).tema} capa`, `${swoosh(SHAPES.swooshCover, 'fill-rule="evenodd" clip-rule="evenodd"')}${fotoSVG(s.foto, s.fotoPos)}<img class="logo-c" src="assets/logo.png"><h1>${esc(s.setor)}</h1>`, `data-si="${r.secoes.indexOf(s)}"`);
  const abertura = !m.capaGeral && r.secoes[0] && r.secoes[0].capa ? r.secoes[0] : null;
  const abrirSetor = () => {
    if (m.capaGeral || abertura) return;
    add(`t-${tema} capa`, `${swoosh(SHAPES.swooshCover, 'fill-rule="evenodd" clip-rule="evenodd"')}${fotoSVG(m.capa, m.capaPos)}<img class="logo-c" src="assets/logo.png"><h1>${esc(m.setor)}</h1>`);
  };
  if (abertura) sumEntries.push({ t: abertura.setor, p: capaTrazida(abertura), capa: true });
  else if (!m.capaGeral) abrirSetor();
  // Sumário (opcional) — preenchido depois que as páginas forem numeradas
  const sumPage = m.sumario ? add('t-azul sumario', `${swoosh(SHAPES.swoosh)}<h1>Sumário</h1><div class="sum-list"></div>`) : null;
  if (m.capaGeral) abrirSetor();
  // Resumo
  if (r.resumo || r.resumoImagem) {
    const intro = internas('intro', r.resumoImagem ? `--img-h:${+r.resumoAltura || 300}px` : '');
    const b = intro.querySelector('.body');
    b.append(htmlNode(`<h2 class="h2">${esc(m.setor)}</h2>`), htmlNode(`<div class="t-texto">${paras(r.resumo)}</div>`));
    if (r.resumoImagem) intro.insertBefore(Object.assign(document.createElement('img'), { className: 'full-img', src: r.resumoImagem }), intro.querySelector('.pn'));
    sumEntries.push({ t: 'Resumo', p: intro });
  }
  // Seções (cada título acompanha o 1º bloco para não ficar órfão)
  let pagina = null;
  const colocar = (node, forceNew, c = ctxPadrao) => {
    if (!pagina || forceNew || pagina.dataset.tema !== c.tema || pagina.dataset.sigla !== c.sigla) { pagina = internas('', '', c); pagina.dataset.sigla = c.sigla; }
    const body = pagina.querySelector('.body');
    body.append(node);
    if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {
      const tb = node.matches('table.tabela') ? node : node.querySelector('table.tabela');
      if (!(tb && tb.tBodies[0].rows.length > 1 && umaLinhaCabe(tb))) { node.remove(); pagina = internas('', '', c); pagina.dataset.sigla = c.sigla; pagina.querySelector('.body').append(node); }
    }
    partirTabela(node, c);
  };
  // Tabela maior que a página: as linhas que não cabem seguem para a página seguinte, com o cabeçalho repetido
  const estoura = () => { const b = pagina.querySelector('.body'); return b.scrollHeight > b.clientHeight + 1; };
  const umaLinhaCabe = tb => { // a tabela cabe na página atual se ficar só com a 1ª linha?
    const resto = [...tb.tBodies[0].rows].slice(1);
    resto.forEach(r => r.remove()); const cabe = !estoura(); resto.forEach(r => tb.tBodies[0].append(r)); return cabe;
  };
  const partirTabela = (node, c) => {
    let cur = node.matches('table.tabela') ? node : node.querySelector('table.tabela');
    while (cur && estoura() && cur.tBodies[0].rows.length > 1) {
      const rows = [...cur.tBodies[0].rows], mover = [];
      while (rows.length > 1 && estoura()) { const r = rows.pop(); mover.unshift(r); r.remove(); }
      const nova = cur.cloneNode(false); nova.append(cur.tHead.cloneNode(true));
      const tb = document.createElement('tbody'); tb.append(...mover); nova.append(tb);
      nova.dataset.si = node.dataset.si;
      pagina = internas('', '', c); pagina.dataset.sigla = c.sigla; pagina.querySelector('.body').append(nova); cur = nova;
    }
  };
  for (const s of r.secoes) {
    const c = s.ctx || ctxPadrao;
    if (s.capa) { // capa de outro setor trazida para dentro deste relatório (sem o sumário dele)
      pagina = null; if (s === abertura) continue; // já aberta no início do relatório
      sumEntries.push({ t: s.setor, p: capaTrazida(s), capa: true }); continue;
    }
    const blocos = blocosDe(s.itens);
    const titulo = s.titulo ? `<h2 class="h2">${esc(s.titulo)}</h2>` : '';
    const marca = (n, si) => { n.dataset.si = si; return n; };
    const si = r.secoes.indexOf(s);
    colocar(marca(htmlNode(`<div class="bloco">${titulo}${blocos.shift() || ''}</div>`), si), s.quebra || pagina === null, c);
    if (s.titulo) sumEntries.push({ t: s.titulo, p: pagina });
    for (const h of blocos) colocar(marca(htmlNode(h), si), false, c);
  }
  // Contracapa (opcional)
  if (m.contracapa) add('t-verde capa back', `${swoosh(SHAPES.swoosh)}<img class="logo-c" src="assets/logo.png"><h1>Relatório<br>Trimestral</h1><div class="pill">nº ${esc(m.numero)} | ${esc(m.orgao)}</div>`);

  // Numeração e sumário
  const ini = +m.paginaInicial || 1;
  pages.forEach((p, i) => { p.querySelector('.pn').textContent = /(^|\s)(capa|sumario)(\s|$)/.test(p.className) ? '' : ini + i; }); // capas e sumário não levam número
  const listadas = m.sumarioModo === 'capas' ? sumEntries.filter(e => e.capa) : sumEntries;
  if (sumPage) sumPage.querySelector('.sum-list').classList.toggle('compacto', listadas.length > 9);
  if (sumPage) sumPage.querySelector('.sum-list').innerHTML = listadas.map(e => `<div class="sum-row"><span class="t">${esc(e.t)}</span><span class="n">${pad2(ini + pages.indexOf(e.p))}</span></div>`).join('');
  document.title = `Relatório Trimestral ${m.numero.replace('/', '-')} ${m.sigla}`;
  $('page-count').textContent = `${pages.length} página${pages.length === 1 ? '' : 's'}`;
}

function imprimir(confirmado) {
  let visto = false; try { visto = localStorage.getItem(KEY + '-pdfok') === '1'; } catch {}
  if (!visto && !confirmado) { $('dlg-pdf').showModal(); return; }
  renderPreview().then(() => setTimeout(() => window.print(), 150));
}


/* ===== Histórico de versões ===== */
let versaoVista = null;      // relatório antigo em exibição (somente leitura)
let emHist = false, histLista = [], histSel = null;
let sujoVersao = false, ultVersao = 0, tVersao = null;
const quando = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '');
const diaDe = t => { const d = new Date(t), h = new Date(), o = new Date(Date.now() - 864e5); const mesmo = (a, b) => a.toDateString() === b.toDateString(); return mesmo(d, h) ? 'Hoje' : mesmo(d, o) ? 'Ontem' : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }); };

/* Versões automáticas: depois de 2 min sem editar, a cada 10 min de edição contínua, e ao sair da página */
function agendarVersao() {
  if (emHist) return;
  sujoVersao = true; clearTimeout(tVersao); tVersao = setTimeout(versaoAuto, 120000);
  if (Date.now() - ultVersao > 600000) versaoAuto();
}
function versaoAuto() {
  clearTimeout(tVersao); if (!sujoVersao || emHist || !R()) return Promise.resolve();
  sujoVersao = false; ultVersao = Date.now();
  return criarVersao(R(), { auto: true }).catch(() => {});
}

async function abrirHistorico() {
  await versaoAuto(); await aguardarGravacao();
  try { await criarVersao(R(), { auto: true }); histLista = await listarVersoes(atualId); }
  catch (e) { return toast('Não foi possível abrir o histórico neste navegador.'); }
  emHist = true; histSel = histLista[0]?.id; versaoVista = null;
  document.body.classList.add('em-historico'); irPara('edit'); desenharHist();
}
function desenharHist() {
  const g = []; let dia = '';
  histLista.forEach((v, i) => {
    const d = diaDe(v.t); if (d !== dia) { dia = d; g.push(`<li class="hist-dia">${esc(d)}</li>`); }
    const nome = v.rotulo ? esc(v.rotulo) : v.auto ? 'Salva automaticamente' : 'Versão';
    g.push(`<li><button type="button" class="hv ${v.id === histSel ? 'on' : ''}" data-act="hist-ver" data-id="${v.id}"><span class="hv-t">${new Date(v.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><span class="hv-n"><b class="${v.rotulo ? 'nomeada' : ''}">${nome}</b><small>${i === 0 ? 'Versão atual · ' : ''}${v.n} tópico${v.n === 1 ? '' : 's'}</small></span></button></li>`);
  });
  ed.innerHTML = `<div class="hist-h"><h2>Histórico de versões</h2><button type="button" class="mini" data-act="hist-sair">Fechar</button></div>
    <p class="lead">Escolha uma versão para ver como o relatório estava. Nada muda até você clicar em <b>Restaurar</b>, e a versão atual continua guardada no histórico.</p>
    <div class="card hist-nova"><label class="f"><span class="lb">Guardar a versão de agora com um nome</span><input type="text" id="hist-nome" placeholder="Ex.: Enviada à diretoria"></label><button type="button" class="mini primary" data-act="hist-salvar">Salvar versão agora</button></div>
    <ol class="hist-lista">${g.join('')}</ol>`;
  ed.scrollTop = 0; barraHist();
}
function barraHist() {
  const v = histLista.find(x => x.id === histSel);
  $('hist-bar').hidden = !emHist; if (!emHist || !v) return;
  const atual = histLista[0]?.id === histSel;
  $('hist-txt').textContent = atual ? 'Você está vendo a versão atual.' : `Você está vendo a versão de ${quando(v.t)}${v.rotulo ? ' — ' + v.rotulo : ''}. Ela é somente leitura.`;
  $('hist-rest').hidden = atual;
}
async function verVersao(id) {
  histSel = id; const v = histLista.find(x => x.id === id); if (!v) return;
  versaoVista = histLista[0]?.id === id ? null : await hidratar(v.dados);
  desenharHist(); renderPreview();
}
async function salvarVersaoNomeada() {
  const nome = $('hist-nome').value.trim() || 'Versão guardada';
  await criarVersao(R(), { rotulo: nome, auto: false }); histLista = await listarVersoes(atualId);
  histSel = histLista[0].id; versaoVista = null; desenharHist(); renderPreview(); toast('Versão guardada.');
}
async function restaurarVersao() {
  const v = histLista.find(x => x.id === histSel); if (!versaoVista || !v) return;
  await criarVersao(R(), { rotulo: `Antes de restaurar a versão de ${quando(v.t)}`, auto: false });
  const i = state.reports.findIndex(x => x.id === atualId);
  state.reports[i] = { ...versaoVista, id: atualId };
  sairHistorico(true); save(); renderEditor({ top: true }); renderPreview();
  toast(`Versão de ${quando(v.t)} restaurada. A anterior continua no histórico.`);
}
function sairHistorico(semRedesenhar) {
  emHist = false; versaoVista = null; document.body.classList.remove('em-historico'); $('hist-bar').hidden = true;
  if (semRedesenhar !== true) { renderEditor({ top: true }); renderPreview(); }
}

/* ===== Trazer conteúdo de outros relatórios ===== */
const rotuloRel = x => `${x.meta.sigla} — nº ${x.meta.numero}`;
function abrirTrazer() {
  const outros = state.reports.filter(x => x.id !== atualId);
  $('tz-lista').innerHTML = outros.length ? outros.map(x => `<fieldset class="tz-rel" data-rid="${x.id}">
    <legend><i style="background:${COR[x.meta.tema] || '#999'}"></i>${esc(rotuloRel(x))}<small>${esc(x.meta.setor)}</small></legend>
    <button type="button" class="mini tz-all" data-act="trazer-todos">Marcar / desmarcar tudo</button>
    <label class="tz-i"><input type="checkbox" data-capa> <span><b>Capa do setor</b><small>página de abertura com o nome, a cor e a foto (o sumário não é trazido)</small></span></label>
    ${x.resumo ? `<label class="tz-i"><input type="checkbox" data-resumo> <span><b>Resumo do trimestre</b><small>vira um tópico com o texto do resumo</small></span></label>` : ''}
    ${x.secoes.map((s, si) => `<label class="tz-i"><input type="checkbox" data-si="${si}"> <span><b>${s.capa ? 'Capa — ' + esc(s.setor) : esc(s.titulo || 'Tópico sem título')}</b><small>${s.capa ? 'capa trazida de outro relatório' : s.itens.length + ' bloco' + (s.itens.length === 1 ? '' : 's')}</small></span></label>`).join('')}
    ${!x.resumo && !x.secoes.length ? '<p class="tz-vazio">Este relatório ainda está vazio.</p>' : ''}</fieldset>`).join('')
    : '<p class="tz-vazio">Não há outros relatórios. Volte à lista e crie ou abra um relatório de outra área.</p>';
  trazerResumo(); $('dlg-trazer').showModal();
}
const trazerMarcados = () => [...$('tz-lista').querySelectorAll('input:checked')];
function trazerResumo() { const n = trazerMarcados().length; $('tz-resumo').textContent = n ? `${n} item${n === 1 ? '' : 's'} para trazer` : 'Marque o que deseja trazer.'; $('tz-go').disabled = !n; }
$('tz-lista').addEventListener('change', trazerResumo);
function trazerConfirmar() {
  const r = R(); const novos = [];
  $('tz-lista').querySelectorAll('.tz-rel').forEach(f => {
    const x = state.reports.find(q => q.id === f.dataset.rid); if (!x) return; const orig = rotuloRel(x);
    f.querySelectorAll('input:checked').forEach(c => {
      const ctx = ctxDe(x);
      if (c.hasAttribute('data-capa')) novos.push({ id: uid(), capa: true, setor: x.meta.setor, foto: x.meta.capa, origem: orig, ctx, itens: [] });
      else if (c.hasAttribute('data-resumo')) novos.push({ id: uid(), titulo: `Resumo — ${x.meta.sigla}`, quebra: true, origem: orig, ctx, itens: [{ id: uid(), tipo: 'texto', texto: x.resumo }] });
      else novos.push(clonarSecao(x.secoes[+c.dataset.si], orig, ctx));
    });
  });
  if (!novos.length) return;
  criarVersao(r, { rotulo: 'Antes de trazer conteúdo de outros relatórios', auto: false }).catch(() => {});
  snapshot(); novos.forEach(n => { n._aberta = false; r.secoes.push(n); });
  $('dlg-trazer').close(); aba = 'ativ'; save(); renderEditor({ top: true }); renderPreview();
  removido(`${novos.length} tópico${novos.length === 1 ? '' : 's'} trazido${novos.length === 1 ? '' : 's'} para este relatório.`);
}

/* ===== Juntar PDFs de outras áreas (pdf-lib, no próprio navegador) ===== */
const anexos = []; // { nome, bytes, paginas }
const tamanhoTxt = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
function desenharJuntar() {
  const total = anexos.reduce((t, a) => t + a.paginas, 0);
  $('jn-lista').innerHTML = anexos.map((a, i) => `<li><span class="jn-n">${esc(a.nome)}<small>${a.paginas} página${a.paginas > 1 ? 's' : ''} · ${tamanhoTxt(a.bytes.byteLength)}</small></span>
    <button type="button" data-act="jn-up" data-i="${i}" aria-label="Mover para cima" ${i ? '' : 'disabled'}>↑</button>
    <button type="button" data-act="jn-down" data-i="${i}" aria-label="Mover para baixo" ${i < anexos.length - 1 ? '' : 'disabled'}>↓</button>
    <button type="button" data-act="jn-del" data-i="${i}" aria-label="Remover ${esc(a.nome)}">✕</button></li>`).join('');
  $('jn-resumo').textContent = anexos.length ? `${anexos.length} arquivo${anexos.length > 1 ? 's' : ''} · ${total} páginas no PDF final` : 'Nenhum arquivo adicionado ainda.';
  $('jn-go').disabled = anexos.length < 2;
}
$('file-juntar').addEventListener('change', async e => {
  const recusados = [];
  for (const f of e.target.files) {
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false });
      anexos.push({ nome: f.name, bytes, paginas: doc.getPageCount() });
    } catch { recusados.push(f.name); }
  }
  e.target.value = ''; desenharJuntar();
  if (recusados.length) toast('Não foi possível ler (arquivo protegido ou inválido): ' + recusados.join(', '), null, 7000);
});
async function juntarGerar() {
  const btn = $('jn-go'); btn.disabled = true; btn.textContent = 'Gerando…';
  try {
    const saida = await PDFLib.PDFDocument.create();
    for (const a of anexos) {
      const doc = await PDFLib.PDFDocument.load(a.bytes);
      (await saida.copyPages(doc, doc.getPageIndices())).forEach(p => saida.addPage(p));
    }
    const r = R();
    saida.setTitle(`Relatório ${r.meta.sigla} ${r.meta.numero} (consolidado)`);
    const u = document.createElement('a');
    u.href = URL.createObjectURL(new Blob([await saida.save()], { type: 'application/pdf' }));
    u.download = `relatorio-consolidado-${r.meta.numero.replace('/', '-')}.pdf`; u.click();
    setTimeout(() => URL.revokeObjectURL(u.href), 10000);
    toast('PDF único gerado.');
  } catch { toast('Ocorreu um erro ao juntar os PDFs. Verifique se nenhum arquivo está protegido por senha.', null, 7000); }
  btn.textContent = 'Gerar PDF único'; desenharJuntar();
}

/* ===== Início ===== */
document.addEventListener('click', e => { // ao voltar para a lista, espera terminar de salvar
  const a = e.target.closest('a.back'); if (!a) return;
  e.preventDefault(); Promise.all([aguardarGravacao(), versaoAuto()]).then(() => { location.href = a.href; });
});
carregar().then(function init() {
  try { const z = parseFloat(localStorage.getItem(KEY + '-z')); if (z) { zoomModo = 'num'; zoomVal = z; } } catch {}
  atualId = new URLSearchParams(location.search).get('id');
  if (!R()) { location.replace('index.html'); return; }
  setStatus('✓ Salvo automaticamente');
  aplicarZoom(); renderEditor(); renderPreview();
  if (new URLSearchParams(location.search).get('trazer')) { aba = 'ativ'; renderEditor({ top: true }); history.replaceState(null, '', 'editor.html?id=' + atualId); abrirTrazer(); }
  aoMudarEmOutraAba(() => { if (!R()) location.href = 'index.html'; });
  ultVersao = Date.now();
  listarVersoes(atualId).then(l => { if (!l.length) criarVersao(R(), { rotulo: 'Versão inicial', auto: false }); }).catch(() => {});
  document.addEventListener('visibilitychange', () => { if (document.hidden) versaoAuto(); });
});
