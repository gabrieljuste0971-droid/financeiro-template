/**
 * Tema — transforma UMA cor de marca na escala inteira que a tela usa.
 *
 * As classes do Financeiro falam em `brand-50 … brand-950`, `neutro-*` e nos
 * tokens `acc`/`s0–s5`/`t1–t4`. Todos leem variáveis CSS (triplas RGB). Este
 * arquivo calcula essas triplas a partir de um ou dois hex e grava no <html> —
 * então trocar a marca é trocar valores em `src/marca.js`, sem tocar em classe.
 *
 * Sem chamar `aplicarMarca`, valem os valores padrão de `financeiro.css`.
 */

const hexParaRgb = (hex) => {
  const h = String(hex || "").trim().replace(/^#/, "");
  const cheio = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(cheio)) return null;
  return [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16));
};

/** Mistura `rgb` com `alvo` — `peso` é quanto do alvo entra (0 a 1). */
const misturar = (rgb, alvo, peso) => rgb.map((c, i) => Math.round(c + (alvo[i] - c) * peso));

const BRANCO = [255, 255, 255];
const PRETO = [0, 0, 0];

/* Quanto de branco (degraus claros) ou de preto (escuros) entra em cada degrau.
   O 500 é a própria cor da marca. */
const DEGRAUS = [
  [50, BRANCO, 0.93], [100, BRANCO, 0.85], [200, BRANCO, 0.7], [300, BRANCO, 0.5], [400, BRANCO, 0.25],
  [500, BRANCO, 0],
  [600, PRETO, 0.15], [700, PRETO, 0.3], [800, PRETO, 0.45], [900, PRETO, 0.6], [950, PRETO, 0.75],
];

/**
 * Escala completa de uma cor: `{ 50: "r g b", …, 950: "r g b", forte: "r g b" }`.
 * `corForte` é o acento brilhante (foco, brilho de hover); sem ele, usa uma
 * versão mais clara da própria cor. Devolve null se o hex for inválido.
 */
export function escalaDaCor(cor, corForte = null) {
  const base = hexParaRgb(cor);
  if (!base) return null;
  const escala = {};
  for (const [degrau, alvo, peso] of DEGRAUS) escala[degrau] = misturar(base, alvo, peso).join(" ");
  escala.forte = (hexParaRgb(corForte) || misturar(base, BRANCO, 0.28)).join(" ");
  return escala;
}

/* Quanto de branco entra em cada degrau, partindo da cor de base (o mais
   escuro). Os pesos reproduzem a curva de luminosidade do neutro padrão, então
   trocar a base muda o matiz sem mexer no contraste da tela. */
const NEUTROS = [
  [950, 0], [900, 0.065], [800, 0.12], [700, 0.21], [600, 0.31], [500, 0.44],
  [400, 0.615], [300, 0.78], [200, 0.875], [100, 0.93], [50, 0.968],
];
/* Tema escuro: seis degraus de superfície (s0–s5) e quatro de texto (t1–t4). */
const FUNDOS = [0, 0.03, 0.05, 0.08, 0.11, 0.145];
const TEXTOS = [0.95, 0.64, 0.44, 0.31];

/**
 * Escala neutra a partir de uma cor de base escura (ex.: o navy da marca):
 * `{ neutro: { 50…950 }, fundo: [6 triplas], texto: [4 triplas] }`. A base vira
 * o fundo do tema escuro; os cinzas da tela ganham o matiz dela. Devolve null
 * se o hex for inválido.
 */
export function escalaNeutra(base) {
  const rgb = hexParaRgb(base);
  if (!rgb) return null;
  const degrau = (peso) => misturar(rgb, BRANCO, peso).join(" ");
  return {
    neutro: Object.fromEntries(NEUTROS.map(([n, peso]) => [n, degrau(peso)])),
    fundo: FUNDOS.map(degrau),
    texto: TEXTOS.map(degrau),
  };
}

const VARS_MARCA = [...DEGRAUS.map(([n]) => `--brand-${n}`), "--brand-forte"];
const VARS_BASE = [
  ...NEUTROS.map(([n]) => `--neutro-${n}`),
  ...FUNDOS.map((_, i) => `--fundo-${i}`),
  ...TEXTOS.map((_, i) => `--texto-${i + 1}`),
];

/**
 * Aplica a marca no documento: cor (escala `--brand-*`), base (neutros e fundo
 * do tema escuro) e fonte (`--fonte`). Chame uma vez antes de montar o React
 * (ver `src/main.jsx`). Pode chamar de novo em runtime para trocar ao vivo.
 *
 * `cor` ou `base` em `null` desfazem o que foi aplicado e devolvem a tela ao
 * padrão de financeiro.css; `undefined` (campo ausente) não mexe em nada.
 */
export function aplicarMarca({ cor, corForte, base, fonte } = {}, alvo = document.documentElement) {
  const escala = cor ? escalaDaCor(cor, corForte) : null;
  if (escala) {
    for (const [degrau, tripla] of Object.entries(escala)) alvo.style.setProperty(`--brand-${degrau}`, tripla);
  } else if (cor === null) {
    for (const v of VARS_MARCA) alvo.style.removeProperty(v);
  }
  const neutra = base ? escalaNeutra(base) : null;
  if (neutra) {
    for (const [degrau, tripla] of Object.entries(neutra.neutro)) alvo.style.setProperty(`--neutro-${degrau}`, tripla);
    neutra.fundo.forEach((tripla, i) => alvo.style.setProperty(`--fundo-${i}`, tripla));
    neutra.texto.forEach((tripla, i) => alvo.style.setProperty(`--texto-${i + 1}`, tripla));
  } else if (base === null) {
    for (const v of VARS_BASE) alvo.style.removeProperty(v);
  }
  if (fonte) alvo.style.setProperty("--fonte", `"${fonte}"`);
}

/* ── Personalização de cores pelo usuário ─────────────────────────────────────
   Quem usa a tela pode trocar a cor principal e a cor de base sem tocar em
   código (componente PersonalizarAparencia). A escolha fica no localStorage deste
   navegador e vale por cima de `src/marca.js`:

     aplicarMarca({ ...MARCA, ...coresSalvas() });

   Formato salvo: { cor: "#rrggbb", base: "#rrggbb" | null } — `base: null` é o
   cinza neutro. Campo ausente = vale o da marca. */
const CHAVE_CORES = "financeiro_cores";

const paraHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/** Hex válido em minúsculas ("#abc" vira "#aabbcc"), ou null. */
export const hexValido = (hex) => {
  const rgb = hexParaRgb(hex);
  return rgb ? paraHex(rgb) : null;
};

/**
 * A base precisa ser escura: ela é o fundo do tema escuro e o tom mais fundo
 * dos cinzas. Uma cor clara aqui deixaria a tela sem contraste, então o que
 * passar do limite é escurecido mantendo o matiz. Devolve hex ou null.
 */
export function normalizarBase(hex) {
  const rgb = hexParaRgb(hex);
  if (!rgb) return null;
  const maior = Math.max(...rgb);
  const LIMITE = 64;
  return paraHex(maior > LIMITE ? rgb.map((c) => Math.round((c * LIMITE) / maior)) : rgb);
}

/** Contraste (WCAG) de um texto branco sobre a cor — os botões usam branco. */
export function contrasteComBranco(hex) {
  const rgb = hexParaRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

/**
 * Junta a marca com as cores do usuário, pronto para `aplicarMarca`. O acento
 * brilhante (`corForte`) foi escolhido para a cor original da marca; se o
 * usuário trocou a cor principal, ele passa a ser derivado da cor nova.
 */
export function marcaComCores(marca = {}, cores = {}) {
  const trocouCor = cores.cor && cores.cor !== hexValido(marca.cor);
  return { ...marca, ...cores, corForte: trocouCor ? null : marca.corForte };
}

/** Cores escolhidas pelo usuário neste navegador (só os campos válidos). */
export function coresSalvas() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_CORES) || "null");
    if (!bruto || typeof bruto !== "object") return {};
    const cores = {};
    if (hexValido(bruto.cor)) cores.cor = hexValido(bruto.cor);
    if (bruto.base === null) cores.base = null;
    else if (normalizarBase(bruto.base)) cores.base = normalizarBase(bruto.base);
    return cores;
  } catch {
    return {};
  }
}

export function salvarCores(cores) {
  try {
    localStorage.setItem(CHAVE_CORES, JSON.stringify(cores));
  } catch { /* modo privado: vale só nesta sessão */ }
}

/** Esquece a escolha do usuário — volta a valer a marca. */
export function limparCores() {
  try {
    localStorage.removeItem(CHAVE_CORES);
  } catch { /* nada a limpar */ }
}

/* ── Logo do usuário ──────────────────────────────────────────────────────────
   Além das cores, quem usa a tela pode trocar o logo (topo da tela e ícone da
   aba do navegador) enviando uma imagem. Ela fica guardada neste navegador como
   data URL e vale por cima do logo de `src/marca.js`.

   A imagem só é usada em <img> e no favicon — nunca injetada como HTML —, então
   um SVG enviado não consegue executar script. */
const CHAVE_LOGO = "financeiro_logo";
const EVENTO_APARENCIA = "financeiro:aparencia";
const TIPOS_DE_LOGO = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const LADO_MAXIMO = 256;            // px — sobra para o topo (36px) e para o favicon
const PESO_MAXIMO = 5 * 1024 * 1024; // 5 MB antes de reduzir
const PESO_MAXIMO_SVG = 150 * 1024;  // SVG vai inteiro, então o limite é menor

/** Logo enviado pelo usuário (data URL), ou null se ele não trocou. */
export function logoSalvo() {
  try {
    const valor = localStorage.getItem(CHAVE_LOGO);
    return valor && valor.startsWith("data:image/") ? valor : null;
  } catch {
    return null;
  }
}

const avisarAparencia = () => window.dispatchEvent(new Event(EVENTO_APARENCIA));

/** Chama `fn` sempre que o logo mudar (nesta aba ou em outra). Devolve a função
 *  que cancela a escuta — o formato que o useEffect espera. */
export function aoMudarAparencia(fn) {
  window.addEventListener(EVENTO_APARENCIA, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENTO_APARENCIA, fn);
    window.removeEventListener("storage", fn);
  };
}

export function salvarLogo(dataUrl) {
  try {
    localStorage.setItem(CHAVE_LOGO, dataUrl);
  } catch {
    throw new Error("Não coube no armazenamento deste navegador. Tente uma imagem menor.");
  }
  aplicarFavicon(dataUrl);
  avisarAparencia();
}

/** Esquece o logo do usuário — volta a valer o da marca. */
export function limparLogo() {
  try {
    localStorage.removeItem(CHAVE_LOGO);
  } catch { /* nada a limpar */ }
  aplicarFavicon(null);
  avisarAparencia();
}

/**
 * Troca o ícone da aba do navegador. `null` devolve o ícone original da página
 * (o que estava no index.html quando ela abriu).
 */
export function aplicarFavicon(url) {
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    if (!url) return;
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (link.dataset.original === undefined) {
    link.dataset.original = link.getAttribute("href") || "";
    link.dataset.tipoOriginal = link.getAttribute("type") || "";
  }
  const tipo = url ? (/^data:([^;,]+)/.exec(url)?.[1] || "") : link.dataset.tipoOriginal;
  if (tipo) link.setAttribute("type", tipo);
  else link.removeAttribute("type");
  link.setAttribute("href", url || link.dataset.original);
}

const lerComoDataUrl = (arquivo) =>
  new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result));
    leitor.onerror = () => falha(new Error("Não consegui ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });

const carregarImagem = (src) =>
  new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error("Esse arquivo não abriu como imagem."));
    img.src = src;
  });

/**
 * Prepara um arquivo de imagem para virar logo: confere tipo e tamanho e
 * devolve um data URL leve. Foto ou PNG grande é reduzido para caber em
 * 256×256 (mantendo proporção e transparência); SVG vai como está.
 * Rejeita com `Error` de mensagem pronta para a tela.
 */
export async function prepararLogo(arquivo) {
  if (!arquivo || !TIPOS_DE_LOGO.includes(arquivo.type)) {
    throw new Error("Use uma imagem PNG, SVG, JPG ou WebP.");
  }
  if (arquivo.type === "image/svg+xml") {
    if (arquivo.size > PESO_MAXIMO_SVG) throw new Error("SVG grande demais (máximo 150 KB).");
    const dataUrl = await lerComoDataUrl(arquivo);
    await carregarImagem(dataUrl); // só confere que abre
    return dataUrl;
  }
  if (arquivo.size > PESO_MAXIMO) throw new Error("Imagem grande demais (máximo 5 MB).");
  const img = await carregarImagem(await lerComoDataUrl(arquivo));
  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight));
  const tela = document.createElement("canvas");
  tela.width = Math.max(1, Math.round(img.naturalWidth * escala));
  tela.height = Math.max(1, Math.round(img.naturalHeight * escala));
  tela.getContext("2d").drawImage(img, 0, 0, tela.width, tela.height);
  return tela.toDataURL("image/png");
}

/* ── Claro / escuro ───────────────────────────────────────────────────────────
   O tema segue a classe `dark` no <html> (o padrão do Tailwind). A escolha fica
   no localStorage; sem escolha salva, vale o `padrao` passado. */
const CHAVE_TEMA = "financeiro_tema";

export function temaSalvo(padrao = "escuro") {
  try {
    return localStorage.getItem(CHAVE_TEMA) || padrao;
  } catch {
    return padrao;
  }
}

export function aplicarTema(tema, alvo = document.documentElement) {
  const escuro = tema !== "claro";
  alvo.classList.toggle("dark", escuro);
  alvo.style.colorScheme = escuro ? "dark" : "light";
  try {
    localStorage.setItem(CHAVE_TEMA, escuro ? "escuro" : "claro");
  } catch { /* modo privado: só não lembra */ }
  return escuro ? "escuro" : "claro";
}
