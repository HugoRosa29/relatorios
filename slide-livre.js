'use strict';
/* ===== Slide de conteúdo livre: título + blocos, como um tópico do relatório =====
   Os blocos são empilhados (ou dois lado a lado, com "lado") e dividem a altura do slide:
   cada bloco diz a altura que gostaria (alt) e a mínima (min); se não couber, todos encolhem
   proporcionalmente e os textos diminuem a letra. Sobrando espaço, gráficos e imagens crescem. */
const MODOS_GRAF = { colunas: 'Colunas', barras: 'Barras (horizontais)', empilhadas: 'Barras empilhadas', pizza: 'Pizza', rosca: 'Rosca' };
const BLOCOS_SL = {
  texto:     { ic: 'TXT', nome: 'Texto', desc: 'Parágrafos de texto corrido', campos: [{ k: 'texto', t: 'area', l: 'Texto', h: 'Linha em branco = novo parágrafo. **negrito** com dois asteriscos.' }, { k: 'justificar', t: 'check', l: 'Justificar o texto' }], novo: () => ({ texto: '', justificar: true }) },
  subtitulo: { ic: 'SUB', nome: 'Subtítulo', desc: 'Uma linha de título para separar partes', campos: [{ k: 'texto', t: 'text', l: 'Subtítulo' }], novo: () => ({ texto: 'Subtítulo' }) },
  destaque:  { ic: 'DST', nome: 'Caixa de destaque', desc: 'Texto em caixa colorida, com título opcional', campos: [{ k: 'rotulo', t: 'text', l: 'Título da caixa (opcional)', p: 'Ex.: Impacto no negócio' }, { k: 'texto', t: 'area', l: 'Texto' }], novo: () => ({ rotulo: '', texto: '' }) },
  lista:     { ic: 'LST', nome: 'Lista', desc: 'Itens um embaixo do outro, com marcador', campos: [{ k: 'titulo', t: 'text', l: 'Título da lista (opcional)', p: 'Ex.: Resultados' }, { k: 'linhas', t: 'lines', l: 'Itens', item: 'item', h: '**negrito** com dois asteriscos.' }], novo: () => ({ titulo: '', linhas: ['Primeiro item', 'Segundo item'] }) },
  kpis:      { ic: 'KPI', nome: 'Indicadores', desc: 'Cartões com números grandes, ex.: 99,83%', campos: [{ k: 'cards', t: 'list', l: 'Cartões (até 5)', item: 'cartão', max: 5, novo: () => ({ rotulo: '', valor: '' }), sub: [{ k: 'rotulo', t: 'text', l: 'Nome do indicador' }, { k: 'valor', t: 'text', l: 'Número (ex.: 99,83%)' }] }], novo: () => ({ cards: [{ rotulo: 'Indicador', valor: '100' }, { rotulo: 'Indicador', valor: '90%' }] }) },
  tabela:    { ic: 'TAB', nome: 'Tabela', desc: 'Linhas e colunas com cabeçalho colorido', campos: [{ k: 'colunas', t: 'grid' }], novo: () => ({ colunas: ['Coluna 1', 'Coluna 2'], linhas: [' | ', ' | '] }) },
  grafico:   { ic: 'GRF', nome: 'Gráfico', desc: 'Colunas, barras, pizza ou rosca a partir dos números', campos: [{ k: 'titulo', t: 'text', l: 'Título do gráfico (opcional)' }, { k: 'modo', t: 'select', l: 'Tipo de gráfico', o: MODOS_GRAF }, { k: 'dados', t: 'graf' }, { k: 'centro', t: 'text', l: 'Texto no centro da rosca (opcional)', se: b => b.modo === 'rosca' }, { k: 'fonte', t: 'text', l: 'Fonte / observação (opcional)' }], novo: () => ({ titulo: '', modo: 'colunas', series: ['Série 1'], dados: ['Item A | 10', 'Item B | 6'], centro: '', fonte: '' }) },
  imagem:    { ic: 'IMG', nome: 'Imagem', desc: 'Foto, print de tela ou figura', campos: [{ k: 'src', t: 'image', l: 'Imagem' }, { k: 'ajuste', t: 'select', l: 'Encaixe', o: { conter: 'Mostrar inteira', preencher: 'Preencher o espaço (corta as bordas)' } }, { k: 'legenda', t: 'text', l: 'Legenda (opcional)' }], novo: () => ({ src: '', ajuste: 'conter', legenda: '' }) },
  barra:     { ic: 'BAR', nome: 'Barra de progresso', desc: 'Uma porcentagem, ex.: 85% concluído', campos: [{ k: 'titulo', t: 'text', l: 'Título (opcional)' }, { k: 'percentual', t: 'text', l: 'Porcentagem (0 a 100)' }, { k: 'legenda', t: 'text', l: 'Texto embaixo da barra (opcional)' }], novo: () => ({ titulo: '', percentual: '75', legenda: '' }) },
};
const ORDEM_BLOCOS = ['texto', 'subtitulo', 'destaque', 'lista', 'kpis', 'tabela', 'grafico', 'imagem', 'barra'];
const novoBloco = tipo => ({ id: uid(), tipo, ...BLOCOS_SL[tipo].novo() });

/* ---------- desenho de cada bloco numa caixa (x, y, w, h) ---------- */
let _avisoLivre = '';
const gapPar = lh => Math.round(lh * .45);
const altTexto = (t, w, sz) => { const lh = Math.round(sz * 1.5); return nLinhas(t, w, sz) * lh + Math.max(0, paragrafos(t, 0).length - 1) * gapPar(lh); };
function textoAjustado(t, w, h, max, min) { for (let s = max; s > min; s--) if (altTexto(t, w, s) <= h) return s; return min; }

const DESENHO = {
  texto: {
    alt: (b, w) => Math.max(60, altTexto(b.texto, w, 28)), min: 60,
    ops(b, th, x, y, w, h, p) {
      const sz = textoAjustado(b.texto, w, h, 30, 15), lh = Math.round(sz * 1.5);
      if (altTexto(b.texto, w, sz) > h + 4) _avisoLivre = 'Um texto não cabe no slide: reduza o texto, tire algum bloco ou divida em dois slides.';
      return [texto(b.texto, x, y, w, h, { size: sz, lh, gap: gapPar(lh), align: b.justificar ? 'justify' : 'left', ed: p + '.texto', em: 'b' })];
    },
  },
  subtitulo: {
    alt: () => 62, min: 48, max: () => 62,
    ops: (b, th, x, y, w, h, p) => [texto(maiusc(b.texto), x, y, w, h, { font: 'b', size: Math.min(46, Math.round(h * .8)), lh: Math.round(h * .95), color: th.head, valign: 'middle', ed: p + '.texto', up: 1 })],
  },
  destaque: {
    alt: (b, w) => (b.rotulo ? 54 : 0) + Math.max(45, altTexto(b.texto, w - 150, 30)) + 64, min: 110, max: (b, w) => (b.rotulo ? 54 : 0) + Math.max(45, altTexto(b.texto, w - 150, 30)) + 64,
    ops(b, th, x, y, w, h, p) {
      const ops = [rect(x, y, 22, h, th.main), rect(x + 22, y, w - 22, h, misturar(th.main, .12), { r: [0, Math.min(40, h / 2), 0, 0] })];
      const ix = x + 70, iw = w - 120; let ty = y + 26;
      if (b.rotulo) { ops.push(texto(maiusc(b.rotulo), ix, ty, iw, 46, { font: 'b', size: 36, lh: 46, color: th.head, ed: p + '.rotulo', up: 1 })); ty += 52; }
      const hh = y + h - 22 - ty, sz = textoAjustado(b.texto, iw, hh, 32, 15), lh = Math.round(sz * 1.5);
      if (altTexto(b.texto, iw, sz) > hh + 4) _avisoLivre = 'O texto de uma caixa de destaque não cabe: reduza o texto.';
      ops.push(texto(b.texto, ix, ty, iw, hh, { size: sz, lh, gap: gapPar(lh), color: DARK, valign: b.rotulo ? 'top' : 'middle', ed: p + '.texto', em: 'b' }));
      return ops;
    },
  },
  lista: {
    alt: (b, w) => (b.titulo ? 58 : 0) + (b.linhas || []).reduce((a, l) => a + nLinhas(l || ' ', w - 50, 28) * 39 + 12, 0), min: 80,
    ops(b, th, x, y, w, h, p) {
      const ops = [], ls = b.linhas || []; let ty = y;
      if (b.titulo) { ops.push(texto(maiusc(b.titulo), x, ty, w, 48, { font: 'b', size: 38, lh: 48, color: th.head, ed: p + '.titulo', up: 1 })); ty += 58; }
      const med = sz => ls.map(l => nLinhas(l || ' ', w - sz * 1.6, sz) * Math.round(sz * 1.4) + Math.round(sz * .45));
      let sz = 30, hs = med(sz); while (sz > 15 && hs.reduce((a, c) => a + c, 0) > y + h - ty) hs = med(--sz);
      if (hs.reduce((a, c) => a + c, 0) > y + h - ty + 4) _avisoLivre = 'A lista não cabe no slide: tire itens ou divida em dois slides.';
      const lh = Math.round(sz * 1.4), q = Math.round(sz * .42);
      ls.forEach((l, k) => {
        ops.push(rect(x + 2, ty + (lh - q) / 2, q, q, th.main, { r: 3 }));
        ops.push(texto(l, x + sz * 1.6, ty, w - sz * 1.6, hs[k], { size: sz, lh, color: DARK, ed: `${p}.linhas.${k}`, em: 'r' }));
        ty += hs[k];
      });
      return ops;
    },
  },
  kpis: {
    alt: () => 240, min: 150, max: () => 300,
    ops(b, th, x, y, w, h, p) {
      const ops = [], cs = (b.cards || []).slice(0, 5), n = Math.max(1, cs.length), gap = 22, cw = (w - gap * (n - 1)) / n;
      cs.forEach((c, i) => {
        const cx = x + i * (cw + gap), cor = i % 2 ? th.acc : th.main, fg = lumCor(cor) > .45 ? DARK : '#fff', hr = h * .36;
        ops.push(rect(cx, y, cw, h, cor, { r: [0, 48, 0, 0] }));
        const rt = maiusc(c.rotulo); let rs = 34; while (rs > 16 && nLinhas(rt, cw - 40, rs, 'b') * rs * 1.15 > hr) rs -= 2;
        ops.push(texto(rt, cx + 20, y + 14, cw - 40, hr, { font: 'b', size: rs, lh: Math.round(rs * 1.15), color: fg, align: 'center', valign: 'middle', ed: `${p}.cards.${i}.rotulo`, up: 1 }));
        const vt = maiusc(c.valor), vh = h - hr - 30; let vs = Math.min(130, Math.round(vh * .9)); while (vs > 28 && larg(vt, vs, 'b') > (cw - 30) * .97) vs -= 4;
        ops.push(texto(vt, cx + 10, y + 14 + hr, cw - 20, vh, { font: 'b', size: vs, lh: vs, color: fg, align: 'center', valign: 'middle', ed: `${p}.cards.${i}.valor`, up: 1 }));
      });
      return ops;
    },
  },
  tabela: {
    alt: (b, w) => tabelaMedidas(b, w, 9999).total, min: 120,
    ops(b, th, x, y, w, h, p) {
      const m = tabelaMedidas(b, w, h), ops = [], hh = 52;
      if (m.total > h + 4) _avisoLivre = 'A tabela não cabe no slide: tire linhas, outros blocos ou divida em dois slides.';
      ops.push(rect(x, y, w, hh, th.main, { r: [0, 20, 0, 0] }));
      let cx = x; m.cols.forEach((c, j) => { ops.push(texto(c, cx + 16, y, m.ws[j] - 24, hh, { size: Math.min(24, m.sz + 2), lh: 30, color: lumCor(th.main) > .45 ? DARK : '#fff', valign: 'middle', bold: true, ed: `${p}.colunas.${j}` })); cx += m.ws[j]; });
      let ry = y + hh;
      m.rows.forEach((r, i) => {
        ops.push(rect(x, ry, w, m.alturas[i], i % 2 ? misturar(th.main, .13) : '#fff'));
        let xx = x; m.cols.forEach((_, j) => { ops.push(texto(r[j] || '', xx + 16, ry, m.ws[j] - 24, m.alturas[i], { size: m.sz, lh: Math.round(m.sz * 1.4), color: DARK, valign: 'middle', ed: `${p}.linhas.${i}`, cell: j, em: 'r' })); xx += m.ws[j]; });
        ry += m.alturas[i];
      });
      ops.push(linha(x, ry, x + w, ry, misturar(th.main, .5), 2));
      return ops;
    },
  },
  grafico: { alt: () => 440, min: 240, elastico: 1, ops: (b, th, x, y, w, h, p) => graficoBox(b, th, x, y, w, h, p) },
  imagem: {
    alt: b => b.src ? 460 : 320, min: 150, elastico: 1,
    ops(b, th, x, y, w, h, p) {
      const hl = b.legenda ? 40 : 0, hi = h - hl, ops = [];
      if (b.src) ops.push(img(b.src, x, y, w, hi, { fit: b.ajuste === 'preencher' ? 'cover' : 'contain', ed: p + '.src' }));
      else ops.push(rect(x, y, w, hi, '#F1F1F1', { r: 12 }), texto('Clique para escolher uma imagem', x, y, w, hi, { size: 28, color: '#888', align: 'center', valign: 'middle', img: p + '.src' }));
      if (b.legenda) ops.push(texto(b.legenda, x, y + hi + 6, w, 34, { size: 22, lh: 30, color: CINZA, align: 'center', ed: p + '.legenda' }));
      return ops;
    },
  },
  barra: {
    alt: b => (b.titulo ? 54 : 0) + 60 + (b.legenda ? 42 : 0), min: 70, max: b => (b.titulo ? 54 : 0) + 60 + (b.legenda ? 42 : 0),
    ops(b, th, x, y, w, h, p) {
      const ops = [], pct = Math.max(0, Math.min(100, numero(b.percentual))); let ty = y;
      if (b.titulo) { ops.push(texto(maiusc(b.titulo), x, ty, w, 46, { font: 'b', size: 36, lh: 46, color: th.head, ed: p + '.titulo', up: 1 })); ty += 54; }
      const bh = 56, fw = Math.max(bh, w * pct / 100);
      ops.push(rect(x, ty, w, bh, misturar(th.main, .15), { r: [0, 28, 28, 0] }), rect(x, ty, fw, bh, th.main, { r: [0, 28, 28, 0] }));
      const dentro = fw > 150;
      ops.push(texto(`${pct}%`, dentro ? x : x + fw + 16, ty, dentro ? fw - 24 : 200, bh, { font: 'b', size: 42, lh: 50, color: dentro ? (lumCor(th.main) > .45 ? DARK : '#fff') : th.head, align: dentro ? 'right' : 'left', valign: 'middle', edf: p + '.percentual' }));
      if (b.legenda) ops.push(texto(b.legenda, x, ty + bh + 8, w, 34, { size: 24, lh: 32, color: DARK, ed: p + '.legenda' }));
      return ops;
    },
  },
};

/* tabela: larguras das colunas pelo tamanho do texto e a maior letra que cabe na altura */
function tabelaMedidas(b, w, h) {
  const cols = b.colunas || [], nC = Math.max(1, cols.length), rows = (b.linhas || []).map(l => { const c = String(l).split('|').map(x => x.trim()); while (c.length < nC) c.push(''); return c.slice(0, nC); });
  const peso = cols.map((c, j) => Math.min(8, Math.max(1.2, Math.max(String(c).length, ...rows.map(r => Math.min(80, (r[j] || '').length))) / 14 + .5)));
  const ps = peso.reduce((a, c) => a + c, 0) || 1, ws = peso.map(q => w * q / ps);
  let sz = 24, alturas = [];
  for (; sz >= 13; sz--) { alturas = rows.map(r => Math.max(sz * 1.4 + 26, Math.max(1, ...r.map((c, j) => nLinhas(c, ws[j] - 28, sz))) * sz * 1.4 + 22)); if (52 + alturas.reduce((a, c) => a + c, 0) <= h) break; }
  sz = Math.max(13, sz);
  return { cols, rows, ws, sz, alturas, total: 52 + alturas.reduce((a, c) => a + c, 0) };
}

/* gráfico dentro de uma caixa */
function graficoBox(g, th, x, y, w, h, p) {
  const ops = [], series = g.series || [];
  const rows = (g.dados || []).map((l, k) => ({ l, k })).filter(o => String(o.l).trim()).map(({ l, k }) => { const q = String(l).split('|').map(s => s.trim()); return { k, n: q[0] || '', t: q.slice(1), v: q.slice(1).map(numero) }; });
  const cor = i => (/#[0-9a-fA-F]{6}\s*$/.exec(series[i] || '') || [])[0]?.trim() || th.serie[i % th.serie.length];
  const nomeS = i => String(series[i] || '').replace(/\s*#[0-9a-fA-F]{6}\s*$/, '');
  const edD = k => `${p}.dados.${k}`;
  let top = y, bot = y + h;
  if (g.titulo) { ops.push(texto(maiusc(g.titulo), x, y, w, 44, { font: 'b', size: 34, lh: 44, color: th.head, ed: p + '.titulo', up: 1 })); top += 54; }
  if (g.fonte) { ops.push(texto(g.fonte, x, bot - 30, w, 30, { size: 20, lh: 28, color: CINZA, ed: p + '.fonte', em: 'r' })); bot -= 40; }
  if (!rows.length) { ops.push(rect(x, top, w, bot - top, '#F1F1F1', { r: 12 }), texto('Preencha os dados do gráfico no painel', x, top, w, bot - top, { size: 26, color: '#888', align: 'center', valign: 'middle', edf: edD(0) })); return ops; }
  // legenda em linhas centralizadas; devolve a altura
  const legenda = (itens, ly, simular) => {
    const fs = 24, ws = itens.map(t => 34 + larg(t, fs) + 34), linhas = [[]]; let acc = 0;
    ws.forEach((wi, i) => { if (acc + wi > w && linhas[linhas.length - 1].length) { linhas.push([]); acc = 0; } linhas[linhas.length - 1].push(i); acc += wi; });
    if (!simular) linhas.forEach((ln, r) => {
      let lx = x + (w - ln.reduce((a, i) => a + ws[i], 0) + 34) / 2;
      ln.forEach(i => { ops.push(rect(lx, ly + r * 36 + 7, 20, 20, itens.cores[i], { r: 4 }), texto(itens[i], lx + 30, ly + r * 36, ws[i] - 30, 34, { size: fs, lh: 34, color: DARK, edf: itens.edf[i] })); lx += ws[i]; });
    });
    return linhas.length * 36;
  };
  const modo = g.modo || 'colunas';
  if (modo === 'pizza' || modo === 'rosca') {
    const tot = rows.reduce((a, r) => a + (r.v[0] || 0), 0) || 1, lado = w >= 1000, fs = 26;
    const nomes = rows.map((r, i) => nomeS(i) || r.n), pcts = rows.map(r => Math.round((r.v[0] || 0) / tot * 100));
    const legW = lado ? Math.min(w * .48, Math.max(...nomes.map((n, i) => larg(`${n} — ${pcts[i]}%`, fs) * 1.08)) + 70) : w - 40, legH = rows.length * 40;
    const areaW = lado ? w - legW - 40 : w, areaH = lado ? bot - top : bot - top - legH - 20;
    const R = Math.max(40, Math.min(areaW, areaH) / 2 - 6), cx = x + areaW / 2, cy = top + (lado ? (bot - top) / 2 : R + 6);
    let ang = -Math.PI / 2;
    rows.forEach((r, i) => {
      const a1 = ang + (r.v[0] || 0) / tot * Math.PI * 2, n = Math.max(2, Math.ceil((a1 - ang) / (Math.PI / 90))), pts = [];
      if (modo === 'rosca') { const ri = R * .55; for (let k = 0; k <= n; k++) { const a = ang + (a1 - ang) * k / n; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } for (let k = n; k >= 0; k--) { const a = ang + (a1 - ang) * k / n; pts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]); } }
      else { pts.push([cx, cy]); for (let k = 0; k <= n; k++) { const a = ang + (a1 - ang) * k / n; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } }
      ops.push(poly(pts, cor(i), rows.length > 1 ? { line: { color: '#fff', w: 3 } } : {}));
      if (pcts[i] >= 7) {
        const am = (ang + a1) / 2, rl = modo === 'rosca' ? R * .78 : R * .6, ls = Math.max(18, Math.min(52, R * .2));
        ops.push(texto(/%/.test(r.t[0] || '') ? r.t[0] : pcts[i] + '%', cx + rl * Math.cos(am) - 80, cy + rl * Math.sin(am) - ls * .7, 160, ls * 1.4, { font: 'b', size: ls, lh: Math.round(ls * 1.3), color: lumCor(cor(i)) > .45 ? DARK : '#fff', align: 'center', valign: 'middle', edf: edD(r.k) }));
      }
      ang = a1;
    });
    if (modo === 'rosca' && g.centro) { const cs = Math.round(R * .42); ops.push(texto(g.centro, cx - R * .5, cy - cs * .7, R, cs * 1.4, { font: 'b', size: cs, lh: Math.round(cs * 1.2), color: DARK, align: 'center', valign: 'middle', ed: p + '.centro' })); }
    const lx = lado ? x + w - legW : x + 40, ly0 = lado ? top + (bot - top - legH) / 2 : top + 2 * R + 30;
    rows.forEach((r, i) => { const ly = ly0 + i * 40; ops.push(rect(lx, ly + 8, 22, 22, cor(i), { r: 4 }), texto(`${nomes[i]} — **${/%/.test(r.t[0] || '') ? r.t[0] : pcts[i] + '%'}**`, lx + 34, ly, legW - 40, 38, { size: fs, lh: 38, color: DARK, edf: series[i] != null ? `${p}.series.${i}` : edD(r.k) })); });
    return ops;
  }
  const nS = Math.max(1, ...rows.map(r => r.v.length)), emp = modo === 'empilhadas';
  const sNomes = Array.from({ length: emp || modo === 'colunas' ? nS : 1 }, (_, i) => nomeS(i) || `Série ${i + 1}`); sNomes.cores = sNomes.map((_, i) => cor(i)); sNomes.edf = sNomes.map((_, i) => `${p}.series.${i}`);
  const comLeg = sNomes.length > 1 || (series.length && nomeS(0)), legH = comLeg ? legenda(sNomes, 0, true) + 10 : 0;
  if (modo === 'colunas') {
    const nameH = 62, base = bot - legH - nameH, plotTop = top + 46, maxH = Math.max(20, base - plotTop), vmax = Math.max(1, ...rows.map(r => Math.max(...r.v, 0)));
    const gw = w / rows.length, cw = Math.min(90, gw / (nS + 1.2)), vs = Math.max(18, Math.min(36, cw * .55 + 8));
    ops.push(linha(x, base, x + w, base, '#9a9a9a', 2));
    rows.forEach((r, gI) => {
      const gx = x + gI * gw + (gw - nS * cw - (nS - 1) * 8) / 2;
      r.v.forEach((v, i) => { if (r.t[i] === '') return; const hh = Math.max(6, v / vmax * maxH), cx = gx + i * (cw + 8); ops.push(rect(cx, base - hh, cw, hh, cor(i), { r: [10, 10, 0, 0] }), texto(r.t[i], cx - 30, base - hh - vs * 1.25, cw + 60, vs * 1.2, { font: 'b', size: vs, lh: Math.round(vs * 1.15), color: DARK, align: 'center', valign: 'bottom', edf: edD(r.k) })); });
      const ns = Math.max(16, Math.min(26, gw / 9)); ops.push(texto(maiusc(r.n), x + gI * gw + 4, base + 10, gw - 8, nameH - 10, { font: 'b', size: ns, lh: Math.round(ns * 1.15), color: DARK, align: 'center', edf: edD(r.k) }));
    });
  } else {
    const labW = Math.min(380, w * .3), bx = x + labW + 20, bW = x + w - bx - 70, tot = rows.map(r => emp ? r.v.reduce((a, c) => a + c, 0) : Math.max(...r.v, 0)), vmax = Math.max(1, ...tot);
    const rh = (bot - top - legH) / rows.length, bh = Math.max(16, Math.min(emp ? 90 : 64, rh * .72)), fs = Math.max(16, Math.min(34, bh * .55));
    rows.forEach((r, gI) => {
      const ry = top + gI * rh + (rh - bh) / 2; ops.push(texto(maiusc(r.n), x, ry - 10, labW, bh + 20, { font: 'b', size: fs, lh: Math.round(fs * 1.1), color: DARK, align: 'right', valign: 'middle', edf: edD(r.k) }));
      let bxx = bx; const vis = r.v.map((v, i) => ({ v, i })).filter(o => o.v > 0).slice(0, emp ? 99 : 1);
      vis.forEach((o, k) => {
        const ww = Math.max(emp ? 40 : 24, o.v / vmax * bW), c = cor(emp ? o.i : 0), ult = k === vis.length - 1;
        ops.push(rect(bxx, ry, ww, bh, c, { r: [0, ult ? bh / 2.5 : 0, ult ? bh / 2.5 : 0, 0] }));
        const cabe = larg(r.t[o.i], fs, 'b') < ww - 12;
        ops.push(texto(r.t[o.i], cabe ? bxx : bxx + ww + 8, ry, cabe ? ww : 120, bh, { font: 'b', size: fs, lh: Math.round(fs * 1.2), color: cabe ? (lumCor(c) > .45 ? DARK : '#fff') : DARK, align: cabe ? 'center' : 'left', valign: 'middle', edf: edD(r.k) }));
        bxx += ww;
      });
    });
  }
  if (comLeg) legenda(sNomes, bot - legH + 10);
  return ops;
}

/* ---------- distribuição dos blocos no slide ---------- */
function livreOps(s, th) {
  _avisoLivre = '';
  const ops = fundoConteudo(th), blocos = (s.blocos || []).filter(b => DESENHO[b.tipo]), X = 150, W = 1620, GAP = 30, GX = 60, FIM = 1032;
  let yc = 110;
  if ((s.titulo || '').trim()) {
    const t = maiusc(s.titulo); let ts = 64; while (ts > 40 && nLinhas(t, 1440, ts, 'b') > 2) ts -= 2;
    const nl = Math.min(2, nLinhas(t, 1440, ts, 'b')), tlh = Math.round(ts * 1.2);
    ops.push(texto(quebrar(t, 1440, ts), X, 58, 1450, nl * tlh, { font: 'b', size: ts, lh: tlh, color: th.head, ed: 'titulo', up: 1 }));
    yc = 58 + nl * tlh + 36;
  } else ops.push(texto('', X, 58, 1450, 44, { font: 'b', size: 40, lh: 44, color: th.head, ed: 'titulo', up: 1, ph: 'Título do slide (opcional)' }));
  const idx = b => s.blocos.indexOf(b), linhas = [];
  for (let i = 0; i < blocos.length; i++) { if (blocos[i].lado && blocos[i + 1]) { linhas.push([blocos[i], blocos[i + 1]]); i++; } else linhas.push([blocos[i]]); }
  if (!linhas.length) { ops.push(rect(X, yc, W, FIM - yc, '#F6F6F2', { r: 16 }), texto('Slide vazio: use “+ Adicionar conteúdo” no painel à direita', X, yc, W, FIM - yc, { size: 30, color: '#999', align: 'center', valign: 'middle' })); return ops; }
  const largura = l => l.length === 2 ? (W - GX) / 2 : W;
  const des = linhas.map(l => Math.max(...l.map(b => DESENHO[b.tipo].alt(b, largura(l)))));
  const mins = linhas.map(l => Math.max(...l.map(b => DESENHO[b.tipo].min)));
  const disp = FIM - yc - GAP * (linhas.length - 1), soma = des.reduce((a, c) => a + c, 0);
  let hs = des.slice();
  if (soma > disp) { // encolhe, sem passar da altura mínima de cada bloco
    let fixo = new Set();
    for (let it = 0; it < 6; it++) {
      const livre = disp - [...fixo].reduce((a, k) => a + mins[k], 0), somaL = des.reduce((a, c, k) => a + (fixo.has(k) ? 0 : c), 0), k0 = fixo.size;
      hs = des.map((h, k) => fixo.has(k) ? mins[k] : Math.max(mins[k], h * livre / Math.max(1, somaL)));
      hs.forEach((h, k) => { if (!fixo.has(k) && des[k] * livre / Math.max(1, somaL) < mins[k]) fixo.add(k); });
      if (fixo.size === k0) break;
    }
    if (hs.reduce((a, c) => a + c, 0) > disp + 2) _avisoLivre = 'O conteúdo não cabe no slide: tire algum bloco ou divida em dois slides.';
  } else { // sobra espaço: gráficos e imagens crescem
    const el = linhas.map(l => l.some(b => DESENHO[b.tipo].elastico) ? 1 : 0), ne = el.reduce((a, c) => a + c, 0);
    if (ne) hs = des.map((h, k) => el[k] ? h + Math.min((disp - soma) / ne, h * 1.2) : h);
  }
  let y = yc;
  linhas.forEach((l, k) => {
    const w = largura(l);
    l.forEach((b, j) => { // blocos de altura limitada (indicadores, barra…) ficam centralizados na linha
      const D_ = DESENHO[b.tipo], bh = Math.min(hs[k], D_.max ? D_.max(b, w) : Infinity);
      ops.push(...D_.ops(b, th, X + j * (w + GX), y + (hs[k] - bh) / 2, w, bh, `blocos.${idx(b)}`));
    });
    y += hs[k] + GAP;
  });
  if (_avisoLivre) ops.aviso = _avisoLivre;
  return ops;
}

LAYOUTS.livre = {
  nome: 'Conteúdo livre (montar com blocos)', desc: 'Título e quantos blocos quiser: texto, gráfico, tabela, indicadores, imagem, lista…', cor: 'verde',
  novo: () => ({ titulo: 'Título do slide', blocos: [novoBloco('texto')] }),
  campos: [CAMPO_TITULO],
  ops: (s, th) => livreOps(s, th),
};
ORDEM_LAYOUTS.splice(ORDEM_LAYOUTS.indexOf('texto'), 0, 'livre');
ICONES.livre = '+';

/* Qualquer slide de modelo fixo vira slide livre, sem perder o conteúdo */
function paraLivre(s) {
  const B = (tipo, extra) => ({ ...novoBloco(tipo), ...extra }), bl = [], tit = s.titulo || s.tituloA || '';
  switch (s.tipo) {
    case 'texto': if ((s.texto || '').trim()) bl.push(B('texto', { texto: s.texto, justificar: !!s.justificar })); if ((s.destaque || '').trim()) bl.push(B('destaque', { texto: s.destaque })); break;
    case 'indicadores': if ((s.cards || []).length) bl.push(B('kpis', { cards: s.cards.map(c => ({ rotulo: c.rotulo, valor: c.valor })) })); if ((s.itens || []).some(i => (i.rotulo || '').trim())) bl.push(B('grafico', { titulo: s.tituloLista || '', modo: 'barras', series: [''], dados: s.itens.filter(i => (i.rotulo || '').trim()).map(i => `${i.rotulo} | ${i.valor}`) })); break;
    case 'grafico': bl.push(B('grafico', { titulo: '', modo: s.modo, series: [...(s.series || [])], dados: [...(s.dados || [])], centro: s.centro || '', fonte: s.fonte || '', lado: !!(s.texto || '').trim() })); if ((s.texto || '').trim()) bl.push(B('destaque', { texto: s.texto })); break;
    case 'destaques': case 'agenda': bl.push(B('lista', { linhas: (s.itens || []).filter(x => x.trim()) })); break;
    case 'beneficios': bl.push(B('tabela', { colunas: ['Item', 'Coluna 1', 'Coluna 2'], linhas: (s.itens || []).map(i => [i.rotulo, i.a, i.b].map(x => String(x || '').replace(/\|/g, '/').replace(/\n/g, ' ')).join(' | ')) })); break;
    case 'tabela': bl.push(B('tabela', { colunas: [...(s.colunas || [])], linhas: [...(s.linhas || [])] })); break;
    case 'faixas': bl.push(B('subtitulo', { texto: s.tituloA || '' }), B('texto', { texto: s.textoA || '' }), B('subtitulo', { texto: s.tituloB || '' }), B('texto', { texto: s.textoB || '' })); return { titulo: '', blocos: bl };
    case 'textoimagem': bl.push(B('imagem', { src: s.imagem || '', ajuste: s.ajuste === 'preencher' ? 'preencher' : 'conter', lado: true }), B('texto', { texto: s.texto || '', justificar: true })); break;
    case 'imagem': bl.push(B('imagem', { src: s.imagem || '', legenda: s.legenda || '' })); break;
  }
  return { titulo: tit, blocos: bl.length ? bl : [novoBloco('texto')] };
}
