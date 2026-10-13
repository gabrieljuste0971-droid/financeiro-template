/**
 * Consulta pública de CNPJ na BrasilAPI (dados abertos da Receita). É só
 * conveniência — confirma de quem é o número e poupa digitar razão social e
 * endereço. Qualquer falha (rede, limite, CNPJ fora da base) devolve null e o
 * cadastro segue normalmente.
 */
export async function consultarCnpj(cnpj, { signal } = {}) {
  const digitos = (cnpj || "").replace(/\D/g, "");
  if (digitos.length !== 14) return null;
  try {
    const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`, { signal });
    if (!resposta.ok) return null;
    const d = await resposta.json();
    const rua = [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" ");
    const cep = (d.cep || "").replace(/^(\d{5})(\d{3})$/, "$1-$2");
    const endereco = [
      [rua, d.numero].filter(Boolean).join(", "),
      d.complemento,
      d.bairro,
      [d.municipio, d.uf].filter(Boolean).join(" - "),
      cep && `CEP ${cep}`,
    ].filter(Boolean).join(", ");
    return {
      razaoSocial: d.razao_social || "",
      nomeFantasia: d.nome_fantasia || "",
      situacao: d.descricao_situacao_cadastral || "",
      cep, numero: d.numero || "", complemento: d.complemento || "", bairro: d.bairro || "",
      cidade: d.municipio || "", estado: d.uf || "",
      endereco,
    };
  } catch {
    return null;
  }
}
