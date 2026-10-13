import React, { useEffect, useRef, useState } from "react";
import { Palette, Check, X, Pipette, RotateCcw, AlertTriangle, Upload, Trash2, Wallet } from "lucide-react";
import { Btn, CAMPO, LABEL, NUM, ToolbarButton } from "./ui";
import {
  aplicarMarca, marcaComCores, coresSalvas, salvarCores, limparCores,
  hexValido, normalizarBase, contrasteComBranco, escalaNeutra,
  logoSalvo, salvarLogo, limparLogo, prepararLogo, aoMudarAparencia,
} from "./tema";

/* ── Personalizar aparência ───────────────────────────────────────────────────
   Botão de barra + diálogo para quem usa a tela deixar o sistema com a própria
   cara, sem código: logo (topo da tela e ícone da aba), cor principal e cor de
   base. A mudança aparece na hora e fica guardada neste navegador, por cima da
   marca de `src/marca.js`.

   Uso, dentro de `acoes` do <Financeiro>:
     <PersonalizarAparencia marca={MARCA} />

   Quem mostra o logo lê com o hook:
     const logo = useLogo(MARCA.logo);   // o do usuário, ou o da marca

   No carregamento do app (main.jsx):
     aplicarMarca(marcaComCores(MARCA, coresSalvas()));
     aplicarFavicon(logoSalvo()); */

/**
 * Logo em vigor: o que o usuário enviou ou, sem isso, o `padrao` (o da marca).
 * Atualiza sozinho quando o logo é trocado no diálogo — nesta aba ou em outra.
 */
export function useLogo(padrao = null) {
  const [logo, setLogo] = useState(() => logoSalvo() || padrao);
  useEffect(() => {
    setLogo(logoSalvo() || padrao);
    return aoMudarAparencia(() => setLogo(logoSalvo() || padrao));
  }, [padrao]);
  return logo;
}

/** Sugestões de cor principal. A da marca entra sempre na frente. */
const CORES = [
  { hex: "#5755ff", nome: "Azul-violeta vivo" },
  { hex: "#ef304c", nome: "Vermelho" },
  { hex: "#ea580c", nome: "Laranja" },
  { hex: "#16a34a", nome: "Verde" },
  { hex: "#0d9488", nome: "Verde-água" },
  { hex: "#0891b2", nome: "Ciano" },
  { hex: "#2563eb", nome: "Azul" },
  { hex: "#7c3aed", nome: "Violeta" },
  { hex: "#db2777", nome: "Rosa" },
];

/** Sugestões de cor de base. `null` é o cinza neutro da tela. */
const BASES = [
  { hex: null, nome: "Neutro" },
  { hex: "#000624", nome: "Navy" },
  { hex: "#020202", nome: "Preto" },
  { hex: "#0b1220", nome: "Grafite azulado" },
  { hex: "#06140f", nome: "Verde-noite" },
  { hex: "#120a24", nome: "Roxo-noite" },
  { hex: "#190712", nome: "Vinho" },
];
/** Como o cinza neutro aparece na bolinha (não tem hex próprio). */
const COR_DO_NEUTRO = "#0a0c0e";
/** Abaixo disso, texto branco sobre a cor perde leitura (botões, chips). */
const CONTRASTE_MINIMO = 3;

/** Junta a opção da marca com as sugestões, sem repetir a mesma cor. */
const comMarca = (daMarca, lista) => [
  { hex: daMarca, nome: "Padrão da marca" },
  ...lista.filter((o) => o.hex !== daMarca),
];

/* As bases são todas quase pretas — lado a lado ficam iguais. A bolinha mostra
   meio a meio: a base e o cinza médio que ela gera, onde o matiz aparece. */
const fundoDaBase = (hex) =>
  `linear-gradient(135deg, ${hex} 50%, rgb(${escalaNeutra(hex).neutro[600]}) 50%)`;

function Bolinha({ hex, nome, ativa, onClick, fundo }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      aria-label={nome}
      title={nome}
      className={`relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset ring-black/10 transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:shadow-ring active:scale-95 dark:ring-white/15 ${
        ativa ? "outline outline-2 outline-offset-2 outline-acc-strong" : ""
      }`}
      style={fundo ? { background: fundo } : { backgroundColor: hex }}
    >
      {ativa && <Check size={15} strokeWidth={3} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,.5)]" />}
    </button>
  );
}

/** Bolinha "Outra cor": abre o seletor do sistema e aceita hex digitado. */
function OutraCor({ id, valor, ativa, rotulo, onEscolher }) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => { setTexto(valor); }, [valor]);
  return (
    <div className="flex items-center gap-2">
      <label
        title={rotulo}
        className={`relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutro-100 text-neutro-500 ring-1 ring-inset ring-black/10 transition-transform duration-150 focus-within:shadow-ring hover:scale-110 dark:bg-s4 dark:text-t2 dark:ring-white/15 ${
          ativa ? "outline outline-2 outline-offset-2 outline-acc-strong" : ""
        }`}
        style={ativa ? { backgroundColor: valor, color: "#fff" } : undefined}
      >
        <Pipette size={14} />
        <input
          type="color"
          value={valor}
          onChange={(e) => onEscolher(e.target.value)}
          aria-label={rotulo}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <input
        id={id}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          const hex = hexValido(e.target.value);
          if (hex) onEscolher(hex);
        }}
        onBlur={() => setTexto(valor)}
        placeholder="#000000"
        spellCheck={false}
        maxLength={7}
        aria-label={`${rotulo} em hexadecimal`}
        className={`${CAMPO} w-[104px] uppercase ${NUM}`}
      />
    </div>
  );
}

/** Enviar, ver e remover o logo. O arquivo é reduzido antes de salvar. */
function SecaoLogo({ logoDaMarca }) {
  const logo = useLogo(logoDaMarca);
  const proprio = !!logoSalvo();
  const campo = useRef(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // deixa escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setErro("");
    setEnviando(true);
    try {
      salvarLogo(await prepararLogo(arquivo));
    } catch (falha) {
      setErro(falha.message || "Não consegui usar essa imagem.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="space-y-2.5">
      <div>
        <h3 className={LABEL}>Logo</h3>
        <p className="text-[11.5px] text-neutro-400 dark:text-t3">Aparece no topo da tela e no ícone da aba do navegador.</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Mesma moldura do topo da tela, maior, para conferir o encaixe. */}
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-neutro-100 text-neutro-400 dark:bg-s1 dark:text-t3">
          {logo ? <img src={logo} alt="Logo atual" className="h-10 w-10 object-contain" /> : <Wallet size={22} strokeWidth={1.8} />}
        </span>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Btn icon={Upload} onClick={() => campo.current?.click()} disabled={enviando}>
            {enviando ? "Enviando…" : proprio ? "Trocar imagem" : "Enviar imagem"}
          </Btn>
          {proprio && (
            <Btn variant="ghost" icon={Trash2} onClick={() => { setErro(""); limparLogo(); }}>Remover</Btn>
          )}
          <input
            ref={campo}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={enviar}
            aria-label="Arquivo do logo"
            className="sr-only"
          />
        </div>
      </div>
      {erro ? (
        <p role="alert" className="flex items-start gap-1.5 text-[11.5px] text-rose-600 dark:text-bad-text">
          <AlertTriangle size={13} className="mt-px shrink-0" />
          {erro}
        </p>
      ) : (
        <p className="text-[11.5px] text-neutro-400 dark:text-t3">PNG, SVG, JPG ou WebP. Fica melhor quadrado e com fundo transparente.</p>
      )}
    </section>
  );
}

export default function PersonalizarAparencia({ marca = {}, className = "" }) {
  const corDaMarca = hexValido(marca.cor);
  const baseDaMarca = marca.base ? normalizarBase(marca.base) : null;

  const [aberto, setAberto] = useState(false);
  // Só o que o usuário escolheu; campo ausente = vale o da marca.
  const [cores, setCores] = useState(coresSalvas);
  // O hook redesenha quando o logo muda; é o que mantém o botão "Restaurar
  // padrão" em dia com o que foi enviado ou removido.
  useLogo(marca.logo || null);
  const temLogoProprio = !!logoSalvo();

  const cor = cores.cor ?? corDaMarca;
  const base = cores.base !== undefined ? cores.base : baseDaMarca;
  const personalizado = Object.keys(cores).length > 0 || temLogoProprio;

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const mudar = (patch) => {
    const novas = { ...cores, ...patch };
    setCores(novas);
    salvarCores(novas);
    aplicarMarca(marcaComCores(marca, novas));
  };

  const restaurar = () => {
    setCores({});
    limparCores();
    limparLogo();
    // null desfaz o que estava aplicado quando a marca não define o campo.
    aplicarMarca({ ...marca, cor: corDaMarca, base: baseDaMarca });
  };

  const opcoesCor = comMarca(corDaMarca, CORES);
  const opcoesBase = comMarca(baseDaMarca, BASES);
  const corForaDaLista = !opcoesCor.some((o) => o.hex === cor);
  const baseForaDaLista = !opcoesBase.some((o) => o.hex === base);
  const corClara = contrasteComBranco(cor) < CONTRASTE_MINIMO;

  return (
    <>
      <ToolbarButton
        icon={Palette}
        onClick={() => setAberto(true)}
        title="Personalizar aparência"
        aria-label="Personalizar aparência"
        className={className}
      />

      {aberto && (
        // Celular: folha que sobe do rodapé. Desktop: caixa centrada.
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Personalizar aparência">
          {/* Sem desfoque no fundo: a graça é ver a tela mudar atrás do diálogo. */}
          <div className="absolute inset-0 bg-neutro-900/25 dark:bg-black/40" onClick={() => setAberto(false)} />
          <div className="relative flex max-h-[88dvh] w-full max-w-md animate-sheet-in flex-col overflow-hidden rounded-t-2xl border border-neutro-200 bg-white shadow-2xl sm:max-h-[85vh] sm:animate-scale-in sm:rounded-2xl dark:border-line dark:bg-s2">
            <header className="flex items-center gap-2.5 border-b border-neutro-100 px-4 py-4 sm:px-5 dark:border-line">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <Palette size={15} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-neutro-800 dark:text-t1">Personalizar aparência</h2>
                <p className="text-[11.5px] text-neutro-500 dark:text-t2">A tela muda na hora. A escolha fica salva neste navegador.</p>
              </div>
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="ml-auto shrink-0 cursor-pointer rounded-lg p-1.5 text-neutro-400 transition-colors hover:bg-neutro-100 hover:text-neutro-600 dark:text-t3 dark:hover:bg-white/[0.06] dark:hover:text-t2"
              >
                <X size={16} />
              </button>
            </header>

            <div className="overscroll-contain-y min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-5">
              <SecaoLogo logoDaMarca={marca.logo || null} />

              <section className="space-y-2.5">
                <div>
                  <h3 className={LABEL}>Cor principal</h3>
                  <p className="text-[11.5px] text-neutro-400 dark:text-t3">Botões, destaques, barras e a linha de entradas do gráfico.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {opcoesCor.map((o) => (
                    <Bolinha key={o.hex} hex={o.hex} nome={o.nome} ativa={cor === o.hex} onClick={() => mudar({ cor: o.hex })} />
                  ))}
                </div>
                <OutraCor id="cores-principal" valor={cor} ativa={corForaDaLista} rotulo="Outra cor principal" onEscolher={(hex) => mudar({ cor: hex })} />
                {corClara && (
                  <p className="flex items-start gap-1.5 text-[11.5px] text-amber-700 dark:text-warn-text">
                    <AlertTriangle size={13} className="mt-px shrink-0" />
                    Cor clara demais: o texto branco dos botões perde leitura. Prefira um tom mais escuro.
                  </p>
                )}
              </section>

              <section className="space-y-2.5">
                <div>
                  <h3 className={LABEL}>Cor de base</h3>
                  <p className="text-[11.5px] text-neutro-400 dark:text-t3">Fundo do tema escuro e tom dos cinzas. Cores claras são escurecidas sozinhas.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {opcoesBase.map((o) => (
                    <Bolinha key={o.hex ?? "neutro"} hex={o.hex ?? COR_DO_NEUTRO} fundo={fundoDaBase(o.hex ?? COR_DO_NEUTRO)} nome={o.nome} ativa={base === o.hex} onClick={() => mudar({ base: o.hex })} />
                  ))}
                </div>
                <OutraCor id="cores-base" valor={base ?? COR_DO_NEUTRO} ativa={baseForaDaLista} rotulo="Outra cor de base" onEscolher={(hex) => mudar({ base: normalizarBase(hex) })} />
              </section>

              {/* Amostra: os mesmos tokens da tela, para conferir sem fechar. */}
              <section className="space-y-2">
                <h3 className={LABEL}>Amostra</h3>
                <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-neutro-50 p-3 dark:bg-s1">
                  <span className="inline-flex h-[34px] items-center rounded-[10px] bg-brand-500 px-3.5 text-[13px] font-medium text-white">Botão</span>
                  <span className="inline-flex h-[22px] items-center rounded-full bg-brand-500/10 px-2.5 text-[11.5px] font-medium text-brand-700 dark:bg-acc/[.14] dark:text-acc-text">Destaque</span>
                  <span className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-neutro-200 dark:bg-white/[0.08]">
                    <span className="block h-full w-2/3 rounded-full bg-brand-500" />
                  </span>
                  <span className={`text-[13px] font-semibold text-neutro-800 dark:text-t1 ${NUM}`}>R$ 1.250,00</span>
                </div>
              </section>
            </div>

            {/* pb-safe-3 == pb-3 no desktop e abre espaço pro indicador de gestos no iOS. */}
            <footer className="pb-safe-3 flex gap-2 border-t border-neutro-100 px-4 pt-3 sm:px-5 dark:border-line">
              <Btn icon={RotateCcw} size="lg" onClick={restaurar} disabled={!personalizado} className="flex-1">Restaurar padrão</Btn>
              <Btn variant="primary" size="lg" onClick={() => setAberto(false)} className="flex-1">Concluído</Btn>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
