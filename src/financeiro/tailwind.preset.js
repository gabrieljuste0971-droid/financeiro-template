/**
 * Preset do Tailwind (v3) para a tela de Financeiro.
 *
 * Só ACRESCENTA nomes novos ao tema (`brand`, `neutro`, `s0–s5`, `t1–t4`,
 * `acc`…): não remapeia nenhuma cor padrão do Tailwind, então entra num projeto
 * existente sem mudar a aparência do resto.
 *
 * Uso no tailwind.config.js do projeto:
 *
 *   import financeiro from "./src/financeiro/tailwind.preset.js";
 *   export default {
 *     presets: [financeiro],
 *     darkMode: "class",
 *     content: ["./index.html", "./src/**\/*.{js,jsx}"],
 *   };
 *
 * Os valores vêm das variáveis CSS de `financeiro.css` (triplas RGB), então
 * `bg-brand-500/20` e `text-t2` funcionam nos dois temas.
 */

const tok = (v) => `rgb(var(--${v}) / <alpha-value>)`;

// Cor da marca: a escala inteira é calculada em tema.js a partir de um hex.
const brand = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, tok(`brand-${n}`)])
);

// Neutro da tela. O padrão ("carvão", cinza levemente frio) está em
// financeiro.css; com `base` na marca, tema.js recalcula a escala inteira.
const neutro = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [n, tok(`neutro-${n}`)])
);

export default {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand,
        neutro,
        // Escada de superfícies e de texto.
        s0: tok("s0"), s1: tok("s1"), s2: tok("s2"), s3: tok("s3"), s4: tok("s4"), s5: tok("s5"),
        t1: tok("t1"), t2: tok("t2"), t3: tok("t3"), t4: tok("t4"),
        // Acento (segue a marca) e feedback.
        acc: { DEFAULT: tok("acc"), hover: tok("acc-hover"), strong: tok("acc-strong"), text: tok("acc-text") },
        ok: { DEFAULT: tok("ok"), text: tok("ok-text") },
        warn: { DEFAULT: tok("warn"), text: tok("warn-text") },
        bad: { DEFAULT: tok("bad"), text: tok("bad-text") },
        info: { DEFAULT: tok("info"), text: tok("info-text") },
        // Fios: `border-line` (mais fraco), `border-line-2`, `border-line-dash`.
        line: {
          DEFAULT: "rgb(var(--line) / var(--line-a))",
          2: "rgb(var(--line) / var(--line-b))",
          dash: "rgb(var(--line) / var(--line-dash-a))",
        },
        // Realce de hover em itens sem fundo.
        hover: "rgb(var(--line) / .04)",
      },
      boxShadow: {
        // Cards flutuam por sombra difusa (contato curto + ambiente longo).
        card: "0 2px 6px -1px rgba(20,23,28,.05), 0 10px 24px -12px rgba(20,23,28,.12)",
        "card-hover": "0 6px 16px -4px rgba(20,23,28,.08), 0 18px 40px -16px rgba(20,23,28,.18)",
        soft: "0 3.5px 5.5px 0 rgba(20,23,28,.02)",
        // Sombra colorida sob o chip de ícone da marca.
        chip: "0 6px 14px -4px rgb(var(--brand-500) / .45)",
        // Fio de luz no topo de superfícies elevadas (botões, tiles).
        edge: "var(--edge)",
        "float-2": "var(--sh-2)",
        "float-3": "var(--sh-3)",
        "float-4": "var(--sh-4)",
        // Brilho de feedback (hover do botão principal). Nunca em repouso.
        "glow-acc": "var(--glow)",
        // Anel de foco de teclado: 2px da superfície + 2px do acento.
        ring: "0 0 0 2px rgb(var(--s2)), 0 0 0 4px rgb(var(--acc-strong) / .6)",
      },
      backgroundImage: {
        // Chip de ícone: marca → acento brilhante, diagonal.
        "brand-chip": "linear-gradient(310deg, rgb(var(--brand-500)) 0%, rgb(var(--brand-forte)) 100%)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
};
