import { useState, useEffect, useCallback } from "react";
import { CONFIG_INICIAL } from "./padroes";

/**
 * Estado do Financeiro em cima de um adaptador (local, Supabase ou o seu).
 *
 * Devolve exatamente as props que <Financeiro> espera — dá pra espalhar:
 *
 *   const fin = useFinanceiro(adaptador);
 *   <Financeiro {...fin} />
 *
 * Toda escrita é otimista: a tela muda na hora e, se o adaptador falhar, o
 * estado volta ao que era e a mensagem fica em `erro`.
 *
 * Mudar o valor de uma mensalidade grava no contrato, não no mês — é isso que
 * faz o valor valer para os meses seguintes sem redigitar.
 */
export function useFinanceiro(adaptador) {
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [config, setConfig] = useState(CONFIG_INICIAL);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const receber = useCallback((d) => {
    setClientes(d.clientes || []);
    setContratos(d.contratos || []);
    setLancamentos(d.lancamentos || []);
    setConfig({ ...CONFIG_INICIAL, ...(d.config || {}) });
  }, []);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    adaptador.carregar()
      .then((d) => { if (vivo) { receber(d); setErro(""); } })
      .catch((e) => vivo && setErro(e.message))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [adaptador, receber]);

  /** Relê tudo do adaptador (ex.: depois de uma escrita feita por fora). */
  const recarregar = useCallback(async () => {
    try {
      receber(await adaptador.carregar());
      setErro("");
    } catch (e) {
      setErro(e.message);
    }
  }, [adaptador, receber]);

  const salvarConfig = useCallback(async (patch) => {
    const anterior = config;
    setConfig((c) => ({ ...c, ...patch }));
    try {
      await adaptador.salvarConfig(patch);
      setErro("");
    } catch (e) {
      setConfig(anterior);
      setErro(`Não consegui salvar: ${e.message}`);
    }
  }, [adaptador, config]);

  /**
   * Renomeia um grupo ou categoria. `chave` vem de chaveGrupo/chaveCategoria
   * ("g:pontuais", "c:comissao"). Nome vazio apaga o apelido e volta ao label
   * padrão. Grava o mapa inteiro em `rotulos`.
   */
  const renomear = useCallback((chave, nome) => {
    const atual = config.rotulos || {};
    const limpo = (nome ?? "").trim();
    if ((atual[chave] || "") === limpo) return Promise.resolve();
    const novo = { ...atual };
    if (limpo) novo[chave] = limpo;
    else delete novo[chave];
    return salvarConfig({ rotulos: novo });
  }, [config, salvarConfig]);

  /** Salva a ordem manual das seções de um tipo ("entrada"/"saida"). */
  const reordenarGrupos = useCallback((tipo, ids) => {
    const atual = config.ordens || {};
    return salvarConfig({ ordens: { ...atual, [tipo]: ids } });
  }, [config, salvarConfig]);

  const definirValorContrato = useCallback(async (clienteId, valor) => {
    const anterior = contratos;
    setContratos((cs) => cs.map((c) => (c.clienteId === clienteId ? { ...c, valor } : c)));
    try {
      await adaptador.salvarContrato(clienteId, { valor });
      setErro("");
    } catch (e) {
      setContratos(anterior);
      setErro(`Não consegui salvar o contrato: ${e.message}`);
    }
  }, [adaptador, contratos]);

  /** Cria (ou reativa) a mensalidade de um cliente fixo. Não é usado pela tela
   *  em si — serve ao app que tem um cadastro de clientes com contrato. */
  const salvarContrato = useCallback(async (clienteId, { valor = 0, diaVencimento = 5 } = {}) => {
    const anterior = contratos;
    setContratos((cs) =>
      cs.some((c) => c.clienteId === clienteId)
        ? cs.map((c) => (c.clienteId === clienteId ? { ...c, valor, diaVencimento } : c))
        : [...cs, { clienteId, valor, diaVencimento }]);
    try {
      await adaptador.salvarContrato(clienteId, { valor, diaVencimento });
      setErro("");
    } catch (e) {
      setContratos(anterior);
      setErro(`Não consegui salvar o contrato: ${e.message}`);
    }
  }, [adaptador, contratos]);

  const criar = useCallback(async (l) => {
    const provisorio = { ...l, id: `tmp-${Math.random().toString(36).slice(2)}` };
    setLancamentos((ls) => [...ls, provisorio]);
    try {
      const salvo = await adaptador.criarLancamento(l);
      setLancamentos((ls) => ls.map((x) => (x.id === provisorio.id ? { ...l, ...salvo } : x)));
      setErro("");
    } catch (e) {
      setLancamentos((ls) => ls.filter((x) => x.id !== provisorio.id));
      setErro(`Não consegui criar o lançamento: ${e.message}`);
    }
  }, [adaptador]);

  const atualizar = useCallback(async (id, patch) => {
    const anterior = lancamentos;
    setLancamentos((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    try {
      await adaptador.atualizarLancamento(id, patch);
      setErro("");
    } catch (e) {
      setLancamentos(anterior);
      setErro(`Não consegui salvar: ${e.message}`);
    }
  }, [adaptador, lancamentos]);

  const remover = useCallback(async (id) => {
    const anterior = lancamentos;
    setLancamentos((ls) => ls.filter((l) => l.id !== id));
    try {
      await adaptador.apagarLancamento(id);
    } catch (e) {
      setLancamentos(anterior);
      setErro(`Não consegui remover: ${e.message}`);
    }
  }, [adaptador, lancamentos]);

  /**
   * Move os lançamentos de um conjunto de categorias para outra categoria, ou
   * apaga esses lançamentos (`paraId` nulo). É o que destrava apagar uma
   * categoria/seção que ainda está em uso — a tela pergunta o destino.
   */
  const realocarLancamentos = useCallback(async (deIds, paraId) => {
    const ids = (deIds || []).filter(Boolean);
    if (!ids.length) return;
    const anterior = lancamentos;
    setLancamentos((ls) =>
      paraId
        ? ls.map((l) => (ids.includes(l.categoria) ? { ...l, categoria: paraId } : l))
        : ls.filter((l) => !ids.includes(l.categoria)));
    try {
      if (paraId) await adaptador.recategorizarLancamentos(ids, paraId);
      else await adaptador.apagarLancamentosDeCategorias(ids);
      setErro("");
    } catch (e) {
      setLancamentos(anterior);
      setErro(`Não consegui mover os lançamentos: ${e.message}`);
      throw e;
    }
  }, [adaptador, lancamentos]);

  /**
   * Remove uma linha que se repete: para a repetição (série inteira) e apaga o
   * lançamento deste mês, quando ele já existe salvo. Sem parar a série, a
   * linha voltaria no mês seguinte.
   */
  const removerSerie = useCallback(async (serieId, lancamentoId) => {
    const anterior = lancamentos;
    const temLanc = lancamentoId && !String(lancamentoId).startsWith("gen-");
    setLancamentos((ls) =>
      ls.map((l) => (l.serieId === serieId ? { ...l, recorrente: false } : l))
        .filter((l) => !(temLanc && l.id === lancamentoId)));
    try {
      await adaptador.definirRecorrenciaSerie(serieId, false);
      if (temLanc) await adaptador.apagarLancamento(lancamentoId);
      setErro("");
    } catch (e) {
      setLancamentos(anterior);
      setErro(`Não consegui remover: ${e.message}`);
    }
  }, [adaptador, lancamentos]);

  /**
   * Remove um cliente fixo de vez: desativa o contrato (para de gerar a
   * mensalidade) e apaga o lançamento já salvo deste mês, se houver. Apagar só
   * o lançamento faria o contrato regerar a linha. `lancamentoId` é nulo quando
   * a linha ainda é só gerada (id `gen-…`).
   */
  const removerContrato = useCallback(async (clienteId, lancamentoId) => {
    const antesContratos = contratos;
    const antesLanc = lancamentos;
    const temLanc = lancamentoId && !String(lancamentoId).startsWith("gen-");
    setContratos((cs) => cs.filter((c) => c.clienteId !== clienteId));
    if (temLanc) setLancamentos((ls) => ls.filter((l) => l.id !== lancamentoId));
    try {
      await adaptador.desativarContrato(clienteId);
      if (temLanc) await adaptador.apagarLancamento(lancamentoId);
      setErro("");
    } catch (e) {
      setContratos(antesContratos);
      setLancamentos(antesLanc);
      setErro(`Não consegui remover o cliente fixo: ${e.message}`);
    }
  }, [adaptador, contratos, lancamentos]);

  /* Clientes: sem otimismo. O diálogo do tomador espera a resposta e mostra o
     erro no próprio formulário (ex.: CPF/CNPJ já cadastrado), então aqui o erro
     sobe em vez de virar mensagem global. */
  const criarCliente = useCallback(async (dados) => {
    const novo = await adaptador.criarCliente(dados);
    setClientes((cs) => [...cs, novo]);
    return novo;
  }, [adaptador]);

  const atualizarCliente = useCallback(async (id, patch) => {
    await adaptador.atualizarCliente(id, patch);
    setClientes((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, [adaptador]);

  return {
    // props do <Financeiro>
    clientes, contratos, lancamentos, config, carregando,
    definirValorContrato, criar, atualizar, remover, removerContrato, removerSerie,
    salvarConfig, renomear, reordenarGrupos, realocarLancamentos,
    criarCliente, atualizarCliente,
    // para o app em volta
    erro, limparErro: () => setErro(""), recarregar, salvarContrato,
  };
}
