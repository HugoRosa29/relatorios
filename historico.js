'use strict';
/* ===== Histórico de versões (como o do Google Docs) =====
   Cada versão é um retrato do relatório. As imagens ficam num depósito à parte, uma só vez cada,
   e as versões apontam para elas ("@img:<código>"), então guardar muitas versões não pesa. */
const VERS_MAX = 40;          // versões por relatório (as nomeadas são as últimas a serem descartadas)
const ORFAS_DIAS = 30;        // versões de relatórios já excluídos somem depois disso

const idbReq = r => new Promise((ok, erro) => { r.onsuccess = () => ok(r.result); r.onerror = () => erro(r.error); });
const idbTx = t => new Promise((ok, erro) => { t.oncomplete = () => ok(); t.onerror = t.onabort = () => erro(t.error); });

function codigoImagem(s) { // resumo rápido do conteúdo (cyrb53) + tamanho
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36) + s.length.toString(36);
}
function empacotar(r, imgs) { // cópia do relatório com as imagens trocadas por referências
  return JSON.parse(JSON.stringify(r, (k, v) => {
    if (k === '_aberta' || k === 'atualizado') return undefined; // estado da tela, não conteúdo
    if (typeof v === 'string' && v.startsWith('data:image')) { const h = codigoImagem(v); imgs.set(h, v); return '@img:' + h; }
    return v;
  }));
}
async function hidratar(dados) { // devolve o relatório com as imagens de volta
  const txt = JSON.stringify(dados);
  const hs = [...new Set([...txt.matchAll(/@img:([0-9a-z]+)/g)].map(m => m[1]))];
  const db = await abrirDB(); const mapa = {};
  try { for (const h of hs) mapa[h] = await idbReq(db.transaction('imagens').objectStore('imagens').get(h)); } finally { db.close(); }
  return JSON.parse(txt.replace(/@img:([0-9a-z]+)/g, (_, h) => mapa[h] || ''));
}

async function listarVersoes(relId, dbAberto) {
  const db = dbAberto || await abrirDB();
  try {
    const l = await idbReq(db.transaction('versoes').objectStore('versoes').index('rel').getAll(relId));
    return l.sort((a, b) => b.t - a.t);
  } finally { if (!dbAberto) db.close(); }
}

/* Cria uma versão. Sem `rotulo`, não cria se nada mudou desde a última. */
async function criarVersao(r, { rotulo = '', auto = true } = {}) {
  const imgs = new Map(); const dados = empacotar(r, imgs); // síncrono: fotografa o estado deste instante
  const db = await abrirDB();
  try {
    const ult = (await listarVersoes(r.id, db))[0];
    if (ult && !rotulo && JSON.stringify(ult.dados) === JSON.stringify(dados)) return null;
    const tx = db.transaction(['imagens', 'versoes'], 'readwrite'); const si = tx.objectStore('imagens');
    for (const [h, v] of imgs) si.getKey(h).onsuccess = e => { if (e.target.result === undefined) si.put(v, h); };
    const ver = { id: uid(), rel: r.id, t: Date.now(), rotulo, auto, n: (r.secoes || []).length, dados };
    tx.objectStore('versoes').put(ver);
    await idbTx(tx);
    await podarVersoes(r.id, db);
    return ver;
  } finally { db.close(); }
}

async function podarVersoes(relId, db) {
  // 1) leituras
  const lista = await listarVersoes(relId, db); const apagar = [];
  const sobra = () => lista.filter(v => !apagar.includes(v));
  while (sobra().length > VERS_MAX) {
    const cand = sobra().slice().reverse(); // da mais antiga para a mais nova
    apagar.push(cand.find(v => v.auto && !v.rotulo) || cand[0]);
  }
  const todas = await idbReq(db.transaction('versoes').objectStore('versoes').getAll());
  const vivos = new Set(state.reports.map(x => x.id));
  const limite = Date.now() - ORFAS_DIAS * 864e5;
  todas.forEach(v => { if (!vivos.has(v.rel) && v.t < limite && !apagar.includes(v)) apagar.push(v); });
  const usadas = new Set();
  todas.filter(v => !apagar.includes(v)).forEach(v => { for (const m of JSON.stringify(v.dados).matchAll(/@img:([0-9a-z]+)/g)) usadas.add(m[1]); });
  const chaves = await idbReq(db.transaction('imagens').objectStore('imagens').getAllKeys());
  const soltas = chaves.filter(k => !usadas.has(k));
  if (!apagar.length && !soltas.length) return;
  // 2) escrita, numa transação só
  const tx = db.transaction(['versoes', 'imagens'], 'readwrite');
  apagar.forEach(v => tx.objectStore('versoes').delete(v.id));
  soltas.forEach(k => tx.objectStore('imagens').delete(k));
  await idbTx(tx);
}
