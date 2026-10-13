import React from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Primitivos de interface do Financeiro

   As regras que a tela inteira segue:

   · Superfície    cards SEM borda no claro, apoiados só numa sombra difusa
                   (shadow-card). No escuro a sombra some e o card usa um fio.
   · Profundidade  degraus de luz (tokens s0–s5 / t1–t4 em financeiro.css):
                   filho = pai + 1 degrau; campo = pai − 1 (cavado).
   · Raio          10 em controles, 12 em chips, 16 em cards e painéis.
   · Cor           um único acento — a cor da marca (`brand-*` / `acc`) — em
                   chips, links, barras e ativos. Verde = positivo · rosa =
                   negativo · âmbar = atenção.
   · Números       sempre em tabular-nums.

   A cor da marca não está escrita aqui: vem das variáveis CSS que `marca.js`
   aplica. Trocar a marca não exige tocar neste arquivo.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Superfície-base de card. Claro: branco + sombra difusa, sem borda.
 *  Escuro: degrau s2 + fio (a sombra não lê no preto). */
export const CARD =
  "rounded-2xl bg-white shadow-card dark:bg-s2 dark:border dark:border-line dark:shadow-none";

/** Fio de cabelo para divisórias internas (headers, linhas, rodapés). */
export const HAIR = "border-neutro-100 dark:border-line";

/** Preenchimento sutil (trilhos de barra, chips neutros, faixas). */
export const INSET = "bg-neutro-50 dark:bg-white/[0.05]";

/** Rótulo de bloco: 12/500 em caixa normal. */
export const LABEL = "text-[12px] font-medium text-neutro-500 dark:text-t2";

/** Números sempre em tabular-nums (alinham em colunas, sem cara de mono). */
export const NUM = "tabular-nums";

/**
 * Chip de ícone. `tom="gradient"` é o da marca (gradiente + ícone branco); os
 * demais são tintas sólidas para quando o gradiente não cabe.
 */
export function GradientChip({ icon: Icon, size = 44, iconSize, tom = "gradient", className = "" }) {
  const tons = {
    gradient: "bg-brand-chip text-white shadow-chip",
    emerald: "bg-emerald-500/[.12] text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    rose: "bg-rose-500/[.12] text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    amber: "bg-amber-500/[.12] text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    slate: "bg-neutro-100 text-neutro-500 dark:bg-white/[0.06] dark:text-neutro-400",
  };
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ${tons[tom] || tons.gradient} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon size={iconSize || Math.round(size * 0.44)} strokeWidth={2.1} />
    </span>
  );
}

/** Botão de barra de ferramentas (preenchido, sem contorno). `active` tinge
 *  com a cor da marca. */
export function ToolbarButton({ icon: Icon, children, active = false, className = "", ...props }) {
  return (
    <button
      className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-medium transition-[background-color,color,transform] duration-200 active:scale-95 focus:outline-none focus-visible:shadow-ring ${
        active
          ? "bg-brand-500/10 text-brand-700 dark:bg-acc/15 dark:text-acc-text"
          : "bg-neutro-100/80 text-neutro-700 hover:bg-neutro-200/70 dark:bg-s4 dark:text-t1 dark:shadow-edge dark:hover:bg-s5"
      } ${className}`}
      {...props}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/** Campo de formulário: cavado (um degrau abaixo do pai), raio 10, sem contorno;
 *  o foco desenha borda + anel na cor da marca. */
export const CAMPO =
  "h-9 rounded-[10px] border border-transparent bg-neutro-100/80 px-3 text-[13px] text-neutro-800 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-neutro-400 hover:border-neutro-200 focus:border-acc-strong/60 focus:ring-[3px] focus:ring-acc/[.18] dark:bg-s1 dark:text-t1 dark:placeholder:text-t3 dark:hover:border-line-2 dark:focus:border-acc-strong/60";

/** Rótulo de campo: 12/500, caixa normal. */
export const ROTULO = "text-[12px] font-medium text-neutro-500 dark:text-t2";

/** Rótulo + controle + ajuda (ou erro). */
export function Campo({ rotulo, ajuda, erro, htmlFor, className = "", children }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      {rotulo && <label htmlFor={htmlFor} className={ROTULO}>{rotulo}</label>}
      {children}
      {(erro || ajuda) && (
        <span className={`text-[12px] ${erro ? "text-rose-600 dark:text-bad-text" : "text-neutro-400 dark:text-t3"}`}>{erro || ajuda}</span>
      )}
    </div>
  );
}

const BTN_BASE =
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-spring active:scale-[.98] focus:outline-none focus-visible:shadow-ring disabled:pointer-events-none disabled:opacity-45";
const BTN_SIZE = { sm: "h-7 px-2.5 text-[12px]", md: "h-[34px] px-3.5 text-[13px]", lg: "h-10 px-[18px] text-[14px]" };
const BTN_ICON = { sm: 14, md: 15, lg: 16 };
const BTN_VAR = {
  // Preenchido na cor da marca: confirmação de formulário, ação principal.
  primary: "bg-brand-500 text-white hover:bg-brand-600 dark:hover:bg-acc-hover dark:hover:shadow-glow-acc",
  // Degrau s4 com fio de luz: cancelar, opções, toolbar.
  secondary: "bg-neutro-100/80 text-neutro-800 hover:bg-neutro-200/70 dark:bg-s4 dark:text-t1 dark:shadow-edge dark:hover:bg-s5",
  // Sem fundo: ações dentro de linhas e cards.
  ghost: "text-neutro-500 hover:bg-neutro-900/[.05] hover:text-neutro-800 dark:text-t2 dark:hover:bg-hover dark:hover:text-t1",
  // Tinta vermelha: excluir. Sempre com confirmação.
  danger: "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-bad/[.14] dark:text-bad-text dark:hover:bg-bad/[.24]",
};

/** Botão do sistema (raio 10). */
export function Btn({ variant = "secondary", size = "md", icon: Icon, iconRight: IconRight, className = "", children, ...props }) {
  return (
    <button type="button" className={`${BTN_BASE} ${BTN_SIZE[size] || BTN_SIZE.md} ${BTN_VAR[variant] || BTN_VAR.secondary} ${className}`} {...props}>
      {Icon && <Icon size={BTN_ICON[size] || 15} strokeWidth={2} />}
      {children}
      {IconRight && <IconRight size={BTN_ICON[size] || 15} strokeWidth={2} />}
    </button>
  );
}

/**
 * Controle segmentado: troca um parâmetro dentro da mesma vista. Trilho
 * cavado, item ativo sobe um degrau. Até 4 opções.
 */
export function Segmented({ opcoes, valor, onChange, compacto = false, className = "" }) {
  return (
    <div className={`inline-flex h-[34px] shrink-0 items-center gap-0.5 rounded-[10px] bg-neutro-100/80 p-[3px] dark:bg-s1 ${className}`} role="tablist">
      {opcoes.map(({ id, label, icon: Icon }) => {
        const ativo = valor === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={ativo}
            title={label}
            onClick={() => onChange(id)}
            className={`inline-flex h-full cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] font-medium transition-[background-color,color] duration-150 focus:outline-none focus-visible:shadow-ring ${
              ativo
                ? "bg-white text-neutro-900 shadow-soft dark:bg-s4 dark:text-t1 dark:shadow-edge"
                : "text-neutro-500 hover:text-neutro-800 dark:text-t2 dark:hover:text-t1"
            }`}
          >
            {Icon && <Icon size={14} />}
            {label && <span className={compacto ? "max-md:hidden" : ""}>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Barra superior da tela: tile com o ícone (ou o `logo` da marca), título e
 * ações à direita. Transparente sobre o canvas.
 */
export function TopBar({ icon: Icon, logo, titulo, subtitulo, className = "", children }) {
  return (
    <header className={`shrink-0 px-4 pt-3 sm:px-6 sm:pt-4 ${className}`}>
      <div className="flex min-h-[40px] flex-wrap items-center gap-x-3 gap-y-2">
        {logo ? (
          <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-[10px] object-contain" />
        ) : Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-neutro-100 text-neutro-500 dark:bg-s3 dark:text-t2 dark:shadow-edge">
            <Icon size={18} strokeWidth={1.9} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold leading-tight tracking-[-0.02em] text-neutro-900 sm:text-[22px] dark:text-t1">{titulo}</h1>
          {subtitulo && <p className="truncate text-[12.5px] text-neutro-500 dark:text-t3">{subtitulo}</p>}
        </div>
        {children && <div className="ml-auto flex shrink-0 items-center gap-2 max-md:w-full max-md:justify-end">{children}</div>}
      </div>
    </header>
  );
}
