import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./financeiro/financeiro.css";
import { aplicarMarca, coresSalvas, marcaComCores, aplicarFavicon, logoSalvo } from "./financeiro";
import { MARCA } from "./marca";
import App from "./App";

// Cor e fonte da marca viram variáveis CSS antes da primeira pintura. O que o
// usuário escolheu em "Personalizar aparência" (cores e logo) vale por cima.
aplicarMarca(marcaComCores(MARCA, coresSalvas()));
if (logoSalvo()) aplicarFavicon(logoSalvo());
document.title = `${MARCA.titulo} · ${MARCA.nome}`;

createRoot(document.getElementById("root")).render(<App />);
