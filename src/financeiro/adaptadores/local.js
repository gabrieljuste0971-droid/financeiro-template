/**
 * Adaptador local — guarda tudo no localStorage do navegador.
 *
 * É o que faz o template funcionar na hora, sem backend. Os dados ficam só
 * neste navegador: trocar de aparelho ou limpar o cache perde tudo (use
 * `exportar()` para backup). Para banco de verdade, troque por
 * `criarAdaptadorSupabase` — a tela não muda.
 *
 * Todo adaptador expõe as mesmas funções assíncronas (o contrato está no
 * CLAUDE.md). Para ligar em outro backend, copie este arquivo e troque o miolo.
 */
import { CONFIG_INICIAL } from "../padroes";
import { chaveDoc } from "../documentos";

const novoId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const vazio = () => ({ clientes: [], contratos: [], lancamentos: [], config: { ...CONFIG_INICIAL }, demo: false });

/** Completa um estado parcial (backup antigo, dados de exemplo) com os padrões. */
const completar = (e) => ({ ...vazio(), ...e, config: { ...CONFIG_INICIAL, ...(e?.config || {}) } });

/**
 * @param {object}   opcoes
 * @param {string}   opcoes.chave    chave do localStorage (mude para ter mais de um "caixa")
 * @param {Function} opcoes.inicial  devolve o estado da primeira abertura (ex.: dados de exemplo)
 */
export function criarAdaptadorLocal({ chave = "financeiro:v1", inicial = null } = {}) {
  let memoria = null; // usado se o localStorage estiver indisponível (modo privado)

  const ler = () => {
    try {
      const bruto = localStorage.getItem(chave);
      if (bruto) return completar(JSON.parse(bruto));
    } catch { /* cai na memória */ }
    if (memoria) return memoria;
    const semente = inicial ? { ...completar(inicial()), demo: true } : vazio();
    gravar(semente);
    return semente;
  };

  function gravar(estado) {
    memoria = estado;
    try {
      localStorage.setItem(chave, JSON.stringify(estado));
    } catch { /* fica só na memória desta sessão */ }
  }

  /** Lê, aplica a mudança e grava. `fn` recebe o estado e devolve o novo. */
  const mudar = (fn) => {
    const novo = fn(ler());
    gravar(novo);
    return novo;
  };

  const docEmUso = (estado, doc, ignorarId) => {
    const k = chaveDoc(doc);
    return !!k && estado.clientes.some((c) => c.id !== ignorarId && chaveDoc(c.doc) === k);
  };

  return {
    async carregar() {
      const e = ler();
      return {
        clientes: e.clientes,
        contratos: e.contratos.filter((c) => c.ativo !== false),
        lancamentos: e.lancamentos,
        config: e.config,
      };
    },

    /* ── Lançamentos ───────────────────────────────────────────────────────── */
    async criarLancamento(l) {
      const salvo = { ...l, id: novoId() };
      mudar((e) => ({ ...e, lancamentos: [...e.lancamentos, salvo] }));
      return salvo;
    },
    async atualizarLancamento(id, patch) {
      mudar((e) => ({ ...e, lancamentos: e.lancamentos.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    },
    async apagarLancamento(id) {
      mudar((e) => ({ ...e, lancamentos: e.lancamentos.filter((l) => l.id !== id) }));
    },
    /** Move todos os lançamentos das categorias `deIds` para `paraId`. */
    async recategorizarLancamentos(deIds, paraId) {
      mudar((e) => ({
        ...e,
        lancamentos: e.lancamentos.map((l) => (deIds.includes(l.categoria) ? { ...l, categoria: paraId } : l)),
      }));
    },
    async apagarLancamentosDeCategorias(deIds) {
      mudar((e) => ({ ...e, lancamentos: e.lancamentos.filter((l) => !deIds.includes(l.categoria)) }));
    },
    /** Liga/desliga a repetição mensal de uma série inteira. */
    async definirRecorrenciaSerie(serieId, recorrente) {
      mudar((e) => ({
        ...e,
        lancamentos: e.lancamentos.map((l) => (l.serieId === serieId ? { ...l, recorrente } : l)),
      }));
    },

    /* ── Contratos (mensalidade de cliente fixo) ───────────────────────────── */
    async salvarContrato(clienteId, patch) {
      mudar((e) => {
        const existe = e.contratos.some((c) => c.clienteId === clienteId);
        const contratos = existe
          ? e.contratos.map((c) => (c.clienteId === clienteId ? { ...c, ...patch, ativo: true } : c))
          : [...e.contratos, { clienteId, valor: 0, diaVencimento: 5, ...patch, ativo: true }];
        return { ...e, contratos };
      });
    },
    /** Soft delete: para de gerar a mensalidade, mantém o histórico. */
    async desativarContrato(clienteId) {
      mudar((e) => ({
        ...e,
        contratos: e.contratos.map((c) => (c.clienteId === clienteId ? { ...c, ativo: false } : c)),
      }));
    },

    /* ── Config (saldo base, meta, apelidos, seções e categorias criadas) ──── */
    async salvarConfig(patch) {
      mudar((e) => ({ ...e, config: { ...e.config, ...patch } }));
    },

    /* ── Clientes (tomador da nota) ────────────────────────────────────────── */
    async criarCliente(dados) {
      const cliente = { apelidos: [], docTipo: "cnpj", doc: "", ...dados, id: novoId() };
      mudar((e) => {
        if (docEmUso(e, cliente.doc)) throw new Error("Já existe um cliente com esse CPF/CNPJ.");
        return { ...e, clientes: [...e.clientes, cliente] };
      });
      return cliente;
    },
    async atualizarCliente(id, patch) {
      mudar((e) => {
        if (patch.doc !== undefined && docEmUso(e, patch.doc, id)) throw new Error("Já existe um cliente com esse CPF/CNPJ.");
        return { ...e, clientes: e.clientes.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
      });
    },

    /* ── Extras só do adaptador local ──────────────────────────────────────── */
    /** Os dados em tela ainda são os de exemplo da primeira abertura? */
    ehDemo: () => !!ler().demo,
    /** Apaga tudo e começa vazio. */
    comecarDoZero: () => gravar(vazio()),
    /** Fica com os dados de exemplo (já editados) como se fossem os seus. */
    manterDados: () => gravar({ ...ler(), demo: false }),
    /** Backup: o estado inteiro em JSON. */
    exportar: () => JSON.stringify({ ...ler(), demo: false }, null, 2),
    /** Restaura um backup gerado por `exportar()`. */
    importar(json) {
      const e = JSON.parse(json);
      if (!e || !Array.isArray(e.lancamentos)) throw new Error("Arquivo de backup inválido.");
      gravar({ ...completar(e), demo: false });
    },
  };
}
