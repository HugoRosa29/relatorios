'use strict';
/* ===== Dados do gráfico em forma de planilha =====
   O modelo continua o mesmo: series[] ("Nome #RRGGBB") e dados[] ("Item | 10 | 20").
   Colunas/barras: uma coluna por série, com nome e cor no cabeçalho.
   Pizza/rosca: uma linha por fatia (nome, valor e cor).
   DadosGrafico.html(item, caminho, corPadrao) monta a tabela; DadosGrafico.ligar(raiz, opções) cuida dos eventos. */
const DadosGrafico = (() => {
  const SUF = /\s*#[0-9a-fA-F]{6}\s*$/;
  const corDa = v => (SUF.exec(v || '') || [])[0]?.trim() || '';
  const semCor = v => String(v || '').replace(SUF, '').trim();
  const redonda = it => it.modo === 'pizza' || it.modo === 'rosca';
  const e = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const limpa = s => String(s ?? '').replace(/\|/g, '/').replace(/[\r\n\t]+/g, ' ').trim();

  function modelo(it) {
    const linhas = (it.dados || []).map(l => { const p = String(l).split('|').map(x => x.trim()); return { n: p[0] || '', v: p.slice(1) }; });
    const nS = redonda(it) ? 1 : Math.max(1, ...linhas.map(r => r.v.length));
    return { linhas: linhas.length ? linhas : [{ n: '', v: [] }], nS };
  }
  const corBt = (cor, padrao, x, cls = 'cor-bt') => `<button type="button" class="${cls}" data-gact="cor"${cor ? ` data-cor="${cor}"` : ''} data-padrao="${padrao}" ${x} title="Escolher a cor" aria-label="Escolher a cor"><i style="background:${cor || padrao}"></i></button>`;
  const del = (oq, i, rot) => `<button type="button" class="ico danger" data-gact="${oq}" data-n="${i}" title="${rot}" aria-label="${rot}">✕</button>`;

  function html(it, path, corPadrao) {
    const { linhas, nS } = modelo(it), pie = redonda(it), series = it.series || [];
    const cab = pie
      ? `<th>Fatia</th><th class="gv">Valor</th>`
      : `<th>Item</th>${Array.from({ length: nS }, (_, j) => `<th class="gv"><div class="gs"><textarea rows="1" data-gds placeholder="Série ${j + 1}" aria-label="Nome da série ${j + 1}">${e(semCor(series[j]))}</textarea><div class="gs-b">${corBt(corDa(series[j]), corPadrao(j), `data-col="${j}"`, 'cor-barra')}${nS > 1 ? del('delcol', j, `Remover a série ${j + 1}`) : ''}</div></div></th>`).join('')}`;
    const corpo = linhas.map((r, i) => `<tr><td><div class="gh">${pie ? corBt(corDa(series[i]), corPadrao(i), `data-lin="${i}"`) : ''}<textarea rows="1" data-gdn placeholder="${pie ? 'Nome da fatia' : 'Nome do item'}" aria-label="Nome da linha ${i + 1}">${e(r.n)}</textarea></div></td>${Array.from({ length: nS }, (_, j) => `<td class="gv"><input type="text" inputmode="decimal" data-gdv value="${e(r.v[j] ?? '')}" placeholder="0" aria-label="Linha ${i + 1}, ${pie ? 'valor' : 'série ' + (j + 1)}"></td>`).join('')}<td class="act">${del('delrow', i, `Remover a linha ${i + 1}`)}</td></tr>`).join('');
    return `<div class="f gd" data-graf="${path}"><span class="lb">Dados do gráfico</span>
      <small class="help">Digite como numa planilha${pie ? ': uma linha por fatia' : ': uma linha por item e uma coluna por série'}. Enter desce para a linha de baixo; também dá para <b>colar do Excel</b>. ${pie ? 'Clique no quadradinho para mudar a cor da fatia.' : 'Clique na barra colorida embaixo do nome da série para mudar a cor.'}</small>
      <div class="grid-wrap"><table class="grid gd-t"><thead><tr>${cab}<th class="act"></th></tr></thead><tbody>${corpo}</tbody></table></div>
      <div class="row"><button type="button" class="mini" data-gact="addrow">+ ${pie ? 'Fatia' : 'Linha'}</button>${pie ? '' : '<button type="button" class="mini" data-gact="addcol">+ Série</button>'}</div></div>`;
  }

  /* tabela na tela → modelo */
  function gravar(t, it) {
    const pie = redonda(it), rows = [...t.tBodies[0].rows];
    const nomes = rows.map(tr => limpa(tr.querySelector('[data-gdn]').value));
    it.dados = rows.map((tr, i) => [nomes[i], ...[...tr.querySelectorAll('[data-gdv]')].map(x => limpa(x.value))].join(' | '));
    if (pie) it.series = rows.map((tr, i) => { const c = tr.querySelector('[data-gact=cor]').dataset.cor; return c ? `${nomes[i]} ${c}`.trim() : nomes[i]; });
    else it.series = [...t.querySelectorAll('thead th.gv')].map((th, j) => { const n = limpa(th.querySelector('[data-gds]').value), c = th.querySelector('[data-gact=cor]').dataset.cor; return c ? `${n || 'Série ' + (j + 1)} ${c}` : n; });
  }

  /* op: { item(caminho), mudou(caminho), corPadrao(item, i), antesDeRemover?() } */
  function ligar(raiz, op) {
    const ctx = el => { const box = el.closest('[data-graf]'); if (!box) return null; const path = box.dataset.graf; return { box, path, it: op.item(path), t: box.querySelector('table') }; };
    const redesenhar = (c, foco) => {
      c.box.outerHTML = html(c.it, c.path, i => op.corPadrao(c.it, i));
      const nb = raiz.querySelector(`[data-graf="${c.path}"]`);
      if (foco) { const [i, j] = foco, tr = nb.querySelector('tbody').rows[i]; const alvo = tr && (j < 0 ? tr.querySelector('[data-gdn]') : tr.querySelectorAll('[data-gdv]')[j]); alvo?.focus(); alvo?.select?.(); }
    };
    const pos = el => { const tr = el.closest('tr'), td = el.closest('td'); return [tr.sectionRowIndex, el.hasAttribute('data-gdn') ? -1 : [...tr.querySelectorAll('td.gv')].indexOf(td)]; };
    const muda = c => { gravar(c.t, c.it); op.mudou(c.path); };

    raiz.addEventListener('input', ev => { const el = ev.target; if (!el.matches?.('[data-gdn],[data-gdv],[data-gds]')) return; const c = ctx(el); if (c) muda(c); });
    raiz.addEventListener('keydown', ev => {
      const el = ev.target; if (ev.key !== 'Enter') return;
      if (el.matches?.('[data-gds]')) { ev.preventDefault(); const th = el.closest('th'), j = [...th.parentElement.querySelectorAll('th.gv')].indexOf(th), a = el.closest('table').tBodies[0].rows[0]?.querySelectorAll('[data-gdv]')[j]; a?.focus(); a?.select(); return; }
      if (!el.matches?.('[data-gdn],[data-gdv]')) return;
      ev.preventDefault(); const c = ctx(el), [i, j] = pos(el), rows = c.t.tBodies[0].rows;
      if (i < rows.length - 1) { const a = j < 0 ? rows[i + 1].querySelector('[data-gdn]') : rows[i + 1].querySelectorAll('[data-gdv]')[j]; a.focus(); a.select(); return; }
      gravar(c.t, c.it); c.it.dados.push(''); if (redonda(c.it)) c.it.series.push(''); op.mudou(c.path); redesenhar(c, [i + 1, j]);
    });
    raiz.addEventListener('paste', ev => { // bloco copiado do Excel/planilha: preenche a partir da célula atual
      const el = ev.target; if (!el.matches?.('[data-gdn],[data-gdv]')) return;
      const txt = ev.clipboardData.getData('text/plain'); if (!/[\t\n]/.test(txt.trim())) return;
      ev.preventDefault(); const c = ctx(el), [i0, j0] = pos(el); gravar(c.t, c.it);
      const pie = redonda(c.it), m = modelo(c.it), bloco = txt.replace(/\r/g, '').replace(/\n+$/, '').split('\n').map(l => l.split('\t'));
      bloco.forEach((cels, di) => {
        const r = m.linhas[i0 + di] ||= { n: '', v: [] };
        cels.forEach((v, dj) => { const col = j0 + dj; if (col < 0) r.n = limpa(v); else if (!pie || col === 0) r.v[col] = limpa(v); });
      });
      const nS = pie ? 1 : Math.max(m.nS, ...m.linhas.map(r => r.v.length));
      c.it.dados = m.linhas.map(r => [r.n, ...Array.from({ length: nS }, (_, j) => r.v[j] ?? '')].join(' | '));
      if (pie) c.it.series = m.linhas.map((r, i) => { const cor = corDa((c.it.series || [])[i]); return cor ? `${r.n} ${cor}` : r.n; });
      op.mudou(c.path); redesenhar(c, [i0, j0]);
    });
    raiz.addEventListener('click', ev => {
      const b = ev.target.closest('[data-gact]'); if (!b) return; const c = ctx(b); if (!c) return;
      const a = b.dataset.gact, n = +b.dataset.n, pie = redonda(c.it);
      gravar(c.t, c.it);
      if (a === 'addrow') { c.it.dados.push(Array.from({ length: modelo(c.it).nS + 1 }, () => '').join(' | ')); if (pie) c.it.series.push(''); op.mudou(c.path); return redesenhar(c, [c.it.dados.length - 1, -1]); }
      if (a === 'addcol') { c.it.dados = c.it.dados.map(l => l + ' | '); c.it.series.push(''); op.mudou(c.path); redesenhar(c); const hs = c.box.ownerDocument.querySelectorAll(`[data-graf="${c.path}"] [data-gds]`); hs[hs.length - 1]?.focus(); return; }
      if (a === 'delrow') { if (c.it.dados.length < 2) return; op.antesDeRemover?.(); c.it.dados.splice(n, 1); if (pie) c.it.series.splice(n, 1); op.mudou(c.path); return redesenhar(c); }
      if (a === 'delcol') { op.antesDeRemover?.(); c.it.dados = c.it.dados.map(l => { const p = l.split('|'); p.splice(n + 1, 1); return p.map(x => x.trim()).join(' | '); }); c.it.series.splice(n, 1); op.mudou(c.path); return redesenhar(c); }
      if (a === 'cor') {
        const antes = b.dataset.cor, pinta = h => { if (h) b.dataset.cor = h; else delete b.dataset.cor; b.firstElementChild.style.background = h || b.dataset.padrao; muda(c); };
        RodaCores.abrir(b, antes || b.dataset.padrao, { aoMudar: pinta, aoCancelar: () => pinta(antes) });
      }
    });
  }
  return { html, ligar };
})();
