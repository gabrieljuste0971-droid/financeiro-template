/**
 * Adaptador Supabase — os mesmos dados da tela, num Postgres de verdade.
 *
 * Antes de usar, rode `supabase/schema.sql` no projeto (cria as tabelas
 * `fin_*` com RLS: cada usuário só enxerga as próprias linhas). O adaptador
 * precisa de uma sessão ativa — o login é do app, não do Financeiro.
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   const supabase = createClient(url, chavePublica);
 *   const adaptador = criarAdaptadorSupabase(supabase);
 *
 * A tela fala camelCase (`pagoEm`), o banco snake_case (`pago_em`): a tradução
 * acontece aqui e em nenhum outro lugar.
 */
import { CONFIG_INICIAL } from "../padroes";
import { chaveDoc } from "../documentos";

const TABELAS_PADRAO = {
  clientes: "fin_clientes",
  contratos: "fin_contratos",
  lancamentos: "fin_lancamentos",
  config: "fin_config",
};

/* tela → banco */
const CAMPOS_LANCAMENTO = {
  tipo: "tipo", mes: "mes", descricao: "descricao", categoria: "categoria", valor: "valor", dia: "dia",
  pago: "pago", pagoEm: "pago_em", notaEmitida: "nota_emitida", clienteId: "cliente_id", origem: "origem",
  serieId: "serie_id", recorrente: "recorrente", parcela: "parcela", saldoQuitado: "saldo_quitado",
};
const CAMPOS_CLIENTE = {
  nome: "nome", apelidos: "apelidos", docTipo: "doc_tipo", doc: "doc", endereco: "endereco",
  razaoSocial: "razao_social", nomeFantasia: "nome_fantasia", cep: "cep", numero: "numero",
  complemento: "complemento", bairro: "bairro", cidade: "cidade", estado: "estado",
};
const CAMPOS_CONFIG = {
  saldoBase: "saldo_base", meta: "meta", rotulos: "rotulos", ordens: "ordens", grupos: "grupos",
  categorias: "categorias", naturezas: "naturezas", categoriasParcela: "categorias_parcela",
};

const paraBanco = (patch, mapa) => {
  const campos = {};
  for (const [k, v] of Object.entries(patch || {})) if (mapa[k] && v !== undefined) campos[mapa[k]] = v;
  return campos;
};

const lancamentoParaTela = (l) => ({
  id: l.id, tipo: l.tipo, mes: l.mes, descricao: l.descricao, categoria: l.categoria,
  valor: Number(l.valor), dia: l.dia, pago: l.pago, pagoEm: l.pago_em ?? null,
  notaEmitida: l.nota_emitida ?? false, clienteId: l.cliente_id ?? null, origem: l.origem ?? null,
  serieId: l.serie_id ?? null, recorrente: l.recorrente ?? false,
  parcela: l.parcela ?? null, saldoQuitado: l.saldo_quitado ?? false,
});

const clienteParaTela = (c) => ({
  id: c.id, nome: c.nome, apelidos: c.apelidos || [], docTipo: c.doc_tipo || "cnpj", doc: c.doc || "",
  endereco: c.endereco || "", razaoSocial: c.razao_social || "", nomeFantasia: c.nome_fantasia || "",
  cep: c.cep || "", numero: c.numero || "", complemento: c.complemento || "", bairro: c.bairro || "",
  cidade: c.cidade || "", estado: c.estado || "",
});

/** Erro do banco em texto de tela — o índice único do documento vira frase. */
const erroDeCliente = (error) =>
  new Error(error.code === "23505" ? "Já existe um cliente com esse CPF/CNPJ." : error.message);

const ou = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

/**
 * @param {object} supabase  cliente criado com `createClient`
 * @param {object} opcoes
 * @param {object} opcoes.tabelas  nomes das tabelas, se não forem os padrão `fin_*`
 */
export function criarAdaptadorSupabase(supabase, { tabelas = {} } = {}) {
  const T = { ...TABELAS_PADRAO, ...tabelas };

  /** Id do usuário logado — a chave da linha única de config. */
  const usuario = async () => {
    const { data } = await supabase.auth.getSession();
    const id = data?.session?.user?.id;
    if (!id) throw new Error("Sem sessão: entre na conta antes de abrir o Financeiro.");
    return id;
  };

  return {
    async carregar() {
      const [clientes, contratos, lancamentos, config] = await Promise.all([
        supabase.from(T.clientes).select("*").order("nome"),
        supabase.from(T.contratos).select("*").eq("ativo", true),
        supabase.from(T.lancamentos).select("*"),
        supabase.from(T.config).select("*").maybeSingle(),
      ]);
      const cfg = ou(config);
      return {
        clientes: ou(clientes).map(clienteParaTela),
        contratos: ou(contratos).map((c) => ({
          clienteId: c.cliente_id, valor: Number(c.valor), diaVencimento: c.dia_vencimento,
        })),
        lancamentos: ou(lancamentos).map(lancamentoParaTela),
        config: {
          ...CONFIG_INICIAL,
          ...(cfg && {
            saldoBase: Number(cfg.saldo_base ?? 0), meta: Number(cfg.meta ?? 0),
            rotulos: cfg.rotulos ?? {}, ordens: cfg.ordens ?? {}, grupos: cfg.grupos ?? [],
            categorias: cfg.categorias ?? [], naturezas: cfg.naturezas ?? {},
            categoriasParcela: cfg.categorias_parcela ?? CONFIG_INICIAL.categoriasParcela,
          }),
        },
      };
    },

    /* ── Lançamentos ───────────────────────────────────────────────────────── */
    async criarLancamento(l) {
      const linha = {
        valor: 0, dia: 1, pago: false, nota_emitida: false, recorrente: false, saldo_quitado: false,
        ...paraBanco(l, CAMPOS_LANCAMENTO),
      };
      return lancamentoParaTela(ou(await supabase.from(T.lancamentos).insert(linha).select().single()));
    },
    async atualizarLancamento(id, patch) {
      ou(await supabase.from(T.lancamentos).update(paraBanco(patch, CAMPOS_LANCAMENTO)).eq("id", id));
    },
    async apagarLancamento(id) {
      ou(await supabase.from(T.lancamentos).delete().eq("id", id));
    },
    async recategorizarLancamentos(deIds, paraId) {
      if (!deIds?.length) return;
      ou(await supabase.from(T.lancamentos).update({ categoria: paraId }).in("categoria", deIds));
    },
    async apagarLancamentosDeCategorias(deIds) {
      if (!deIds?.length) return;
      ou(await supabase.from(T.lancamentos).delete().in("categoria", deIds));
    },
    async definirRecorrenciaSerie(serieId, recorrente) {
      if (!serieId) return;
      ou(await supabase.from(T.lancamentos).update({ recorrente }).eq("serie_id", serieId));
    },

    /* ── Contratos ─────────────────────────────────────────────────────────── */
    async salvarContrato(clienteId, patch) {
      const campos = { cliente_id: clienteId, ativo: true };
      if (patch.valor !== undefined) campos.valor = patch.valor;
      if (patch.diaVencimento !== undefined) campos.dia_vencimento = patch.diaVencimento;
      ou(await supabase.from(T.contratos).upsert(campos, { onConflict: "cliente_id" }));
    },
    async desativarContrato(clienteId) {
      ou(await supabase.from(T.contratos).update({ ativo: false }).eq("cliente_id", clienteId));
    },

    /* ── Config (uma linha por usuário) ────────────────────────────────────── */
    async salvarConfig(patch) {
      const linha = { user_id: await usuario(), ...paraBanco(patch, CAMPOS_CONFIG), atualizado_em: new Date().toISOString() };
      ou(await supabase.from(T.config).upsert(linha, { onConflict: "user_id" }));
    },

    /* ── Clientes ──────────────────────────────────────────────────────────── */
    async criarCliente(dados) {
      const linha = paraBanco(dados, CAMPOS_CLIENTE);
      // Chave de deduplicação: o índice único olha para ela, não para o texto.
      if (dados.doc !== undefined) linha.doc_normalizado = chaveDoc(dados.doc);
      const { data, error } = await supabase.from(T.clientes).insert(linha).select().single();
      if (error) throw erroDeCliente(error);
      return clienteParaTela(data);
    },
    async atualizarCliente(id, patch) {
      const campos = paraBanco(patch, CAMPOS_CLIENTE);
      if (patch.doc !== undefined) campos.doc_normalizado = chaveDoc(patch.doc);
      if (!Object.keys(campos).length) return;
      const { error } = await supabase.from(T.clientes).update(campos).eq("id", id);
      if (error) throw erroDeCliente(error);
    },
  };
}
