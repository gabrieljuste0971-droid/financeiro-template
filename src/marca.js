/**
 * A MARCA — o arquivo para deixar o template com a sua cara.
 *
 * Troque os valores abaixo e a tela inteira acompanha: botões, chips, gráfico,
 * foco, brilho, fundo do tema escuro. Não precisa mexer em classe nem em CSS.
 *
 * Os valores atuais são a identidade da Gestão Criativa (logo e cores tirados
 * do arquivo de identidade visual no Figma), com as duas cores suavizadas para
 * tela: numa interface cheia de números, o azul e o navy puros da marca
 * (#5755ff e #000624) pesavam. O matiz é o mesmo; caiu a saturação. Os tons
 * originais continuam a um clique em "Personalizar aparência".
 */
import simbolo from "./assets/simbolo.svg";

export const MARCA = {
  /** Nome do negócio (título da aba do navegador, tela de entrada). */
  nome: "Gestão Criativa",

  /** Cor principal, em hex. A escala clara→escura é calculada sozinha. */
  cor: "#6f6cf6",

  /** Acento brilhante (anel de foco, brilho de hover). `null` = deriva da cor. */
  corForte: null,

  /**
   * Cor de base escura: vira o fundo do tema escuro e dá o matiz dos cinzas e
   * do texto no tema claro. `null` = cinza neutro ("carvão").
   */
  base: "#0a0b14",

  /** Símbolo quadrado no topo da tela. `null` = ícone de carteira. */
  logo: simbolo,

  /** Fonte. Precisa estar carregada no index.html (a padrão é a Rethink Sans). */
  fonte: "Rethink Sans",

  /** Tema de quem abre pela primeira vez: "escuro" ou "claro". */
  temaPadrao: "escuro",

  /** Textos do cabeçalho da tela. */
  titulo: "Financeiro",
  subtitulo: "Fechamento do mês",
};
