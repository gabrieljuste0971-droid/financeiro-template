/**
 * Padrões do Financeiro — O ARQUIVO PARA ADAPTAR AO SEU NEGÓCIO.
 *
 * Aqui ficam as seções e categorias que já vêm prontas na tela. O padrão abaixo
 * serve a um negócio de serviços (agência, estúdio, consultoria, freelancer).
 * Troque nomes, cores e categorias à vontade; as regras em `modelo.js` não
 * precisam mudar.
 *
 * Pela própria tela (botão "Categorias") o usuário ainda renomeia tudo e cria
 * seções e categorias novas — essas ficam salvas na config, não aqui.
 *
 * Cuidado ao trocar um `id` depois que já existem lançamentos: o lançamento
 * guarda o id da categoria. Trocar só o `label` é sempre seguro.
 */

/* ── Entradas ─────────────────────────────────────────────────────────────────
   Cada categoria pertence a uma seção (`grupo`). A seção é o que aparece como
   subdivisão no card, com subtotal próprio. */
export const GRUPOS_ENTRADA = [
  { id: "recorrentes", label: "Clientes fixos", hint: "contratos recorrentes", padrao: "recorrente" },
  { id: "projetos", label: "Projetos", hint: "trabalhos com começo, meio e fim", padrao: "projeto" },
  { id: "parcelados", label: "Pagamentos parcelados", hint: "cobranças divididas em parcelas", padrao: "parcelado" },
  { id: "pontuais", label: "Outras receitas", hint: "produtos, comissões e extras", padrao: "produto" },
];

export const CATEGORIAS_ENTRADA = [
  { id: "recorrente", label: "Mensalidade", cor: "#2ecd6f", grupo: "recorrentes" },
  { id: "projeto", label: "Projeto", cor: "#12a89d", grupo: "projetos" },
  { id: "parcelado", label: "Parcela", cor: "#e8568f", grupo: "parcelados" },
  { id: "produto", label: "Produto", cor: "#f5a623", grupo: "pontuais" },
  { id: "comissao", label: "Comissão", cor: "#b06ab3", grupo: "pontuais" },
];

/* ── Saídas ───────────────────────────────────────────────────────────────── */
export const GRUPOS_SAIDA = [
  { id: "fixas", label: "Saídas fixas", hint: "todo mês, valor previsível", padrao: "ferramentas" },
  { id: "distribuicao", label: "Lucro distribuído e pró-labore", hint: "pró-labore fixo e retiradas de lucro", padrao: "prolabore" },
  { id: "colaboradores", label: "Colaboradores", hint: "quem trabalha de forma contínua", padrao: "equipe" },
  { id: "variaveis", label: "Saídas variáveis", hint: "muda de mês para mês", padrao: "freela" },
];

export const CATEGORIAS_SAIDA = [
  // distribuição — o que sai como remuneração dos sócios
  { id: "prolabore", label: "Pró-labore", cor: "#7b68ee", grupo: "distribuicao" },
  { id: "lucro", label: "Lucro distribuído", cor: "#12a89d", grupo: "distribuicao" },
  // fixas — saem todo mês, com valor previsível
  { id: "ferramentas", label: "Ferramentas", cor: "#3c86d8", grupo: "fixas" },
  { id: "estrutura", label: "Estrutura", cor: "#f5a623", grupo: "fixas" },
  { id: "impostos", label: "Impostos", cor: "#e8556d", grupo: "fixas" },
  // colaboradores — quem trabalha de forma contínua
  { id: "equipe", label: "Equipe fixa", cor: "#a875ff", grupo: "colaboradores" },
  { id: "parceiro", label: "Parceiro recorrente", cor: "#8b7bf0", grupo: "colaboradores" },
  // variáveis — muda de mês para mês
  { id: "freela", label: "Freelancer", cor: "#ef8b3f", grupo: "variaveis" },
  { id: "marketing", label: "Marketing e anúncios", cor: "#5b9fd6", grupo: "variaveis" },
  { id: "outros", label: "Outros", cor: "#87909e", grupo: "variaveis" },
];

/* ── Regras por seção/categoria ───────────────────────────────────────────── */

/** Seções SEM dia fixo de vencimento: a linha mostra só "Pago em". As demais
 *  (clientes fixos, projetos, saídas fixas, colaboradores) têm dia de vencer. */
export const SECOES_SEM_DIA_FIXO = ["distribuicao", "variaveis", "parcelados", "pontuais"];

/** Categorias de entrada que NÃO entram no controle de nota fiscal (selo na
 *  linha e fila "Notas fiscais"). Deixe vazio para controlar nota de tudo. */
export const CATEGORIAS_SEM_NOTA = ["parcelado", "produto"];

/** Saídas que são retirada de lucro, e não despesa: descontam do saldo em
 *  caixa, mas ficam fora do "Lucro do mês" (senão o resultado seria descontado
 *  duas vezes). */
export const CATEGORIAS_LUCRO_DISTRIBUIDO = ["lucro"];

/** Categoria que aparece numa seção mas soma no subtotal de outra. O pró-labore
 *  é lançado junto das retiradas, mas é despesa fixa. */
export const SUBTOTAL_EM_OUTRA_SECAO = { prolabore: "fixas" };

/* ── Ids estruturais ──────────────────────────────────────────────────────────
   O modelo precisa saber qual seção é a dos clientes fixos (é a "receita fixa"
   do mês, e é onde caem as mensalidades geradas pelos contratos) e para onde
   vai um lançamento de categoria desconhecida. Se renomear os ids acima,
   ajuste aqui também. */
export const SECAO_RECORRENTE = "recorrentes";
export const CATEGORIA_MENSALIDADE = "recorrente";
export const SECAO_RESERVA = { entrada: "pontuais", saida: "variaveis" };

/** Cor de uma categoria criada sem cor escolhida. */
export const COR_PADRAO = "#87909e";

/** Config de quem abre a tela pela primeira vez. `categoriasParcela` lista as
 *  categorias com a opção 100% / 50% ligada (sinal + saldo). */
export const CONFIG_INICIAL = {
  saldoBase: 0,
  meta: 0,
  rotulos: {},
  ordens: {},
  grupos: [],
  categorias: [],
  naturezas: {},
  categoriasParcela: ["projeto"],
};
