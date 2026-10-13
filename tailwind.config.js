import financeiro from "./src/financeiro/tailwind.preset.js";

/** @type {import('tailwindcss').Config} */
export default {
  // Cores, sombras e tokens da tela vêm do preset. A marca NÃO se troca aqui:
  // é em src/marca.js.
  presets: [financeiro],
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--fonte)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
};
