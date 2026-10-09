'use strict';
/* ===== Apresentações (slides 1920 x 1080, medidas do Figma) =====
   Cada slide vira uma lista de "ops" (retângulos, polígonos, textos, imagens) em coordenadas 1920x1080.
   A MESMA lista alimenta a visualização na tela (HTML) e a exportação para PowerPoint (.pptx),
   então o arquivo exportado fica igual ao que se vê. */
const SW = 1920, SH = 1080;
const DARK = '#202020', CINZA = '#5D5D5D';
const FONTES = { b: { css: "'Bebas Neue',Impact,'Arial Narrow',sans-serif", ppt: 'Bebas Neue' }, i: { css: "Inter,Arial,sans-serif", ppt: 'Inter' }, s: { css: "'Space Grotesk',Inter,Arial,sans-serif", ppt: 'Space Grotesk' } };

/* ---------- cores ---------- */
const rgbDe = c => { c = c.replace('#', ''); if (c.length === 3) c = c.replace(/./g, m => m + m); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); };
const misturar = (fg, a, bg = '#ffffff') => { const f = rgbDe(fg), b = rgbDe(bg); return '#' + f.map((v, i) => Math.round(v * a + b[i] * (1 - a)).toString(16).padStart(2, '0')).join(''); };

/* main = cor da faixa lateral, das capas e dos cartões · head = cor dos títulos · acc = cor de apoio · faixa = fundo claro das faixas */
const TEMAS_SL = {
  verde:    { nome: 'Verde (Controladoria / DIGER)', main: '#276645', acc: '#007F3E', esc: '#1B4B31', head: '#276645', luz: '#38C47C', faixa: '#C9E2D4', serie: ['#276645', '#6685A2', '#004A80', '#38C57F', '#F1C232', '#95A8A0'] },
  azul:     { nome: 'Azul (CORED)',                  main: '#004A80', acc: '#4D82A4', esc: '#00355C', head: '#004A80', luz: '#4D82A4', faixa: '#CCD9E3', serie: ['#004A80', '#4D82A4', '#276645', '#38C57F', '#F1C232', '#95A8A0'] },
  aco:      { nome: 'Azul-aço (DICOP)',              main: '#4D82A4', acc: '#004A80', esc: '#004A80', head: '#004A80', luz: '#6E97B3', faixa: '#CCD9E3', serie: ['#276645', '#6685A2', '#004A80', '#38C57F', '#F1C232', '#95A8A0'] },
  dourado:  { nome: 'Dourado (COTIN)',               main: '#D0A010', acc: '#F1B80E', esc: '#A47E08', head: '#202020', luz: '#F1B80E', faixa: '#E7CF87', serie: ['#D0A010', '#004A80', '#276645', '#6685A2', '#38C57F', '#95A8A0'] },
};
/* tema personalizado (roda de cores): todas as cores derivam de uma só */
const _pers = {};
function temaPers(cor) {
  cor = cor.toUpperCase(); if (_pers[cor]) return _pers[cor];
  const l = lumCor(cor);
  return (_pers[cor] = { nome: 'Personalizada', main: cor, acc: misturar(cor, .8), esc: misturar(cor, .7, '#000000'), head: l < .3 ? cor : DARK, luz: misturar(cor, .7), faixa: misturar(cor, .28), serie: [cor, '#004A80', '#6685A2', '#38C57F', '#F1C232', '#95A8A0'] });
}
const temaObj = o => o.tema === 'pers' && /^#[0-9a-f]{6}$/i.test(o.cor || '') ? temaPers(o.cor) : TEMAS_SL[o.tema];
const temaDe = (deck, s) => temaObj(s) || temaObj(deck) || TEMAS_SL.verde;

/* ---------- formas: caminhos do Figma → polígonos recortados no slide ---------- */
const _formas = {};
function formaPts(nome) {
  if (_formas[nome]) return _formas[nome];
  const d = SLIDE_PATHS[nome], t = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g); let i = 0, cmd = 'M', x = 0, y = 0, sx = 0, sy = 0, cur = null;
  const num = () => parseFloat(t[i++]); const poly = [];
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    if (cmd === 'M') { x = num(); y = num(); sx = x; sy = y; cur = [[x, y]]; poly.push(cur); cmd = 'L'; }
    else if (cmd === 'L') { x = num(); y = num(); cur.push([x, y]); }
    else if (cmd === 'H') { x = num(); cur.push([x, y]); }
    else if (cmd === 'V') { y = num(); cur.push([x, y]); }
    else if (cmd === 'C') {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
      const n = Math.min(240, Math.max(14, Math.ceil(Math.hypot(x3 - x, y3 - y) / 14)));
      for (let k = 1; k <= n; k++) { const u = k / n, v = 1 - u; cur.push([v * v * v * x + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, v * v * v * y + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3]); }
      x = x3; y = y3;
    } else if (cmd === 'Z' || cmd === 'z') { x = sx; y = sy; }
    else i++;
  }
  const r = recortar(poly[0], 0, 0, SW, SH);
  return (_formas[nome] = simplificar(r, .4).map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]));
}
function recortar(pts, x0, y0, x1, y1) { // Sutherland–Hodgman contra o retângulo
  const bordas = [[p => p[0] >= x0, (a, b) => { const t = (x0 - a[0]) / (b[0] - a[0]); return [x0, a[1] + t * (b[1] - a[1])]; }],
    [p => p[0] <= x1, (a, b) => { const t = (x1 - a[0]) / (b[0] - a[0]); return [x1, a[1] + t * (b[1] - a[1])]; }],
    [p => p[1] >= y0, (a, b) => { const t = (y0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y0]; }],
    [p => p[1] <= y1, (a, b) => { const t = (y1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y1]; }]];
  let out = pts;
  for (const [dentro, cruza] of bordas) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length], da = dentro(a), db = dentro(b);
      if (da) out.push(a);
      if (da !== db) out.push(cruza(a, b));
    }
    if (!out.length) break;
  }
  return out;
}
function simplificar(pts, eps) { // Douglas–Peucker (polígono fechado: ancora no primeiro e no ponto mais distante)
  if (pts.length < 20) return pts;
  const dist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; if (!l) return Math.hypot(p[0] - a[0], p[1] - a[1]); const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const rec = (a, b) => { let m = 0, k = -1; for (let i = a + 1; i < b; i++) { const d = dist(pts[i], pts[a], pts[b]); if (d > m) { m = d; k = i; } } return m > eps ? [...rec(a, k).slice(0, -1), ...rec(k, b)] : [pts[a], pts[b]]; };
  let far = 0, fd = 0; pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > fd) { fd = d; far = i; } });
  return [...rec(0, far).slice(0, -1), ...rec(far, pts.length - 1), pts[0]].slice(0, -1);
}

/* ---------- construtores de ops ---------- */
const rect = (x, y, w, h, fill, o = {}) => ({ k: 'rect', x, y, w, h, fill, ...o });
const poly = (pts, fill, o = {}) => ({ k: 'poly', pts, fill, ...o });
const img = (src, x, y, w, h, o = {}) => ({ k: 'img', src, x, y, w, h, fit: 'fill', ...o });
const texto = (text, x, y, w, h, o = {}) => ({ k: 'text', text: String(text ?? ''), x, y, w, h, font: 'i', size: 24, lh: 36, color: DARK, align: 'left', valign: 'top', ...o });
const linha = (x1, y1, x2, y2, color, wd = 2) => ({ k: 'line', x1, y1, x2, y2, color, wd });
const cantos = (r, tl, tr, br, bl) => [tl ? r : 0, tr ? r : 0, br ? r : 0, bl ? r : 0];
const logoBox = (x, y, w, h, branco) => img(branco ? SLIDE_IMG.logo : SLIDE_IMG.logoEscuro, x, y, w, h);
const maiusc = s => String(s ?? '').toLocaleUpperCase('pt-BR');

/* quantas linhas / que tamanho cabe: estimativa pela largura média dos caracteres */
const CW = { i: .535, b: .345, s: .55 };
let _cv = null;
function larg(txt, size, fonte = 'i') { // largura em px; mede com a fonte real quando ela já carregou
  const f = FONTES[fonte].css;
  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.check('16px ' + f.split(',')[0])) {
      _cv ||= document.createElement('canvas').getContext('2d'); _cv.font = `${size}px ${f}`; return _cv.measureText(txt).width;
    }
  } catch (e) { /* usa a estimativa */ }
  return String(txt).length * size * CW[fonte];
}
function nLinhas(txt, w, size, fonte = 'i') { // quantas linhas o texto ocupa (quebra por palavras, como no navegador)
  const lim = w * .97; let n = 0;
  for (const p of String(txt ?? '').replace(/\*\*/g, '').split('\n')) {
    let atual = '', linhas = 1;
    for (const pal of p.split(/\s+/).filter(Boolean)) {
      const t = atual ? atual + ' ' + pal : pal;
      if (atual && larg(t, size, fonte) > lim) { linhas++; atual = pal; } else atual = t;
    }
    n += linhas;
  }
  return n;
}
function ajustar(txt, w, h, max, min, lhr = 1.5, fonte = 'i') {
  for (let s = max; s > min; s--) if (nLinhas(txt, w, s, fonte) * s * lhr <= h) return s;
  return min;
}

/* quebra o título em linhas equilibradas (o mesmo resultado na tela e no PowerPoint) */
function quebrar(txt, maxW, size, fonte = 'b') {
  const palavras = String(txt).split(/\s+/).filter(Boolean), lw0 = w => larg(w, size, fonte) + size * .2, total = palavras.reduce((a, w) => a + lw0(w), 0), n = Math.max(1, Math.ceil(total / maxW)), alvo = total / n, linhas = [];
  let atual = '', acc = 0;
  palavras.forEach(w => { const lw = lw0(w); if (atual && acc + lw / 2 > alvo * (linhas.length + 1) && linhas.length < n - 1) { linhas.push(atual); atual = ''; } atual += (atual ? ' ' : '') + w; acc += lw; });
  linhas.push(atual); return linhas.join('\n');
}

/* parágrafos: linha em branco = novo parágrafo (com respiro), **negrito** */
function paragrafos(txt, gap) {
  const out = []; let vazio = false;
  String(txt ?? '').split('\n').forEach(l => {
    if (!l.trim()) { if (out.length) vazio = true; return; }
    if (vazio && out.length) out[out.length - 1].gap = gap; vazio = false;
    const runs = []; l.split(/\*\*(.+?)\*\*/g).forEach((t, i) => { if (t) runs.push({ t, b: !!(i % 2) }); });
    out.push({ runs, gap: 0 });
  });
  return out;
}

/* ---------- partes comuns ---------- */
function fundoConteudo(th, o = {}) {
  const ops = [rect(0, 0, SW, SH, '#fff')];
  if (o.antes) ops.push(...o.antes);
  ops.push(poly(formaPts('faixaCinza'), '#959595'), poly(formaPts('faixaTema'), th.main), logoBox(1636.4, 21, 221, 61));
  return ops;
}
const titulo = (t, x, y, w, size, th, o = {}) => texto(maiusc(t), x, y, w, o.h || size * 1.3 * 2, { font: 'b', size, lh: o.lh || Math.round(size * 1.28), color: o.color || th.head, valign: o.valign || 'top', align: o.align || 'left', ed: o.ed || 'titulo', up: 1 });

/* cartão com barra lateral (callout): barra mais escura à esquerda e canto superior direito arredondado */
function destaqueBox(x, y, w, h, th, txt, o = {}) {
  const cor = o.cor || misturar(th.acc, .85), fg = o.fg || '#fff', size = o.size || ajustar(txt, w - 140, h - 60, 40, 20, 1.5), r = Math.min(40, h / 2);
  return [
    rect(x, y, 26, h, th.main),
    rect(x + 26, y, w - 26, h, cor, { r: [0, r, 0, 0] }),
    texto(txt, x + 26 + 66, y, w - 26 - 66 - 50, h, { size, lh: Math.round(size * 1.5), color: fg, valign: 'middle', ed: o.ed, em: 'b' }),
  ];
}

/* ===================== LAYOUTS ===================== */
const CAMPO_TITULO = { k: 'titulo', t: 'text', l: 'Título' };
const LAYOUTS = {
  capa: {
    nome: 'Capa', desc: 'Capa da apresentação (com ou sem foto)', tema0: 'verde',
    novo: () => ({ estilo: 'centro', titulo: 'Relatório Trimestral', numero: '02/26', orgao: 'Controladoria Interna', foto: '' }),
    campos: [
      { k: 'estilo', t: 'select', l: 'Estilo da capa', o: { centro: 'Centralizada (sem foto)', foto: 'Com foto à direita' } },
      { k: 'titulo', t: 'text', l: 'Título' },
      { k: 'numero', t: 'text', l: 'Número do relatório', p: 'Ex.: 02/26' },
      { k: 'orgao', t: 'text', l: 'Órgão', p: 'Ex.: Controladoria Interna' },
      { k: 'foto', t: 'image', l: 'Foto (se vazio, usa a Torre de TV)', se: s => s.estilo === 'foto' },
    ],
    ops(s, th) {
      const ops = [rect(0, 0, SW, SH, th.main)];
      if (s.estilo === 'foto') {
        ops.push(poly(formaPts('swooshB'), '#fff', { alpha: .1 }));
        ops.push(s.foto ? img(s.foto, 745, 0, 1175, 1080, { fit: 'cover', clip: 'fotoClip', ed: 'foto' }) : img(SLIDE_IMG.torre, 737.9, -386.8, 1240.3, 1860, { clip: 'fotoClip', ed: 'foto' }));
        ops.push(logoBox(79.6, 443, 340.7, 94, true));
        const sz = ajustar(maiusc(s.titulo), 850, 130, 112, 60, 1.16, 'b');
        ops.push(texto(maiusc(s.titulo), 82, 536, 880, 130, { font: 'b', size: sz, lh: Math.round(sz * 1.16), color: '#fff', valign: 'middle', ed: 'titulo', up: 1 }));
        ops.push(rect(35, 683, 757, 175, '#fff', { r: [0, 68, 0, 0] }), rect(0, 683, 35, 175, '#F1B80E'));
        ops.push(texto(`nº ${s.numero}\n${s.orgao}`, 97, 700, 690, 141, { font: 's', size: 44, lh: 58, color: '#959595', valign: 'middle', edf: 'numero' }));
      } else {
        ops.push(poly(formaPts('swooshA'), '#fff', { alpha: .1 }));
        ops.push(logoBox(759.6, 258, 340.7, 94, true));
        const sz = ajustar(maiusc(s.titulo), 1084, 130, 94, 50, 1.16, 'b');
        ops.push(texto(maiusc(s.titulo), 380, 396, 1084, 120, { font: 'b', size: sz, lh: Math.round(sz * 1.16), color: '#fff', align: 'center', valign: 'middle', ed: 'titulo', up: 1 }));
        ops.push(rect(380, 519, 1084, 125, '#fff', { r: [0, 68, 0, 0] }), rect(380, 644, 1084, 16, '#F1B80E', { r: [0, 0, 0, 10] }));
        ops.push(texto(`nº ${s.numero} | ${s.orgao}`, 380, 519, 1084, 125, { font: 's', size: 48, lh: 60, color: th.acc, align: 'center', valign: 'middle', edf: 'numero' }));
      }
      return ops;
    },
  },

  divisor: {
    nome: 'Divisor de seção', desc: 'Página de abertura de cada área (nome do setor)', cor: 'azul',
    novo: () => ({ titulo: 'Divisão de Compliance – DICOP' }),
    campos: [{ k: 'titulo', t: 'area', l: 'Nome da área ou seção' }],
    ops(s, th) {
      const t0 = maiusc(s.titulo); let sz = 168; while (sz > 70 && quebrar(t0, 1365, sz).split('\n').length > 2) sz -= 2;
      return [rect(0, 0, SW, SH, th.main), poly(formaPts('swooshA'), '#fff', { alpha: .1 }), logoBox(1515.6, 58, 340.7, 94, true),
        texto(quebrar(t0, 1365, sz), 225, 330, 1470, 420, { font: 'b', size: sz, lh: Math.round(sz * 1.16), color: '#fff', align: 'center', valign: 'middle', ed: 'titulo', em: 'b', up: 1 })];
    },
  },

  agenda: {
    nome: 'Agenda', desc: 'Lista numerada dos assuntos', tema0: 'azul',
    novo: () => ({ titulo: 'Agenda', itens: ['Divisão de Gestão de Riscos', 'Corregedoria', 'Coordenação de Tecnologia da Informação e Inovação', 'Divisão de Compliance'] }),
    campos: [CAMPO_TITULO, { k: 'itens', t: 'lines', l: 'Assuntos (um por linha)', item: 'assunto' }, { k: '_agenda', t: 'botao', l: 'Preencher com os divisores de seção da apresentação', a: 'agenda-auto' }],
    ops(s, th) {
      const itens = (s.itens || []).filter(x => x.trim()), sz = itens.length > 6 ? 62 : 76, pitch = itens.length > 6 ? 92 : 115;
      return [rect(0, 0, SW, SH, th.main), poly(formaPts('swooshB'), '#fff', { alpha: .1 }), logoBox(1505.6, 58, 340.7, 94, true),
        texto(maiusc(s.titulo), 182, 130, 1200, 200, { font: 'b', size: 166, lh: 190, color: '#fff', ed: 'titulo', up: 1 }),
        texto(itens.map((x, i) => `${i + 1}. ${maiusc(x)}`).join('\n'), 214, 392, 1560, 640, { font: 'b', size: sz, lh: pitch, color: '#fff', ed: 'itens', em: 'L', up: 1 })];
    },
  },

  texto: {
    nome: 'Título e texto', desc: 'Título com texto corrido e, se quiser, uma caixa de destaque', cor: 'verde',
    novo: () => ({ titulo: 'Comitê de Gestão de Riscos', texto: 'Escreva aqui o texto do slide. Pule uma linha para começar um novo parágrafo e use **dois asteriscos** para deixar um trecho em negrito.', destaque: '', justificar: true }),
    campos: [CAMPO_TITULO, { k: 'texto', t: 'area', l: 'Texto', h: 'Linha em branco = novo parágrafo. **negrito** com dois asteriscos.' }, { k: 'destaque', t: 'area', l: 'Caixa de destaque (opcional)', h: 'Aparece embaixo do texto, em cor.' }, { k: 'justificar', t: 'check', l: 'Justificar o texto' }],
    ops(s, th) {
      const ops = fundoConteudo(th), temD = (s.destaque || '').trim(), t = maiusc(s.titulo);
      let ts = 64; while (ts > 40 && nLinhas(t, 1440, ts, 'b') > 2) ts -= 2;
      const nl = nLinhas(t, 1440, ts, 'b'), tlh = Math.round(ts * 1.2), tq = quebrar(t, 1440, ts), yc = 58 + nl * tlh + 40;
      ops.push(texto(tq, 150, 58, 1450, nl * tlh, { font: 'b', size: ts, lh: tlh, color: th.head, ed: 'titulo', up: 1 }));
      const hD = temD ? 170 : 0, h = 1040 - yc - hD - (temD ? 30 : 0);
      const sz = ajustar(s.texto, 1620, h, 34, 16, 1.5), lh = Math.round(sz * 1.5);
      if (nLinhas(s.texto, 1620, sz) * lh + paragrafos(s.texto, 0).length * lh * .45 > h + 4) ops.aviso = 'O texto não cabe no slide: reduza o texto ou divida em dois slides.';
      ops.push(texto(s.texto, 150, yc, 1620, h, { size: sz, lh, align: s.justificar ? 'justify' : 'left', gap: Math.round(lh * .45), ed: 'texto', em: 'b' }));
      if (temD) ops.push(...destaqueBox(150, 1040 - hD, 1620, hD, th, s.destaque, { size: ajustar(s.destaque, 1400, hD - 40, 36, 20, 1.4), ed: 'destaque' }));
      return ops;
    },
  },

  indicadores: {
    nome: 'Indicadores (números)', desc: 'Cartões com números grandes e, se quiser, uma lista com barras', cor: 'verde',
    novo: () => ({ titulo: 'Diligências externas em números', cards: [{ rotulo: 'Demandas externas', valor: '100' }, { rotulo: 'Demandas atendidas no prazo', valor: '90%' }, { rotulo: 'Matrizes de risco', valor: '03' }], tituloLista: 'Demandas externas recebidas no trimestre por órgão', itens: [{ rotulo: 'Promotoria Geral do DF', valor: '3', cor: 'verde' }, { rotulo: 'Ministério Público do DF e Territórios', valor: '43', cor: 'azul' }, { rotulo: 'Polícia Civil do DF', valor: '1', cor: 'verde' }] }),
    campos: [CAMPO_TITULO,
      { k: 'cards', t: 'list', l: 'Cartões (1 a 4)', item: 'cartão', max: 4, novo: () => ({ rotulo: '', valor: '' }), sub: [{ k: 'rotulo', t: 'text', l: 'Nome do indicador' }, { k: 'valor', t: 'text', l: 'Número (ex.: 99,83%)' }] },
      { k: 'tituloLista', t: 'text', l: 'Título da lista com barras (opcional)' },
      { k: 'itens', t: 'list', l: 'Lista com barras (opcional)', item: 'item', max: 12, novo: () => ({ rotulo: '', valor: '1', cor: 'verde' }), sub: [{ k: 'rotulo', t: 'text', l: 'Nome' }, { k: 'valor', t: 'text', l: 'Valor (número)' }, { k: 'cor', t: 'select', l: 'Cor da barra', o: { verde: 'Verde', azul: 'Azul' } }] }],
    ops(s, th) {
      const ops = fundoConteudo(th), cards = (s.cards || []).slice(0, 4), n = Math.max(1, cards.length), itens = (s.itens || []).map((it, k) => ({ ...it, _k: k })).filter(i => (i.rotulo || '').trim());
      const comLista = itens.length > 0, y0 = comLista ? 148 : 390, hC = comLista ? 240 : 300, x0 = 792, W = 988, cw = W / n;
      const tw = 500;
      { const tt = maiusc(s.titulo), tsz = ajustar(tt, tw, 200, 64, 34, 1.25, 'b'); ops.push(texto(quebrar(tt, tw, tsz), 166, comLista ? 180 : y0 + hC / 2 - 100, tw, 200, { font: 'b', size: tsz, lh: Math.round(tsz * 1.25), color: th.head, valign: comLista ? 'top' : 'middle', ed: 'titulo', up: 1 })); }
      cards.forEach((c, i) => {
        const x = x0 + i * cw, cor = i % 2 ? th.acc : th.main, r = 64;
        ops.push(rect(x, y0, cw, hC, cor, { r: [0, i === n - 1 ? r : 0, 0, i === 0 ? r : 0], shadow: true, line: { color: '#000', w: 1 } }));
        const rt = maiusc(c.rotulo), hr = comLista ? 96 : 120; let rs = cw < 260 ? 34 : 40; while (rs > 22 && nLinhas(rt, cw - 40, rs, 'b') * rs * 1.2 > hr) rs -= 2;
        ops.push(texto(rt, x + 20, y0 + (comLista ? 22 : 40), cw - 40, hr, { font: 'b', size: rs, lh: Math.round(rs * 1.2), color: '#fff', align: 'center', valign: 'middle', ed: `cards.${i}.rotulo`, up: 1 }));
        const vt = maiusc(c.valor); let vs = comLista ? 100 : 130; while (vs > 30 && larg(vt, vs, 'b') > (cw - 30) * .97) vs -= 4;
        ops.push(texto(vt, x + 10, y0 + (comLista ? 122 : 160), cw - 20, comLista ? 110 : 140, { font: 'b', size: vs, lh: vs, color: '#fff', align: 'center', valign: 'middle', ed: `cards.${i}.valor`, up: 1 }));
      });
      if (comLista) {
        if (s.tituloLista) ops.push(texto(maiusc(s.tituloLista), 150, 500, 1620, 70, { font: 'b', size: 44, lh: 56, color: DARK, align: 'center', ed: 'tituloLista', up: 1 }));
        const nc = itens.length > 4 ? 3 : itens.length > 2 ? 2 : 1, per = Math.ceil(itens.length / nc), colW = 1560 / nc, vmax = Math.max(1, ...itens.map(i => numero(i.valor)));
        const topo = 610, rowH = Math.min(112, 440 / per);
        itens.forEach((it, k) => {
          const c = Math.floor(k / per), r = k % per, x = nc === 3 ? [152, 624, 1272][c] : 152 + c * colW, y = topo + r * rowH, bw = Math.max(18, numero(it.valor) / vmax * (nc === 3 ? 480 : colW - 100));
          ops.push(texto(`${maiusc(it.rotulo)}   ${it.valor}`, x, y, colW - 30, 40, { font: 'b', size: 34, lh: 40, color: DARK, edf: `itens.${it._k}.rotulo` }));
          ops.push(rect(x, y + 44, bw, 33, it.cor === 'azul' ? '#004A80' : th.acc));
        });
      }
      return ops;
    },
  },

  grafico: {
    nome: 'Gráfico', desc: 'Pizza, rosca, colunas ou barras a partir dos números', cor: 'verde',
    novo: () => ({ titulo: '', modo: 'pizza', series: ['Atendidas no Prazo #276645', 'Fora do Prazo #004A80'], dados: ['Atendidas no Prazo | 90', 'Fora do Prazo | 10'], centro: '', texto: 'Vale destacar que demandas mais complexas **exigem um tempo maior de análise das partes técnicas**, sendo necessário requerer prorrogação do prazo aos órgãos que fizeram a solicitação.', fonte: '**Fonte:** Sistema GDO' }),
    campos: [{ k: 'titulo', t: 'text', l: 'Título (opcional)' },
      { k: 'modo', t: 'select', l: 'Tipo de gráfico', o: { pizza: 'Pizza', rosca: 'Rosca', colunas: 'Colunas', barras: 'Barras (horizontais)', empilhadas: 'Barras empilhadas' } },
      { k: 'dados', t: 'graf' },
      { k: 'centro', t: 'text', l: 'Texto no centro da rosca (opcional)', se: s => s.modo === 'rosca' },
      { k: 'texto', t: 'area', l: 'Texto ao lado do gráfico (opcional)', h: 'Aparece numa caixa colorida à direita.' },
      { k: 'fonte', t: 'text', l: 'Fonte / observação (opcional)' }],
    ops(s, th) { return graficoOps(s, th); },
  },

  destaques: {
    nome: 'Destaques numerados (I, II, III…)', desc: 'Painel azul com até 5 itens em algarismos romanos', cor: 'aco',
    novo: () => ({ titulo: 'Destaques do trimestre', itens: ['Primeiro destaque do trimestre.', 'Segundo destaque do trimestre.', 'Terceiro destaque do trimestre.'] }),
    campos: [CAMPO_TITULO, { k: 'itens', t: 'lines', l: 'Destaques (um por linha, até 5)', item: 'destaque', max: 5, h: '**negrito** com dois asteriscos.' }],
    ops(s, th) {
      const itens = (s.itens || []).map((t, k) => ({ t, k })).filter(x => x.t.trim()).slice(0, 5), n = Math.max(1, itens.length), y0 = 209, H = SH - y0, romanos = ['I', 'II', 'III', 'IV', 'V'];
      const ops = fundoConteudo(th), base = th.main;
      ops.push(titulo(s.titulo, 106, 104, 1500, 56, th, { h: 80 }));
      // peso de cada linha pelo tamanho do texto
      const pesos = itens.map(x => Math.max(1, nLinhas(x.t, 1470, 28)) + 1.1), soma = pesos.reduce((a, b) => a + b, 0);
      let y = y0;
      ops.push(rect(-6, y0, 1784, H, base, { r: [0, 32, 0, 0] }));
      itens.forEach(({ t, k }, i) => {
        const h = H * pesos[i] / soma, escuroRow = i % 2 === 1;
        if (escuroRow) ops.push(rect(0, y, 1778, h, th.esc));
        ops.push(texto(romanos[i], 40, y, 120, h, { font: 'b', size: 52, lh: 60, color: '#fff', align: 'center', valign: 'middle' }));
        ops.push(texto(t, 210, y, 1480, h, { size: 28, lh: 39, color: '#fff', valign: 'middle', ed: `itens.${k}`, em: 'r' }));
        y += h;
      });
      return ops;
    },
  },

  beneficios: {
    nome: 'Quadro numerado (01–05)', desc: 'Linhas numeradas com título e duas colunas de texto', cor: 'verde',
    novo: () => ({ titulo: 'Benefícios da Matriz de TI', itens: [{ rotulo: 'Segurança de TI', a: 'Primeira coluna de texto.', b: 'Segunda coluna de texto.' }, { rotulo: 'Governança', a: 'Primeira coluna de texto.', b: 'Segunda coluna de texto.' }, { rotulo: 'Jurídico / LGPD', a: 'Primeira coluna de texto.', b: 'Segunda coluna de texto.' }] }),
    campos: [CAMPO_TITULO, { k: 'itens', t: 'list', l: 'Linhas (até 5)', item: 'linha', max: 5, novo: () => ({ rotulo: '', a: '', b: '' }), sub: [{ k: 'rotulo', t: 'text', l: 'Título da linha' }, { k: 'a', t: 'area', l: 'Texto da 1ª coluna' }, { k: 'b', t: 'area', l: 'Texto da 2ª coluna' }] }],
    ops(s, th) {
      const itens = (s.itens || []).slice(0, 5), n = Math.max(1, itens.length), ops = fundoConteudo(th);
      ops.push(titulo(s.titulo, 136, 70, 1400, 56, th, { h: 90, color: DARK }));
      const y0 = 260, rh = Math.min(146, 730 / n), H = rh * n, W = 1560;
      ops.push(rect(-15, y0, W, H, th.main, { r: [0, 80, 80, 0] }));
      itens.forEach((it, i) => {
        const y = y0 + i * rh;
        if (i % 2) ops.push(rect(-15, y, W, rh, '#18B062', { r: [0, i === 0 ? 80 : 0, i === n - 1 ? 80 : 0, 0] }));
        ops.push(texto(String(i + 1).padStart(2, '0'), 130, y, 120, rh, { font: 'b', size: 80, lh: 90, color: '#fff', valign: 'middle', align: 'center' }));
        ops.push(texto(it.rotulo, 274, y, 210, rh, { size: 22, lh: 30, color: '#fff', valign: 'middle', bold: true, ed: `itens.${i}.rotulo` }));
        const sz = ajustar(`${it.a}\n${it.b}`.length > 300 ? it.a + it.b : it.a, 480, rh - 24, 24, 14, 1.35);
        ops.push(texto(it.a, 506, y, 480, rh, { size: sz, lh: Math.round(sz * 1.35), color: '#fff', valign: 'middle', ed: `itens.${i}.a`, em: 'b' }));
        ops.push(texto(it.b, 1030, y, 480, rh, { size: sz, lh: Math.round(sz * 1.35), color: '#fff', valign: 'middle', ed: `itens.${i}.b`, em: 'b' }));
      });
      return ops;
    },
  },

  tabela: {
    nome: 'Tabela', desc: 'Linhas e colunas com cabeçalho colorido', cor: 'azul',
    novo: () => ({ titulo: 'Avaliações de normas organizacionais', colunas: ['Norma', 'Assunto', 'Processo SEI', 'Documento SEI'], linhas: ['GPE 01 | Análise de conformidade da proposta de revisão da política | 00111-00011502/2017-19 | 183245003', 'GPE 02 | Análise de conformidade da proposta de alteração da norma | 00111-00012125/2025-37 | 189803845'] }),
    campos: [CAMPO_TITULO, { k: 'colunas', t: 'grid' }],
    ops(s, th) {
      const ops = fundoConteudo(th), cols = s.colunas || [], rows = (s.linhas || []).map(l => l.split('|').map(c => c.trim()));
      ops.push(titulo(s.titulo, 109, 100, 1500, 56, th, { h: 80 }));
      const nC = Math.max(1, cols.length), X = 94, W = 1740;
      const peso = cols.map((c, j) => Math.min(8, Math.max(1.2, Math.max(String(c).length, ...rows.map(r => Math.min(80, (r[j] || '').length))) / 14 + .5)));
      const ps = peso.reduce((a, b) => a + b, 0), ws = peso.map(p => W * p / ps);
      const avail = 1010 - 262; let sz = 24, alturas = [];
      for (; sz >= 14; sz--) { alturas = rows.map(r => Math.max(sz * 1.5 + 40, Math.max(...r.map((c, j) => nLinhas(c, ws[j] - 40, sz)) , 1) * sz * 1.4 + 36)); if (alturas.reduce((a, b) => a + b, 0) <= avail) break; }
      const hh = 58, y0 = 190; ops.push(rect(X, y0, W, hh, '#004A80', { r: [0, 20, 0, 0] }));
      let x = X; cols.forEach((c, j) => { ops.push(texto(c, x + 20, y0, ws[j] - 30, hh, { size: Math.min(24, sz + 2), lh: 30, color: '#fff', valign: 'middle', bold: true, align: j >= 2 && nC > 3 ? 'center' : 'left', ed: `colunas.${j}` })); x += ws[j]; });
      let y = y0 + hh;
      rows.forEach((r, i) => {
        const h = alturas[i]; ops.push(rect(X, y, W, h, i % 2 ? th.faixa === '#C9E2D4' ? '#CCD9E3' : th.faixa : '#fff'));
        let xx = X; r.slice(0, nC).forEach((c, j) => { ops.push(texto(c, xx + 20, y, ws[j] - 30, h, { size: sz, lh: Math.round(sz * 1.4), color: DARK, valign: 'middle', align: j >= 2 && nC > 3 ? 'center' : 'left', ed: `linhas.${i}`, cell: j, em: 'r' })); xx += ws[j]; });
        y += h;
      });
      if (y > 1040) ops.aviso = 'A tabela não cabe no slide: divida em dois slides.';
      return ops;
    },
  },

  faixas: {
    nome: 'Duas seções (faixa colorida)', desc: 'Faixa colorida no alto e outra seção embaixo, cada uma com título e texto', cor: 'dourado',
    novo: () => ({ tituloA: 'Coordenação de Tecnologia da Informação e Inovação – COTIN', estiloA: 'pilulas', textoA: 'Chamados atendidos dentro do prazo foi **de 99,99%** de média\nSatisfação do usuário atendido **de 99,99%**', tituloB: 'Modernização de equipamentos de vídeo conferência', textoB: 'Foi realizada a aquisição de equipamentos de videoconferência para as salas dos diretores da Terracap.\n\nA aquisição de novas câmeras visa atualizar o parque tecnológico.' }),
    campos: [{ k: 'tituloA', t: 'text', l: 'Faixa de cima — título' }, { k: 'estiloA', t: 'select', l: 'Faixa de cima — formato', o: { pilulas: 'Frases em caixas (uma por linha)', texto: 'Texto corrido' } }, { k: 'textoA', t: 'area', l: 'Faixa de cima — texto' }, { k: 'tituloB', t: 'text', l: 'Parte de baixo — título' }, { k: 'textoB', t: 'area', l: 'Parte de baixo — texto' }],
    ops(s, th) {
      const ops = fundoConteudo(th, { antes: [rect(-16, -8, 1936, 483, th.faixa)] });
      const tA = maiusc(s.tituloA), tB = maiusc(s.tituloB);
      ops.push(texto(tA, 272, 40, 600, 395, { font: 'b', size: ajustar(tA, 600, 300, 46, 28, 1.26, 'b'), lh: Math.round(ajustar(tA, 600, 300, 46, 28, 1.26, 'b') * 1.26), color: th.head === '#202020' ? DARK : th.head, valign: 'middle', ed: 'tituloA', up: 1 }));
      if (s.estiloA === 'pilulas') {
        const ls = String(s.textoA || '').split('\n').filter(x => x.trim()).slice(0, 4), alt = ls.map(l => Math.max(1, nLinhas(l, 700, 32)) * 48 + 30), tot = alt.reduce((a, b) => a + b, 0) + (ls.length - 1) * 27; let y = 40 + (395 - tot) / 2;
        ls.forEach((l, i) => { const h = alt[i]; ops.push(rect(926, y, 26, h, th.main), rect(952, y, 809, h, misturar(th.main, .66, th.faixa), { r: [0, 64, 0, 0] }), texto(l, 996, y, 700, h, { size: 32, lh: 48, valign: 'middle', edf: 'textoA' })); y += h + 27; });
      } else ops.push(texto(s.textoA, 942, 60, 900, 360, { size: ajustar(s.textoA, 900, 360, 28, 16, 1.5), lh: Math.round(ajustar(s.textoA, 900, 360, 28, 16, 1.5) * 1.5), valign: 'middle', align: 'justify', gap: 14, ed: 'textoA', em: 'b' }));
      const sz = ajustar(s.tituloB, 560, 300, 46, 28, 1.26, 'b');
      ops.push(texto(tB, 260, 520, 600, 520, { font: 'b', size: sz, lh: Math.round(sz * 1.26), color: DARK, valign: 'middle', ed: 'tituloB', up: 1 }));
      const sB = ajustar(s.textoB, 900, 480, 24, 16, 1.5);
      ops.push(texto(s.textoB, 942, 560, 900, 440, { size: sB, lh: Math.round(sB * 1.5), valign: 'middle', align: 'justify', gap: Math.round(sB * .6), ed: 'textoB', em: 'b' }));
      return ops;
    },
  },

  textoimagem: {
    nome: 'Texto com imagem', desc: 'Título e imagem à esquerda, texto à direita com barra colorida', cor: 'dourado',
    novo: () => ({ titulo: 'Renegociação de dívidas 100% digital', imagem: '', texto: 'Por meio do portal de serviços, o mutuário realiza login pessoal, visualiza suas dívidas ativas e realiza simulações em tempo real.\n\nO sistema permite a **geração imediata do boleto** referente à entrada do acordo.', ajuste: 'conter' }),
    campos: [CAMPO_TITULO, { k: 'imagem', t: 'image', l: 'Imagem' }, { k: 'ajuste', t: 'select', l: 'Imagem', o: { conter: 'Mostrar inteira', preencher: 'Preencher o espaço (corta as bordas)' } }, { k: 'texto', t: 'area', l: 'Texto' }],
    ops(s, th) {
      const ops = fundoConteudo(th), tt = maiusc(s.titulo), sz = ajustar(tt, 620, 150, 46, 28, 1.26, 'b');
      ops.push(texto(tt, 150, 100, 700, 150, { font: 'b', size: sz, lh: Math.round(sz * 1.26), color: th.head === '#202020' ? DARK : th.head, valign: 'middle', ed: 'titulo', up: 1 }));
      if (s.imagem) ops.push(img(s.imagem, 150, 290, 700, 700, { fit: s.ajuste === 'preencher' ? 'cover' : 'contain', ed: 'imagem' }));
      else ops.push(rect(150, 290, 700, 700, '#F1F1F1'), texto('Imagem', 150, 290, 700, 700, { size: 30, color: '#999', align: 'center', valign: 'middle', img: 'imagem' }));
      ops.push(rect(953, 216, 13, 786, th.main));
      const sT = ajustar(s.texto, 820, 740, 28, 17, 1.55), lh = Math.round(sT * 1.55);
      ops.push(texto(s.texto, 1000, 216, 830, 786, { size: sT, lh, valign: 'top', align: 'justify', gap: Math.round(lh * .45), ed: 'texto', em: 'b' }));
      return ops;
    },
  },

  imagem: {
    nome: 'Imagem em destaque', desc: 'Título e uma imagem grande (painel, foto, print)', cor: 'dourado',
    novo: () => ({ titulo: 'Riscos de governança de tecnologia', imagem: '', legenda: '' }),
    campos: [CAMPO_TITULO, { k: 'imagem', t: 'image', l: 'Imagem' }, { k: 'legenda', t: 'text', l: 'Legenda (opcional)' }],
    ops(s, th) {
      const ops = fundoConteudo(th, { antes: [rect(0, 0, SW, 150, th.faixa)] });
      ops.push(texto(maiusc(s.titulo), 150, 20, 1450, 110, { font: 'b', size: 56, lh: 66, color: th.head === '#202020' ? DARK : th.head, valign: 'middle', align: 'center', ed: 'titulo', up: 1 }));
      const hI = s.legenda ? 800 : 860;
      if (s.imagem) ops.push(img(s.imagem, 150, 190, 1620, hI, { fit: 'contain', ed: 'imagem' }));
      else ops.push(rect(150, 190, 1620, hI, '#F1F1F1'), texto('Imagem', 150, 190, 1620, hI, { size: 34, color: '#999', align: 'center', valign: 'middle', img: 'imagem' }));
      if (s.legenda) ops.push(texto(s.legenda, 150, 1000, 1620, 40, { size: 22, color: CINZA, align: 'center', ed: 'legenda' }));
      return ops;
    },
  },
};
const ORDEM_LAYOUTS = ['capa', 'divisor', 'agenda', 'texto', 'indicadores', 'grafico', 'destaques', 'beneficios', 'tabela', 'faixas', 'textoimagem', 'imagem'];
const ICONES = { capa: 'CAP', divisor: 'DIV', agenda: 'AGD', texto: 'TXT', indicadores: 'KPI', grafico: 'GRF', destaques: 'DST', beneficios: 'QDR', tabela: 'TAB', faixas: '2×', textoimagem: 'T+I', imagem: 'IMG' };

const numero = v => parseFloat(String(v ?? '').replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, '')) || 0;

/* ---------- gráficos ---------- */
function graficoOps(s, th) {
  const ops = fundoConteudo(th);
  const rows = (s.dados || []).map((l, k) => ({ l, k })).filter(x => x.l.trim()).map(({ l, k }) => { const p = l.split('|').map(x => x.trim()); return { k, n: p[0] || '', t: p.slice(1), v: p.slice(1).map(numero) }; });
  const series = s.series || [];
  const cor = i => (/#[0-9a-fA-F]{6}\s*$/.exec(series[i] || '') || [])[0]?.trim() || th.serie[i % th.serie.length];
  const nomeS = i => String(series[i] || '').replace(/\s*#[0-9a-fA-F]{6}\s*$/, '');
  const temT = (s.texto || '').trim(), modo = s.modo || 'pizza', redonda = modo === 'pizza' || modo === 'rosca';
  if (s.titulo) ops.push(titulo(s.titulo, 150, 58, 1450, 60, th, { h: 90 }));
  if (!rows.length) return ops;
  const topo = s.titulo ? 190 : 120, areaW = temT && redonda ? 800 : 1620, x0 = 150;
  const legenda = (itens, cx, y, esq) => { // quadradinhos + nome, em linha
    const wi = itens.map(t => 52 + t.length * 15.4), tot = wi.reduce((a, b) => a + b, 0) + (itens.length - 1) * 40; let x = esq != null ? esq : cx - tot / 2;
    itens.forEach((t, i) => { ops.push(rect(x, y + 6, 22, 22, itens.cores[i]), texto(t, x + 34, y, wi[i], 36, { size: 28, lh: 34, edf: (itens.edf || [])[i] || 'series' })); x += wi[i] + 40; });
  };
  if (redonda) {
    const tot = rows.reduce((a, r) => a + (r.v[0] || 0), 0) || 1, R = temT ? 218 : 250, cx = temT ? 452 : 960, cy = temT ? 437 + (s.titulo ? 60 : 0) : topo + R + 30;
    let ang = -Math.PI / 2;
    rows.forEach((r, i) => {
      const a1 = ang + (r.v[0] || 0) / tot * Math.PI * 2, c = cor(i), pts = [];
      const n = Math.max(2, Math.ceil((a1 - ang) / (Math.PI / 90)));
      if (modo === 'rosca') { const ri = R * .5; for (let k = 0; k <= n; k++) { const a = ang + (a1 - ang) * k / n; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } for (let k = n; k >= 0; k--) { const a = ang + (a1 - ang) * k / n; pts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]); } }
      else { pts.push([cx, cy]); for (let k = 0; k <= n; k++) { const a = ang + (a1 - ang) * k / n; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } }
      if (rows.length === 1) ops.push(poly(pts, c)); else ops.push(poly(pts, c, { line: { color: '#fff', w: 3 } }));
      const pct = Math.round((r.v[0] || 0) / tot * 100), rotulo = /%/.test(r.t[0] || '') ? r.t[0] : pct + '%', am = (ang + a1) / 2, dentro = pct >= 25 || (modo === 'rosca' && pct >= 12);
      const rl = dentro ? (modo === 'rosca' ? R * .75 : R * .58) : R + 62, lx = cx + rl * Math.cos(am), ly = cy + rl * Math.sin(am);
      ops.push(texto(rotulo, lx - 90, ly - 40, 180, 80, { font: 'b', size: dentro ? 64 : 56, lh: 80, color: dentro ? '#fff' : c, align: 'center', valign: 'middle', edf: `dados.${r.k}` }));
      ang = a1;
    });
    if (modo === 'rosca' && s.centro) ops.push(texto(s.centro, cx - 130, cy - 80, 260, 160, { font: 'b', size: 120, lh: 140, color: DARK, align: 'center', valign: 'middle', ed: 'centro' }));
    const nomes = rows.map((r, i) => nomeS(i) || r.n); nomes.cores = rows.map((_, i) => cor(i)); nomes.edf = rows.map((r, i) => series[i] != null ? `series.${i}` : `dados.${r.k}`);
    legenda(nomes, cx, cy + R + 90);
    if (s.fonte) ops.push(texto(s.fonte, cx - 380, cy + R + 150, 760, 40, { size: 25, lh: 32, color: CINZA, align: 'center', ed: 'fonte', em: 'r' }));
  } else if (modo === 'colunas') {
    const nS = Math.max(1, ...rows.map(r => r.v.length)), vmax = Math.max(1, ...rows.map(r => Math.max(...r.v, 0))), base = temT ? 640 : 880, maxH = temT ? 380 : 470, gw = areaW / rows.length, cw = Math.min(70, gw / (nS + 1.2));
    const sNomes = Array.from({ length: nS }, (_, i) => nomeS(i) || `Série ${i + 1}`); sNomes.cores = sNomes.map((_, i) => cor(i)); sNomes.edf = sNomes.map((_, i) => `series.${i}`);
    ops.push(linha(x0, base, x0 + areaW, base, '#9a9a9a', 2));
    rows.forEach((r, g) => {
      const gx = x0 + g * gw + (gw - nS * cw - (nS - 1) * 8) / 2;
      r.v.forEach((v, i) => { if (r.t[i] === '') return; const h = Math.max(6, v / vmax * maxH), x = gx + i * (cw + 8); ops.push(rect(x, base - h, cw, h, cor(i), { r: [12, 12, 0, 0] }), texto(r.t[i], x - 20, base - h - 50, cw + 40, 46, { font: 'b', size: 40, lh: 46, align: 'center', valign: 'bottom', edf: `dados.${r.k}` })); });
      ops.push(texto(maiusc(r.n), x0 + g * gw, base + 14, gw, 80, { font: 'b', size: 28, lh: 34, align: 'center', edf: `dados.${r.k}` }));
    });
    if (nS > 1 || series.length) legenda(sNomes, x0 + areaW / 2, temT ? 735 : 960);
  } else { // barras / empilhadas
    const emp = modo === 'empilhadas', nS = Math.max(1, ...rows.map(r => r.v.length)), labW = 400, bx = x0 + labW + 24, bW = areaW - labW - 80 - (temT ? 300 : 0);
    const tot = rows.map(r => emp ? r.v.reduce((a, b) => a + b, 0) : Math.max(...r.v, 0)), vmax = Math.max(1, ...tot), rh = Math.min(emp ? 110 : 80, (temT ? 420 : 620) / rows.length), bh = emp ? Math.min(103, rh - 16) : Math.min(56, rh - 14);
    const sNomes = Array.from({ length: emp ? nS : 1 }, (_, i) => nomeS(i) || (emp ? `Série ${i + 1}` : '')); sNomes.cores = sNomes.map((_, i) => cor(i)); sNomes.edf = sNomes.map((_, i) => `series.${i}`);
    rows.forEach((r, g) => {
      const y = topo + 30 + g * rh; ops.push(texto(maiusc(r.n), x0, y, labW, bh, { font: 'b', size: emp ? 44 : 34, lh: 44, align: 'right', valign: 'middle', edf: `dados.${r.k}` }));
      let x = bx; const vis = r.v.map((v, i) => ({ v, i })).filter(o => o.v > 0);
      vis.forEach((o, k) => { const w = Math.max(emp ? 44 : 30, o.v / vmax * bW), c = cor(emp ? o.i : 0); ops.push(rect(x, y, w, bh, c, { r: [0, k === vis.length - 1 ? 22 : 0, k === vis.length - 1 ? 22 : 0, 0] }), texto(r.t[o.i], x, y, w, bh, { font: 'b', size: emp ? 40 : 36, lh: 44, color: '#fff', align: 'center', valign: 'middle', edf: `dados.${r.k}` })); x += w; });
    });
    if (emp && sNomes.some(n => n)) legenda(sNomes, null, topo + 60 + rows.length * rh, bx);
    if (s.fonte && !temT) ops.push(texto(s.fonte, 150, 1010, 1620, 36, { size: 22, color: CINZA, ed: 'fonte', em: 'r' }));
  }
  if (temT) {
    if (redonda) { const h = Math.min(480, Math.max(250, nLinhas(s.texto, 640, 38) * 57 + 110)), y = 437 + (s.titulo ? 60 : 0) - h / 2; ops.push(...destaqueBox(960, y, 835, h, th, s.texto, { size: ajustar(s.texto, 690, h - 80, 40, 20, 1.5), ed: 'texto' })); }
    else { ops.push(...destaqueBox(150, 800, 1620, 190, th, s.texto, { size: ajustar(s.texto, 1470, 130, 36, 20, 1.5), ed: 'texto' })); if (s.fonte) ops.push(texto(s.fonte, 150, 1010, 1620, 36, { size: 22, color: CINZA, ed: 'fonte', em: 'r' })); }
  }
  return ops;
}

/* ===================== Saída: slide → ops ===================== */
function opsDoSlide(deck, s) {
  const L = LAYOUTS[s.tipo]; if (!L) return [];
  return L.ops(s, temaDe(deck, s));
}

/* ===================== Visualização (HTML) ===================== */
const escH = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const px = n => (Math.round(n * 100) / 100) + 'px';
const clipCSS = { fotoClip: 'M745 1080C1000.58 561.076 980.631 377.081 1054.98 -1H1920V1080H745Z' };
function opHTML(o) {
  const pos = `left:${px(o.x)};top:${px(o.y)};width:${px(o.w)};height:${px(o.h)}`;
  switch (o.k) {
    case 'rect': {
      const r = o.r == null ? '' : `border-radius:${(Array.isArray(o.r) ? o.r : [o.r, o.r, o.r, o.r]).map(px).join(' ')};`;
      return `<div class="o" style="${pos};background:${o.fill};${o.alpha != null ? `opacity:${o.alpha};` : ''}${r}${o.shadow ? 'box-shadow:0 4px 4px rgba(0,0,0,.25);' : ''}"></div>`;
    }
    case 'poly': return `<svg class="o" style="left:0;top:0;width:${SW}px;height:${SH}px" viewBox="0 0 ${SW} ${SH}"><path d="M${o.pts.map(p => p.join(' ')).join('L')}Z" fill="${o.fill}"${o.alpha != null ? ` fill-opacity="${o.alpha}"` : ''}${o.line ? ` stroke="${o.line.color}" stroke-width="${o.line.w}" stroke-linejoin="round"` : ''}/></svg>`;
    case 'line': return `<svg class="o" style="left:0;top:0;width:${SW}px;height:${SH}px" viewBox="0 0 ${SW} ${SH}"><line x1="${o.x1}" y1="${o.y1}" x2="${o.x2}" y2="${o.y2}" stroke="${o.color}" stroke-width="${o.wd}"/></svg>`;
    case 'img': {
      const clip = o.clip ? `clip-path:path('${clipCSS[o.clip]}');` : '';
      const wrap = o.clip ? `left:0;top:0;width:${SW}px;height:${SH}px;${clip}` : pos;
      const ipos = o.clip ? `position:absolute;left:${px(o.x)};top:${px(o.y)};width:${px(o.w)};height:${px(o.h)}` : 'position:absolute;inset:0;width:100%;height:100%';
      return `<div class="o" style="${wrap};overflow:hidden"${o.ed ? ` data-img="${o.ed}"` : ''}><img src="${o.src}" alt="" draggable="false" style="${ipos};object-fit:${o.fit === 'cover' ? 'cover' : o.fit === 'contain' ? 'contain' : 'fill'}"></div>`;
    }
    case 'text': {
      const f = FONTES[o.font], jv = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[o.valign];
      const gap = o.gap != null ? o.gap : Math.round(o.size * .5);
      const ps = paragrafos(o.text, gap).map(p => `<div style="margin-bottom:${p.gap}px">${p.runs.map(r => (r.b || o.bold) ? `<b>${escH(r.t)}</b>` : escH(r.t)).join('')}</div>`).join('');
      const ed = o.ed != null ? ` data-ed="${escH(o.ed)}" data-em="${o.em || 't'}"${o.cell != null ? ` data-cell="${o.cell}"` : ''}${o.ph ? ` data-ph="${escH(o.ph)}"` : ''}` : o.edf ? ` data-edf="${escH(o.edf)}"` : o.img ? ` data-img="${o.img}"` : ''; // edição direta no palco
      return `<div class="o ot" style="${pos};display:flex;flex-direction:column;justify-content:${jv};font-family:${f.css};font-size:${o.size}px;line-height:${o.lh}px;color:${o.color};text-align:${o.align}${o.up ? ';text-transform:uppercase' : ''}${o.bold ? ';font-weight:700' : ''}"${ed}>${ps}</div>`;
    }
  }
  return '';
}
const slideHTML = (deck, s) => `<div class="sld">${opsDoSlide(deck, s).map(opHTML).join('')}</div>`;

/* ===================== Exportar PowerPoint (.pptx) ===================== */
const PPI = 144; // 1920 px = 13,333 pol
const pol = v => Math.round(v / PPI * 10000) / 10000;
const hex6 = c => { c = c.replace('#', '').toUpperCase(); return c.length === 3 ? c.replace(/./g, m => m + m) : c; };
function carregarImg(src) { return new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; }); }
const _raster = new Map();
/* cortes de imagem (preencher / recorte em forma) feitos em canvas, para o PowerPoint receber a imagem já pronta */
async function rasterizar(o) {
  const chave = o.src.length + o.src.slice(-60) + [o.x, o.y, o.w, o.h, o.fit, o.clip].join();
  if (_raster.has(chave)) return _raster.get(chave);
  const p = (async () => {
    const im = await carregarImg(o.src), nw = im.naturalWidth, nh = im.naturalHeight, esc = Math.min(1, 1800 / Math.max(o.w, o.h));
    if (o.clip) { // imagem posicionada em (x,y,w,h) e recortada pela forma — vira PNG com transparência
      const bx = 745, by = 0, bw = 1175, bh = 1080, c = document.createElement('canvas'); c.width = Math.round(bw * esc); c.height = Math.round(bh * esc);
      const g = c.getContext('2d'); g.scale(esc, esc); g.translate(-bx, -by); g.clip(new Path2D(clipCSS[o.clip]));
      if (o.fit === 'cover') { const k = Math.max(o.w / nw, o.h / nh), w = nw * k, h = nh * k; g.drawImage(im, o.x + (o.w - w) / 2, o.y + (o.h - h) / 2, w, h); } else g.drawImage(im, o.x, o.y, o.w, o.h);
      return { data: c.toDataURL('image/png'), x: bx, y: by, w: bw, h: bh };
    }
    if (o.fit === 'contain') { const k = Math.min(o.w / nw, o.h / nh), w = nw * k, h = nh * k; return { data: o.src, x: o.x + (o.w - w) / 2, y: o.y + (o.h - h) / 2, w, h }; }
    if (o.fit === 'cover') {
      const k = Math.max(o.w / nw, o.h / nh), sw = o.w / k, sh = o.h / k, c = document.createElement('canvas'); c.width = Math.round(o.w * esc); c.height = Math.round(o.h * esc);
      c.getContext('2d').drawImage(im, (nw - sw) / 2, (nh - sh) / 2, sw, sh, 0, 0, c.width, c.height);
      return { data: c.toDataURL(/^data:image\/png/.test(o.src) ? 'image/png' : 'image/jpeg', .9), x: o.x, y: o.y, w: o.w, h: o.h };
    }
    return { data: o.src, x: o.x, y: o.y, w: o.w, h: o.h };
  })();
  _raster.set(chave, p); return p;
}
function contornoArredondado(x, y, w, h, [tl, tr, br, bl]) { // pontos relativos ao retângulo
  const pts = [], arco = (cx, cy, r, a0) => { for (let k = 0; k <= 10; k++) { const a = a0 + k * Math.PI / 20; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  if (tl) arco(tl, tl, tl, Math.PI); else pts.push([0, 0]);
  if (tr) arco(w - tr, tr, tr, 1.5 * Math.PI); else pts.push([w, 0]);
  if (br) arco(w - br, h - br, br, 0); else pts.push([w, h]);
  if (bl) arco(bl, h - bl, bl, Math.PI / 2); else pts.push([0, h]);
  return pts;
}
function addPoligono(slide, pts, o) { // formas livres: o PowerPoint recebe o polígono e pode editar os pontos
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), bx = Math.min(...xs), by = Math.min(...ys), w = Math.max(1, Math.max(...xs) - bx), h = Math.max(1, Math.max(...ys) - by);
  const pp = pts.map((p, i) => ({ x: pol(p[0] - bx), y: pol(p[1] - by), ...(i === 0 ? { moveTo: true } : {}) })); pp.push({ close: true });
  const opt = { x: pol(bx), y: pol(by), w: pol(w), h: pol(h), points: pp, fill: { color: hex6(o.fill), transparency: o.alpha != null ? Math.round((1 - o.alpha) * 100) : 0 } };
  opt.line = o.line ? { color: hex6(o.line.color), width: o.line.w * .5 } : { type: 'none' };
  slide.addShape('custGeom', opt);
}
async function exportarPPTX(deck, nomeArquivo, aoProgresso) {
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.title = deck.titulo || 'Apresentação'; pptx.company = 'Terracap'; pptx.author = 'Controladoria Interna';
  let n = 0;
  for (const s of deck.slides) {
    const sl = pptx.addSlide(); sl.background = { color: 'FFFFFF' };
    for (const o of opsDoSlide(deck, s)) {
      if (o.k === 'rect') {
        const r = o.r == null ? 0 : o.r, arr = Array.isArray(r) ? r : [r, r, r, r], base = { x: pol(o.x), y: pol(o.y), w: pol(o.w), h: pol(o.h), fill: { color: hex6(o.fill), transparency: o.alpha != null ? Math.round((1 - o.alpha) * 100) : 0 }, line: { type: 'none' } };
        if (o.shadow) base.shadow = { type: 'outer', color: '000000', opacity: .25, blur: 4, offset: 3, angle: 90 };
        if (arr.every(v => !v)) sl.addShape('rect', base);
        else if (arr.every(v => v === arr[0]) && arr[0] * 2 <= Math.min(o.w, o.h)) sl.addShape('roundRect', { ...base, rectRadius: pol(arr[0]) });
        else addPoligono(sl, contornoArredondado(o.x, o.y, o.w, o.h, arr).map(p => [p[0] + o.x, p[1] + o.y]), o);
      } else if (o.k === 'poly') addPoligono(sl, o.pts, o);
      else if (o.k === 'line') sl.addShape('line', { x: pol(Math.min(o.x1, o.x2)), y: pol(Math.min(o.y1, o.y2)), w: pol(Math.abs(o.x2 - o.x1)), h: pol(Math.abs(o.y2 - o.y1)), line: { color: hex6(o.color), width: o.wd * .5 } });
      else if (o.k === 'img') {
        if (o.src === SLIDE_IMG.logo || o.src === SLIDE_IMG.logoEscuro) sl.addImage({ data: o.src, x: pol(o.x), y: pol(o.y), w: pol(o.w), h: pol(o.h) });
        else { const r = await rasterizar(o); sl.addImage({ data: r.data, x: pol(r.x), y: pol(r.y), w: pol(r.w), h: pol(r.h) }); }
      } else if (o.k === 'text') {
        const txt = o.text, gap = o.gap != null ? o.gap : Math.round(o.size * .5), ps = paragrafos(txt, gap), runs = [];
        ps.forEach((p, pi) => p.runs.forEach((r, ri) => runs.push({ text: r.t, options: { bold: !!(r.b || o.bold), breakLine: ri === p.runs.length - 1 && pi < ps.length - 1, paraSpaceAfter: p.gap * .5 } })));
        if (!runs.length) continue;
        sl.addText(runs, { x: pol(o.x), y: pol(o.y), w: pol(o.w), h: pol(o.h), margin: 0, fontFace: FONTES[o.font].ppt, fontSize: Math.round(o.size * 50) / 100, color: hex6(o.color), align: o.align, valign: o.valign, lineSpacing: Math.round(o.lh * 50) / 100, wrap: true, fit: 'none', autoFit: false });
      }
    }
    if (s.notas) sl.addNotes(s.notas);
    if (aoProgresso) aoProgresso(++n, deck.slides.length);
  }
  await pptx.writeFile({ fileName: nomeArquivo });
}

/* ===================== Criação de apresentações ===================== */
const novoSlide = (tipo, extra = {}) => ({ id: uid(), tipo, tema: LAYOUTS[tipo].tema0 || '', notas: '', ...LAYOUTS[tipo].novo(), ...extra });
const novaApresentacao = () => ({ id: uid(), titulo: 'Apresentação do Relatório Trimestral', tema: 'verde', slides: [novoSlide('capa'), novoSlide('texto')], atualizado: Date.now() });

/* Exemplo com um slide de cada modelo (baseado na apresentação do 4º trimestre/2025) */
function apresentacaoExemplo() {
  const S = (tipo, extra) => novoSlide(tipo, extra);
  return {
    id: uid(), titulo: 'Exemplo – Apresentação Trimestral', tema: 'verde', atualizado: Date.now(),
    slides: [
      S('capa', { estilo: 'foto', numero: '02/26' }),
      S('capa', { estilo: 'centro', numero: '04/25' }),
      S('agenda'),
      S('divisor', { titulo: 'Divisão de Gestão de Riscos – DIGER', tema: 'verde' }),
      S('indicadores'),
      S('grafico'),
      S('grafico', { modo: 'rosca', titulo: 'Processos analisados – conformidade', series: ['Sem ressalvas #276645', 'Apontamentos #004A80', 'Aprimoramento #D0A010'], dados: ['Sem ressalvas | 67', 'Apontamentos | 11', 'Aprimoramento | 46'], centro: '124', texto: '', fonte: '' }),
      S('grafico', { modo: 'colunas', titulo: 'Demandas sem ressalvas', series: ['Analisadas #276645', 'Apontamentos #6685A2', 'Aprimoramento #004A80'], dados: ['1º TRIMESTRE 2025 | 125 | 3 | 37', '2º TRIMESTRE 2025 | 134 | 11 | 15', '3º TRIMESTRE 2025 | 163 | 12 | 36', '4º TRIMESTRE 2025 | 120 | 16 | 25'], texto: '', fonte: '' }),
      S('grafico', { modo: 'empilhadas', titulo: 'Matrizes de risco em monitoramento', series: ['A iniciar #004A80', 'Em desenvolvimento #F1C232', 'Entregue #38C47C'], dados: ['Tecnologia da informação | 34 | 16 | 75', 'Corporativa | 1 | 4 | 10'], texto: 'A Matriz Institucional de Riscos de Governança de TI possui 34 eventos de riscos associados a 125 planos originais a serem desenvolvidos.', fonte: '' }),
      S('divisor', { titulo: 'Divisão de Compliance – DICOP', tema: 'aco' }),
      S('destaques', { tema: 'aco', titulo: 'Destaques do 4º trimestre', itens: ['Nova revisão dos RVCs de Cessão e Doação de imóveis da Terracap.', 'Análise de conformidade da apuração de conduta conduzida pela Comissão de Ética – COET. Denúncia registrada por cidadão via Participa-DF, de suposta infração ética praticada por empregado da TERRACAP.', 'Análise das alterações propostas à Política de Gestão de Riscos (172675057), que estabelece os princípios, as diretrizes, as responsabilidades e o processo de gestão de riscos na Terracap.', 'Proposição de transmutação do normativo interno de pesquisa de preços para aquisição de bens e contratação de serviços em geral.'] }),
      S('tabela', { tema: 'azul' }),
      S('beneficios'),
      S('divisor', { titulo: 'Coordenação de Tecnologia da Informação e Inovação – COTIN', tema: 'dourado' }),
      S('faixas', { tema: 'dourado' }),
      S('textoimagem', { tema: 'dourado' }),
      S('texto', { tema: 'azul', destaque: 'Destaque do trimestre: **95 produtos** de riscos de governança entregues.' }),
      S('imagem', { tema: 'dourado' }),
    ],
  };
}

/* Converte os tópicos de um relatório em slides (texto → slide de texto; números → indicadores; tabela → tabela; gráfico → gráfico) */
function slidesDeRelatorio(r, { capa = false } = {}) {
  const tema = r.meta.tema || 'dourado', out = [], base = tema === 'pers' ? { tema, cor: r.meta.cor } : { tema };
  if (capa) out.push(novoSlide('capa', { estilo: 'centro', titulo: 'Relatório Trimestral', numero: r.meta.numero, orgao: r.meta.orgao, tema: 'verde' }));
  out.push(novoSlide('divisor', { titulo: r.meta.setor, ...base }));
  const partir = (titulo, txt) => { // quebra textos longos em vários slides
    const ps = String(txt).split(/\n\s*\n/).filter(x => x.trim()), grupos = []; let atual = '';
    ps.forEach(p => { if (atual && (atual + p).length > 1100) { grupos.push(atual); atual = ''; } atual += (atual ? '\n\n' : '') + p; });
    if (atual) grupos.push(atual);
    grupos.forEach((g, i) => out.push(novoSlide('texto', { ...base, titulo: i ? titulo + ' (cont.)' : titulo, texto: g, destaque: '' })));
  };
  if ((r.resumo || '').trim()) partir('Resumo do trimestre', r.resumo);
  (r.secoes || []).forEach(sc => {
    let txt = '';
    const add = t => { txt += (txt ? '\n\n' : '') + t; };
    (sc.itens || []).forEach(it => {
      switch (it.tipo) {
        case 'texto': add(it.texto); break;
        case 'subtitulo': add(`**${it.texto}**`); break;
        case 'destaque': add((it.rotulo ? `**${it.rotulo}** ` : '') + it.texto); break;
        case 'resultados': add((it.titulo ? `**${it.titulo}**\n` : '') + (it.linhas || []).map(l => '• ' + l).join('\n')); break;
        case 'lista': add((it.titulo ? `**${it.titulo}**\n` : '') + (it.linhas || []).map(l => '• ' + l).join('\n')); break;
        case 'barra': add(`**${it.percentual}%** ${it.legenda || ''}`.trim()); break;
      }
    });
    if (txt.trim()) partir(sc.titulo, txt);
    (sc.itens || []).forEach(it => {
      if (it.tipo === 'kpis' && (it.cards || []).length) out.push(novoSlide('indicadores', { ...base, titulo: sc.titulo, cards: it.cards.slice(0, 4).map(c => ({ rotulo: c.rotulo, valor: c.valor })), tituloLista: '', itens: [] }));
      else if (it.tipo === 'tabela') out.push(novoSlide('tabela', { ...base, titulo: sc.titulo, colunas: [...(it.colunas || [])], linhas: [...(it.linhas || [])] }));
      else if (it.tipo === 'grafico') out.push(novoSlide('grafico', { ...base, titulo: it.titulo || sc.titulo, modo: it.modo || 'colunas', series: [...(it.series || [])], dados: [...(it.dados || [])], fonte: it.fonte || '', texto: '', centro: '' }));
      else if (it.tipo === 'imagem' && it.src) out.push(novoSlide('imagem', { ...base, titulo: sc.titulo, imagem: it.src, legenda: it.legenda || '' }));
    });
    if (!txt.trim() && !(sc.itens || []).some(it => ['kpis', 'tabela', 'grafico', 'imagem'].includes(it.tipo))) out.push(novoSlide('texto', { ...base, titulo: sc.titulo, texto: '', destaque: '' }));
  });
  return out;
}

/* Resumo executivo: escolhe, sem IA externa, as frases com mais números e verbos de resultado e monta poucos slides */
function slidesResumoDeRelatorio(r, { capa = false } = {}) {
  const tema = r.meta.tema || 'dourado', out = [], base = tema === 'pers' ? { tema, cor: r.meta.cor } : { tema };
  const limpa = t => String(t || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const frases = [];
  const add = (txt, sec, peso = 0) => limpa(txt).split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).forEach((f, i) => { if (f.length >= 50 && f.length <= 420) frases.push({ f, sec, ordem: frases.length, peso: peso + (i === 0 ? 1 : 0) }); });
  add(r.resumo, -1, 1);
  (r.secoes || []).forEach((sc, si) => (sc.itens || []).forEach(it => { if (['texto', 'destaque'].includes(it.tipo)) add((it.rotulo ? it.rotulo + ' ' : '') + it.texto, si); else if (it.tipo === 'resultados') (it.linhas || []).forEach(l => add(l + '.', si)); }));
  const KW = /(entreg|implant|conclu|finaliz|reduz|redu[cç]|aument|ampli|atingi|alcan[cç]|aprovad|automat|bloque|moderniz|economi|ader[eê]ncia|disponibilidade|satisfa)/i;
  frases.forEach(x => { x.pt = (x.f.match(/\d[\d.,]*\s*(%|mil|milh)?/g) || []).length * 2 + (/%/.test(x.f) ? 2 : 0) + (KW.test(x.f) ? 2 : 0) + x.peso - Math.max(0, x.f.length - 260) / 60; });
  const usadas = new Map(), escolhidas = [];
  [...frases].sort((a, b) => b.pt - a.pt).forEach(x => { if (escolhidas.length >= 10 || (usadas.get(x.sec) || 0) >= 2) return; usadas.set(x.sec, (usadas.get(x.sec) || 0) + 1); escolhidas.push(x); });
  escolhidas.sort((a, b) => a.ordem - b.ordem);
  const corta = s => s.length <= 240 ? s : s.slice(0, 237).replace(/\s+\S*$/, '') + '…';
  if (capa) out.push(novoSlide('capa', { estilo: 'centro', titulo: 'Relatório Trimestral', numero: r.meta.numero, orgao: r.meta.orgao, tema: 'verde' }));
  out.push(novoSlide('divisor', { titulo: r.meta.setor, ...base }));
  const cards = []; (r.secoes || []).forEach(sc => (sc.itens || []).forEach(it => { if (it.tipo === 'kpis') it.cards.forEach(c => { if (c.valor && cards.length < 4) cards.push({ rotulo: c.rotulo, valor: c.valor }); }); }));
  if (cards.length) out.push(novoSlide('indicadores', { ...base, titulo: 'Principais números do trimestre', cards, tituloLista: '', itens: [] }));
  for (let i = 0; i < escolhidas.length; i += 5) out.push(novoSlide('destaques', { ...base, titulo: i ? 'Destaques do trimestre (cont.)' : 'Destaques do trimestre', itens: escolhidas.slice(i, i + 5).map(x => corta(x.f)) }));
  return out;
}
