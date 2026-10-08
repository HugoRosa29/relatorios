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
  const foto = src => `<svg class="full" viewBox="0 0 595 842"><defs><clipPath id="${id}"><path d="${SHAPES.photoClip}"/></clipPath></defs>${src
    ? `<image href="${src}" x="0" y="0" width="595" height="842" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
    : `<rect width="595" height="842" fill="#fff" fill-opacity=".18" clip-path="url(#${id})"/>`}</svg>`;
  const pg = geral
    ? `<section class="page t-verde capa geral">${foto(m.capaGeralFoto)}${swoosh}<img class="logo-c" src="assets/logo.png"><h1>Relatório<br>Trimestral</h1><div class="pill">nº ${esc(m.numero)} | ${esc(m.orgao)}</div></section>`
    : `<section class="page t-${m.tema || 'dourado'} capa">${swoosh}${foto(m.capa)}<img class="logo-c" src="assets/logo.png"><h1>${esc(m.setor)}</h1></section>`;
  return `<div class="rc-thumb" aria-hidden="true">${pg}</div>`;
}
function cardHTML(r) {
  const m = r.meta, nt = r.secoes.length, dt = dataTxt(r.atualizado);
  return `<article class="rcard" data-id="${r.id}" style="--tema:${COR[m.tema] || '#999'}">
    <div class="rc-main">
    <a class="rc-prev" href="editor.html?id=${r.id}" tabindex="-1" title="Abrir ${esc(m.sigla)}">${thumbHTML(r)}</a>
    <div class="rc-info">
    <div class="rc-top"><span class="rc-sigla">${esc(m.sigla)}</span><span class="rc-num">nº ${esc(m.numero)}</span></div>
    <h2 class="rc-setor">${esc(m.setor)}</h2>
    <p class="rc-meta">${nt} tópico${nt === 1 ? '' : 's'} · ${esc(TEMAS[m.tema] || '')}${dt ? ` · editado em ${dt}` : ''}</p>
    </div></div>
    <div class="rc-acts">
      <a class="btn primary" href="editor.html?id=${r.id}">Editar</a>
      <button type="button" class="mini" data-act="dup">Duplicar</button>
      <button type="button" class="mini" data-act="copia">Salvar cópia</button>
      <button type="button" class="mini danger" data-act="del">Excluir</button>
    </div></article>`;
}
function render() {
  const n = state.reports.length;
  $('home-sub').textContent = n ? `${n} relatório${n === 1 ? '' : 's'}. Clique em Editar para abrir um deles.` : '';
  $('cards').innerHTML = n ? state.reports.map(cardHTML).join('') : `<div class="vazio"><b>Nenhum relatório ainda</b>Crie o primeiro relatório do seu setor.<br><br><button type="button" class="primary" data-act="novo">+ Novo relatório</button> <button type="button" data-act="exemplo">Ver relatório de exemplo</button></div>`;
}

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

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, card = b.closest('.rcard'), r = card && state.reports.find(x => x.id === card.dataset.id);
  switch (a) {
    case 'novo': return abrirNovo();
    case 'novo-fechar': return $('dlg-novo').close();
    case 'importar': return $('file-import').click();
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
$('file-import').addEventListener('change', async e => {
  try {
    let ok = 0, ruins = [];
    for (const f of e.target.files) {
      try { const n = JSON.parse(await f.text()); if (!n.meta) throw 0; n.id = uid(); n.secoes ||= []; state.reports.push(n); ok++; }
      catch { ruins.push(f.name); }
    }
    if (ok) { await salvar(); render(); }
    toast(ok ? `${ok} relatório${ok === 1 ? ' aberto' : 's abertos'}.` + (ruins.length ? ` Não foi possível ler: ${ruins.join(', ')}` : '') : 'Esse arquivo não é uma cópia de segurança válida.', null, ruins.length ? 7000 : 0);
  } catch { toast('Esse arquivo não é uma cópia de segurança válida.'); }
  e.target.value = '';
});
// dados alterados em outra aba / ao voltar do editor
aoMudarEmOutraAba(render);
window.addEventListener('pageshow', e => { if (e.persisted) carregar().then(render); });
carregar().then(render);
