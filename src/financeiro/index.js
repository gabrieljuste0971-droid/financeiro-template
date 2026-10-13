/**
 * Porta de entrada da pasta `financeiro/` — tudo que um app precisa importar.
 *
 *   import Financeiro, { useFinanceiro, criarAdaptadorLocal } from "./financeiro";
 */
export { default } from "./Financeiro";
export { useFinanceiro } from "./useFinanceiro";
export { criarAdaptadorLocal } from "./adaptadores/local";
export { criarAdaptadorSupabase } from "./adaptadores/supabase";
export {
  aplicarMarca, aplicarTema, temaSalvo, escalaDaCor, escalaNeutra,
  coresSalvas, salvarCores, limparCores, marcaComCores,
  logoSalvo, salvarLogo, limparLogo, aplicarFavicon,
} from "./tema";
export { default as PersonalizarAparencia, useLogo } from "./PersonalizarAparencia";
export { ToolbarButton, Btn, Campo, CAMPO, CARD } from "./ui";
