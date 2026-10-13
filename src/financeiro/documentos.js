/**
 * Documentos e tomador da nota.
 *
 * Máscara e validação de CPF/CNPJ, a chave de deduplicação fiscal e a busca do
 * cliente citado num texto livre (pra achar o tomador de uma entrada antiga sem
 * vínculo). Tudo função pura — não depende de tela nem de banco.
 */

export const TIPOS_DOC = [
  { id: "cnpj", label: "CNPJ" },
  { id: "cpf", label: "CPF" },
  { id: "outro", label: "Outro" },
];

/** Rótulo do documento conforme o tipo; "outro" cobre NIF, EIN e afins. */
export const rotuloDoc = (tipo) => (tipo === "cpf" ? "CPF" : tipo === "outro" ? "Documento" : "CNPJ");

/**
 * Formata CNPJ (00.000.000/0000-00) ou CPF (000.000.000-00) conforme digita.
 * Documento estrangeiro ("outro") fica como foi digitado — não há máscara.
 */
export function formataDoc(valor, tipo) {
  if (tipo === "outro") return valor || "";
  const n = (valor || "").replace(/\D/g, "").slice(0, tipo === "cpf" ? 11 : 14);
  if (tipo === "cpf") {
    return n
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  return n
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

const soDigitos = (v) => (v || "").replace(/\D/g, "");

/** Dígito verificador módulo 11 sobre os pesos dados. */
const dv11 = (digitos, pesos) => {
  const resto = [...digitos].reduce((t, d, i) => t + Number(d) * pesos[i], 0) % 11;
  return resto < 2 ? 0 : 11 - resto;
};

export function cpfValido(valor) {
  const d = soDigitos(valor);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const a = dv11(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const b = dv11(d.slice(0, 9) + a, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${a}${b}`);
}

export function cnpjValido(valor) {
  const d = soDigitos(valor);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const a = dv11(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const b = dv11(d.slice(0, 12) + a, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${a}${b}`);
}

/** Mensagem de erro do documento, ou "" quando está ok. Vazio e "outro" passam. */
export function erroDoDoc(doc, tipo) {
  if (!(doc || "").trim() || tipo === "outro") return "";
  if (tipo === "cpf") return cpfValido(doc) ? "" : "CPF inválido. Confira os dígitos.";
  return cnpjValido(doc) ? "" : "CNPJ inválido. Confira os dígitos.";
}

/**
 * Chave de deduplicação fiscal: só os dígitos de um CPF (11) ou CNPJ (14)
 * completo. Documento pela metade ou estrangeiro fica sem chave — assim um
 * número ainda sendo digitado nunca esbarra no índice único.
 */
export function chaveDoc(doc) {
  const d = soDigitos(doc);
  return d.length === 11 || d.length === 14 ? d : null;
}

const normalizar = (s) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Acha o cliente citado num texto livre (ex.: descrição de um lançamento sem
 * vínculo). Casa o nome ou um apelido como palavra inteira; o termo mais longo
 * vence e empate entre clientes diferentes não casa ninguém — melhor ficar sem
 * CNPJ do que emitir nota no tomador errado.
 */
export function clienteCitado(texto, clientes) {
  const alvo = ` ${normalizar(texto)} `;
  let melhor = null, tamanho = 0, empate = false;
  for (const c of clientes || []) {
    for (const termo of [c.nome, ...(c.apelidos || [])]) {
      const t = normalizar(termo);
      if (!t || !alvo.includes(` ${t} `)) continue;
      if (t.length > tamanho) { melhor = c; tamanho = t.length; empate = false; }
      else if (t.length === tamanho && melhor !== c) empate = true;
    }
  }
  return empate ? null : melhor;
}
