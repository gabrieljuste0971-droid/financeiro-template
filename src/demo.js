/**
 * Dados de exemplo — a tela nasce viva e mostrando cada recurso em uso.
 *
 * Tudo aqui é fictício e relativo ao mês de hoje (assim gráfico, alertas e
 * painéis têm o que mostrar em qualquer data). Para começar vazio, tire o
 * `inicial` do adaptador em src/App.jsx — ou clique em "Começar do zero".
 *
 * O que cada bloco demonstra está comentado junto do dado.
 */
import { HOJE, mesVizinho } from "./financeiro/modelo";

const MES = HOJE.slice(0, 7);
const DIA_HOJE = Number(HOJE.slice(8, 10));
const dois = (n) => String(n).padStart(2, "0");
const MESES_DE_HISTORICO = 11; // com o mês atual, enche o gráfico de 12 meses

/** Série de repetição mensal: id fixo, pra mesma linha se reconhecer mês a mês. */
const serie = (n) => `00000000-0000-4000-a000-${String(n).padStart(12, "0")}`;

export function dadosDeExemplo() {
  let seq = 0;
  const id = () => `demo-${++seq}`;

  /* ── Clientes (tomadores de nota) ─────────────────────────────────────────
     Um com CNPJ (a fila de notas copia o número), um com CPF e os demais sem
     documento (a fila oferece cadastrar na hora). */
  const clientes = [
    { id: "demo-c1", nome: "Clínica Aurora", apelidos: ["Aurora"], docTipo: "cnpj", doc: "11.222.333/0001-81", razaoSocial: "Clínica Aurora Ltda", cidade: "Curitiba", estado: "PR" },
    { id: "demo-c2", nome: "Café Brisa", apelidos: ["Brisa"], docTipo: "cnpj", doc: "" },
    { id: "demo-c3", nome: "Lume Arquitetura", apelidos: ["Lume"], docTipo: "cnpj", doc: "" },
    { id: "demo-c4", nome: "Estúdio Norte", apelidos: [], docTipo: "cpf", doc: "111.444.777-35" },
    { id: "demo-c5", nome: "Padaria Sol", apelidos: [], docTipo: "cnpj", doc: "" },
  ];

  /* ── Clientes fixos por contrato ──────────────────────────────────────────
     A mensalidade aparece sozinha todo mês. `desde` é há quantos meses o
     cliente entrou — a carteira cresce ao longo do histórico. */
  const carteira = [
    { clienteId: "demo-c1", valor: 2500, diaVencimento: 5, desde: 11 },
    { clienteId: "demo-c2", valor: 1800, diaVencimento: 10, desde: 8 },
    { clienteId: "demo-c3", valor: 3200, diaVencimento: 15, desde: 5 },
  ];
  const contratos = carteira.map(({ clienteId, valor, diaVencimento }) => ({ clienteId, valor, diaVencimento }));

  /* ── Linhas que se repetem por série (ícone de repetição na linha) ──────── */
  // Cliente fixo sem contrato: lançado uma vez com "repetir" ligado.
  const fixoPorSerie = { serieId: serie(10), descricao: "Padaria Sol — gestão mensal", categoria: "recorrente", valor: 1200, dia: 1, clienteId: "demo-c5", desde: 3 };
  const saidasFixas = [
    { serieId: serie(1), descricao: "Assinaturas de software", categoria: "ferramentas", valor: 420, dia: 2, desde: 11 },
    { serieId: serie(2), descricao: "Contabilidade", categoria: "estrutura", valor: 350, dia: 10, desde: 11 },
    { serieId: serie(3), descricao: "Marina — design", categoria: "equipe", valor: 2200, dia: 5, desde: 9 },
    { serieId: serie(4), descricao: "Rafael — tráfego", categoria: "parceiro", valor: 1500, dia: 10, desde: 4 },
  ];
  const semDesde = ({ desde, ...resto }) => resto; // eslint-disable-line no-unused-vars

  const lancamentos = [];
  const entra = (l) => lancamentos.push({ id: id(), tipo: "entrada", pago: false, notaEmitida: false, clienteId: null, ...l });
  const sai = (l) => lancamentos.push({ id: id(), tipo: "saida", pago: false, clienteId: null, ...l });
  /** Já pago e, se for entrada, com nota emitida — o estado de mês fechado. */
  const quitado = (mes, dia) => ({ pago: true, pagoEm: `${mes}-${dois(dia)}`, notaEmitida: true });

  /* ── Histórico: meses fechados, do mais antigo ao mês passado ───────────── */
  const PROJETOS = [
    ["Site institucional — Vila Verde", 3800], null, ["Identidade visual — Ótica Prisma", 4500],
    ["E-commerce — Empório Canto", 5200], null, ["Landing page — Dra. Helena", 3500],
    ["Site institucional — Grupo Atlas", 6800], null, ["Manual de marca — Estúdio Norte", 4200],
    ["Apresentação comercial — Lume", 5600], null,
  ];
  const RETIRADAS = [0, 0, 1000, 0, 1500, 0, 2500, 0, 1800, 0, 2000];

  for (let k = MESES_DE_HISTORICO; k >= 1; k--) {
    const mes = mesVizinho(MES, -k);
    const i = MESES_DE_HISTORICO - k; // 0 = mês mais antigo
    let entrou = 0;

    for (const c of carteira.filter((x) => x.desde >= k)) {
      const cliente = clientes.find((x) => x.id === c.clienteId);
      entra({ mes, descricao: cliente.nome, categoria: "recorrente", valor: c.valor, dia: c.diaVencimento, clienteId: c.clienteId, origem: "contrato", ...quitado(mes, c.diaVencimento) });
      entrou += c.valor;
    }
    if (fixoPorSerie.desde >= k) {
      entra({ mes, ...semDesde(fixoPorSerie), recorrente: true, ...quitado(mes, fixoPorSerie.dia) });
      entrou += fixoPorSerie.valor;
    }
    if (PROJETOS[i]) {
      const [descricao, valor] = PROJETOS[i];
      entra({ mes, descricao, categoria: "projeto", parcela: "integral", valor, dia: 18, ...quitado(mes, 18) });
      entrou += valor;
    }
    if (i % 2 === 1) {
      const valor = 297 * (1 + (i % 3));
      entra({ mes, descricao: "Template de proposta", categoria: "produto", valor, dia: 25, pago: true, pagoEm: `${mes}-25` });
      entrou += valor;
    }
    if (i % 4 === 1) {
      entra({ mes, descricao: "Comissão — indicação de fotógrafo", categoria: "comissao", valor: 450, dia: 27, ...quitado(mes, 27) });
      entrou += 450;
    }

    for (const f of saidasFixas.filter((x) => x.desde >= k)) {
      sai({ mes, ...semDesde(f), recorrente: true, pago: true, pagoEm: `${mes}-${dois(f.dia)}` });
    }
    sai({ mes, descricao: "Impostos (DAS)", categoria: "impostos", valor: Math.round(entrou * 0.06), dia: 20, pago: true, pagoEm: `${mes}-20` });
    sai({ mes, descricao: "Pró-labore", categoria: "prolabore", valor: k > 8 ? 2500 : k > 4 ? 3500 : 5000, dia: 5, pago: true, pagoEm: `${mes}-05` });
    if (RETIRADAS[i]) {
      sai({ mes, descricao: "Retirada de lucro", categoria: "lucro", valor: RETIRADAS[i], dia: 28, pago: true, pagoEm: `${mes}-28` });
    }
    sai({ mes, descricao: "Anúncios", categoria: "marketing", valor: 500 + i * 40, dia: 12, pago: true, pagoEm: `${mes}-12` });
    if (i % 3 === 0) {
      sai({ mes, descricao: "Redação — textos de site", categoria: "freela", parcela: "integral", valor: 700, dia: 16, pago: true, pagoEm: `${mes}-16` });
    }
    if (i % 5 === 2) {
      sai({ mes, descricao: "Curso de precificação", categoria: "x_cursos_demo", valor: 397, dia: 9, pago: true, pagoEm: `${mes}-09` });
    }
  }

  /* ── Mês passado: de onde vêm os "Falta 50%" ────────────────────────────── */
  const passado = mesVizinho(MES, -1);
  // Sinal cuja 2ª metade JÁ foi lançada (está no mês atual): sai da lista.
  entra({ mes: passado, descricao: "Landing page — Café Brisa", categoria: "projeto", parcela: "sinal", valor: 1900, dia: 22, clienteId: "demo-c2", saldoQuitado: true, ...quitado(passado, 22) });
  // Sinal ainda sem a 2ª metade: aparece em "Falta 50% · A receber".
  entra({ mes: passado, descricao: "Identidade visual — Padaria Sol", categoria: "projeto", parcela: "sinal", valor: 1400, dia: 24, clienteId: "demo-c5", ...quitado(passado, 24) });
  entra({ mes: passado, descricao: "Consultoria — parcela 1/6", categoria: "parcelado", valor: 1450, dia: 15, pago: true, pagoEm: `${passado}-15` });

  /* ── Mês atual: um de cada estado ───────────────────────────────────────── */
  /** Data de baixa que nunca cai no futuro. */
  const pagoEm = (dia) => `${MES}-${dois(Math.min(dia, DIA_HOJE))}`;
  const pago = (dia) => ({ pago: true, pagoEm: pagoEm(dia) });

  // Clientes fixos. Aurora já pagou e a nota ainda não saiu → fila de notas,
  // com o CNPJ pronto pra copiar. Café Brisa e Lume aparecem sozinhos, do
  // contrato. Padaria Sol vem da série e vence no dia 1 → alerta de atraso.
  entra({ mes: MES, descricao: "Clínica Aurora", categoria: "recorrente", valor: 2500, dia: 5, clienteId: "demo-c1", origem: "contrato", ...pago(5) });

  // Projetos: sinal de 50% recebido (entra em "Falta 50%" e na fila de notas,
  // com CPF), 2ª metade de um sinal antigo, e um valor cheio a vencer.
  entra({ mes: MES, descricao: "Site — Estúdio Norte", categoria: "projeto", parcela: "sinal", valor: 3100, dia: 2, clienteId: "demo-c4", ...pago(2) });
  entra({ mes: MES, descricao: "Landing page — Café Brisa", categoria: "projeto", parcela: "saldo", valor: 1900, dia: 22, clienteId: "demo-c2" });
  entra({ mes: MES, descricao: "Identidade — Ateliê Flora", categoria: "projeto", parcela: "integral", valor: 2400, dia: 20 });
  // Sem cliente vinculado: o tomador é achado pelo nome citado na descrição.
  // Pago e com nota emitida → conta no anel de progresso das notas.
  entra({ mes: MES, descricao: "Workshop de marca — Lume Arquitetura", categoria: "projeto", parcela: "integral", valor: 1800, dia: 1, ...pago(1), notaEmitida: true });

  // Parcelados e outras receitas: seções sem dia fixo (só "Pago em") e fora
  // do controle de nota. "Mentoria" é uma categoria criada pela tela.
  entra({ mes: MES, descricao: "Consultoria — parcela 2/6", categoria: "parcelado", valor: 1450, dia: 15 });
  entra({ mes: MES, descricao: "Template de proposta", categoria: "produto", valor: 594, dia: 1, ...pago(1) });
  entra({ mes: MES, descricao: "Comissão — indicação de fotógrafo", categoria: "comissao", valor: 450, dia: 27 });
  entra({ mes: MES, descricao: "Mentoria — Júlia Prado", categoria: "x_mentoria_demo", valor: 600, dia: 2, ...pago(2) });

  // Saídas fixas: a de software já foi paga; contabilidade, Marina e Rafael
  // aparecem sozinhas pela série, ainda em aberto.
  sai({ mes: MES, ...semDesde(saidasFixas[0]), recorrente: true, ...pago(2) });
  // Sem valor ainda → alerta "lançamento sem valor" e botão "definir".
  sai({ mes: MES, descricao: "Impostos (DAS)", categoria: "impostos", valor: 0, dia: 20 });
  sai({ mes: MES, descricao: "Renovação de domínios", categoria: "estrutura", valor: 180, dia: 25 });

  // Pró-labore (despesa) × retirada de lucro (não é despesa: sai do caixa,
  // mas não derruba o lucro do mês).
  sai({ mes: MES, descricao: "Pró-labore", categoria: "prolabore", valor: 5000, dia: 5 });
  sai({ mes: MES, descricao: "Retirada de lucro", categoria: "lucro", valor: 1500, dia: 2, ...pago(2) });

  // Variáveis. O freelancer recebeu 50% adiantado → "Falta 50% · A pagar".
  sai({ mes: MES, descricao: "Redação — textos do site", categoria: "freela", parcela: "sinal", valor: 600, dia: 2, ...pago(2) });
  sai({ mes: MES, descricao: "Anúncios", categoria: "marketing", valor: 900, dia: 12 });
  sai({ mes: MES, descricao: "Banco de imagens", categoria: "outros", valor: 180, dia: 18 });
  // Seção e categoria criadas pela tela (botão "Categorias").
  sai({ mes: MES, descricao: "Curso de gestão financeira", categoria: "x_cursos_demo", valor: 497, dia: 1, ...pago(1) });

  /* ── Mês que vem: o que já está combinado ───────────────────────────────── */
  const proximo = mesVizinho(MES, 1);
  entra({ mes: proximo, descricao: "Site institucional — Clínica Aurora", categoria: "projeto", parcela: "integral", valor: 6800, dia: 12, clienteId: "demo-c1" });
  entra({ mes: proximo, descricao: "Consultoria — parcela 3/6", categoria: "parcelado", valor: 1450, dia: 15 });
  sai({ mes: proximo, descricao: "Evento de design — ingresso", categoria: "x_cursos_demo", valor: 350, dia: 8 });

  return {
    clientes,
    contratos,
    lancamentos,
    config: {
      saldoBase: 8000,
      meta: 15000,
      // 100% / 50% ligado em projetos (a receber) e em freelancers (a pagar).
      categoriasParcela: ["projeto", "freela"],
      // Criados pela tela: uma seção de saída inteira e uma categoria de entrada.
      grupos: [{ id: "s_educacao_demo", tipo: "saida", label: "Educação e eventos", hint: "seção personalizada", variavel: true }],
      categorias: [
        { id: "x_cursos_demo", tipo: "saida", grupo: "s_educacao_demo", label: "Cursos e eventos", cor: "#0891b2" },
        { id: "x_mentoria_demo", tipo: "entrada", grupo: "pontuais", label: "Mentoria", cor: "#7c3aed" },
      ],
      // Apelido dado a uma categoria padrão.
      rotulos: { "c:marketing": "Tráfego e anúncios" },
    },
  };
}
