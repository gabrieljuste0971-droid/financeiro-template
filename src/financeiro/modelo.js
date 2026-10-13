/**
 * Modelo do Financeiro — as regras, sem tela e sem banco.
 *
 * A cobrança de cliente recorrente não é digitada todo mês: ela é gerada a
 * partir do contrato (ou da série, quando a linha é marcada para repetir). O
 * que se digita é só o que foge do padrão: projeto pontual, extra, ajuste.
 *
 * As seções e categorias que já vêm prontas moram em `padroes.js` — é lá que
 * se adapta o template a outro tipo de negócio. Aqui ficam as regras que valem
 * para qualquer um.
 */
import {
  CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, GRUPOS_ENTRADA, GRUPOS_SAIDA,
  SECOES_SEM_DIA_FIXO, CATEGORIAS_SEM_NOTA, CATEGORIAS_LUCRO_DISTRIBUIDO, SUBTOTAL_EM_OUTRA_SECAO,
  SECAO_RECORRENTE, CATEGORIA_MENSALIDADE, SECAO_RESERVA, COR_PADRAO,
} from "./padroes";

export { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, GRUPOS_ENTRADA, GRUPOS_SAIDA };

/** Data de hoje no fuso local, em ISO (YYYY-MM-DD). */
function dataLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Data de referência da tela: o dia de hoje, no relógio de quem abriu. */
export const HOJE = dataLocalISO();

/* ── Grupos e categorias criados pelo usuário ─────────────────────────────────
   Além dos padrões de `padroes.js`, o usuário cria seções e categorias próprias
   pela tela (botão "Categorias"). Elas vivem em `config.grupos` e
   `config.categorias` e são injetadas aqui em runtime — assim `categoriaDe`,
   `grupoDaCategoria` e os selects resolvem id → label/cor/grupo sem props.

   Formato:
     grupo:     { id, tipo: "entrada"|"saida", label, hint, padrao, variavel }
     categoria: { id, tipo: "entrada"|"saida", label, cor, grupo }
   `variavel` marca a seção como sem dia fixo de vencimento (só "Pago em"). */
let GRUPOS_EXTRA = [];
let CATEGORIAS_EXTRA = [];

/** Injeta as seções e categorias personalizadas vindas da config. */
export function hidratarPersonalizados({ grupos, categorias } = {}) {
  GRUPOS_EXTRA = (Array.isArray(grupos) ? grupos : [])
    .filter((g) => g && g.id && g.label && (g.tipo === "entrada" || g.tipo === "saida"))
    .map((g) => ({
      id: g.id,
      tipo: g.tipo,
      label: g.label,
      hint: g.hint || "seção personalizada",
      padrao: g.padrao || null,
      variavel: !!g.variavel,
      custom: true,
    }));
  CATEGORIAS_EXTRA = (Array.isArray(categorias) ? categorias : [])
    .filter((c) => c && c.id && c.label && (c.tipo === "entrada" || c.tipo === "saida"))
    .map((c) => ({
      id: c.id,
      tipo: c.tipo,
      label: c.label,
      cor: c.cor || COR_PADRAO,
      grupo: c.grupo,
      custom: true,
    }));
}

/** Seções de um tipo: as padrão + as criadas pelo usuário. */
export const gruposDe = (tipo) => [
  ...(tipo === "entrada" ? GRUPOS_ENTRADA : GRUPOS_SAIDA),
  ...GRUPOS_EXTRA.filter((g) => g.tipo === tipo),
];

/** Categorias de um tipo: as padrão + as criadas pelo usuário. */
export const categoriasDe = (tipo) => [
  ...(tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA),
  ...CATEGORIAS_EXTRA.filter((c) => c.tipo === tipo),
];

/** Categorias de uma seção, na ordem em que aparecem no select. */
export const categoriasDoGrupo = (grupoId, tipo) =>
  categoriasDe(tipo).filter((c) => c.grupo === grupoId);

/**
 * Categoria padrão de uma seção — a que já vem selecionada no formulário.
 * Numa seção criada pela tela não existe padrão fixo: cai na primeira categoria
 * dela (e em nada, se o usuário ainda não criou nenhuma).
 */
export const padraoDoGrupo = (grupo) =>
  grupo.padrao || categoriasDoGrupo(grupo.id, grupo.tipo || tipoDoGrupo(grupo.id))[0]?.id || "";

/** A que tipo ("entrada"/"saida") pertence uma seção. */
export const tipoDoGrupo = (grupoId) =>
  GRUPOS_ENTRADA.some((g) => g.id === grupoId) ? "entrada"
  : GRUPOS_SAIDA.some((g) => g.id === grupoId) ? "saida"
  : GRUPOS_EXTRA.find((g) => g.id === grupoId)?.tipo || "saida";

/** Resolve id → objeto de categoria (padrão ou criada), com fallback seguro:
 *  um lançamento de categoria desconhecida cai em "Outros" na seção de reserva. */
export const categoriaDe = (id, tipo) =>
  categoriasDe(tipo).find((c) => c.id === id) ||
  { id: "outros", label: "Outros", cor: COR_PADRAO, grupo: SECAO_RESERVA[tipo] || SECAO_RESERVA.saida };

export const grupoDaCategoria = (id, tipo) =>
  categoriasDe(tipo).find((c) => c.id === id)?.grupo ||
  SECAO_RESERVA[tipo] || SECAO_RESERVA.saida;

/* ── Lançamentos variáveis (sem data fixa de vencimento) ──────────────────────
   Alguns grupos não têm dia fixo: o valor e a data mudam a cada mês e só passam
   a valer quando pagos. Nesses, a lista esconde o dia de vencimento e o
   formulário não pede um — sobra só a data do pagamento ("Pago em"). Os grupos
   restantes (fixos, clientes fixos, colaboradores) mantêm o dia de vencimento.
   A lista padrão vem de `padroes.js`. */
export const GRUPOS_VARIAVEIS = new Set(SECOES_SEM_DIA_FIXO);

/** Um grupo é variável quando não tem dia fixo de vencimento. */
export const ehGrupoVariavel = (grupoId) =>
  GRUPOS_VARIAVEIS.has(grupoId) || !!GRUPOS_EXTRA.find((g) => g.id === grupoId)?.variavel;

/** Um lançamento é variável quando pertence a um grupo variável. */
export const ehVariavel = (categoria, tipo) =>
  GRUPOS_VARIAVEIS.has(grupoDaCategoria(categoria, tipo));

/* ── Receita/custo fixo do mês ────────────────────────────────────────────────
   Corte diferente do de cima e por isso mora numa função própria: ali "fixo" é
   ter dia de vencimento, aqui é o dinheiro que se pode contar como certo todo
   mês. Na saída os dois batem — saídas fixas e colaboradores caem sempre. Na
   entrada não: um projeto tem dia marcado, mas é venda pontual; só a
   mensalidade de cliente fixo se repete por natureza. Seção criada pela tela
   nunca é fixa na entrada, e na saída segue a marcação de variável dela. */
export const ehSecaoFixa = (grupoId, tipo) =>
  tipo === "entrada" ? grupoId === SECAO_RECORRENTE : !ehGrupoVariavel(grupoId);

/* O padrão acima é só o ponto de partida: cada negócio conta o próprio dinheiro
   de um jeito, então a tela deixa mover seção entre fixa e variável — ou tirar
   da conta ("fora"), pro cabeçalho medir só o que interessa. A escolha vale pra
   todos os meses e vive em `config.naturezas`, um mapa com a chave
   prefixada pelo tipo (o mesmo id de seção pode existir na entrada e na saída).
   Só o que foge do padrão é gravado — mudar o padrão depois vale pro resto. */
export const NATUREZAS = ["fixa", "variavel", "fora"];
export const chaveNatureza = (tipo, grupoId) => `${tipo}:${grupoId}`;

/** Como a seção entra na repartição do cabeçalho: escolha salva ou o padrão. */
export const naturezaDaSecao = (grupoId, tipo, naturezas = {}) => {
  const escolha = naturezas?.[chaveNatureza(tipo, grupoId)];
  if (NATUREZAS.includes(escolha)) return escolha;
  return ehSecaoFixa(grupoId, tipo) ? "fixa" : "variavel";
};

/* ── Nota fiscal ──────────────────────────────────────────────────────────────
   Nem toda entrada emite nota fiscal. As categorias listadas em
   `CATEGORIAS_SEM_NOTA` (padroes.js) ficam de fora do controle de NF (selo na
   linha + painel de notas); as demais categorias de entrada emitem. */
const SEM_NOTA = new Set(CATEGORIAS_SEM_NOTA);

/** Uma categoria de entrada emite nota fiscal? */
export const emiteNota = (categoria) => !SEM_NOTA.has(categoria);

/* ── Distribuição de lucro ────────────────────────────────────────────────────
   Retirada de lucro sai do caixa, mas não é despesa: é o resultado já apurado
   sendo distribuído aos sócios. Por isso ela é descontada do saldo em caixa
   (o dinheiro saiu mesmo) e ignorada no cálculo do lucro do mês — senão o
   resultado seria descontado duas vezes. Pró-labore continua sendo despesa:
   é remuneração fixa, entra no custo do mês como qualquer outra saída. */
const LUCRO_DISTRIBUIDO = new Set(CATEGORIAS_LUCRO_DISTRIBUIDO);

/** A saída é retirada de lucro (e não despesa do mês)? */
export const ehLucroDistribuido = (categoria) =>
  LUCRO_DISTRIBUIDO.has(categoria);

/* ── Subtotal contábil ────────────────────────────────────────────────────────
   Uma categoria pode morar numa seção e ser contabilizada em outra. É o caso do
   pró-labore: ele fica listado junto das retiradas (é ali que se lança, no mesmo
   dia e do mesmo bolso), mas é despesa fixa — então o valor entra no subtotal de
   "Saídas fixas", e o subtotal da seção de distribuição mostra só o que de fato
   foi retirado como lucro. A LINHA NÃO SE MOVE: só o subtotal muda de lugar.
   O mapa vem de `padroes.js`. */

/** Em que seção o valor da categoria é somado (≠ da seção onde a linha aparece). */
export const secaoDoSubtotal = (categoria, tipo) =>
  SUBTOTAL_EM_OUTRA_SECAO[categoria] || grupoDaCategoria(categoria, tipo);

/* ── Apelidos editáveis ───────────────────────────────────────────────────────
   Os grupos e categorias acima são a estrutura fixa (id, cor, ordem, a que grupo
   cada categoria pertence). Só o NOME é editável pela tela: o apelido escolhido
   fica em `config.rotulos`, um mapa com chaves prefixadas — `g:<id>` para
   grupo, `c:<id>` para categoria — pra não confundir um grupo e uma categoria
   de mesmo id. Sem apelido, cai no label padrão do código. */
export const chaveGrupo = (id) => `g:${id}`;
export const chaveCategoria = (id) => `c:${id}`;

/** Nome a exibir de um grupo — apelido salvo ou o label padrão. */
export const nomeGrupo = (grupo, rotulos = {}) =>
  (rotulos?.[chaveGrupo(grupo.id)] ?? "").trim() || grupo.label;

/** Nome a exibir de uma categoria — apelido salvo ou o label padrão. */
export const nomeCategoria = (cat, rotulos = {}) =>
  (rotulos?.[chaveCategoria(cat.id)] ?? "").trim() || cat.label;

/**
 * Grupos de um tipo na ordem que o usuário definiu (arrastando na tela). A
 * ordem salva é uma lista de ids em `ordens[tipo]`; grupos que não estiverem
 * nela (ex.: um grupo novo adicionado depois no código) entram no fim, na ordem
 * padrão. Sem ordem salva, devolve os grupos como estão no código.
 */
export const gruposOrdenados = (tipo, ordens = {}) => {
  const base = gruposDe(tipo);
  const ordem = ordens?.[tipo];
  if (!Array.isArray(ordem) || !ordem.length) return base;
  const pos = new Map(ordem.map((id, i) => [id, i]));
  return [...base].sort((a, b) => {
    const pa = pos.has(a.id) ? pos.get(a.id) : Infinity;
    const pb = pos.has(b.id) ? pos.get(b.id) : Infinity;
    return pa === pb ? base.indexOf(a) - base.indexOf(b) : pa - pb;
  });
};

export const mesLegivel = (mes) => {
  const [a, m] = mes.split("-").map(Number);
  const nomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${nomes[m - 1]} de ${a}`;
};

export const mesVizinho = (mes, passo) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + passo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const emReal = (v) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ── Repetição mensal ─────────────────────────────────────────────────────────
   Saída fixa, colaborador e qualquer linha marcada como recorrente não são
   redigitadas todo mês: elas formam uma SÉRIE (mesmo `serieId`) e o mês seguinte
   é gerado a partir da linha mais recente da série — do mesmo jeito que a
   mensalidade de cliente fixo nasce do contrato. A linha gerada só existe na
   tela; ao editar (valor, baixa, dia…) ela vira um lançamento de verdade
   naquele mês, e é essa versão que passa a ser o molde dos meses à frente.
   Assim, mudar o valor vale daquele mês em diante sem mexer no histórico. */

/** Uma seção cujo lançamento já nasce repetindo: clientes fixos (a cobrança é
 *  mensal por definição) e as saídas com dia fixo de vencimento (fixas,
 *  colaboradores e seções próprias não marcadas como variáveis). O usuário pode
 *  ligar/desligar linha a linha na tela. */
export const repetePadrao = (grupoId, tipo) =>
  grupoId === SECAO_RECORRENTE || (tipo === "saida" && !ehGrupoVariavel(grupoId));

/**
 * Linhas que a repetição gera para `mes`: por série, a última linha lançada até
 * este mês (inclusive). Séries com repetição desligada ficam de fora, e nada é
 * gerado antes do mês em que a série começou.
 */
function repeticoesDoMes(mes, lancamentos, jaNoMes) {
  const molde = new Map();
  for (const l of lancamentos) {
    // Linha de contrato já se repete pela via do contrato — repetir de novo
    // pela série colocaria a mesma mensalidade duas vezes no mês.
    if (!l.recorrente || !l.serieId || l.mes > mes || l.origem === "contrato") continue;
    const atual = molde.get(l.serieId);
    if (!atual || l.mes > atual.mes) molde.set(l.serieId, l);
  }
  return [...molde.values()]
    .filter((l) => l.mes !== mes && !jaNoMes.has(l.serieId))
    .map((l) => ({
      ...l,
      id: `gen-s-${l.serieId}-${mes}`,
      mes,
      pago: false,
      pagoEm: null,
      notaEmitida: false,
      saldoQuitado: false,
      gerado: true,
    }));
}

/**
 * Junta as cobranças geradas pelos contratos e as linhas repetidas das séries
 * com os lançamentos avulsos. A linha gerada vira um lançamento normal assim
 * que você a edita, então não há duplicidade entre o automático e o manual.
 */
export function lancamentosDoMes(mes, contratos, lancamentos, clientes) {
  const manuais = lancamentos.filter((l) => l.mes === mes);
  const jaManual = new Set(manuais.filter((l) => l.origem === "contrato").map((l) => l.clienteId));
  const jaSerie = new Set(manuais.map((l) => l.serieId).filter(Boolean));
  const repetidas = repeticoesDoMes(mes, lancamentos, jaSerie);

  const geradas = contratos
    .filter((c) => !jaManual.has(c.clienteId))
    .map((c) => {
      const cliente = clientes.find((x) => x.id === c.clienteId);
      return {
        id: `gen-${mes}-${c.clienteId}`,
        tipo: "entrada",
        mes,
        // Só o nome do cliente: a seção e o chip da categoria já dizem que é
        // mensalidade, e o prefixo comia a largura da coluna de descrição.
        descricao: cliente?.nome || c.clienteId,
        categoria: CATEGORIA_MENSALIDADE,
        valor: c.valor,
        dia: c.diaVencimento,
        pago: false,
        notaEmitida: false,
        clienteId: c.clienteId,
        origem: "contrato",
        gerado: true,
      };
    });

  return ordenarPorData([...geradas, ...repetidas, ...manuais]);
}

/**
 * Data que posiciona a linha no extrato. Depois de pago vale a data da baixa
 * ("Pago em"); antes disso vale o vencimento do mês. Devolve ISO
 * (YYYY-MM-DD) porque assim a comparação de texto já é cronológica — e uma
 * baixa lançada em outro mês entra na posição certa em vez de cair pelo dia.
 */
export function dataOrdenacao(l) {
  if (l.pago && l.pagoEm) return l.pagoEm;
  return `${l.mes}-${String(l.dia || 1).padStart(2, "0")}`;
}

/**
 * Ordena o extrato pela data — crescente por padrão, decrescente com `desc`.
 * O sort do JS é estável, então empates de data mantêm a ordem de entrada em
 * vez de embaralhar a cada render.
 */
export function ordenarPorData(itens, desc = false) {
  return [...itens].sort((a, b) => {
    const c = dataOrdenacao(a).localeCompare(dataOrdenacao(b));
    return desc ? -c : c;
  });
}

/* ── Parcela: 100% ou 50% ─────────────────────────────────────────────────────
   Nas categorias marcadas em `config.categoriasParcela`, cada
   lançamento diz se é o valor cheio ("integral") ou metade: "sinal" (1ª metade)
   ou "saldo" (2ª metade). Um sinal cuja outra metade ainda não foi lançada
   (`saldoQuitado` falso) é o que aparece em "Falta 50%" — previsão de caixa. */
export const PARCELAS = [
  { id: "integral", curto: "100%", label: "100%" },
  { id: "sinal", curto: "50%", label: "50% · 1ª parte" },
  { id: "saldo", curto: "2ª 50%", label: "50% · 2ª parte" },
];
export const parcelaDe = (id) => PARCELAS.find((p) => p.id === id) || null;

/** Sinais (1ª metade) ainda sem a 2ª metade lançada — todos os meses. */
export const sinaisPendentes = (lancamentos) =>
  (lancamentos || []).filter((l) => l.parcela === "sinal" && !l.saldoQuitado && !l.gerado);

/* Categorias com a opção de parcela ligada — injetadas da config no render,
   como as personalizadas, pra linha e formulários não precisarem de props. */
let CATEGORIAS_PARCELA = new Set();
export function hidratarParcela(ids) {
  CATEGORIAS_PARCELA = new Set(Array.isArray(ids) ? ids : []);
}
export const usaParcela = (catId) => CATEGORIAS_PARCELA.has(catId);
