'use strict';
/* ===== Dados compartilhados: lista de relatórios (index.html) e editor (editor.html) ===== */
const KEY = 'relatorios-trimestrais-v2';
const uid = () => Math.random().toString(36).slice(2, 9);
const $ = id => document.getElementById(id);

const TEMAS = { dourado: 'Dourado (COTIN)', verde: 'Verde (Controladoria / DIGER)', azul: 'Azul (CORED)', aco: 'Azul-aço (DICOP)' };
const COR = { dourado: '#D0A010', verde: '#276645', azul: '#004A80', aco: '#4D82A4' };

const novoRelatorio = () => ({
  id: uid(),
  meta: { setor: 'Coordenação de Tecnologia da Informação e Inovação – COTIN', sigla: 'COINT', numero: '01/26', paginaInicial: 1, tema: 'dourado', capa: '', orgao: 'Controladoria Interna', capaGeral: false, capaGeralFoto: '', sumario: true, contracapa: false },
  resumo: '', resumoImagem: '', resumoAltura: 520,
  secoes: [],
});

let state = { reports: [] };
let atualId = null; // relatório aberto no editor (vem da URL)

/* Armazenamento: IndexedDB (aguenta relatórios com muitas imagens); localStorage só como reserva */
const DB_NOME = 'relatorios-trimestrais', DB_LOJA = 'kv';
const abrirDB = () => new Promise((ok, erro) => {
  const q = indexedDB.open(DB_NOME, 2);
  q.onupgradeneeded = () => {
    const db = q.result;
    if (!db.objectStoreNames.contains(DB_LOJA)) db.createObjectStore(DB_LOJA);
    if (!db.objectStoreNames.contains('imagens')) db.createObjectStore('imagens');
    if (!db.objectStoreNames.contains('versoes')) db.createObjectStore('versoes', { keyPath: 'id' }).createIndex('rel', 'rel');
  };
  q.onsuccess = () => ok(q.result); q.onerror = () => erro(q.error);
});
async function lerEstado() {
  try {
    const db = await abrirDB();
    return await new Promise(ok => { const r = db.transaction(DB_LOJA).objectStore(DB_LOJA).get('estado'); r.onsuccess = () => { db.close(); ok(r.result || null); }; r.onerror = () => { db.close(); ok(null); }; });
  } catch (e) {
    try { const o = JSON.parse(localStorage.getItem(KEY)); return o && Array.isArray(o.reports) ? o : null; } catch (e2) { return null; }
  }
}
async function gravarEstado() {
  const dados = { reports: state.reports };
  try {
    const db = await abrirDB();
    return await new Promise(ok => {
      const t = db.transaction(DB_LOJA, 'readwrite'); t.objectStore(DB_LOJA).put(dados, 'estado');
      t.oncomplete = () => { db.close(); ok(true); }; t.onerror = t.onabort = () => { db.close(); ok(false); };
    });
  } catch (e) {
    try { localStorage.setItem(KEY, JSON.stringify(dados)); return true; } catch (e2) { return false; }
  }
}
function normalizar(s) {
  s.reports.forEach(r => { if (!r.meta.sumarioPadrao) { r.meta.sumario = true; r.meta.sumarioPadrao = true; } r.secoes ||= []; });
  return s;
}
/* Carrega os relatórios salvos. Na primeira vez traz os do armazenamento antigo (localStorage) ou cria o exemplo. */
async function carregar() {
  let s = await lerEstado(), migrar = false;
  if (!s) {
    try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && Array.isArray(o.reports)) { s = o; migrar = true; } } catch (e) {}
  }
  if (!s) { s = { reports: [exemplo()] }; migrar = true; }
  state = normalizar(s);
  if (migrar && await gravarEstado()) { try { localStorage.removeItem(KEY); } catch (e) {} }
  return state;
}
/* Gravação: sempre a mais recente, uma de cada vez. Devolve uma promessa (true = salvou). */
const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('relatorios-trimestrais') : null;
let gravando = null, sujo = false;
function persistir() {
  sujo = true;
  if (!gravando) gravando = (async () => {
    let ok = true;
    while (sujo) { sujo = false; ok = await gravarEstado() && ok; }
    gravando = null; if (ok && canal) canal.postMessage('mudou');
    return ok;
  })();
  return gravando;
}
const aguardarGravacao = () => gravando || Promise.resolve(true);
/* avisa quando OUTRA aba altera os dados (já recarregados em `state`) */
function aoMudarEmOutraAba(fn) {
  if (canal) canal.onmessage = async () => { const s = await lerEstado(); if (s) { state = normalizar(s); fn(); } };
}
const R = () => state.reports.find(r => r.id === atualId);

/* Copia um tópico de outro relatório, com ids novos (o original não é afetado) */
const ctxDe = x => ({ tema: x.meta.tema, sigla: x.meta.sigla, numero: x.meta.numero });
function clonarSecao(s, origem, ctx) {
  const c = JSON.parse(JSON.stringify(s));
  c.id = uid(); delete c._aberta; c.origem = origem; c.ctx = ctx; // ctx: tema e cabeçalho do relatório de origem
  (c.itens || []).forEach(it => { it.id = uid(); });
  return c;
}

/* ===== Exemplo: conteúdo do relatório 02/26 COTIN ===== */
function exemplo() {
  const t = (texto) => ({ id: uid(), tipo: 'texto', texto });
  const d = (rotulo, texto) => ({ id: uid(), tipo: 'destaque', rotulo, texto });
  return {
    id: uid(),
    meta: { setor: 'Coordenação de Tecnologia da Informação e Inovação – COTIN', sigla: 'COINT', numero: '02/26', paginaInicial: 26, tema: 'dourado', capa: '', orgao: 'Controladoria Interna', capaGeral: false, capaGeralFoto: '', sumario: true, contracapa: false },
    resumo: 'No 2º trimestre de 2026, a Coordenação de Tecnologia da Informação e Inovação da Terracap avançou na entrega de produtos de riscos corporativos de tecnologia atingindo a marca de 95 produtos entregues. Também priorizou projetos que auxiliam a experiência do cliente. Medidas importantes de segurança foram continuadas, como o envio quinzenal de relatório de segurança para alta administração e o monitoramento 24h contra ataques externos.\n\nNa parte de sistemas, a COTIN deu mais um passo para melhorar a experiência dos clientes tornando a renegociação de dívidas 100% digital e implantando o PIX nos financiamentos. Também implantou novas regras de negócio na venda direta viabilizando a entrada de recursos da empresa.\n\nNa segurança cibernética a TI manteve o percentual de aderência de 88,9% ao modelo de segurança CIS CONTROLS V8, promoveu a migração de rede cabeada para Wi-Fi nos computadores da empresa para otimizar o uso dos recursos de rede ao mesmo tempo que protegeu a empresa de invasões externas.\n\nFinalmente, a COTIN modernizou a estrutura de rede da Biotic garantindo maior estabilidade e disponibilidade da rede e ampliação da cobertura do sinal Wi-Fi.',
    resumoImagem: '', resumoAltura: 520,
    secoes: [
      { id: uid(), titulo: 'Projeto "Data Science" – Agenda 01 – Desenvolvimento de Painéis', quebra: true, itens: [
        t('O projeto Data Science abrangeu um total de 145 painéis, quase todos já finalizados, representando um avanço significativo para a empresa. Foram criados painéis com informação estratégica para todas as diretorias da Terracap, além de BIOTIC e ETR. Todos os painéis finalizados já foram embarcados na plataforma BI HUB. O próximo passo é a disponibilização da plataforma aos empregados.'),
        { id: uid(), tipo: 'barra', titulo: '', percentual: 100, legenda: 'FINALIZADO' },
      ] },
      { id: uid(), titulo: 'Entregas Agenda 01 – Inteligência de Dados – Produtos', quebra: false, itens: [{ id: uid(), tipo: 'barra', titulo: '', percentual: 100, legenda: 'ENTREGUES' }] },
      { id: uid(), titulo: 'Entregas Agenda 02 – Governança de T.I', quebra: false, itens: [{ id: uid(), tipo: 'barra', titulo: '', percentual: 100, legenda: 'ENTREGUES' }] },
      { id: uid(), titulo: 'Entregas Agenda 03 – Cibersegurança', quebra: false, itens: [{ id: uid(), tipo: 'barra', titulo: '', percentual: 100, legenda: 'ENTREGUES' }] },
      { id: uid(), titulo: 'Riscos de governança de tecnologia', quebra: true, itens: [
        t('Em 2024 foi aprovada a matriz de riscos de governança de tecnologia com o total de 132 produtos a serem entregues até 2026. Até o momento foram entregues 95 produtos sendo que 4 encontram-se em avaliação pela Divisão de Gestão de Riscos da Terracap. Especificamente no 2º trimestre de 2026 foram entregues 12 produtos de risco.'),
      ] },
      { id: uid(), titulo: 'Renegociação de dívidas 100% digital', quebra: true, itens: [
        t('Dando continuidade à modernização da gestão de recebíveis descrita no relatório do 1º trimestre, foi entregue a segunda versão do Módulo de Renegociação de Dívidas (Imóveis Urbanos), marcando a automação total deste processo e empoderando o cliente com o autosserviço.'),
        d('Autonomia do Cliente:', 'Através do portal de serviços da Terracap, o mutuário agora realiza login pessoal, visualiza suas dívidas ativas e realiza simulações em tempo real das condições de negociação.'),
        t('**Efetivação Automatizada:** O sistema permite a geração imediata do boleto referente à entrada do acordo e a assinatura digital online do termo. Após a compensação do pagamento da entrada, a renegociação é ativada e efetivada automaticamente no sistema, espelhando a simulação escolhida, sem qualquer intervenção manual do backoffice.'),
      ] },
      { id: uid(), titulo: 'Implantação do PIX nos financiamentos', quebra: false, itens: [
        t('Para agilizar a arrecadação e oferecer mais conveniência aos clientes, a tecnologia PIX foi integrada ao faturamento da empresa.'),
        d('QR Code Dinâmico:', 'Cidadãos agora utilizam uma única credencial (CPF) para acessar os serviços e editais da Terracap, eliminando a necessidade de múltiplos cadastros e gestão de senhas dispersas.'),
        t('**Benefícios:** A medida moderniza a experiência do usuário, reduz custos transacionais bancários e acelera o tempo de conciliação financeira das parcelas.'),
      ] },
      { id: uid(), titulo: 'Impulsionamento de receitas: novas regras de Venda Direta (GOP, GSO e GAI)', quebra: true, itens: [
        t('Com o objetivo de viabilizar a entrada de recursos para a Empresa, a TI atuou fortemente na adequação sistêmica às novas regras de negócio dos editais de Venda Direta (regularização de condomínios). O novo regramento criou um modelo de venda com benefícios agressivos: desconto de 25% para financiamentos em até 60 parcelas e carência de juros (juros zero) nos 12 primeiros meses.'),
        d('Impacto no negócio:', 'A nova versão do GOP foi implantada, destravando a geração de controles. Essa mudança tem a capacidade de impulsionar dezenas de milhões de reais que se encontravam parados. A atualização permitiu aplicar as novas normas e descontos, permitindo a emissão de centenas de habilitações retroativas que aguardavam o processamento sistêmico.'),
      ] },
      { id: uid(), titulo: 'Declaração de quitação automática', quebra: true, itens: [
        t('Solucionando um dos principais gargalos de atendimento ao cidadão, o processo de emissão da Declaração de Quitação de Imóveis foi completamente reestruturado. O cliente precisava solicitar formalmente o documento após a liquidação. As áreas internas eram acionadas e **levavam até 17 dias úteis** para concluir as verificações e gerar o documento.'),
        d('Cenário Automatizado:', 'No exato momento em que o sistema acusa a baixa da última parcela, rotinas robóticas são acionadas em background. O sistema cruza as informações necessárias e gera o documento instantaneamente.\n\n**A única etapa não sistêmica restante é a assinatura digital pelos gerentes Financeiro e de Cobrança.**'),
      ] },
      { id: uid(), titulo: 'Disponibilidade de serviços', quebra: true, itens: [
        t('A infraestrutura tecnológica manteve alta estabilidade no período, com 100% de disponibilidade dos serviços, refletindo um ambiente robusto e confiável para as operações corporativas.'),
        { id: uid(), tipo: 'subtitulo', texto: 'Atendimento de chamados' },
        t('O índice de chamados atendidos dentro dos padrões de qualidade estabelecidos atingiu 99,83%, evidenciando o comprometimento da equipe técnica com a agilidade e a resolução eficaz das demandas dos usuários.'),
        { id: uid(), tipo: 'subtitulo', texto: 'Satisfação do usuário' },
        t('A avaliação de satisfação dos usuários com os serviços prestados alcançou o índice de 100%, demonstrando a eficiência no suporte e a adequação das soluções às necessidades dos colaboradores.'),
        { id: uid(), tipo: 'kpis', cards: [{ rotulo: 'Disponibilidade de serviços', valor: '100%', legenda: 'do tempo' }, { rotulo: 'Chamados atendidos', valor: '99,83%', legenda: '' }, { rotulo: 'Satisfação do usuário', valor: '100%', legenda: '' }] },
      ] },
      { id: uid(), titulo: 'Modernização da infraestrutura de rede da BIOTIC', quebra: false, itens: [
        t('Foi executada a atualização da infraestrutura de rede da unidade administrativa da BIOTIC, com o objetivo de solucionar problemas recorrentes de conectividade e desempenho. O ambiente apresentava frequentes reclamações relacionadas à instabilidade da rede Wi-Fi, baixa cobertura do sinal e gargalos na comunicação entre os computadores e a internet, em razão da obsolescência dos equipamentos.'),
        { id: uid(), tipo: 'resultados', titulo: 'Resultados:', linhas: ['Maior estabilidade e disponibilidade da rede;', 'Ampliação da cobertura do sinal Wi-Fi;', 'Eliminação dos gargalos na comunicação da rede local;', 'Melhor aproveitamento do link de internet de alta velocidade;'] },
      ] },
      { id: uid(), titulo: 'Roadmap de cibersegurança', quebra: true, itens: [
        t('As ações deste trimestre focaram na remediação de pendências críticas especificamente nos domínios de Segurança de Dados e Segurança de Softwares e Aplicações do CIS CONTROLS V8, garantindo a proteção do patrimônio digital contra vazamentos e invasões.'),
        t('O CIS CONTROLS V8 é um dos principais conjuntos de melhores práticas em segurança cibernética do mundo. A Terracap adota 88,9% de todas as práticas recomendadas.'),
        { id: uid(), tipo: 'kpis', cards: [{ rotulo: 'Percentual de aderência ao CIS Controls V8', valor: '88,9%', legenda: '' }] },
      ] },
      { id: uid(), titulo: 'Migração de rede cabeada para Wi-Fi nos computadores', quebra: false, itens: [
        t('Com o objetivo de modernizar a infraestrutura de conectividade e otimizar o uso dos recursos de rede, foi iniciada a transição dos computadores da Terracap para a rede sem fio.'),
      ] },
      { id: uid(), titulo: 'Proteção de e-mails e comunicações', quebra: false, itens: [
        { id: uid(), tipo: 'kpis', horizontal: true, cards: [{ rotulo: 'Mensagens processadas', valor: '172 mil', legenda: '' }, { rotulo: 'Bloqueios de phishing', valor: '4,3 mil', legenda: '' }, { rotulo: 'Filtragem de lixo eletrônico', valor: '41 mil', legenda: '' }] },
        t('**Volume e Eficiência:** Processamos cerca de 172 mil mensagens, retendo automaticamente 27,8% (47,8 mil e-mails) de todo o tráfego por serem classificados como indesejados ou nocivos.'),
        t('**Defesa contra fraudes:** A ferramenta bloqueou 6.534 ameaças diretas e críticas, incluindo mais de 4,3 mil tentativas de Phishing (roubo de credenciais) e 1,6 mil fraudes de falsidade ideológica corporativa (Spoofing).'),
        t('**Produtividade e Higiene:** Mais de 41 mil mensagens de lixo eletrônico genérico e campanhas agressivas foram filtradas, poupando o tempo das equipes e reduzindo o custo de armazenamento. O tráfego interno manteve-se íntegro e focado em rotinas automatizadas, sem sinais de contas comprometidas.'),
      ] },
      { id: uid(), titulo: 'Proteção do tráfego de rede', quebra: true, itens: [
        t('**Mitigação de Ataques:** O sistema interceptou 9.790 atividades de reconhecimento hostil, sendo a quase totalidade (99,64%) composta por ataques de sobrecarga (UDP Flood), que visam derrubar e indisponibilizar nossos sistemas.'),
        t('**Contenção de Ameaças Avançadas:** Para evitar que malwares roubassem dados ou assumissem o controle da nossa rede, o firewall bloqueou com 100% de sucesso mais de 4.630 conexões direcionadas a servidores criminosos (Comando e Controle).'),
        t('**Governança de Acesso:** O sistema bloqueou 97,5% das tentativas de uso de 13 aplicativos de alto risco (como VPNs pessoais e proxies que tentam burlar a segurança corporativa). Além disso, conteve mais de 20.260 tentativas de acesso a sites perigosos, incluindo 7.850 acessos a links de Phishing.'),
        { id: uid(), tipo: 'kpis', horizontal: true, cards: [{ rotulo: 'Monitoramento contra ataques', valor: '24H', legenda: '' }, { rotulo: 'Intercepção de ataques', valor: '9.790', legenda: '' }, { rotulo: 'Bloqueios a malwares', valor: '4.630', legenda: '' }] },
      ] },
      { id: uid(), titulo: 'Padronização e eficácia operacional: implementação de novos procedimentos operacionais padrão (POPs)', quebra: false, itens: [
        { id: uid(), tipo: 'lista', titulo: '', linhas: ['POP - Procedimento Operacional Padrão - Gestão de ativos de TI (205128969)', 'POP - Procedimento Operacional Padrão 1 Gestão de Acesso a Dados (201043956)', 'POP - Procedimento Operacional Padrão - Gestão do Conhecimento de TI (199649992)', 'POP - Procedimento Operacional Padrão - Gestão de Projetos, Programas e Portfólio (198343332)'] },
      ] },
    ],
  };
}
