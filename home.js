'use strict';
/* ===== Lista de relatórios (index.html) ===== */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataTxt = t => t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;

function toast(msg, acao, ms) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.append(msg);
  if (acao) { const b = document.createElement('button'); b.textContent = acao.rotulo; b.onclick = () => { acao.fn(); t.remove(); }; t.append(b); }
  $('toasts').append(t); setTimeout(() => t.remove(), ms || (acao ? 8000 : 3500));
}
function salvar() {
  return persistir().then(ok => { if (!ok) toast('O navegador não conseguiu salvar os dados. Use "Salvar cópia" para não perder o trabalho.', null, 10000); return ok; });
}

// miniatura da capa (mesma arte da página 595x842, reduzida por CSS)
function thumbHTML(r) {
  const m = r.meta, geral = !!m.capaGeral, id = 'th' + r.id;
  const swoosh = `<svg class="full" viewBox="0 0 595 842"><path fill-rule="evenodd" clip-rule="evenodd" d="${SHAPES.swooshCover}" fill="#fff" fill-opacity="0.1"/></svg>`;
  const foto = (src, pos) => `<svg class="full" viewBox="0 0 595 842"><defs><clipPath id="${id}"><path d="${SHAPES.photoClip}"/></clipPath></defs>${src
    ? fotoImagem(src, pos, id)
    : `<rect width="595" height="842" fill="#fff" fill-opacity=".18" clip-path="url(#${id})"/>`}</svg>`;
  const pg = geral
    ? `<section class="page t-verde capa geral">${foto(m.capaGeralFoto, m.capaGeralFotoPos)}${swoosh}<img class="logo-c" src="assets/logo.png"><h1>Relatório<br>Trimestral</h1><div class="pill">nº ${esc(m.numero)} | ${esc(m.orgao)}</div></section>`
    : `<section class="page t-${m.tema || 'dourado'} capa" style="${varsTema(m)}">${swoosh}${foto(m.capa, m.capaPos)}<img class="logo-c" src="assets/logo.png"><h1>${esc(m.setor)}</h1></section>`;
  return `<div class="rc-thumb" aria-hidden="true">${pg}</div>`;
}
function cardHTML(r) {
  const m = r.meta, nt = r.secoes.length, dt = dataTxt(r.atualizado);
  return `<article class="rcard" data-id="${r.id}" style="--tema:${corDe(m)}">
    <div class="rc-main">
    <a class="rc-prev" href="editor.html?id=${r.id}" tabindex="-1" title="Abrir ${esc(m.sigla)}">${thumbHTML(r)}</a>
    <div class="rc-info">
    <div class="rc-top"><span class="rc-sigla">${esc(m.sigla)}</span><span class="rc-num">nº ${esc(m.numero)}</span></div>
    <h2 class="rc-setor">${esc(m.setor)}</h2>
    <p class="rc-meta">${nt} tópico${nt === 1 ? '' : 's'} · ${esc(nomeTema(m))}${dt ? ` · editado em ${dt}` : ''}</p>
    </div></div>
    <div class="rc-acts">
      <a class="btn primary" href="editor.html?id=${r.id}">Editar</a>
      <button type="button" class="mini" data-act="dup">Duplicar</button>
      <button type="button" class="mini" data-act="copia">Salvar cópia</button>
      <button type="button" class="mini danger" data-act="del">Excluir</button>
    </div></article>`;
}
function render() {
  renderDecks();
  const n = state.reports.length;
  $('home-sub').textContent = n ? `${n} relatório${n === 1 ? '' : 's'}. Clique em Editar para abrir um deles.` : '';
  $('cards').innerHTML = n ? state.reports.map(cardHTML).join('') : `<div class="vazio"><b>Nenhum relatório ainda</b>Crie o primeiro relatório do seu setor.<br><br><button type="button" class="primary" data-act="novo">+ Novo relatório</button> <button type="button" data-act="exemplo">Ver relatório de exemplo</button></div>`;
}

function deckCardHTML(d) {
  const n = d.slides.length, dt = dataTxt(d.atualizado), tema = TEMAS_SL[d.tema] || TEMAS_SL.verde, k = 128 / SW;
  const prim = d.slides[0] ? `<div class="rc-thumb" style="width:${SW}px;height:${SH}px;transform:scale(${k});pointer-events:none">${slideHTML(d, d.slides[0])}</div>` : '';
  return `<article class="rcard" data-deck="${d.id}" style="--tema:${tema.main}">
    <div class="rc-main">
    <a class="rc-prev" href="apresentacao.html?id=${d.id}" tabindex="-1" style="width:128px;height:${Math.round(SH * k)}px" title="Abrir apresentação">${prim}</a>
    <div class="rc-info">
    <div class="rc-top"><span class="rc-sigla">Slides</span><span class="rc-num">${n} slide${n === 1 ? '' : 's'}</span></div>
    <h2 class="rc-setor">${esc(d.titulo)}</h2>
    <p class="rc-meta">${esc(tema.nome)}${dt ? ` · editado em ${dt}` : ''}</p>
    </div></div>
    <div class="rc-acts">
      <a class="btn primary" href="apresentacao.html?id=${d.id}">Editar</a>
      <button type="button" class="mini" data-act="dup-apr">Duplicar</button>
      <button type="button" class="mini" data-act="copia-apr">Salvar cópia</button>
      <button type="button" class="mini danger" data-act="del-apr">Excluir</button>
    </div></article>`;
}
function renderDecks() {
  const n = state.decks.length;
  $('deck-sub').textContent = n ? `${n} apresentaç${n === 1 ? 'ão' : 'ões'}. Baixe em PowerPoint dentro do editor.` : 'Crie slides no mesmo padrão visual da Terracap e baixe em PowerPoint (.pptx).';
  $('decks').innerHTML = n ? state.decks.map(deckCardHTML).join('') : `<div class="vazio"><b>Nenhuma apresentação ainda</b><button type="button" class="primary" data-act="nova-apr">+ Nova apresentação</button></div>`;
}
function abrirApr() {
  $('form-apr').reset(); $('a-rel').innerHTML = '<option value="">— nenhum —</option>' + state.reports.map(r => `<option value="${r.id}">${esc(r.meta.sigla)} — nº ${esc(r.meta.numero)}</option>`).join('');
  $('dlg-apr').showModal(); $('a-titulo').focus();
}
$('form-apr').addEventListener('submit', e => {
  e.preventDefault();
  const base = $('a-base').value, rid = $('a-rel').value, r = state.reports.find(x => x.id === rid);
  const d = base === 'exemplo' && !r ? apresentacaoExemplo() : novaApresentacao();
  d.titulo = $('a-titulo').value.trim() || d.titulo; d.atualizado = Date.now();
  if (r) { d.tema = 'verde'; d.slides = slidesDeRelatorio(r, { capa: true }); }
  state.decks.push(d);
  salvar().then(() => { location.href = 'apresentacao.html?id=' + d.id; });
});

function abrirNovo() {
  $('form-novo').reset();
  $('n-trazer-w').hidden = !state.reports.length;
  $('dlg-novo').showModal(); $('n-sigla').focus();
}
$('form-novo').addEventListener('submit', e => {
  e.preventDefault();
  const n = novoRelatorio();
  n.meta.sigla = $('n-sigla').value.trim(); n.meta.numero = $('n-numero').value.trim();
  n.meta.setor = $('n-setor').value.trim() || n.meta.sigla;
  n.atualizado = Date.now();
  state.reports.push(n);
  const destino = `editor.html?id=${n.id}${$('n-trazer').checked ? '&trazer=1' : ''}`;
  salvar().then(() => { location.href = destino; });
});

function acaoDeck(a, id) {
  const d = state.decks.find(x => x.id === id); if (!d) return;
  if (a === 'dup-apr') { const c = JSON.parse(JSON.stringify(d)); c.id = uid(); c.titulo += ' (cópia)'; c.atualizado = Date.now(); c.slides.forEach(s => { s.id = uid(); }); state.decks.splice(state.decks.indexOf(d) + 1, 0, c); salvar(); render(); return toast('Apresentação duplicada.'); }
  if (a === 'copia-apr') { const u = document.createElement('a'); u.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: 'application/json' })); u.download = 'apresentacao-' + d.titulo.replace(/[^w-]+/g, '-').slice(0, 50) + '.json'; u.click(); return toast('Cópia de segurança baixada.'); }
  if (!confirm('Excluir a apresentação "' + d.titulo + '"?')) return;
  const i = state.decks.indexOf(d); state.decks.splice(i, 1); salvar(); render();
  toast('Apresentação excluída.', { rotulo: 'Desfazer', fn: () => { state.decks.splice(i, 0, d); salvar(); render(); } }, 10000);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, card = b.closest('.rcard'), r = card && state.reports.find(x => x.id === card.dataset.id);
  switch (a) {
    case 'novo': return abrirNovo();
    case 'nova-apr': return abrirApr();
    case 'apr-fechar': return $('dlg-apr').close();
    case 'dup-apr': case 'copia-apr': case 'del-apr': return acaoDeck(a, b.closest('[data-deck]').dataset.deck);
    case 'novo-fechar': return $('dlg-novo').close();
    case 'importar': return $('file-import').click();
    case 'salvar-tudo': return salvarAmbiente();
    case 'exemplo': { const n = exemplo(); state.reports.push(n); salvar(); render(); return toast('Relatório de exemplo adicionado.'); }
    case 'dup': { const c = JSON.parse(JSON.stringify(r)); c.id = uid(); c.meta.numero += ' (cópia)'; c.atualizado = Date.now(); state.reports.splice(state.reports.indexOf(r) + 1, 0, c); salvar(); render(); return toast('Relatório duplicado.'); }
    case 'copia': { const u = document.createElement('a'); u.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' })); u.download = `relatorio-${r.meta.sigla}-${r.meta.numero.replace('/', '-')}.json`; u.click(); return toast('Cópia de segurança baixada.'); }
    case 'del': {
      if (!confirm(`Excluir o relatório ${r.meta.sigla} — nº ${r.meta.numero}?`)) return;
      const i = state.reports.indexOf(r); state.reports.splice(i, 1); salvar(); render();
      return toast('Relatório excluído.', { rotulo: 'Desfazer', fn: () => { state.reports.splice(i, 0, r); salvar(); render(); } }, 10000);
    }
  }
});
/* Ambiente completo: todos os relatórios e apresentações (com imagens) em um único .json */
function salvarAmbiente() {
  const nr = state.reports.length, nd = state.decks.length;
  if (!nr && !nd) return toast('Ainda não há nada para salvar.');
  const pacote = { tipo: 'ambiente-relatorios-trimestrais', versao: 1, salvoEm: new Date().toISOString(), reports: state.reports, decks: state.decks };
  const u = document.createElement('a'); u.href = URL.createObjectURL(new Blob([JSON.stringify(pacote)], { type: 'application/json' }));
  u.download = 'ambiente-relatorios-' + new Date().toISOString().slice(0, 10) + '.json'; u.click(); setTimeout(() => URL.revokeObjectURL(u.href), 5000);
  toast(`Ambiente salvo: ${nr} relatório${nr === 1 ? '' : 's'} e ${nd} apresentaç${nd === 1 ? 'ão' : 'ões'}.`);
}
/* Restaura um ambiente: itens com o mesmo código são substituídos; os demais são acrescentados */
async function abrirAmbiente(p) {
  const rs = (p.reports || []).filter(r => r && r.id && r.meta), ds = (p.decks || []).filter(d => d && d.id && Array.isArray(d.slides));
  const ja = rs.filter(r => state.reports.some(x => x.id === r.id)).length + ds.filter(d => state.decks.some(x => x.id === d.id)).length;
  if (ja && !confirm(`${ja} item(ns) deste arquivo já existe(m) aqui e será(ão) substituído(s) pela versão do arquivo. Continuar?`)) return 0;
  const mesclar = (lista, novos) => novos.forEach(n => { const i = lista.findIndex(x => x.id === n.id); if (i >= 0) lista[i] = n; else lista.push(n); });
  rs.forEach(r => { r.secoes ||= []; }); mesclar(state.reports, rs); mesclar(state.decks, ds);
  await salvar(); render(); toast(`Ambiente restaurado: ${rs.length} relatório${rs.length === 1 ? '' : 's'} e ${ds.length} apresentaç${ds.length === 1 ? 'ão' : 'ões'}.`, null, 5000);
  return rs.length + ds.length;
}
/* Lê um arquivo de cópia de segurança: ambiente completo, apresentação ou relatório (também aceita o formato antigo {reports:[...]}) */
async function lerCopia(f) {
  let txt = await f.text(); txt = txt.replace(/^﻿/, '');
  let n; try { n = JSON.parse(txt); } catch (e) { throw new Error('o arquivo não está em formato JSON'); }
  if (n && (Array.isArray(n.reports) || Array.isArray(n.decks))) { await abrirAmbiente(n); return 'ambiente'; }
  if (n && Array.isArray(n.slides)) { n.id = uid(); n.slides.forEach(s => { s.id = uid(); }); n.titulo ||= 'Apresentação'; n.tema ||= 'verde'; state.decks.push(n); return 'apresentacao'; }
  if (n && n.meta) { n.id = uid(); n.secoes ||= []; state.reports.push(n); return 'relatorio'; }
  throw new Error('não é um relatório, uma apresentação nem um ambiente salvo por este app');
}
$('file-import').addEventListener('change', async e => {
  const feitos = [], ruins = [];
  for (const f of e.target.files) { try { feitos.push(await lerCopia(f)); } catch (err) { ruins.push(`${f.name} (${err.message})`); } }
  e.target.value = '';
  if (feitos.some(t => t !== 'ambiente')) { await salvar(); render(); }
  const n = feitos.filter(t => t !== 'ambiente').length;
  if (ruins.length) toast((n ? `${n} aberto(s). ` : '') + 'Não foi possível ler: ' + ruins.join('; '), null, 9000);
  else if (n) toast(`${n} arquivo${n === 1 ? ' aberto' : 's abertos'}.`);
});
// dados alterados em outra aba / ao voltar do editor
aoMudarEmOutraAba(render);
window.addEventListener('pageshow', e => { if (e.persisted) carregar().then(render); });
carregar().then(render);
