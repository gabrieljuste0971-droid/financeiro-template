import React, { useState, useMemo, useEffect, createContext, useContext } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, Check, Trash2, Wallet,
  ArrowDownRight, ArrowUpRight, AlertTriangle, Target, Pencil, X, PiggyBank, Receipt, Copy,
  Eye, EyeOff, TrendingUp, TrendingDown, ArrowLeftRight, Tags, RotateCcw, GripVertical,
  ArrowUpNarrowWide, ArrowDownWideNarrow, Repeat, Waves, Ban, SlidersHorizontal, Scale, Hourglass, Percent, User,
} from "lucide-react";
import { clienteCitado, rotuloDoc, TIPOS_DOC, formataDoc, erroDoDoc, cnpjValido, chaveDoc } from "./documentos";
import { consultarCnpj } from "./cnpj";
import {
  lancamentosDoMes, mesLegivel, mesVizinho,
  emReal, grupoDaCategoria,
  nomeGrupo, nomeCategoria, chaveGrupo, chaveCategoria, gruposOrdenados,
  categoriaDe, ehVariavel, ehGrupoVariavel, emiteNota, ordenarPorData,
  ehLucroDistribuido, secaoDoSubtotal,
  hidratarPersonalizados, categoriasDe, categoriasDoGrupo, padraoDoGrupo, repetePadrao,
  NATUREZAS, chaveNatureza, naturezaDaSecao, ehSecaoFixa,
  PARCELAS, parcelaDe, sinaisPendentes, hidratarParcela, usaParcela,
  HOJE,
} from "./modelo";
import AreaChart from "./AreaChart";
import { CARD, HAIR, INSET, NUM, LABEL, GradientChip, TopBar, ToolbarButton, CAMPO, Campo, Btn, Segmented } from "./ui";

/* ── Tela de Financeiro ───────────────────────────────────────────────────────
   Cards apoiados em sombra difusa (sem borda no claro), respiro generoso, um
   acento único (a cor da marca) e chips de ícone com gradiente. É um "extrato
   vivo": um número-herói, o fluxo de caixa como peça central e edição no lugar.

   A tela não sabe de onde os dados vêm: recebe tudo por props (ver o contrato
   no CLAUDE.md). Quem liga num banco é o hook useFinanceiro + um adaptador. */
const EYEBROW = LABEL;

/* Tomador da nota: a lista de clientes e a porta do diálogo de cadastro descem
   por contexto — quem usa está quatro níveis abaixo (linha, fila de notas,
   formulário de lançamento) e o diálogo precisa morar na raiz do módulo. */
const TomadorCtx = createContext({ clientes: [], abrir: () => {}, abrirDoItem: () => {} });
const NOVO_CLIENTE = "__novo__";

/* Formulário de linha em `sm+`: uma linha só, na altura da tabela. Com valor e
   chip de cliente a conta não fecha em card estreito — aí a descrição segura
   uma largura mínima e os controles descem pra segunda linha em vez de
   espremê-la. */
const FORM_JUSTO = "sm:h-11 sm:flex-nowrap sm:py-0";
const FORM_FOLGADO = "sm:min-h-11 sm:py-1.5";
/* Barra do cabeçalho — todos os controles com a mesma altura (40px no toque,
   36px no desktop), o mesmo raio (rounded-xl) e o mesmo respiro lateral.
   Os grupos segmentados (abas, navegação de mês) fecham a mesma altura com
   p-1 por fora + um raio menor por dentro, que é o encaixe correto. */
const CTRL = "h-10 md:h-9";
/* Só ícone: o padding do ToolbarButton é zerado pelas duas faixas (as variantes
   vencem a classe base, que é o que garante o quadrado exato). */
const CTRL_ICONE = "h-10 w-10 justify-center max-md:px-0 md:h-9 md:w-9 md:px-0";
/* Ícone no celular, ícone + nome a partir de md. */
const CTRL_COMPACTO = "h-10 justify-center max-md:w-10 max-md:px-0 md:h-9";
const CTRL_CAIXA = "flex h-10 items-center gap-0.5 rounded-[10px] bg-neutro-100/80 p-[3px] md:h-9 dark:bg-s1";
const CTRL_SEG = "inline-flex h-full items-center justify-center rounded-[7px] px-3";
const MESES_ABRV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const MES_ATUAL = HOJE.slice(0, 7);
const MASCARA = "R$ ••••••";
/** Formata em real ou devolve a máscara quando os valores estão ocultos. */
const cifra = (v, oculto) => (oculto ? MASCARA : emReal(v));

/** Data local de hoje em ISO (YYYY-MM-DD) — carimbada ao confirmar um pagamento. */
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** Id de série pra repetição mensal — uuid v4 (a coluna no banco é uuid). */
const novaSerie = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
};

/** "2026-08-06" → "06/08" para a coluna "Pago em". */
const diaMes = (iso) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

/** Faturamento abreviado para o eixo Y do gráfico (R$ 12k, R$ 1,4k, R$ 320). */
const faturaCurto = (v) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: v >= 10000 ? 0 : 1 })}k` : `R$ ${Math.round(v)}`;
// resolve id → categoria (padrão ou criada pela tela); centralizado em modelo.js
const catDe = categoriaDe;

/** Input de moeda no formato pt-BR — parseia "30.922,50" para número. */
function MoedaInput({ inicial, onConfirmar, onCancelar, className = "" }) {
  const [texto, setTexto] = useState(inicial ? String(inicial).replace(".", ",") : "");
  const confirmar = () => {
    const n = parseFloat(texto.replace(/\./g, "").replace(",", "."));
    onConfirmar(isNaN(n) ? 0 : n);
  };
  return (
    <input
      autoFocus
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmar();
        if (e.key === "Escape") onCancelar();
      }}
      placeholder="0,00"
      inputMode="decimal"
      aria-label="Valor"
      className={`rounded-lg border border-brand-400 bg-white px-2 py-1 tabular-nums outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-brand-500 dark:bg-white/[0.06] dark:text-t1 ${className}`}
    />
  );
}

/**
 * Tile de indicador do fechamento. Um sistema de cartão único para os quatro
 * números do topo — mesma borda, raio, respiro, chip e tabular-nums —, com
 * hierarquia pela largura (no grid) e um só destaque cromático (`destaque`
 * pinta o cartão inteiro; é o lucro). O chip com container dá presença ao ícone
 * sem poluir; o rodapé (`children`) ancora no fundo pra alinhar entre tiles.
 */
function StatCard({ icon: Icon, eyebrow, valor, oculto, children, nota = null, chipTom = "slate", destaque = null, numClass = "text-[30px]", className = "", orbita = false }) {
  const surface =
    destaque === "rose"
      ? "border border-rose-500/25 bg-rose-500/[0.05] dark:border-rose-500/30 dark:bg-rose-500/[0.07]"
      : destaque === "emerald"
      ? "border border-emerald-500/25 bg-emerald-500/[0.05] dark:border-emerald-500/30 dark:bg-emerald-500/[0.07]"
      : CARD;
  const numCor =
    destaque === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : destaque === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-neutro-900 dark:text-t1";
  const chipTomFinal = destaque || chipTom;

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-2xl p-4 sm:p-5 ${surface} ${className}`}>
      {destaque && (
        <div className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl ${destaque === "rose" ? "bg-rose-400/20" : "bg-emerald-400/25"}`} />
      )}
      {orbita && (
        <span aria-hidden className={`fin-orbita ${destaque === "rose" ? "fin-orbita-rose" : ""}`}>
          <span className="fin-orbita-luz" />
        </span>
      )}
      <div className="relative flex items-center gap-2">
        <GradientChip icon={Icon} tom={chipTomFinal} size={28} iconSize={15} className="!rounded-lg" />
        <span className={`${EYEBROW} truncate`}>{eyebrow}</span>
      </div>
      <div className={`relative mt-3 font-semibold leading-none ${NUM} ${numClass} ${numCor}`}>
        {cifra(valor, oculto)}
      </div>
      {nota && <div className="relative mt-2.5">{nota}</div>}
      {children && <div className="relative mt-auto pt-3">{children}</div>}
    </div>
  );
}

/** Uma linha do movimento (Recebido / Despesas): chip de direção + rótulo à
 *  esquerda, valor em tabular-nums à direita — empilham como num extrato. */
function LinhaMov({ icon: Icon, tom, label, valor, oculto }) {
  const chip = {
    emerald: "bg-emerald-500/[.12] text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    rose: "bg-rose-500/[.12] text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  }[tom];
  return (
    <div className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chip}`}>
        <Icon size={15} strokeWidth={2.25} />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutro-500 dark:text-t2">{label}</span>
      <span className={`ml-auto text-[18px] font-semibold text-neutro-900 dark:text-t1 ${NUM}`}>
        {cifra(valor, oculto)}
      </span>
    </div>
  );
}

/**
 * Faixa-herói: três tiles do mesmo sistema de cartão — Saldo em caixa (o caixa),
 * Movimento (Recebido − Despesas, o extrato que explica) e Lucro do mês (o
 * resultado, único em destaque cromático). Sem vão morto: densidade uniforme,
 * borda/raio/respiro iguais, um só accent puxando o olho. Empilha no estreito e
 * vira três colunas só quando há largura de verdade (sem cortar os valores).
 */
function HeroSaldo({ saldo, base, recebido, gasto, lucro, distribuido, meta, onEditarBase, oculto }) {
  const [editando, setEditando] = useState(false);
  const lucroTom = lucro >= 0 ? "emerald" : "rose";
  const NUM_PRIN = "text-[26px] sm:text-[28px] xl:text-[30px]";

  // Progresso da meta de faturamento (recebido ÷ meta), no rodapé do Lucro.
  const pctMeta = meta > 0 ? Math.round((recebido / meta) * 100) : 0;
  const metaBatida = meta > 0 && recebido >= meta;
  const faltaMeta = Math.max(meta - recebido, 0);

  return (
    // Celular: uma coluna. Tablet: o Lucro ocupa a linha toda e Movimento/Saldo
    // dividem a de baixo. Desktop largo: os três lado a lado.
    <section className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-1 xl:gap-4">
      {/* Lucro do mês — resultado, único em destaque */}
      <StatCard
        icon={lucro >= 0 ? TrendingUp : TrendingDown}
        destaque={lucroTom}
        eyebrow="Lucro do mês"
        valor={lucro}
        oculto={oculto}
        numClass={NUM_PRIN}
        className="sm:col-span-2 xl:col-span-1"
        orbita
        nota={
          distribuido > 0 ? (
            <span className="flex flex-wrap items-baseline gap-x-1.5 text-[11.5px] font-medium text-neutro-500 dark:text-t2">
              retirado como lucro distribuído
              <span className={`font-semibold text-neutro-700 dark:text-t1 ${NUM}`}>{cifra(distribuido, oculto)}</span>
            </span>
          ) : null
        }
      >
        {meta > 0 ? (
          <div className="w-full">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="truncate font-medium text-neutro-500 dark:text-t2">
                {metaBatida ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Meta do mês batida 🎉</span>
                ) : (
                  <>faltam <span className={`font-semibold text-neutro-700 dark:text-t1 ${NUM}`}>{cifra(faltaMeta, oculto)}</span> pra meta</>
                )}
              </span>
              <span className={`shrink-0 font-semibold ${NUM} ${metaBatida ? "text-emerald-600 dark:text-emerald-400" : "text-brand-600 dark:text-brand-300"}`}>{pctMeta}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.1]">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${metaBatida ? "bg-emerald-500" : "bg-brand-500"}`}
                style={{ width: `${Math.min(pctMeta, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-[11.5px] font-medium text-neutro-500 dark:text-t2">
            Defina uma meta pra acompanhar o progresso
          </span>
        )}
      </StatCard>

      {/* Movimento — o extrato que forma o lucro */}
      <div className={`flex flex-col p-4 sm:p-6 ${CARD}`}>
        <div className="flex items-center gap-2">
          <GradientChip icon={ArrowLeftRight} tom="slate" size={28} iconSize={15} className="!rounded-lg" />
          <span className={EYEBROW}>Movimento do mês</span>
        </div>
        <div className="mt-3 flex flex-1 flex-col justify-center divide-y divide-neutro-100 dark:divide-white/[0.06]">
          <LinhaMov icon={ArrowDownRight} tom="emerald" label="Recebido" valor={recebido} oculto={oculto} />
          <LinhaMov icon={ArrowUpRight} tom="rose" label="Despesas" valor={gasto} oculto={oculto} />
        </div>
      </div>

      {/* Saldo em caixa — dinheiro acumulado */}
      <StatCard
        icon={PiggyBank}
        eyebrow="Saldo em caixa"
        valor={saldo}
        oculto={oculto}
        numClass={`${NUM_PRIN} ${saldo < 0 ? "!text-rose-600 dark:!text-rose-400" : ""}`}
      >
        <div className="flex items-center gap-1.5 text-[11.5px] text-neutro-500 dark:text-t2">
          {editando ? (
            <>
              <span className="shrink-0">base</span>
              <MoedaInput
                inicial={base}
                onConfirmar={(v) => { onEditarBase(v); setEditando(false); }}
                onCancelar={() => setEditando(false)}
                className="w-28 text-[12px]"
              />
            </>
          ) : (
            <>
              <span className="truncate">base <span className={NUM}>{cifra(base, oculto)}</span> · ajustado pelo que entra e sai</span>
              <button
                onClick={() => setEditando(true)}
                aria-label="Editar saldo base"
                className="shrink-0 cursor-pointer rounded p-0.5 text-neutro-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-t3 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
              >
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>
      </StatCard>
    </section>
  );
}

/**
 * Peça central: fluxo de caixa em curvas — Entradas × Despesas × Lucro
 * distribuído ao longo dos últimos meses. Mesmo gráfico dinâmico do Dashboard
 * (<AreaChart>): curvas suaves, área sob as entradas, crosshair e tooltip que
 * deslizam com mola. O lucro distribuído tem curva própria (não entra em
 * despesas) pra separar custo de retirada — mas continua saindo do saldo.
 * Meses passados usam o valor atual dos contratos — é estimativa, não extrato.
 */
function GraficoFluxo({ dados, janela, setJanela, oculto }) {
  const labels = dados.map((d) => MESES_ABRV[Number(d.mes.split("-")[1]) - 1]);
  const saldo = dados.reduce((n, d) => n + (d.entradas - d.despesas - d.lucroDist), 0);

  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="mr-auto flex min-w-0 items-center gap-2">
          <span className={EYEBROW}>Fluxo de caixa</span>
          <span className="hidden text-[11px] text-neutro-400 sm:inline dark:text-t3">· últimos {janela} meses</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-neutro-500 dark:text-t2">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> Entradas</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Despesas</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Lucro Dist.</span>
        </div>
        <button
          onClick={() => setJanela(janela === 6 ? 12 : 6)}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutro-200 px-2.5 py-1 text-[11.5px] font-medium text-neutro-600 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-line dark:text-t2 dark:hover:border-brand-500/50 dark:hover:text-brand-300"
        >
          {janela} meses
          <ChevronDown size={12} className="text-neutro-400 dark:text-t3" />
        </button>
      </div>

      <div className="mt-4">
        <AreaChart
          labels={labels}
          series={[
            { key: "entradas", label: "Entradas", values: dados.map((d) => d.entradas), color: "rgb(var(--brand-500))", area: true },
            { key: "despesas", label: "Despesas", values: dados.map((d) => d.despesas), color: "#fb7185" },
            { key: "lucroDist", label: "Lucro Dist.", values: dados.map((d) => d.lucroDist), color: "#fbbf24" },
          ]}
          formatValor={emReal}
          formatEixo={faturaCurto}
          oculto={oculto}
          vazioTexto="Sem movimento lançado — preencha entradas e saídas"
          alturaAmpla={120}
        />
      </div>

      <div className={`mt-1 flex items-center justify-between gap-3 border-t pt-3 ${HAIR}`}>
        <span className="min-w-0 text-[11.5px] text-neutro-500 dark:text-t2">
          Saldo do período <span className="hidden sm:inline">(entradas − despesas − lucro dist.)</span>
        </span>
        <span className={`text-[13px] font-semibold ${NUM} ${saldo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {oculto ? MASCARA : emReal(saldo)}
        </span>
      </div>
    </section>
  );
}

/**
 * Meta do mês com gauge semicircular. Destaque é "quanto falta" para bater a
 * meta (o número-herói); o gauge mostra o % e o rodapé ancora recebido/meta.
 */
function CartaoMeta({ meta, recebido, oculto, onEditarMeta }) {
  const [editando, setEditando] = useState(false);
  const pctReal = meta > 0 ? Math.round((recebido / meta) * 100) : 0;
  const batida = meta > 0 && recebido >= meta;
  const falta = Math.max(meta - recebido, 0);

  return (
    <section className={`${CARD} flex flex-col p-4 sm:p-5`}>
      <div className="flex items-center gap-2">
        <GradientChip icon={Target} tom="slate" size={28} iconSize={15} className="!rounded-lg" />
        <span className={EYEBROW}>Meta do mês</span>
        {editando ? (
          <MoedaInput
            inicial={meta}
            onConfirmar={(v) => { onEditarMeta(v); setEditando(false); }}
            onCancelar={() => setEditando(false)}
            className="ml-auto w-24 text-[12px] text-right"
          />
        ) : (
          <button
            onClick={() => setEditando(true)}
            className="-my-1.5 ml-auto flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-[11.5px] font-medium text-neutro-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:text-t2 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            <Pencil size={11} /> {meta > 0 ? "Editar" : "Definir"}
          </button>
        )}
      </div>

      {meta > 0 ? (
        <div className="flex flex-1 flex-col">
          {/* Herói — quanto falta pra bater a meta, com o % ao lado */}
          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="min-w-0">
              {batida ? (
                <>
                  <div className="text-[12px] text-neutro-500 dark:text-t2">Faturamento acima do alvo</div>
                  <div className="mt-1.5 text-[24px] font-semibold leading-none tracking-tight text-emerald-600 dark:text-emerald-400">Meta batida</div>
                </>
              ) : (
                <>
                  <div className="text-[12px] text-neutro-500 dark:text-t2">Faltam para a meta</div>
                  <div className={`mt-1.5 truncate text-[26px] font-semibold leading-none tracking-tight ${NUM} text-neutro-900 dark:text-t1`}>
                    {cifra(falta, oculto)}
                  </div>
                </>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${NUM} ${batida ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-brand-500/10 text-brand-600 dark:text-brand-300"}`}>
              {pctReal}%
            </span>
          </div>

          {/* Progresso */}
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-neutro-100 dark:bg-white/[0.06]">
            <div
              className={`h-full rounded-full ${batida ? "bg-emerald-500" : "bg-brand-500"}`}
              style={{ width: `${Math.min(pctReal, 100)}%`, transition: "width .7s cubic-bezier(.22,1,.36,1)" }}
            />
          </div>

          {/* Legenda — recebido de meta */}
          <div className="mt-3 flex items-center justify-between gap-3 text-[12px]">
            <span className="truncate text-neutro-500 dark:text-t2">
              Recebido <span className={`ml-1 font-semibold text-neutro-700 dark:text-t1 ${NUM}`}>{cifra(recebido, oculto)}</span>
            </span>
            <span className="truncate text-neutro-500 dark:text-t2">
              Meta <span className={`ml-1 font-medium text-neutro-600 dark:text-t1 ${NUM}`}>{cifra(meta, oculto)}</span>
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-3 flex-1 text-[13px] leading-relaxed text-neutro-500 dark:text-t2">
          Defina uma meta de faturamento para acompanhar o mês.
        </p>
      )}
    </section>
  );
}

/** Controle de emissão de nota fiscal do mês — quantas faltam, quantas saíram. */
/**
 * "Falta 50%": todo sinal (1ª metade) cuja 2ª metade ainda não foi lançada,
 * de todos os meses. É a previsão de caixa do que ainda vai entrar (ou sair).
 * "Lançar 2ª parte" cria a outra metade no mês em foco; "Já resolvido" só tira
 * da lista (ex.: cliente desistiu, ou a 2ª parte foi lançada à mão).
 */
function PainelParcelas({ pendentes, mes, oculto, onMes, onLancar, onResolver }) {
  const receber = pendentes.filter((l) => l.tipo === "entrada");
  const pagar = pendentes.filter((l) => l.tipo === "saida");
  const soma = (a) => a.reduce((n, l) => n + (l.valor || 0), 0);
  const val = (v) => (oculto ? MASCARA : emReal(v));
  const ordenados = [...pendentes].sort((a, b) => (a.mes + String(a.dia).padStart(2, "0")).localeCompare(b.mes + String(b.dia).padStart(2, "0")));
  const mesCurto = (m) => `${MESES_ABRV[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

  return (
    <section className={`${CARD} flex flex-col p-4 sm:p-5`}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Hourglass size={16} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={EYEBROW}>Falta 50%</span>
            {pendentes.length > 0 && (
              <span className={`rounded-full bg-amber-500/10 px-1.5 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400 ${NUM}`}>
                {pendentes.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* A receber × A pagar: os dois lados sempre à vista, cada um com sua cor. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-emerald-500/[0.06] px-3 py-2 dark:bg-emerald-400/[0.06]">
          <div className="flex items-center gap-1 text-[11px] text-neutro-500 dark:text-t2">
            <ArrowDownRight size={12} className="text-emerald-500" /> A receber
          </div>
          <div className={`mt-0.5 text-[18px] font-semibold leading-tight ${NUM} ${receber.length ? "text-emerald-600 dark:text-emerald-400" : "text-neutro-400 dark:text-t3"}`}>
            {val(soma(receber))}
          </div>
        </div>
        <div className="rounded-xl bg-rose-500/[0.06] px-3 py-2 dark:bg-rose-400/[0.06]">
          <div className="flex items-center gap-1 text-[11px] text-neutro-500 dark:text-t2">
            <ArrowUpRight size={12} className="text-rose-500" /> A pagar
          </div>
          <div className={`mt-0.5 text-[18px] font-semibold leading-tight ${NUM} ${pagar.length ? "text-rose-600 dark:text-rose-400" : "text-neutro-400 dark:text-t3"}`}>
            {val(soma(pagar))}
          </div>
        </div>
      </div>

      {ordenados.length === 0 ? (
        <div className="flex items-center justify-center gap-1.5 py-5 text-center">
          <Check size={16} className="text-emerald-500" />
          <span className="text-[12.5px] text-neutro-500 dark:text-t2">Nenhuma 2ª parte pendente</span>
        </div>
      ) : (
        // Uma linha por sinal; "×" só no hover. No desktop a lista não empurra a
        // altura: o card acompanha a linha do grid e o que passar rola aqui dentro.
        <div className="relative mt-3 min-h-0 flex-1 lg:min-h-[140px]">
        <ul className="max-h-[320px] overflow-y-auto overscroll-contain lg:absolute lg:inset-0 lg:max-h-none">
          {ordenados.map((l) => (
            <li key={l.id} className={`group flex items-center gap-2.5 rounded-lg border-t px-2 py-1.5 transition-colors hover:bg-neutro-50 dark:hover:bg-white/[0.03] ${HAIR}`}>
              {/* Meia-lua: metade cheia = 1ª parte; a outra metade é o que falta. */}
              <span
                aria-hidden
                title={l.pago ? "1ª parte paga" : "1ª parte em aberto"}
                className={`relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full ring-[1.5px] ring-inset ${l.tipo === "entrada" ? "ring-emerald-500/60" : "ring-rose-500/60"}`}
              >
                <span className={`absolute inset-y-0 left-0 w-1/2 ${l.pago ? (l.tipo === "entrada" ? "bg-emerald-500" : "bg-rose-500") : "bg-neutro-300 dark:bg-white/20"}`} />
              </span>
              <span className="min-w-0 truncate text-[13px] text-neutro-700 dark:text-t1">{l.descricao}</span>
              <button
                onClick={() => onMes(l.mes)}
                title={`1ª parte ${l.pago ? "paga" : "em aberto"} — ir para o mês`}
                className={`shrink-0 text-[11px] text-neutro-400 transition-colors hover:text-brand-600 dark:text-t3 dark:hover:text-brand-300 ${NUM}`}
              >
                {mesCurto(l.mes)}
              </button>
              <span className={`ml-auto shrink-0 text-[13px] font-semibold ${NUM} ${l.tipo === "entrada" ? "text-neutro-800 dark:text-t1" : "text-rose-600 dark:text-rose-400"}`}>
                {val(l.valor)}
              </span>
              <button
                onClick={() => onResolver(l)}
                title="Tirar da lista sem lançar nada"
                aria-label="Marcar como resolvido"
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutro-400 opacity-0 transition hover:bg-neutro-100 hover:text-neutro-600 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100 dark:text-t3 dark:hover:bg-white/[0.06] dark:hover:text-t2"
              >
                <X size={13} />
              </button>
              <button
                onClick={() => onLancar(l)}
                title={`Cria a 2ª parte em ${mesLegivel(mes)}`}
                aria-label="Lançar 2ª parte"
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-brand-500 text-white transition-colors hover:bg-brand-600 active:scale-95"
              >
                <Plus size={13} />
              </button>
            </li>
          ))}
        </ul>
        </div>
      )}
    </section>
  );
}

/**
 * Notas fiscais do mês: anel de progresso + números no topo e, embaixo, a fila
 * do que falta emitir (maior valor primeiro). "Emitir" grava no mesmo campo do
 * selo da lista de lançamentos, então as duas seções andam juntas.
 * Só entra aqui a entrada já recebida (check de pago); nota emitida antes do
 * pagamento continua contando como emitida.
 */
function PainelNotas({ entradas, onEmitir, oculto }) {
  const { abrirDoItem } = useContext(TomadorCtx);
  const cobrancas = entradas.filter((e) => (e.valor || 0) > 0 && emiteNota(e.categoria) && (e.pago || e.notaEmitida));
  const total = cobrancas.length;
  const lancadas = cobrancas.filter((e) => e.notaEmitida).length;
  const faltam = total - lancadas;
  const pendentes = cobrancas.filter((e) => !e.notaEmitida).sort((a, b) => (b.valor || 0) - (a.valor || 0));
  const valorPendente = pendentes.reduce((n, e) => n + (e.valor || 0), 0);
  const pct = total ? Math.round((lancadas / total) * 100) : 0;
  const completo = total > 0 && faltam === 0;
  const nomeCurto = (d) => d.replace("Mensalidade — ", "");
  /* Segunda linha: de quem é a nota. Quando a descrição já é o nome do cliente,
     repetir o nome só faz ruído — fica só o documento. */
  const legenda = (p) => {
    const t = p.tomador;
    if (!t) return "Sem cliente";
    const mesmoNome = t.nome.trim().toLowerCase() === nomeCurto(p.descricao).trim().toLowerCase();
    return [mesmoNome ? null : t.nome, t.doc || "Sem documento"].filter(Boolean).join(" · ");
  };
  const R = 20, C = 2 * Math.PI * R;

  return (
    <section className={`${CARD} flex flex-col p-4 sm:p-5`}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Receipt size={16} strokeWidth={1.9} />
        </div>
        <span className={EYEBROW}>Notas fiscais</span>
        {faltam > 0 && (
          <span className={`rounded-full bg-brand-500/10 px-1.5 text-[10.5px] font-semibold text-brand-600 dark:text-brand-300 ${NUM}`}>{faltam}</span>
        )}
      </div>

      {/* Anel de progresso + os dois números que importam. */}
      <div className="mt-3 flex items-center gap-4 rounded-xl bg-neutro-50 px-3 py-2.5 dark:bg-white/[0.03]">
        <div className="relative h-12 w-12 shrink-0">
          <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
            <circle cx="24" cy="24" r={R} fill="none" strokeWidth="5" className="stroke-black/[0.06] dark:stroke-white/[0.08]" />
            <circle
              cx="24" cy="24" r={R} fill="none" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
              className="stroke-emerald-500 transition-[stroke-dashoffset] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-neutro-700 dark:text-t1 ${NUM}`}>{pct}%</span>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-neutro-500 dark:text-t2">Emitidas</div>
            <div className={`text-[18px] font-semibold leading-tight text-emerald-600 dark:text-emerald-400 ${NUM}`}>
              {lancadas}<span className="text-[12px] font-normal text-neutro-400 dark:text-t3">/{total}</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-neutro-500 dark:text-t2">Valor sem nota</div>
            <div className={`text-[18px] font-semibold leading-tight ${NUM} ${faltam ? "text-neutro-800 dark:text-t1" : "text-neutro-400 dark:text-t3"}`}>
              {cifra(valorPendente, oculto)}
            </div>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 items-center justify-center py-5 text-[12.5px] text-neutro-500 dark:text-t2">Nenhuma entrada recebida ainda</div>
      ) : completo ? (
        <div className="flex flex-1 items-center justify-center gap-1.5 py-5">
          <Check size={16} className="text-emerald-500" />
          <span className="text-[12.5px] text-neutro-500 dark:text-t2">Todas as notas emitidas</span>
        </div>
      ) : (
        // Fila rolando dentro do card, como em "Falta 50%".
        <div className="relative mt-3 min-h-0 flex-1 lg:min-h-[140px]">
          <ul className="max-h-[320px] overflow-y-auto overscroll-contain lg:absolute lg:inset-0 lg:max-h-none">
            {pendentes.map((p) => (
              <li key={p.id} className={`group flex items-center gap-2.5 rounded-lg border-t px-2 py-1.5 transition-colors hover:bg-neutro-50 dark:hover:bg-white/[0.03] ${HAIR}`}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-neutro-700 dark:text-t1">{nomeCurto(p.descricao)}</span>
                  <button
                    onClick={() => abrirDoItem(p)}
                    title="Trocar o tomador ou o documento"
                    className={`block max-w-full cursor-pointer truncate text-left text-[11px] transition-colors hover:text-brand-600 focus:outline-none focus-visible:underline dark:hover:text-brand-300 ${NUM} ${
                      p.tomador?.doc ? "text-neutro-400 dark:text-t3" : "text-amber-600/90 dark:text-amber-400/80"
                    }`}
                  >
                    {legenda(p)}
                  </button>
                </span>
                <span className={`shrink-0 text-[12.5px] font-medium text-neutro-500 dark:text-t2 ${NUM}`}>{cifra(p.valor, oculto)}</span>
                <CopiarDoc tomador={p.tomador} onCadastrar={() => abrirDoItem(p)} comRotulo />
                <button
                  onClick={() => onEmitir(p)}
                  title="Marcar nota como emitida"
                  className="flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-emerald-600 ring-1 ring-inset ring-emerald-500/30 transition hover:bg-emerald-500 hover:text-white active:scale-95 dark:text-emerald-400 dark:hover:text-white"
                >
                  <Check size={12} strokeWidth={2.5} /> Emitir
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Campo de dinheiro que edita no lugar, sem abrir modal. */
function ValorEditavel({ valor, onChange, tom, className = "" }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");

  const confirmar = () => {
    const n = parseFloat(texto.replace(/\./g, "").replace(",", "."));
    if (!isNaN(n)) onChange(n);
    setEditando(false);
  };

  if (editando) {
    return (
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirmar();
          if (e.key === "Escape") setEditando(false);
        }}
        placeholder="0,00"
        inputMode="decimal"
        aria-label="Valor"
        className={`w-[104px] rounded-lg border border-brand-400 px-1.5 py-1 text-right text-[13px] outline-none focus:ring-2 focus:ring-brand-500/25 sm:w-[86px] sm:py-0.5 dark:border-brand-500 dark:bg-white/[0.06] dark:text-t1 ${NUM} ${className}`}
      />
    );
  }

  return (
    <button
      onClick={() => { setTexto(valor ? String(valor).replace(".", ",") : ""); setEditando(true); }}
      className={`w-[104px] shrink-0 cursor-pointer rounded-lg px-1.5 py-1.5 text-right text-[14px] font-medium transition-colors duration-200 hover:bg-neutro-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:w-[86px] sm:py-0.5 sm:text-[13px] sm:font-normal dark:hover:bg-white/[0.06] ${NUM} ${
        valor ? tom : "text-neutro-400 dark:text-t3"
      } ${className}`}
    >
      {valor ? emReal(valor) : "definir"}
    </button>
  );
}

/**
 * Coluna "Pago em": mostra a data do pagamento e permite editá-la no lugar com
 * o seletor de data nativo. Escolher uma data também confirma o pagamento;
 * limpar o campo volta para "—" (mantém o estado de pago inalterado).
 */
function DataEditavel({ pago, pagoEm, onChange, className = "" }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={pagoEm || ""}
        onChange={(e) => { onChange(e.target.value || null); setEditando(false); }}
        onBlur={() => setEditando(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setEditando(false); }}
        aria-label="Data de pagamento"
        className={`w-[150px] shrink-0 rounded-lg border border-brand-400 px-1.5 py-1 text-[11px] outline-none focus:ring-2 focus:ring-brand-500/25 sm:w-[124px] sm:py-0.5 dark:border-brand-500 dark:bg-white/[0.06] dark:text-t1 [color-scheme:light] dark:[color-scheme:dark] ${className}`}
      />
    );
  }

  const quitado = pago && pagoEm;

  return (
    <button
      onClick={() => setEditando(true)}
      aria-label="Editar data de pagamento"
      title={quitado ? `Pago em ${diaMes(pagoEm)} — clique para editar` : "Definir data de pagamento"}
      className={`shrink-0 cursor-pointer rounded-lg text-[11.5px] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:py-0.5 sm:text-right sm:text-[11px] ${NUM} ${
        quitado
          ? "sm:w-[60px]"
          : "px-1.5 py-1 text-neutro-300 hover:bg-neutro-100 hover:text-neutro-500 max-sm:text-neutro-400 sm:w-6 sm:px-0 dark:text-t4 dark:hover:bg-white/[0.06] dark:hover:text-t2 max-sm:dark:text-t3"
      } ${className}`}
    >
      {/* Pago vira selo: o "✓ 06/08" carrega o estado sozinho, então some a
          necessidade de explicar a coluna no estreito. Em aberto continua texto
          — no celular ele precisa se apresentar ("baixar"), na tabela larga a
          coluna tem cabeçalho implícito e o traço basta. */}
      {quitado ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-500/25 transition-colors duration-200 hover:bg-emerald-500/[0.18] dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/25">
          <Check size={10} strokeWidth={3.25} />{diaMes(pagoEm)}
        </span>
      ) : (
        <>
          <span className="sm:hidden">baixar</span>
          <span className="hidden sm:inline">—</span>
        </>
      )}
    </button>
  );
}

/**
 * Check da baixa. Mesmo traço do ícone do lucide, mas com o `path` exposto para
 * poder desenhá-lo no momento da confirmação (`stroke-dashoffset`).
 */
function CheckBaixa({ animando }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={animando ? "animate-baixa-check" : ""}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Escolha 100% / 50% (1ª ou 2ª parte) — só em categorias com a opção ligada. */
function SelectParcela({ valor, onChange }) {
  return (
    <select
      value={valor || "integral"}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Parcela"
      className="shrink-0 cursor-pointer rounded-lg border border-neutro-200 px-2 py-1.5 text-xs text-neutro-600 outline-none sm:py-1 dark:border-line dark:bg-white/[0.06] dark:text-t2"
    >
      {PARCELAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
    </select>
  );
}

/** Linha em modo de edição: descrição, categoria e dia. */
function LinhaEdicao({ item, onSalvar, onCancelar, rotulos }) {
  const [desc, setDesc] = useState(item.descricao);
  const [categoria, setCategoria] = useState(item.categoria);
  const [dia, setDia] = useState(String(item.dia || ""));
  const [parcela, setParcela] = useState(item.parcela || "integral");
  const cats = categoriasDe(item.tipo);
  const variavel = ehVariavel(categoria, item.tipo);
  // Mensalidade de contrato já tem dono: o cliente é o do contrato.
  const comCliente = item.tipo === "entrada" && item.origem !== "contrato" && emiteNota(categoria);
  const { cliente, abrirDialogo } = useClienteDoForm(item.clienteId || undefined, desc);

  const salvar = () => {
    if (!desc.trim()) return onCancelar();
    onSalvar({
      descricao: desc.trim(), categoria, dia: Number(dia) || 1, parcela: usaParcela(categoria) ? parcela : item.parcela ?? null,
      ...(comCliente ? { clienteId: cliente?.id ?? null } : {}),
    });
  };

  return (
    // No estreito o formulário quebra em duas linhas (descrição em cima,
    // categoria/dia/ações embaixo); em `sm` volta a ser uma linha só.
    <div className={`flex flex-wrap items-center gap-2 border-b bg-brand-50/50 px-3 py-2.5 last:border-0 sm:px-4 dark:bg-brand-500/[0.06] ${comCliente ? FORM_FOLGADO : FORM_JUSTO} ${HAIR}`}>
      <input
        autoFocus
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") onCancelar(); }}
        aria-label="Descrição"
        className={`w-full min-w-0 rounded-lg border border-brand-300 px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-brand-500/25 sm:w-auto sm:flex-1 sm:py-1 dark:border-brand-500/60 dark:bg-white/[0.06] dark:text-t1 ${comCliente ? "sm:min-w-[9rem]" : ""}`}
      />
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        aria-label="Categoria"
        className="min-w-0 max-w-[45%] flex-1 cursor-pointer rounded-lg border border-neutro-200 px-2 py-1.5 text-xs text-neutro-600 outline-none sm:max-w-none sm:flex-none sm:py-1 dark:border-line dark:bg-white/[0.06] dark:text-t2"
      >
        {cats.map((c) => <option key={c.id} value={c.id}>{nomeCategoria(c, rotulos)}</option>)}
      </select>
      {usaParcela(categoria) && <SelectParcela valor={parcela} onChange={setParcela} />}
      {comCliente && <ChipCliente cliente={cliente} onClick={abrirDialogo} />}
      {!variavel && (
        <input
          value={dia}
          onChange={(e) => setDia(e.target.value.replace(/\D/g, "").slice(0, 2))}
          placeholder="dia"
          inputMode="numeric"
          aria-label="Dia do vencimento"
          className="w-16 shrink-0 rounded-lg border border-neutro-200 px-2 py-1.5 text-center text-xs outline-none sm:w-14 sm:py-1 dark:border-line dark:bg-white/[0.06] dark:text-t1"
        />
      )}
      <button onClick={salvar} aria-label="Salvar" className={`ml-auto shrink-0 cursor-pointer rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-brand-600 active:scale-95 sm:px-2.5 sm:py-1 ${comCliente ? "" : "sm:ml-0"}`}>
        Salvar
      </button>
      <button onClick={onCancelar} aria-label="Cancelar" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutro-400 hover:bg-neutro-100 hover:text-neutro-600 sm:h-auto sm:w-auto sm:p-1 dark:hover:bg-white/[0.06]">
        <X size={16} />
      </button>
    </div>
  );
}

/** Selo de nota fiscal: emitida (verde cheio) ou pendente (contorno discreto). */
function SeloNota({ emitida, onToggle, className = "" }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={emitida}
      aria-label={emitida ? "Nota emitida — clique para desmarcar" : "Marcar nota como emitida"}
      title={emitida ? "Nota emitida" : "Nota pendente"}
      className={`flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[10.5px] font-semibold uppercase tracking-wide transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:h-6 sm:px-2 ${className} ${
        emitida
          ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/20 dark:text-emerald-400"
          : "text-neutro-400 ring-1 ring-inset ring-neutro-200 hover:text-brand-600 hover:ring-brand-300 dark:text-t3 dark:ring-white/[0.1] dark:hover:text-brand-300 dark:hover:ring-brand-500/50"
      }`}
    >
      <Receipt size={11} strokeWidth={2.25} /> <span className="inline sm:hidden 2xl:inline">NF</span>
    </button>
  );
}

/**
 * Copia o documento do tomador (CNPJ/CPF só com dígitos) pra colar no emissor
 * de NF. Sem documento, o mesmo lugar vira a porta do cadastro — a linha nunca
 * fica num beco sem saída.
 */
function CopiarDoc({ tomador, onCadastrar, comRotulo = false, className = "" }) {
  const [copiado, setCopiado] = useState(false);
  const doc = tomador?.doc || "";
  const valor = tomador?.docTipo === "outro" ? doc.trim() : doc.replace(/\D/g, "");
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch { /* clipboard bloqueado: ignora */ }
  };
  const ocioso = "text-neutro-400 ring-neutro-200 hover:text-brand-600 hover:ring-brand-300 dark:text-t3 dark:ring-white/[0.1] dark:hover:text-brand-300 dark:hover:ring-brand-500/50";

  if (!valor) {
    return (
      <button
        onClick={onCadastrar}
        aria-label="Cadastrar documento do tomador"
        title="Cadastrar CNPJ ou CPF do tomador"
        className={`flex shrink-0 cursor-pointer items-center justify-center ring-1 ring-inset transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-95 ${ocioso} ${
          comRotulo ? "h-6 gap-0.5 rounded-lg px-2 text-[11px] font-medium" : "h-7 w-7 rounded-full sm:h-6 sm:w-6"
        } ${className}`}
      >
        <Plus size={11} strokeWidth={2.5} />{comRotulo && "CNPJ"}
      </button>
    );
  }

  return (
    <button
      onClick={copiar}
      aria-label={`Copiar ${rotuloDoc(tomador.docTipo)} do tomador`}
      title={copiado ? "Copiado" : `Copiar ${rotuloDoc(tomador.docTipo)} ${doc} · ${tomador.nome}`}
      className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:h-6 sm:w-6 ${className} ${
        copiado ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/30 dark:text-emerald-400" : ocioso
      }`}
    >
      {copiado ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2.25} />}
    </button>
  );
}

/** Cliente do lançamento dentro dos formulários de linha: mostra quem foi
 *  reconhecido pela descrição e abre o diálogo pra trocar ou cadastrar. */
function ChipCliente({ cliente, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={cliente ? `Cliente: ${cliente.nome}. Trocar` : "Vincular cliente"}
      title={cliente ? `Nota em nome de ${cliente.nome} — clique para trocar` : "Vincular o cliente que recebe a nota"}
      className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors sm:h-7 ${
        cliente
          ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
          : `text-neutro-500 hover:text-brand-600 dark:text-t2 dark:hover:text-brand-300 ${HAIR}`
      }`}
    >
      <User size={12} className="shrink-0" />
      <span className="max-w-[6.5rem] truncate">{cliente ? cliente.nome : "Cliente"}</span>
    </button>
  );
}

/**
 * Cliente do lançamento no formulário: enquanto ninguém escolhe, vale quem a
 * descrição cita (`indefinido`); depois de escolher, vale a escolha — inclusive
 * "sem cliente" (`null`).
 */
function useClienteDoForm(inicial, descricao) {
  const { clientes, abrir } = useContext(TomadorCtx);
  const [escolhido, setEscolhido] = useState(inicial);
  const cliente = escolhido === undefined
    ? clienteCitado(descricao, clientes)
    : clientes.find((c) => c.id === escolhido) || null;
  const abrirDialogo = () => abrir({
    descricao, clienteId: cliente?.id || "", nomeSugerido: descricao,
    aoConcluir: (c) => setEscolhido(c?.id ?? null),
  });
  return { cliente, abrirDialogo, limpar: () => setEscolhido(undefined) };
}

/**
 * Diálogo do tomador: escolhe (ou cria) o cliente e guarda o documento dele.
 * É o único lugar do Financeiro que cadastra CNPJ/CPF — a fila de notas, a
 * linha e os formulários de lançamento abrem todos este mesmo diálogo.
 */
function DialogoTomador({ alvo, clientes, onSalvar, onFechar }) {
  const inicial = clientes.find((c) => c.id === alvo.clienteId) || null;
  const [escolha, setEscolha] = useState(inicial ? inicial.id : NOVO_CLIENTE);
  const [nome, setNome] = useState(alvo.nomeSugerido || "");
  const [docTipo, setDocTipo] = useState(inicial?.docTipo || "cnpj");
  const [doc, setDoc] = useState(inicial?.doc || "");
  const [erro, setErro] = useState("");
  const [erroNome, setErroNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  // null (nada a consultar) | "buscando" | "falha" | dados da Receita
  const [receita, setReceita] = useState(null);

  useEffect(() => {
    const aoTeclar = (e) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  useEffect(() => {
    if (docTipo !== "cnpj" || !cnpjValido(doc)) { setReceita(null); return undefined; }
    const ctrl = new AbortController();
    setReceita("buscando");
    const espera = setTimeout(async () => {
      const dados = await consultarCnpj(doc, { signal: ctrl.signal });
      if (!ctrl.signal.aborted) setReceita(dados || "falha");
    }, 250);
    return () => { clearTimeout(espera); ctrl.abort(); };
  }, [doc, docTipo]);

  const escolher = (id) => {
    const anterior = clientes.find((c) => c.id === escolha);
    const proximo = clientes.find((c) => c.id === id);
    setEscolha(id);
    setErro("");
    // Documento já salvo do cliente escolhido entra no campo; o que foi
    // digitado à mão só some se era o documento do cliente anterior.
    if (proximo?.doc) { setDoc(proximo.doc); setDocTipo(proximo.docTipo || "cnpj"); }
    else if (anterior?.doc && anterior.doc === doc) { setDoc(""); setDocTipo("cnpj"); }
  };

  const trocarTipo = (tipo) => {
    setDocTipo(tipo);
    setDoc(tipo === "outro" ? doc : formataDoc(doc, tipo));
    setErro("");
  };

  // Colar um número inteiro já diz se é CPF ou CNPJ — poupa trocar o tipo.
  const aoColar = (e) => {
    if (docTipo === "outro") return;
    const digitos = (e.clipboardData.getData("text") || "").replace(/\D/g, "");
    const tipo = digitos.length === 11 ? "cpf" : digitos.length === 14 ? "cnpj" : null;
    if (!tipo) return;
    e.preventDefault();
    setDocTipo(tipo);
    setDoc(formataDoc(digitos, tipo));
    setErro("");
  };

  const chave = docTipo === "outro" ? null : chaveDoc(doc);
  const dono = chave ? clientes.find((c) => c.id !== escolha && chaveDoc(c.doc) === chave) : null;
  const semCliente = escolha === "";

  const salvar = async () => {
    if (salvando) return;
    if (escolha === NOVO_CLIENTE && !nome.trim()) return setErroNome("Informe o nome do cliente.");
    if (!semCliente) {
      const invalido = erroDoDoc(doc, docTipo);
      if (invalido) return setErro(invalido);
      if (dono) return setErro(`Esse documento já está em ${dono.nome}.`);
    }
    setSalvando(true);
    try {
      const cliente = await onSalvar({
        escolha, nome: nome.trim(), docTipo, doc: doc.trim(),
        receita: receita && typeof receita === "object" ? receita : null,
      });
      alvo.aoConcluir?.(cliente);
      onFechar();
    } catch (e) {
      setErro(e.message || "Não consegui salvar.");
      setSalvando(false);
    }
  };

  const aoEnter = (e) => { if (e.key === "Enter") salvar(); };
  const placeholder = docTipo === "cpf" ? "000.000.000-00" : docTipo === "outro" ? "NIF, EIN…" : "00.000.000/0000-00";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Tomador da nota">
      <div className="absolute inset-0 bg-neutro-900/50 backdrop-blur-sm dark:bg-black/60" onClick={onFechar} />
      <div className="relative w-full max-w-md animate-sheet-in rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:animate-scale-in sm:rounded-2xl sm:p-5 dark:bg-s2 dark:shadow-edge">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Receipt size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-semibold text-neutro-800 dark:text-t1">Tomador da nota</h2>
            {alvo.descricao && <p className="mt-0.5 truncate text-[12px] text-neutro-500 dark:text-t2">{alvo.descricao}</p>}
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-neutro-400 hover:bg-neutro-100 hover:text-neutro-600 dark:hover:bg-white/[0.06]">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <Campo rotulo="Cliente" htmlFor="tomador-cliente">
            {alvo.travado ? (
              <div className={`${CAMPO} flex items-center`}>{inicial?.nome || "Cliente do contrato"}</div>
            ) : (
              <select id="tomador-cliente" value={escolha} onChange={(e) => escolher(e.target.value)} className={`${CAMPO} w-full cursor-pointer`}>
                <option value={NOVO_CLIENTE}>Novo cliente…</option>
                <option value="">Sem cliente</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )}
          </Campo>

          {escolha === NOVO_CLIENTE && (
            <Campo rotulo="Nome do cliente" htmlFor="tomador-nome" erro={erroNome}>
              <input id="tomador-nome" autoFocus value={nome} onChange={(e) => { setNome(e.target.value); setErroNome(""); }} onKeyDown={aoEnter} onFocus={(e) => e.target.select()} placeholder="Ex.: Mai Milena" className={`${CAMPO} w-full`} />
            </Campo>
          )}

          {!semCliente && (
            <Campo rotulo="Documento" htmlFor="tomador-doc" erro={erro && !dono ? erro : ""}>
              <div className="flex gap-2">
                <Segmented opcoes={TIPOS_DOC} valor={docTipo} onChange={trocarTipo} />
                <input
                  id="tomador-doc"
                  autoFocus={escolha !== NOVO_CLIENTE}
                  value={doc}
                  onChange={(e) => { setDoc(formataDoc(e.target.value, docTipo)); setErro(""); }}
                  onPaste={aoColar}
                  onKeyDown={aoEnter}
                  placeholder={placeholder}
                  inputMode={docTipo === "outro" ? "text" : "numeric"}
                  className={`${CAMPO} min-w-0 flex-1 ${NUM}`}
                />
              </div>
            </Campo>
          )}

          {!semCliente && dono && (
            <div className="flex items-center gap-2 rounded-[10px] bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700 dark:text-amber-300">
              <span className="min-w-0 flex-1">Esse documento já está em {dono.nome}.</span>
              {!alvo.travado && <Btn size="sm" onClick={() => escolher(dono.id)}>Usar {dono.nome}</Btn>}
            </div>
          )}

          {!semCliente && !dono && receita && (
            <div className="rounded-[10px] bg-neutro-100/80 px-3 py-2 text-[12px] text-neutro-500 dark:bg-s1 dark:text-t2">
              {receita === "buscando" && "Consultando a Receita…"}
              {receita === "falha" && "Não achei esse CNPJ na consulta pública. Dá para salvar mesmo assim."}
              {typeof receita === "object" && (
                <>
                  <span className="block truncate font-medium text-neutro-700 dark:text-t1">{receita.razaoSocial || "Razão social não informada"}</span>
                  <span className="block truncate">
                    {[receita.cidade && `${receita.cidade} - ${receita.estado}`, receita.situacao && receita.situacao !== "ATIVA" ? `Situação: ${receita.situacao}` : null].filter(Boolean).join(" · ")}
                  </span>
                </>
              )}
            </div>
          )}

          {semCliente && erro && <p className="text-[12px] text-rose-600 dark:text-bad-text">{erro}</p>}
        </div>

        <div className="mt-5 flex gap-2">
          <Btn className="flex-1" size="lg" onClick={onFechar}>Cancelar</Btn>
          <Btn className="flex-1" size="lg" variant="primary" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</Btn>
        </div>
      </div>
    </div>
  );
}

function Linha({ item, onValor, onPago, onData, onRemover, onEditar, onNota, mostrarNota, atrasado, variavel, rotulos, arrastando, onDragStart, onDragEnd }) {
  const [editando, setEditando] = useState(false);
  // Contador de baixas dadas nesta sessão: reanima o check e a varredura a cada
  // confirmação. Fica em zero enquanto a linha só existe paga (tela recém-aberta),
  // então nada anima sozinho ao montar. Desfazer também não anima.
  const [pulso, setPulso] = useState(0);
  const cat = catDe(item.categoria, item.tipo);
  const catNome = nomeCategoria(cat, rotulos);
  const { abrirDoItem } = useContext(TomadorCtx);
  // A linha gerada pelo contrato carrega origem "contrato" — é o que a separa
  // das linhas geradas pela repetição mensal (que também vêm com `gerado`).
  const ehContrato = item.origem === "contrato";
  if (editando) {
    return (
      <LinhaEdicao
        item={item}
        rotulos={rotulos}
        onSalvar={(patch) => { onEditar(patch); setEditando(false); }}
        onCancelar={() => setEditando(false)}
      />
    );
  }

  /* No celular a linha vira duas: descrição + valor em cima (o que se lê de
     relance), contexto e ações embaixo. De `sm` pra cima os dois grupos viram
     `display:contents` e os filhos voltam a ser colunas da mesma linha — a
     ordem visual da tabela é restaurada pelas classes `sm:order-*`. */
  return (
    <div className={`group relative overflow-hidden border-b px-3 py-2.5 transition-colors duration-300 last:border-0 sm:flex sm:h-11 sm:items-center sm:gap-2 sm:px-4 sm:py-0 ${HAIR} ${
      item.pago ? "bg-emerald-500/[0.045] dark:bg-emerald-400/[0.055]" : "hover:bg-neutro-50 dark:hover:bg-white/[0.03]"
    } ${arrastando ? "opacity-40" : ""}`}>
      {/* Alça de arraste do lançamento: leva a linha inteira para outra seção
          do mesmo card. Como no cabeçalho da seção, só existe onde o gesto de
          mouse existe (HTML5 drag não vale no toque) — no estreito o caminho
          continua sendo o lápis, trocando a categoria. */}
      {onDragStart && (
        <span
          draggable
          onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", item.id); onDragStart(); }}
          onDragEnd={onDragEnd}
          title="Arraste para mover de seção"
          aria-label="Mover lançamento de seção"
          className="absolute inset-y-0 left-0 z-10 hidden w-4 cursor-grab items-center justify-center text-neutro-300 opacity-0 transition-opacity duration-200 hover:text-neutro-500 group-hover:opacity-100 active:cursor-grabbing lg:flex dark:text-t4 dark:hover:text-t2"
        >
          <GripVertical size={12} />
        </span>
      )}
      {/* Trilho de estado: uma coluna vertical que se lê de relance, sem ler
          texto nenhum — verde quitado, vermelho atrasado, vazio em aberto. */}
      <span
        aria-hidden
        className={`absolute inset-y-1.5 left-0 w-[2.5px] rounded-r-full transition-colors duration-300 ${
          item.pago ? "bg-emerald-500" : atrasado ? "bg-rose-400/80" : "bg-transparent"
        }`}
      />

      {/* Varredura de luz cruzando a linha no instante da baixa. */}
      {item.pago && pulso > 0 && (
        <span
          key={pulso}
          aria-hidden
          className="animate-baixa-sweep pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent"
        />
      )}

      <div className="flex items-center gap-2.5 sm:contents">
        <button
          onClick={() => { if (!item.pago) setPulso((p) => p + 1); onPago(!item.pago); }}
          aria-label={item.pago ? "Marcar como não pago" : "Marcar como pago"}
          aria-pressed={item.pago}
          className={`relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-200 after:absolute after:-inset-2 after:content-[''] active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:order-1 sm:h-5 sm:w-5 sm:after:hidden ${
            item.pago
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-neutro-300 text-transparent hover:border-emerald-400 dark:border-white/20"
          } ${item.pago && pulso > 0 ? "animate-baixa-pop" : ""}`}
        >
          <CheckBaixa key={pulso} animando={item.pago && pulso > 0} />
        </button>

        {/* Pago é confirmado, não cancelado: sem risco, sem apagar. A linha
            quitada continua legível — só desce um tom e deixa o trilho, o fundo
            e o selo carregarem o estado. */}
        <span className={`min-w-0 flex-1 truncate text-[14px] transition-colors duration-300 sm:order-2 sm:text-[13px] ${item.pago ? "text-neutro-600 dark:text-t2" : "text-neutro-700 dark:text-t1"}`}>
          {item.descricao}
        </span>

        <ValorEditavel
          className="sm:order-6"
          valor={item.valor}
          onChange={onValor}
          tom={item.tipo === "entrada" ? "text-neutro-700 dark:text-t1" : "text-rose-600 dark:text-rose-400"}
        />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 sm:mt-0 sm:contents">
        <span
          className="max-w-[45%] shrink-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium sm:order-3 sm:min-w-0 sm:max-w-[7.5rem] sm:shrink sm:px-2 sm:text-[10.5px]"
          style={{ backgroundColor: `${cat.cor}1a`, color: cat.cor }}
        >
          {catNome}
        </span>

        {/* Parcela: selo clicável que alterna 100% → 50% → 2ª 50%. */}
        {usaParcela(item.categoria) && (() => {
          const p = parcelaDe(item.parcela) || PARCELAS[0];
          const prox = PARCELAS[(PARCELAS.indexOf(p) + 1) % PARCELAS.length];
          const metade = p.id !== "integral";
          return (
            <button
              onClick={() => onEditar({ parcela: prox.id })}
              title={`${p.label} — clique para trocar para ${prox.label}`}
              aria-label={`Parcela: ${p.label}`}
              className={`shrink-0 cursor-pointer rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset transition-colors sm:order-3 sm:text-[10.5px] ${NUM} ${
                metade
                  ? "bg-amber-500/10 text-amber-600 ring-amber-500/30 hover:bg-amber-500/20 dark:text-amber-400"
                  : "text-neutro-400 ring-neutro-200 hover:text-brand-600 dark:text-t3 dark:ring-white/[0.1] dark:hover:text-brand-300"
              }`}
            >
              {p.curto}
            </button>
          );
        })()}

        {/* Depois de pago, o vencimento vira ruído: no estreito ele sai de cena
            e dá o espaço pra data da baixa. Na tabela larga a coluna fica. */}
        {!variavel && (
          <span className={`shrink-0 text-[11.5px] sm:order-4 sm:w-8 sm:text-right sm:text-xs ${NUM} ${item.pago ? "hidden" : ""} ${atrasado ? "font-medium text-rose-600 dark:text-rose-400" : "text-neutro-400 dark:text-t3"}`}>
            <span className="sm:hidden">venc. </span>{String(item.dia).padStart(2, "0")}
          </span>
        )}

        <DataEditavel className="sm:order-5" pago={item.pago} pagoEm={item.pagoEm} onChange={onData} />

        {/* Grupo de ações: no estreito fica colado à direita e, se não couber,
            quebra pra própria linha em vez de estourar a largura. */}
        <div className="ml-auto flex items-center gap-1 sm:contents">
        {mostrarNota && (
          <SeloNota className="sm:order-7" emitida={!!item.notaEmitida} onToggle={() => onNota(!item.notaEmitida)} />
        )}
        {mostrarNota && <CopiarDoc className="sm:order-7" tomador={item.tomador} onCadastrar={() => abrirDoItem(item)} />}

        {/* Sem hover no toque: no estreito as ações ficam sempre visíveis e com
            alvo maior — daí os overrides serem `max-sm:` (o desktop é a base). */}
        <button
          onClick={() => setEditando(true)}
          aria-label="Editar lançamento"
          className="flex w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 text-neutro-300 opacity-0 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-500 focus-visible:opacity-100 group-hover:opacity-100 max-sm:h-8 max-sm:w-8 max-sm:p-0 max-sm:text-neutro-400 max-sm:opacity-100 sm:order-9 dark:text-t4 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 max-sm:dark:text-t3"
          title="Editar"
        >
          <Pencil size={13} className="max-sm:hidden" />
          <Pencil size={15} className="hidden max-sm:block" />
        </button>

        <button
          onClick={onRemover}
          aria-label={ehContrato ? "Remover cliente fixo" : "Remover lançamento"}
          className="flex w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg p-1 text-neutro-300 opacity-0 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100 max-sm:h-8 max-sm:w-8 max-sm:p-0 max-sm:text-neutro-400 max-sm:opacity-100 sm:order-10 dark:text-t4 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 max-sm:dark:text-t3"
          title={ehContrato ? "Remover cliente fixo — desativa o contrato" : "Remover"}
        >
          <Trash2 size={13} className="max-sm:hidden" />
          <Trash2 size={15} className="hidden max-sm:block" />
        </button>
        </div>
      </div>
    </div>
  );
}

function NovoLancamento({ tipo, onCriar, grupo, rotulo, rotulos, variavel }) {
  const [aberto, setAberto] = useState(false);
  const [desc, setDesc] = useState("");
  const [dia, setDia] = useState("");
  const [categoria, setCategoria] = useState(() => padraoDoGrupo(grupo));
  /* Saída fixa e colaborador nascem repetindo — é o caso comum e evita
     redigitar a mesma linha todo mês. Nas demais seções vem desligado. */
  const [repetir, setRepetir] = useState(() => repetePadrao(grupo.id, tipo));
  const [parcela, setParcela] = useState("integral");
  const [valor, setValor] = useState("");
  const comCliente = tipo === "entrada" && emiteNota(categoria);
  const { cliente, abrirDialogo, limpar } = useClienteDoForm(undefined, desc);
  const meia = usaParcela(categoria) && parcela !== "integral";

  const criar = () => {
    if (!desc.trim()) return setAberto(false);
    const numero = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    onCriar({
      descricao: desc.trim(), dia: Number(dia) || 1, categoria, repetir, parcela: usaParcela(categoria) ? parcela : null,
      clienteId: comCliente ? cliente?.id ?? null : null,
      valor: isNaN(numero) ? 0 : numero,
    });
    setDesc(""); setDia(""); setValor(""); setParcela("integral"); limpar(); setAberto(false);
  };

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className={`flex h-11 w-full cursor-pointer items-center gap-1.5 border-t px-3 text-left text-[13px] text-neutro-500 transition-colors duration-200 hover:bg-brand-50/60 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 sm:h-10 sm:px-4 dark:text-t2 dark:hover:bg-brand-500/[0.06] dark:hover:text-brand-300 ${HAIR}`}
      >
        <Plus size={14} className="shrink-0" /> <span className="truncate">{rotulo}</span>
      </button>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 border-t px-3 py-2.5 sm:px-4 ${FORM_FOLGADO} ${HAIR}`}>
      <input
        autoFocus
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") criar(); if (e.key === "Escape") setAberto(false); }}
        placeholder={tipo === "entrada" ? "Ex.: LP — Mai Milena" : "Ex.: Freela de edição"}
        className="w-full min-w-0 rounded-lg border border-brand-300 px-2 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-brand-500/25 sm:w-auto sm:flex-1 sm:py-1 dark:border-brand-500/60 dark:bg-white/[0.06] dark:text-t1 dark:placeholder:text-t3 sm:min-w-[9rem]"
      />
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, ""))}
        onKeyDown={(e) => { if (e.key === "Enter") criar(); if (e.key === "Escape") setAberto(false); }}
        placeholder={meia ? "Valor dos 50%" : "Valor"}
        title={meia ? "Valor desta parcela (50%), não do total" : tipo === "entrada" ? "Valor da entrada" : "Valor da saída"}
        inputMode="decimal"
        aria-label={meia ? "Valor desta parcela" : "Valor"}
        className={`w-28 shrink-0 rounded-lg border border-neutro-200 px-2 py-1.5 text-right text-xs outline-none focus:border-brand-300 sm:py-1 dark:border-line dark:bg-white/[0.06] dark:text-t1 dark:placeholder:text-t3 dark:focus:border-brand-500/60 ${NUM}`}
      />
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        aria-label="Categoria"
        className="min-w-0 max-w-[45%] flex-1 cursor-pointer rounded-lg border border-neutro-200 px-2 py-1.5 text-xs text-neutro-600 outline-none sm:max-w-none sm:flex-none sm:py-1 dark:border-line dark:bg-white/[0.06] dark:text-t2"
      >
        {categoriasDoGrupo(grupo.id, tipo).map((c) => (
          <option key={c.id} value={c.id}>{nomeCategoria(c, rotulos)}</option>
        ))}
      </select>
      {usaParcela(categoria) && <SelectParcela valor={parcela} onChange={setParcela} />}
      {comCliente && <ChipCliente cliente={cliente} onClick={abrirDialogo} />}
      {!variavel && (
        <input
          value={dia}
          onChange={(e) => setDia(e.target.value.replace(/\D/g, "").slice(0, 2))}
          placeholder="dia"
          inputMode="numeric"
          aria-label="Dia do vencimento"
          className="w-16 shrink-0 rounded-lg border border-neutro-200 px-2 py-1.5 text-center text-xs outline-none sm:w-14 sm:py-1 dark:border-line dark:bg-white/[0.06] dark:text-t1 dark:placeholder:text-t3"
        />
      )}
      <button
        onClick={() => setRepetir((r) => !r)}
        aria-pressed={repetir}
        title={repetir ? "Repete todo mês — clique para desligar" : "Repetir todo mês"}
        className={`flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-colors sm:h-7 ${
          repetir
            ? "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
            : `text-neutro-500 hover:text-brand-600 dark:text-t2 dark:hover:text-brand-300 ${HAIR}`
        }`}
      >
        Todo mês
      </button>
      <button onClick={criar} className="ml-auto shrink-0 cursor-pointer rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-brand-600 active:scale-95 sm:py-1">
        Criar
      </button>
    </div>
  );
}

function Subgrupo({
  grupo, itens, tipo, subtotal, pendente, diaHoje, rotulos, onValor, onPago, onData, onRemover, onEditar, onNota, onCriar,
  arrastando, sobre, onDragStart, onDragEnter, onDragEnd, onDrop,
  recebendo, itemArrastado, onItemDragStart, onItemDragEnd,
}) {
  const [aberto, setAberto] = useState(true);
  /* O subtotal é contábil, não a soma cega das linhas: uma categoria pode ser
     listada aqui e contada em outra seção (pró-labore — ver `secaoDoSubtotal`).
     Quando os dois divergem, o número ganha um title explicando. */
  const somaLinhas = itens.reduce((n, i) => n + (i.valor || 0), 0);
  const desloca = subtotal !== somaLinhas;
  const grupoNome = nomeGrupo(grupo, rotulos);
  const variavel = ehGrupoVariavel(grupo.id);
  const mostraFalta = !variavel && pendente > 0;
  /* Quando há pendência, o número que importa é o que falta: ele fica em
     destaque e o subtotal da seção recua para nota de rodapé. Seção quitada
     (ou variável) não tem pendência — aí o destaque volta pro subtotal. */
  const destaque = `text-[13px] font-medium ${tipo === "entrada" ? "text-neutro-700 dark:text-t1" : "text-rose-600 dark:text-rose-400"}`;
  const apagado = "text-[11.5px] font-normal text-neutro-400 dark:text-t3";
  /* Quanto da seção já virou realidade. Não vira desenho — quem conta o
     andamento é o selo "Falta" e o trilho verde de cada linha; uma régua por
     seção era um terceiro jeito de dizer a mesma coisa. Fica só no title. */
  const quitado = Math.max(subtotal - pendente, 0);
  const pctQuitado = subtotal > 0 ? Math.min(100, Math.round((quitado / subtotal) * 100)) : 0;

  return (
    <div
      className={`relative border-b transition-colors last:border-0 ${HAIR} ${arrastando ? "opacity-40" : ""} ${sobre || recebendo ? "bg-brand-50/70 dark:bg-brand-500/[0.07]" : ""} ${recebendo ? "ring-1 ring-inset ring-brand-400/70 dark:ring-brand-500/50" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter?.(); }}
      onDrop={(e) => { e.preventDefault(); onDrop?.(); }}
    >
      {sobre && <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 bg-brand-500" />}
      <div className={`relative flex min-h-11 items-center sm:h-10 sm:min-h-0 ${INSET}`}>
        {/* Arrastar pra reordenar é gesto de mouse (HTML5 drag não vale no
            toque) — a alça só aparece onde ela funciona. */}
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="Arraste para reordenar a seção"
          aria-label="Reordenar seção"
          className="hidden h-full shrink-0 cursor-grab touch-none items-center pl-2 pr-0.5 text-neutro-300 transition-colors hover:text-neutro-500 active:cursor-grabbing lg:flex dark:text-t4 dark:hover:text-t2"
        >
          <GripVertical size={14} />
        </span>
        <button
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          /* No estreito o cabeçalho vira duas linhas — nome em cima, dinheiro
             embaixo — em vez de esconder a soma pra caber tudo numa só. */
          className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-x-2 pl-3 pr-3 text-left transition-colors duration-200 hover:bg-neutro-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 max-sm:h-auto max-sm:flex-wrap max-sm:gap-y-1 max-sm:py-2 sm:gap-2 sm:pr-4 lg:pl-0 dark:hover:bg-white/[0.03]"
        >
          <ChevronRight size={13} className={`shrink-0 text-neutro-400 transition-transform duration-200 dark:text-t3 ${aberto ? "rotate-90" : ""}`} />
          <span title={grupoNome} className="truncate text-[11.5px] font-semibold uppercase tracking-wide text-neutro-600 dark:text-t2">{grupoNome}</span>
          <span className={`shrink-0 text-[11px] text-neutro-400 dark:text-t3 ${NUM}`}>{itens.length}</span>
          {/* A dica é o texto mais descartável da linha: só entra quando sobra
              largura de verdade, senão come o nome da seção no truncate. */}
          <span className="hidden min-w-0 truncate text-[11px] text-neutro-400 xl:block dark:text-t3">· {grupo.hint}</span>

          {/* Balanço da seção. São dois números com pesos diferentes, então
              são dois objetos diferentes: o total é texto nu e quieto, e a
              pendência vem num selo — assim ela não vira um segundo número
              solto disputando a mesma coluna (era o que embolava a leitura). */}
          {/* Só quebra a linha no celular quando há selo: sem pendência a soma
              sozinha cabe do lado do nome e não vale gastar uma segunda linha. */}
          <span className={`ml-auto flex shrink-0 items-center gap-2 pl-2 ${mostraFalta ? "max-sm:w-full max-sm:justify-end max-sm:pl-[21px]" : ""}`}>
            <span
              title={desloca ? `Soma das linhas ${emReal(somaLinhas)} — parte é contabilizada em outra seção` : "Total da seção"}
              className={`${NUM} ${mostraFalta ? apagado : destaque} ${desloca ? "underline decoration-dotted decoration-neutro-300 underline-offset-4 dark:decoration-neutro-600" : ""}`}
            >
              {emReal(subtotal)}
            </span>
            {/* Seção fixa com pendência: o que ainda não caiu. Em seção variável
                não faz sentido — lá o valor não é previsto, é o que aconteceu. */}
            {mostraFalta && (
              <span
                title={`${tipo === "entrada" ? "Ainda falta receber" : "Ainda falta pagar"} ${emReal(pendente)} dos ${emReal(subtotal)} desta seção — ${pctQuitado}% já ${tipo === "entrada" ? "caiu" : "saiu"}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white py-0.5 pl-2 pr-2.5 ring-1 ring-inset ring-neutro-200/70 dark:bg-white/[0.08] dark:ring-white/[0.07]"
              >
                <span className="text-[10.5px] font-medium text-neutro-400 dark:text-t3">Falta</span>
                <span className={`${NUM} text-[12.5px] font-semibold ${tipo === "entrada" ? "text-neutro-700 dark:text-t1" : "text-rose-600 dark:text-rose-400"}`}>
                  {emReal(pendente)}
                </span>
              </span>
            )}
          </span>
        </button>
      </div>

      {aberto && (
        <>
          {itens.map((i) => (
            <Linha
              key={i.id}
              item={i}
              rotulos={rotulos}
              variavel={variavel}
              atrasado={!variavel && !i.pago && i.dia < diaHoje}
              onValor={(v) => onValor(i, v)}
              onPago={(v) => onPago(i, v)}
              onData={(v) => onData(i, v)}
              onRemover={() => onRemover(i)}
              onEditar={(patch) => onEditar(i, patch)}
              onNota={(v) => onNota(i, v)}
              mostrarNota={tipo === "entrada" && emiteNota(i.categoria)}
              arrastando={itemArrastado?.id === i.id}
              onDragStart={onItemDragStart ? () => onItemDragStart(i) : undefined}
              onDragEnd={onItemDragEnd}
            />
          ))}
          {categoriasDoGrupo(grupo.id, tipo).length > 0 ? (
            <NovoLancamento
              tipo={tipo}
              grupo={grupo}
              rotulos={rotulos}
              variavel={variavel}
              rotulo={`Adicionar em ${grupoNome.toLowerCase()}`}
              onCriar={onCriar}
            />
          ) : (
            // Seção criada pela tela e ainda vazia: sem categoria não há o que
            // lançar — o caminho é abrir "Categorias" e criar a primeira.
            <p className={`border-t px-3 py-2.5 text-[12px] text-neutro-400 sm:px-4 dark:text-t3 ${HAIR}`}>
              Nenhuma categoria nesta seção — crie uma em "Categorias".
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ── Repartição do cabeçalho ──────────────────────────────────────────────────
   O total de um card é a soma de duas naturezas que se leem de formas
   diferentes: o que se repete todo mês com dia de vencimento (fixo, previsível,
   dá pra planejar) e o que muda de mês para mês (variável, só se sabe depois).
   Cada natureza tem cor e ícone próprios — o azul é o que está combinado, o
   âmbar é o que oscila — e a régua na base do cabeçalho mostra o peso de cada
   uma sem precisar ler número nenhum. */
const NATUREZA = {
  fixa: {
    label: "Fixas",
    icone: Repeat,
    dica: "O que se repete todo mês e dá pra contar como certo",
    barra: "bg-sky-500/70 dark:bg-sky-400/60",
    tile: "bg-sky-500/[0.06] ring-sky-500/20 dark:bg-sky-500/[0.09] dark:ring-sky-400/20",
    chip: "bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
    num: "text-sky-700 dark:text-sky-300",
  },
  variavel: {
    label: "Variáveis",
    icone: Waves,
    dica: "O que muda de mês para mês — só se sabe depois",
    barra: "bg-amber-500/75 dark:bg-amber-400/65",
    tile: "bg-amber-500/[0.06] ring-amber-500/20 dark:bg-amber-500/[0.09] dark:ring-amber-400/20",
    chip: "bg-amber-500/15 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
    num: "text-amber-700 dark:text-amber-300",
  },
  /* Terceira via: a seção continua no card, somando no total, mas fica fora da
     leitura fixo × variável. É pra quem não considera aquilo custo (retirada de
     lucro) ou receita do mês. Cinza de propósito — não é uma categoria de
     dinheiro, é a ausência de uma. */
  fora: {
    label: "Fora da conta",
    icone: Ban,
    dica: "Continua no total do card, mas não entra em fixas nem em variáveis",
    barra: "bg-neutro-300 dark:bg-white/[0.14]",
    tile: "bg-neutro-500/[0.05] ring-neutro-300/60 dark:bg-white/[0.03] dark:ring-white/[0.08]",
    chip: "bg-neutro-500/10 text-neutro-500 dark:bg-white/[0.06] dark:text-t2",
    num: "text-neutro-500 dark:text-t2",
  },
};

/**
 * Uma das metades do cabeçalho: ícone em chip colorido, rótulo e valor, tudo
 * numa linha só. A fatia em porcentagem não vira texto — quem conta isso é a
 * régua colorida na base do cabeçalho (e o title, pra quem quiser o número).
 * Sob aperto o rótulo cede espaço e o valor fica inteiro, nunca o contrário.
 * Clicar abre a repartição: quais seções entram em cada soma.
 */
function Fatia({ natureza, valor, pct, oculto, secoes, onAbrir }) {
  const t = NATUREZA[natureza];
  const Icone = t.icone;
  const lista = secoes.length ? secoes.join(", ") : "nenhuma seção";
  return (
    <button
      type="button"
      onClick={onAbrir}
      title={`${t.label} · ${pct}% do total — ${lista}. Clique para escolher as seções.`}
      className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-left ring-1 ring-inset transition-all duration-200 hover:brightness-[0.98] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:brightness-125 ${t.tile}`}
    >
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${t.chip}`}>
        <Icone size={13} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold uppercase tracking-wide text-neutro-500 dark:text-t2">
        {t.label}
      </span>
      <span className={`shrink-0 text-[13px] font-semibold ${NUM} ${t.num}`}>{cifra(valor, oculto)}</span>
      {/* Sinal fixo de "isso se configura" — hover não serve, metade dos acessos
          é no toque. */}
      <SlidersHorizontal size={11} className="shrink-0 text-neutro-400 dark:text-t3" />
    </button>
  );
}

/**
 * Repartição do card: uma linha por seção com o destino dela na leitura do topo
 * — fixa, variável ou fora da conta. Grava a cada clique (não tem "salvar": é a
 * mesma edição no lugar do resto da tela) e vale para todos os meses.
 */
function EditorNaturezas({ tipo, titulo, grupos, rotulos, naturezas, porGrupo, totais, oculto, onDefinir, onRestaurar, onFechar }) {
  const mexido = grupos.some((g) => NATUREZAS.includes(naturezas?.[chaveNatureza(tipo, g.id)]));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Repartição de ${titulo}`}>
      <div className="absolute inset-0 bg-neutro-900/40 backdrop-blur-sm dark:bg-black/50" onClick={onFechar} />
      <div className="relative flex max-h-[88dvh] w-full max-w-lg animate-sheet-in flex-col overflow-hidden rounded-t-2xl border border-neutro-200 bg-white shadow-2xl sm:max-h-[85vh] sm:animate-scale-in sm:rounded-2xl dark:border-line dark:bg-s2">
        <header className="flex items-center gap-2.5 border-b border-neutro-100 px-4 py-4 sm:px-5 dark:border-line">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Scale size={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-neutro-800 dark:text-t1">Repartição de {titulo.toLowerCase()}</h2>
            <p className="text-[11.5px] text-neutro-500 dark:text-t2">Onde cada seção entra na soma do topo — vale para todos os meses.</p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="ml-auto shrink-0 cursor-pointer rounded-lg p-1.5 text-neutro-400 transition-colors hover:bg-neutro-100 hover:text-neutro-600 dark:text-t3 dark:hover:bg-white/[0.06] dark:hover:text-t2"
          >
            <X size={16} />
          </button>
        </header>

        <div className="overscroll-contain-y min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4 sm:px-5">
          {grupos.map((g) => {
            const atual = naturezaDaSecao(g.id, tipo, naturezas);
            const padrao = ehSecaoFixa(g.id, tipo) ? "fixa" : "variavel";
            return (
              <div key={g.id} className="rounded-xl border border-neutro-200 p-2.5 dark:border-line">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-neutro-700 dark:text-t1">{nomeGrupo(g, rotulos)}</span>
                  <span className={`shrink-0 text-[12px] text-neutro-500 dark:text-t2 ${NUM}`}>{cifra(porGrupo[g.id]?.subtotal || 0, oculto)}</span>
                </div>
                <div className={`mt-2 flex gap-0.5 rounded-xl border p-1 ${HAIR}`} role="group" aria-label={`Natureza de ${nomeGrupo(g, rotulos)}`}>
                  {NATUREZAS.map((n) => {
                    const t = NATUREZA[n];
                    const Icone = t.icone;
                    const ativo = atual === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => onDefinir(g.id, n === padrao ? null : n)}
                        className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11.5px] font-medium transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                          ativo
                            ? `ring-1 ring-inset ${t.tile} ${t.num}`
                            : "text-neutro-500 hover:bg-neutro-100 dark:text-t2 dark:hover:bg-white/[0.05]"
                        }`}
                      >
                        <Icone size={12} />
                        <span className="truncate">{n === "fora" ? "Fora" : t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="pb-safe-3 space-y-2.5 border-t border-neutro-100 px-4 pt-3 sm:px-5 dark:border-line">
          {/* O resultado da escolha fica à vista aqui embaixo — assim dá pra
              ajustar sem fechar o diálogo pra conferir o card. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {NATUREZAS.map((n) => (
              <span key={n} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${NATUREZA[n].barra}`} />
                <span className="text-[11px] text-neutro-500 dark:text-t2">{NATUREZA[n].label}</span>
                <span className={`text-[11.5px] font-semibold text-neutro-700 dark:text-t1 ${NUM}`}>{cifra(totais[n], oculto)}</span>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onRestaurar}
              disabled={!mexido}
              className={`shrink-0 rounded-lg border px-3 py-2.5 text-[13px] font-medium transition-colors sm:py-2 ${HAIR} ${
                mexido
                  ? "cursor-pointer text-neutro-600 hover:bg-neutro-100 dark:text-t2 dark:hover:bg-white/[0.05]"
                  : "cursor-default text-neutro-300 dark:text-t4"
              }`}
            >
              Restaurar padrão
            </button>
            <button
              onClick={onFechar}
              className="flex-1 cursor-pointer rounded-lg bg-brand-500 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-600 active:scale-[0.99] sm:py-2"
            >
              Concluído
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Bloco({ titulo, itens, total, tipo, grupos, diaHoje, oculto, rotulos, naturezas, onNatureza, onRestaurarNaturezas, ordemAsc, onAlternarOrdem, onReordenar, onValor, onPago, onData, onRemover, onEditar, onNota, onCriar }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  /* Arrastar um lançamento é outro gesto que o de reordenar seções, então tem
     estado próprio: aqui viaja a linha inteira, e quem manda no destino é a
     categoria — soltar numa seção troca a categoria pela padrão de lá. */
  const [itemDrag, setItemDrag] = useState(null);
  const [itemOver, setItemOver] = useState(null);
  const [abrindoReparticao, setAbrindoReparticao] = useState(false);

  /* Uma passada só pelas linhas resolve os dois níveis de leitura do card: o
     balanço de cada seção (subtotal e pendência) e a repartição do cabeçalho.
     Quem manda no destino é `secaoDoSubtotal`, não a categoria da linha — é ele
     que faz o pró-labore contar na seção certa. */
  const reparticao = useMemo(() => {
    const porGrupo = {};
    for (const g of grupos) porGrupo[g.id] = { subtotal: 0, pendente: 0 };
    for (const i of itens) {
      const alvo = porGrupo[secaoDoSubtotal(i.categoria, tipo)];
      if (!alvo) continue;
      alvo.subtotal += i.valor || 0;
      if (!i.pago) alvo.pendente += i.valor || 0;
    }
    const totais = { fixa: 0, variavel: 0, fora: 0 };
    const secoes = { fixa: [], variavel: [], fora: [] };
    for (const g of grupos) {
      const n = naturezaDaSecao(g.id, tipo, naturezas);
      totais[n] += porGrupo[g.id].subtotal;
      secoes[n].push(nomeGrupo(g, rotulos));
    }
    const base = totais.fixa + totais.variavel + totais.fora;
    const pct = (v) => (base > 0 ? Math.round((v / base) * 100) : 0);
    /* A régua nunca engole uma fatia que existe: com 99,6% de fixo as outras
       ainda aparecem como fio, senão o card mente sobre a composição. Só a
       última fatia com valor fica sem piso — é ela que fecha os 100%. */
    const larguras = {};
    let usado = 0;
    const comValor = NATUREZAS.filter((n) => totais[n] > 0);
    comValor.forEach((n, i) => {
      const w = i === comValor.length - 1 ? 100 - usado : Math.max(1, Math.min(pct(totais[n]), 100 - usado - (comValor.length - 1 - i)));
      larguras[n] = w;
      usado += w;
    });
    return { porGrupo, totais, secoes, base, pct, larguras, comValor };
  }, [grupos, itens, tipo, rotulos, naturezas]);

  const soltar = (alvoId) => {
    if (dragId && dragId !== alvoId) {
      const ids = grupos.map((g) => g.id);
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(alvoId);
      if (from !== -1 && to !== -1) {
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        onReordenar?.(ids);
      }
    }
    setDragId(null);
    setOverId(null);
  };

  /* Seção sem categoria nenhuma não recebe: não há para onde a linha ir. */
  const podeReceber = (grupoId) =>
    !!itemDrag &&
    grupoDaCategoria(itemDrag.categoria, tipo) !== grupoId &&
    categoriasDoGrupo(grupoId, tipo).length > 0;

  const soltarItem = (grupoId) => {
    if (podeReceber(grupoId)) {
      const destino = grupos.find((g) => g.id === grupoId);
      const categoria = destino ? padraoDoGrupo(destino) : "";
      if (categoria) {
        /* Vindo de uma seção variável a linha não tem vencimento — ao cair
           numa seção fixa ela precisa de um dia, senão nasce sem data. */
        const patch = { categoria };
        if (!ehGrupoVariavel(grupoId) && !itemDrag.dia) patch.dia = 1;
        onEditar?.(itemDrag, patch);
      }
    }
    setItemDrag(null);
    setItemOver(null);
  };

  return (
    <section className={`overflow-hidden ${CARD}`}>
      <header className={`relative border-b ${HAIR}`}>
        <div className="flex h-12 items-center gap-2.5 px-3 sm:px-4">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tipo === "entrada" ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"}`}>
            {tipo === "entrada" ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}
          </span>
          <h2 className="truncate text-[13px] font-semibold text-neutro-800 dark:text-t1">{titulo}</h2>
          <span className={`shrink-0 text-xs text-neutro-400 dark:text-t3 ${NUM}`}>{itens.length}</span>
          {onAlternarOrdem && (
            <button
              onClick={onAlternarOrdem}
              title={ordemAsc ? "Datas em ordem crescente — clique para inverter" : "Datas em ordem decrescente — clique para inverter"}
              className={`ml-auto inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2 text-[11.5px] font-medium text-neutro-500 transition-all duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:text-t2 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300 ${HAIR}`}
            >
              {ordemAsc ? <ArrowUpNarrowWide size={13} /> : <ArrowDownWideNarrow size={13} />}
              <span className="hidden sm:inline">Data</span>
              <span>{ordemAsc ? "↑" : "↓"}</span>
            </button>
          )}
          {/* O total é a soma das duas metades logo abaixo — o rótulo entra pra
              deixar isso explícito assim que sobra largura pra ele. */}
          <span
            title={reparticao.base > 0 ? `Total do card — ${NATUREZAS.filter((n) => reparticao.totais[n] > 0).map((n) => `${NATUREZA[n].label} ${emReal(reparticao.totais[n])}`).join(" + ")}` : "Total do card"}
            className={`flex shrink-0 items-baseline gap-1.5 ${onAlternarOrdem ? "ml-2" : "ml-auto"}`}
          >
            <span className="hidden text-[10.5px] font-semibold uppercase tracking-wide text-neutro-400 sm:inline dark:text-t3">Total</span>
            <span className={`text-[14px] font-semibold ${NUM} ${tipo === "entrada" ? "text-neutro-800 dark:text-t1" : "text-rose-600 dark:text-rose-400"}`}>
              {cifra(total, oculto)}
            </span>
          </span>
        </div>

        {/* Card vazio não ganha repartição: dois zeros e uma régua sem cor não
            informam nada — só empurram a primeira seção pra baixo. */}
        {reparticao.base > 0 && (
          <>
            {/* Numa linha só o rótulo e o valor disputam a mesma largura: no
                celular as duas metades empilham pra ninguém truncar; de `sm`
                pra cima elas voltam lado a lado. */}
            <div className="grid grid-cols-2 gap-2 px-3 pb-3 max-sm:grid-cols-1 sm:px-4">
              <Fatia natureza="fixa" valor={reparticao.totais.fixa} pct={reparticao.pct(reparticao.totais.fixa)} oculto={oculto} secoes={reparticao.secoes.fixa} onAbrir={() => setAbrindoReparticao(true)} />
              <Fatia natureza="variavel" valor={reparticao.totais.variavel} pct={reparticao.pct(reparticao.totais.variavel)} oculto={oculto} secoes={reparticao.secoes.variavel} onAbrir={() => setAbrindoReparticao(true)} />
              {/* "Fora da conta" só existe quando alguém colocou algo lá; aí ele
                  ocupa a linha inteira — é nota de rodapé, não terceira coluna. */}
              {reparticao.secoes.fora.length > 0 && (
                <Fatia natureza="fora" valor={reparticao.totais.fora} pct={reparticao.pct(reparticao.totais.fora)} oculto={oculto} secoes={reparticao.secoes.fora} onAbrir={() => setAbrindoReparticao(true)} />
              )}
            </div>
            {/* Régua do peso de cada natureza, encostada na primeira seção:
                a composição do card sem precisar ler número nenhum. */}
            <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[2px] overflow-hidden">
              {reparticao.comValor.map((n) => (
                <span
                  key={n}
                  className={`h-full shrink-0 transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${NATUREZA[n].barra}`}
                  style={{ width: `${reparticao.larguras[n]}%` }}
                />
              ))}
            </span>
          </>
        )}
      </header>

      {grupos.map((g) => (
        <Subgrupo
          key={g.id}
          grupo={g}
          tipo={tipo}
          itens={itens.filter((i) => grupoDaCategoria(i.categoria, tipo) === g.id)}
          subtotal={reparticao.porGrupo[g.id]?.subtotal || 0}
          pendente={reparticao.porGrupo[g.id]?.pendente || 0}
          diaHoje={diaHoje}
          rotulos={rotulos}
          arrastando={dragId === g.id}
          sobre={!!dragId && overId === g.id && dragId !== g.id}
          recebendo={itemOver === g.id && podeReceber(g.id)}
          itemArrastado={itemDrag}
          onDragStart={() => setDragId(g.id)}
          onDragEnter={() => { if (dragId) setOverId(g.id); if (itemDrag) setItemOver(g.id); }}
          onDragEnd={() => { setDragId(null); setOverId(null); }}
          onDrop={() => (dragId ? soltar(g.id) : soltarItem(g.id))}
          onItemDragStart={(i) => setItemDrag(i)}
          onItemDragEnd={() => { setItemDrag(null); setItemOver(null); }}
          onValor={onValor}
          onPago={onPago}
          onData={onData}
          onRemover={onRemover}
          onEditar={onEditar}
          onNota={onNota}
          onCriar={onCriar}
        />
      ))}

      {abrindoReparticao && (
        <EditorNaturezas
          tipo={tipo}
          titulo={titulo}
          grupos={grupos}
          rotulos={rotulos}
          naturezas={naturezas}
          porGrupo={reparticao.porGrupo}
          totais={reparticao.totais}
          oculto={oculto}
          onDefinir={(grupoId, valor) => onNatureza?.(tipo, grupoId, valor)}
          onRestaurar={() => onRestaurarNaturezas?.(tipo)}
          onFechar={() => setAbrindoReparticao(false)}
        />
      )}
    </section>
  );
}

/**
 * Um campo de nome no editor. Renomeia ao confirmar (Enter ou sair do campo).
 * Texto vazio ou igual ao nome padrão apaga o apelido e volta ao padrão; o
 * botão ↺ aparece só quando há apelido, para restaurar num clique.
 */
function CampoNome({ chave, atual, padrao, onRenomear, forte = false, cor, acao = null }) {
  const [texto, setTexto] = useState(atual);
  useEffect(() => { setTexto(atual); }, [atual]);
  const overrideado = atual !== padrao;

  const confirmar = (valor = texto) => {
    const limpo = valor.trim();
    onRenomear(chave, !limpo || limpo === padrao ? "" : limpo);
    if (!limpo) setTexto(padrao);
  };
  const restaurar = () => { setTexto(padrao); confirmar(""); };

  return (
    <div className="flex items-center gap-1.5">
      {cor && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />}
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => confirmar()}
        onKeyDown={(e) => {
          if (e.key === "Enter") { confirmar(); e.currentTarget.blur(); }
          if (e.key === "Escape") { setTexto(atual); e.currentTarget.blur(); }
        }}
        aria-label={`Nome de ${padrao}`}
        className={`min-w-0 flex-1 rounded-lg border border-neutro-200 bg-white px-2.5 py-1.5 text-[13px] text-neutro-700 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-line dark:bg-white/[0.04] dark:text-t1 ${forte ? "font-semibold" : ""}`}
      />
      <button
        onClick={restaurar}
        disabled={!overrideado}
        title={overrideado ? `Voltar ao padrão (${padrao})` : "Já está no padrão"}
        aria-label="Voltar ao nome padrão"
        className={`shrink-0 rounded-lg p-1.5 transition-colors ${
          overrideado
            ? "cursor-pointer text-neutro-400 hover:bg-brand-50 hover:text-brand-600 dark:text-t3 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
            : "cursor-default text-transparent"
        }`}
      >
        <RotateCcw size={13} />
      </button>
      {acao}
    </div>
  );
}

/** Lixeira das seções/categorias criadas pela tela (as fixas não somem). */
function BotaoApagar({ onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="shrink-0 cursor-pointer rounded-lg p-1.5 text-neutro-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-t3 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
    >
      <Trash2 size={13} />
    </button>
  );
}

const TIPOS_EDITOR = [
  { tipo: "entrada", titulo: "Entradas" },
  { tipo: "saida", titulo: "Saídas" },
];

/** Cores oferecidas ao criar uma categoria — as mesmas já usadas no módulo. */
const CORES_CATEGORIA = [
  "#12a89d", "#2ecd6f", "#3c86d8", "#5b9fd6", "#7b68ee",
  "#a875ff", "#e8568f", "#e8556d", "#ef8b3f", "#f5a623", "#87909e",
];

/** Formulário inline de categoria nova dentro de uma seção. */
function NovaCategoria({ onAdd }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_CATEGORIA[0]);

  const criar = () => {
    const limpo = nome.trim();
    if (!limpo) return setAberto(false);
    onAdd(limpo, cor);
    setNome("");
    setCor(CORES_CATEGORIA[(CORES_CATEGORIA.indexOf(cor) + 1) % CORES_CATEGORIA.length]);
    setAberto(false);
  };

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-1 py-1 text-[12px] text-neutro-400 transition-colors hover:text-brand-600 dark:text-t3 dark:hover:text-brand-300"
      >
        <Plus size={12} /> Nova categoria
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") criar(); if (e.key === "Escape") setAberto(false); }}
          placeholder="Nome da categoria"
          className="min-w-0 flex-1 rounded-lg border border-brand-300 px-2.5 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-brand-500/60 dark:bg-white/[0.06] dark:text-t1 dark:placeholder:text-t3"
        />
        <button onClick={criar} className="shrink-0 cursor-pointer rounded-lg bg-brand-500 px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-600">
          Criar
        </button>
        <button onClick={() => setAberto(false)} aria-label="Cancelar" className="shrink-0 cursor-pointer rounded-lg p-1.5 text-neutro-400 hover:bg-neutro-100 dark:hover:bg-white/[0.06]">
          <X size={14} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-4">
        {CORES_CATEGORIA.map((c) => (
          <button
            key={c}
            onClick={() => setCor(c)}
            aria-label={`Cor ${c}`}
            style={{ backgroundColor: c }}
            className={`h-4 w-4 cursor-pointer rounded-full transition-transform ${c === cor ? "scale-125 ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-neutro-900" : "hover:scale-110"}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Confirmação de exclusão de uma seção ou categoria.
 *
 * Quando o que vai sair ainda tem lançamentos, apagar em silêncio sumiria com
 * dinheiro do fechamento — então a tela pergunta o destino: mover para outra
 * categoria (padrão) ou apagar os lançamentos junto. Sem lançamentos, é só um
 * "tem certeza?".
 */
function ConfirmarExclusao({ alvo, rotulos, onConfirmar, onCancelar }) {
  const { tipo: kind, nome, ids, quantidade, destinos } = alvo;
  const [modo, setModo] = useState("mover"); // mover | apagar
  const [destino, setDestino] = useState(destinos[0]?.id || "");
  const emUso = quantidade > 0;
  const semDestino = emUso && !destinos.length;

  const confirmar = () => onConfirmar(emUso && modo === "mover" ? destino : null);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Apagar ${nome}`}>
      <div className="absolute inset-0 bg-neutro-900/50 backdrop-blur-sm dark:bg-black/60" onClick={onCancelar} />
      <div className="relative w-full max-w-md animate-sheet-in rounded-t-2xl border border-neutro-200 bg-white p-4 shadow-2xl sm:animate-scale-in sm:rounded-2xl sm:p-5 dark:border-line dark:bg-s2">
        <div className="flex items-start gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
            <Trash2 size={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-neutro-800 dark:text-t1">
              Apagar {kind === "grupo" ? "a seção" : "a categoria"} "{nome}"?
            </h2>
            <p className="mt-0.5 text-[12px] text-neutro-500 dark:text-t2">
              {emUso
                ? `Tem ${quantidade} lançamento(s) ${kind === "grupo" ? "nas categorias dessa seção" : "nessa categoria"}. Escolha o que fazer com eles.`
                : "Não há nenhum lançamento usando isso — some na hora."}
            </p>
          </div>
        </div>

        {emUso && (
          <div className="mt-3.5 space-y-2">
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 transition-colors ${modo === "mover" ? "border-brand-400 bg-brand-50/60 dark:border-brand-500/60 dark:bg-brand-500/[0.08]" : "border-neutro-200 dark:border-line"}`}>
              <input type="radio" checked={modo === "mover"} onChange={() => setModo("mover")} disabled={semDestino} className="cursor-pointer accent-brand-500" />
              <span className="shrink-0 text-[13px] text-neutro-700 dark:text-t1">Mover para</span>
              <select
                value={destino}
                onChange={(e) => { setDestino(e.target.value); setModo("mover"); }}
                disabled={semDestino}
                aria-label="Categoria de destino"
                className="min-w-0 flex-1 cursor-pointer rounded-lg border border-neutro-200 px-2 py-1.5 text-[12.5px] text-neutro-600 outline-none disabled:opacity-50 dark:border-line dark:bg-white/[0.06] dark:text-t2"
              >
                {destinos.map((c) => (
                  <option key={c.id} value={c.id}>{nomeCategoria(c, rotulos)}</option>
                ))}
                {semDestino && <option value="">nenhuma categoria disponível</option>}
              </select>
            </label>
            <label className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 transition-colors ${modo === "apagar" ? "border-rose-300 bg-rose-50/60 dark:border-rose-500/50 dark:bg-rose-500/[0.08]" : "border-neutro-200 dark:border-line"}`}>
              <input type="radio" checked={modo === "apagar"} onChange={() => setModo("apagar")} className="cursor-pointer accent-rose-500" />
              <span className="text-[13px] text-neutro-700 dark:text-t1">Apagar os lançamentos junto</span>
            </label>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button onClick={onCancelar} className="flex-1 cursor-pointer rounded-lg border border-neutro-200 py-2.5 text-[13px] font-medium text-neutro-600 transition-colors hover:bg-neutro-50 sm:py-2 dark:border-line dark:text-t2 dark:hover:bg-white/[0.06]">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={emUso && modo === "mover" && !destino}
            className="flex-1 cursor-pointer rounded-lg bg-rose-500 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
          >
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Formulário inline de seção nova (um bloco com subtotal próprio). */
function NovaSecao({ onAdd }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [variavel, setVariavel] = useState(false);

  const criar = () => {
    const limpo = nome.trim();
    if (!limpo) return setAberto(false);
    onAdd(limpo, variavel);
    setNome(""); setVariavel(false); setAberto(false);
  };

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutro-300 py-2 text-[12.5px] text-neutro-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-white/[0.12] dark:text-t2 dark:hover:border-brand-500/60 dark:hover:text-brand-300"
      >
        <Plus size={13} /> Nova seção
      </button>
    );
  }

  return (
    <div className="mt-2.5 space-y-2 rounded-xl border border-brand-300 p-2.5 dark:border-brand-500/60">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") criar(); if (e.key === "Escape") setAberto(false); }}
          placeholder="Nome da seção"
          className="min-w-0 flex-1 rounded-lg border border-neutro-200 px-2.5 py-1.5 text-[13px] font-semibold outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 dark:border-line dark:bg-white/[0.04] dark:text-t1 dark:placeholder:text-t3"
        />
        <button onClick={criar} className="shrink-0 cursor-pointer rounded-lg bg-brand-500 px-2.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-brand-600">
          Criar
        </button>
        <button onClick={() => setAberto(false)} aria-label="Cancelar" className="shrink-0 cursor-pointer rounded-lg p-1.5 text-neutro-400 hover:bg-neutro-100 dark:hover:bg-white/[0.06]">
          <X size={14} />
        </button>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-neutro-500 dark:text-t2">
        <input type="checkbox" checked={variavel} onChange={(e) => setVariavel(e.target.checked)} className="cursor-pointer accent-brand-500" />
        Sem dia fixo de vencimento (só "Pago em")
      </label>
    </div>
  );
}

/**
 * Editor das seções e categorias do financeiro.
 *
 * As seções e categorias que vieram do código não somem nem trocam de lugar —
 * delas só se muda o NOME (salvo em financeiro_config.rotulos). Por cima disso,
 * o usuário cria as suas (salvas em financeiro_config.grupos/categorias), que
 * podem ser renomeadas e apagadas. Uma categoria em uso por algum lançamento não
 * é apagada: primeiro é preciso mover ou excluir os lançamentos.
 */
function EditorEstrutura({ rotulos, ordens, usados, onParcela, onRenomear, onAddCategoria, onRemoveCategoria, onAddGrupo, onRemoveGrupo, onFechar }) {
  const [alvo, setAlvo] = useState(null);

  /** Monta o alvo do diálogo: o que sai, quantos lançamentos e para onde podem ir. */
  const pedirExclusao = (kind, obj, tipo) => {
    const ids = kind === "grupo"
      ? categoriasDoGrupo(obj.id, tipo).map((c) => c.id)
      : [obj.id];
    const quantidade = ids.reduce((n, id) => n + (usados.get(id) || 0), 0);
    setAlvo({
      kind,
      obj,
      ids,
      quantidade,
      nome: kind === "grupo" ? nomeGrupo(obj, rotulos) : nomeCategoria(obj, rotulos),
      // destino possível: qualquer categoria do mesmo tipo que não vai sumir
      destinos: categoriasDe(tipo).filter((c) => !ids.includes(c.id)),
    });
  };

  const confirmar = (destino) => {
    const { kind, obj } = alvo;
    setAlvo(null);
    if (kind === "grupo") onRemoveGrupo(obj, destino);
    else onRemoveCategoria(obj, destino);
  };

  return (
    // Celular: folha que sobe do rodapé. Desktop: caixa centrada.
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Editar nomes de grupos e categorias">
      <div className="absolute inset-0 bg-neutro-900/40 backdrop-blur-sm dark:bg-black/50" onClick={onFechar} />
      <div className="relative flex max-h-[88dvh] w-full max-w-lg animate-sheet-in flex-col overflow-hidden rounded-t-2xl border border-neutro-200 bg-white shadow-2xl sm:max-h-[85vh] sm:animate-scale-in sm:rounded-2xl dark:border-line dark:bg-s2">
        <header className="flex items-center gap-2.5 border-b border-neutro-100 px-4 py-4 sm:px-5 dark:border-line">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Tags size={15} />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-neutro-800 dark:text-t1">Seções e categorias</h2>
            <p className="text-[11.5px] text-neutro-500 dark:text-t2">Crie, renomeie e apague — vale para todos os meses. O botão 50% liga a escolha 100% / 50% na categoria.</p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="ml-auto shrink-0 cursor-pointer rounded-lg p-1.5 text-neutro-400 transition-colors hover:bg-neutro-100 hover:text-neutro-600 dark:text-t3 dark:hover:bg-white/[0.06] dark:hover:text-t2"
          >
            <X size={16} />
          </button>
        </header>

        <div className="overscroll-contain-y min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-5">
          {TIPOS_EDITOR.map(({ tipo, titulo }) => (
            <section key={tipo}>
              <h3 className={EYEBROW}>{titulo}</h3>
              <div className="mt-2.5 space-y-2.5">
                {gruposOrdenados(tipo, ordens).map((g) => (
                  <div key={g.id} className="rounded-xl border border-neutro-200 p-2.5 dark:border-line">
                    <CampoNome
                      forte
                      chave={chaveGrupo(g.id)}
                      atual={nomeGrupo(g, rotulos)}
                      padrao={g.label}
                      onRenomear={onRenomear}
                      acao={g.custom ? <BotaoApagar title="Apagar seção" onClick={() => pedirExclusao("grupo", g, tipo)} /> : null}
                    />
                    <div className="mt-2 space-y-1.5 border-l-2 border-neutro-100 pl-3 dark:border dark:border-line">
                      {categoriasDoGrupo(g.id, tipo).map((c) => (
                        <CampoNome
                          key={c.id}
                          cor={c.cor}
                          chave={chaveCategoria(c.id)}
                          atual={nomeCategoria(c, rotulos)}
                          padrao={c.label}
                          onRenomear={onRenomear}
                          acao={<>
                            <button
                              onClick={() => onParcela(c.id)}
                              aria-pressed={usaParcela(c.id)}
                              title={usaParcela(c.id) ? "Opção 100% / 50% ligada — clique para desligar" : "Ligar opção 100% / 50% nesta categoria"}
                              className={`flex h-7 shrink-0 cursor-pointer items-center gap-0.5 rounded-lg px-1.5 text-[11px] font-semibold transition-colors ${
                                usaParcela(c.id)
                                  ? "bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400"
                                  : "text-neutro-300 hover:bg-neutro-100 hover:text-neutro-500 dark:text-t4 dark:hover:bg-white/[0.06] dark:hover:text-t2"
                              }`}
                            >
                              50<Percent size={10} strokeWidth={2.5} />
                            </button>
                            {c.custom && <BotaoApagar title="Apagar categoria" onClick={() => pedirExclusao("categoria", c, tipo)} />}
                          </>}
                        />
                      ))}
                      <NovaCategoria onAdd={(nome, cor) => onAddCategoria(tipo, g.id, nome, cor)} />
                    </div>
                  </div>
                ))}
              </div>
              <NovaSecao onAdd={(nome, variavel) => onAddGrupo(tipo, nome, variavel)} />
            </section>
          ))}
        </div>

        {/* pb-safe-3 == pb-3 no desktop (env() vale 0) e abre espaço pro
            indicador de gestos no iOS. */}
        <footer className="pb-safe-3 border-t border-neutro-100 px-4 pt-3 sm:px-5 dark:border-line">
          <button
            onClick={onFechar}
            className="w-full cursor-pointer rounded-lg bg-brand-500 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-600 active:scale-[0.99] sm:py-2"
          >
            Concluído
          </button>
        </footer>
      </div>

      {alvo && (
        <ConfirmarExclusao
          alvo={{ tipo: alvo.kind, nome: alvo.nome, ids: alvo.ids, quantidade: alvo.quantidade, destinos: alvo.destinos }}
          rotulos={rotulos}
          onConfirmar={confirmar}
          onCancelar={() => setAlvo(null)}
        />
      )}
    </div>
  );
}

export default function Financeiro({
  clientes, contratos, lancamentos, config, carregando,
  definirValorContrato, criar: criarLanc, atualizar, remover, removerContrato, salvarConfig, renomear, reordenarGrupos,
  removerSerie,
  realocarLancamentos,
  criarCliente, atualizarCliente,
  titulo = "Financeiro", subtitulo = "Fechamento do mês", logo = null, acoes = null,
}) {
  const [editorEstrutura, setEditorEstrutura] = useState(false);
  const [tomador, setTomador] = useState(null); // alvo do diálogo "Tomador da nota"
  const rotulos = config?.rotulos || {};
  const ordens = config?.ordens || {};
  /* Repartição do cabeçalho dos cards: só o que foge do padrão fica gravado, e
     escolher o valor padrão apaga a entrada em vez de fixá-la — assim ajustar o
     padrão depois continua valendo pra quem nunca mexeu. */
  const naturezas = config?.naturezas || {};

  const definirNatureza = (tipo, grupoId, valor) => {
    const novo = { ...naturezas };
    if (valor) novo[chaveNatureza(tipo, grupoId)] = valor;
    else delete novo[chaveNatureza(tipo, grupoId)];
    salvarConfig({ naturezas: novo });
  };

  const restaurarNaturezas = (tipo) => {
    const novo = {};
    for (const [k, v] of Object.entries(naturezas)) if (!k.startsWith(`${tipo}:`)) novo[k] = v;
    salvarConfig({ naturezas: novo });
  };

  // Seções e categorias criadas pela tela. A injeção acontece no corpo do
  // render (e não num efeito) porque os selects e o agrupamento logo abaixo já
  // precisam enxergá-las nesta mesma passada.
  const gruposCustom = config?.grupos || [];
  const categoriasCustom = config?.categorias || [];
  hidratarPersonalizados({ grupos: gruposCustom, categorias: categoriasCustom });
  const categoriasParcela = config?.categoriasParcela || [];
  hidratarParcela(categoriasParcela);
  const alternarParcelaCategoria = (catId) =>
    salvarConfig({
      categoriasParcela: categoriasParcela.includes(catId)
        ? categoriasParcela.filter((id) => id !== catId)
        : [...categoriasParcela, catId],
    });

  /** Lança a 2ª metade de um sinal no mês em foco e tira o sinal da lista. */
  const lancarSaldo = (sinal) => {
    criarLanc({
      tipo: sinal.tipo, mes, descricao: sinal.descricao, categoria: sinal.categoria,
      valor: sinal.valor, dia: sinal.dia, pago: false, clienteId: sinal.clienteId ?? null,
      parcela: "saldo",
    });
    atualizar(sinal.id, { saldoQuitado: true });
  };

  const gruposEntrada = useMemo(() => gruposOrdenados("entrada", ordens), [ordens, gruposCustom]);
  const gruposSaida = useMemo(() => gruposOrdenados("saida", ordens), [ordens, gruposCustom]);

  /** Quantos lançamentos cada categoria tem — o diálogo de exclusão pergunta
   *  o destino deles antes de apagar a categoria/seção. */
  const categoriasEmUso = useMemo(() => {
    const m = new Map();
    for (const l of lancamentos || []) m.set(l.categoria, (m.get(l.categoria) || 0) + 1);
    return m;
  }, [lancamentos]);

  /** Id estável a partir do nome: prefixo + slug + sufixo aleatório. */
  const novoId = (prefixo, nome) =>
    prefixo +
    nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) +
    "_" + Math.random().toString(36).slice(2, 5);

  const adicionarCategoria = (tipo, grupoId, label, cor) => {
    const nome = (label || "").trim();
    if (!nome) return;
    salvarConfig({
      categorias: [...categoriasCustom, { id: novoId("x_", nome), tipo, grupo: grupoId, label: nome, cor }],
    });
  };

  /**
   * Apaga uma categoria criada pela tela. Os lançamentos dela vão para `destino`
   * (id de outra categoria) ou são apagados quando `destino` é nulo — quem
   * escolhe é o diálogo de confirmação. Os lançamentos saem primeiro: se essa
   * parte falhar, a categoria continua de pé e nada fica órfão.
   */
  const removerCategoria = async (cat, destino) => {
    if (categoriasEmUso.get(cat.id)) {
      try { await realocarLancamentos([cat.id], destino); } catch { return; }
    }
    salvarConfig({ categorias: categoriasCustom.filter((c) => c.id !== cat.id) });
  };

  const adicionarGrupo = (tipo, label, variavel) => {
    const nome = (label || "").trim();
    if (!nome) return;
    salvarConfig({
      grupos: [...gruposCustom, { id: novoId("s_", nome), tipo, label: nome, hint: "seção personalizada", variavel: !!variavel }],
    });
  };

  /** Apaga uma seção criada pela tela junto com as categorias dela, movendo
   *  (ou apagando) os lançamentos dessas categorias antes. */
  const removerGrupo = async (grupo, destino) => {
    const filhas = categoriasCustom.filter((c) => c.grupo === grupo.id);
    const emUso = filhas.map((c) => c.id).filter((id) => categoriasEmUso.get(id));
    if (emUso.length) {
      try { await realocarLancamentos(emUso, destino); } catch { return; }
    }
    salvarConfig({
      grupos: gruposCustom.filter((g) => g.id !== grupo.id),
      categorias: categoriasCustom.filter((c) => c.grupo !== grupo.id),
    });
  };

  const [mes, setMes] = useState(MES_ATUAL);
  const [janela, setJanela] = useState(6); // meses exibidos no gráfico de fluxo
  const [oculto, setOculto] = useState(() => localStorage.getItem("financeiro_valores_ocultos") === "1");
  /* Ordem das linhas por data: crescente por padrão, decrescente se o usuário
     preferir. Entradas e saídas têm ordem própria — cada card manda no seu
     bloco. Fica no localStorage pra escolha sobreviver ao recarregar; se só
     existe a chave antiga (ordem única), ela vira o padrão dos dois. */
  const lerOrdem = (chave) =>
    (localStorage.getItem(chave) ?? localStorage.getItem("financeiro_ordem_data")) !== "desc";
  const [ordemEntrada, setOrdemEntrada] = useState(() => lerOrdem("financeiro_ordem_data_entrada"));
  const [ordemSaida, setOrdemSaida] = useState(() => lerOrdem("financeiro_ordem_data_saida"));

  const alternarOrdemDe = (set, chave) => () => set((a) => {
    const novo = !a;
    localStorage.setItem(chave, novo ? "asc" : "desc");
    return novo;
  });
  const alternarOrdemEntrada = alternarOrdemDe(setOrdemEntrada, "financeiro_ordem_data_entrada");
  const alternarOrdemSaida = alternarOrdemDe(setOrdemSaida, "financeiro_ordem_data_saida");

  const alternarOculto = () => setOculto((o) => {
    const novo = !o;
    localStorage.setItem("financeiro_valores_ocultos", novo ? "1" : "0");
    return novo;
  });

  /** Saldo em caixa = base + tudo que já foi pago (entra soma, sai subtrai),
   *  somando todos os meses — é o dinheiro que sobrou de verdade. */
  const saldoDisponivel = useMemo(() => {
    const mov = (lancamentos || []).reduce((n, l) => {
      if (!l.pago) return n;
      return n + (l.tipo === "entrada" ? (l.valor || 0) : -(l.valor || 0));
    }, 0);
    return (config?.saldoBase || 0) + mov;
  }, [lancamentos, config]);

  const diaHoje = mes === MES_ATUAL ? Number(HOJE.slice(8, 10)) : 0;

  /* Toda linha entra já no lugar certo da data: `ordenarPorData` reordena a
     lista a cada render, então criar, editar o vencimento ou dar baixa nunca
     deixa o extrato fora de ordem. A ordenação é por bloco, já que cada card
     tem seu próprio sentido de ordem. */
  const doMes = useMemo(
    () => {
      // Anexa o tomador (cliente que recebe a nota) pra linha poder copiar o
      // CNPJ/CPF na hora de emitir. Vale o vínculo do lançamento; entrada antiga
      // sem vínculo cai no nome citado na descrição.
      const porId = new Map((clientes || []).map((c) => [c.id, c]));
      return lancamentosDoMes(mes, contratos || [], lancamentos || [], clientes || [])
        .map((i) => {
          const c = i.clienteId ? porId.get(i.clienteId) : i.tipo === "entrada" ? clienteCitado(i.descricao, clientes) : null;
          return c ? { ...i, tomador: c } : i;
        });
    },
    [mes, contratos, lancamentos, clientes]
  );

  const entradas = useMemo(
    () => ordenarPorData(doMes.filter((l) => l.tipo === "entrada"), !ordemEntrada),
    [doMes, ordemEntrada]
  );
  const saidas = useMemo(
    () => ordenarPorData(doMes.filter((l) => l.tipo === "saida"), !ordemSaida),
    [doMes, ordemSaida]
  );

  const soma = (arr) => arr.reduce((n, l) => n + (l.valor || 0), 0);
  const previsto = soma(entradas);
  const recebido = soma(entradas.filter((l) => l.pago));
  const gasto = soma(saidas); // previsto do mês (todas as saídas) — cabeçalho do bloco
  // Saída fixa é previsão: o valor só desconta do lucro/caixa quando é pago.
  const saidasPagas = saidas.filter((l) => l.pago);
  /* Retirada de lucro é distribuição do resultado, não custo: fica fora das
     despesas (senão o lucro do mês seria descontado duas vezes) e aparece como
     nota embaixo do Lucro do mês. No saldo em caixa ela continua saindo. */
  const lucroDistribuido = soma(saidasPagas.filter((l) => ehLucroDistribuido(l.categoria)));
  const despesasPagas = soma(saidasPagas.filter((l) => !ehLucroDistribuido(l.categoria)));
  const atrasadas = entradas.filter((l) => !l.pago && !ehVariavel(l.categoria, "entrada") && l.dia < diaHoje);
  const semValor = doMes.filter((l) => !l.valor).length;

  /** Fluxo dos últimos N meses (terminando no mês em foco) para o gráfico. */
  const historico = useMemo(() => {
    return Array.from({ length: janela }, (_, k) => {
      const m = mesVizinho(mes, -(janela - 1 - k));
      const doM = lancamentosDoMes(m, contratos || [], lancamentos || [], clientes || []);
      const saidasDoM = doM.filter((l) => l.tipo === "saida");
      /* Mesmo corte dos cards: lucro distribuído é distribuição do resultado,
         não custo — vira curva própria em vez de inflar as despesas. */
      return {
        mes: m,
        entradas: doM.filter((l) => l.tipo === "entrada").reduce((n, l) => n + (l.valor || 0), 0),
        despesas: saidasDoM.filter((l) => !ehLucroDistribuido(l.categoria)).reduce((n, l) => n + (l.valor || 0), 0),
        lucroDist: saidasDoM.filter((l) => ehLucroDistribuido(l.categoria)).reduce((n, l) => n + (l.valor || 0), 0),
      };
    });
  }, [mes, janela, contratos, lancamentos, clientes]);

  /** Uma linha gerada (contrato ou repetição) só existe na tela; ao editar, ela
   *  vira lançamento real deste mês — e, no caso da repetição, passa a ser o
   *  molde dos meses seguintes. */
  const materializar = (item, patch) => {
    if (!item.gerado) return atualizar(item.id, patch);
    return criarLanc({
      tipo: item.tipo, mes, descricao: item.descricao, categoria: item.categoria,
      valor: item.valor, dia: item.dia, pago: false, clienteId: item.clienteId,
      origem: item.origem ?? null, serieId: item.serieId ?? null, recorrente: !!item.recorrente,
      ...patch,
    });
  };

  /** Valor de mensalidade grava no contrato — vale para os meses seguintes. Nas
   *  demais linhas o valor é do mês (a repetição leva o último valor adiante). */
  const definirValor = (item, valor) =>
    item.origem === "contrato" && item.gerado
      ? definirValorContrato(item.clienteId, valor)
      : materializar(item, { valor });

  const criar = (tipo) => ({ descricao, dia, categoria, repetir, parcela, clienteId, valor }) =>
    criarLanc({
      tipo, mes, descricao, dia, categoria, valor: valor || 0, pago: false, clienteId: clienteId ?? null, parcela: parcela ?? null,
      serieId: repetir ? novaSerie() : null, recorrente: !!repetir,
    });

  /** Grava o que o diálogo do tomador decidiu e devolve o cliente (ou null). */
  const salvarTomador = async ({ escolha, nome, docTipo, doc, receita }) => {
    if (!escolha) return null;
    const daReceita = receita
      ? {
          razaoSocial: receita.razaoSocial, nomeFantasia: receita.nomeFantasia, cep: receita.cep, numero: receita.numero,
          complemento: receita.complemento, bairro: receita.bairro, cidade: receita.cidade, estado: receita.estado,
        }
      : {};
    if (escolha === NOVO_CLIENTE) {
      return criarCliente({ nome, apelidos: [nome], docTipo, doc, ...daReceita, ...(receita?.endereco ? { endereco: receita.endereco } : {}) });
    }
    const atual = (clientes || []).find((c) => c.id === escolha);
    if (!atual) return null;
    if ((atual.doc || "") === doc && atual.docTipo === docTipo) return atual;
    const patch = { docTipo, doc, ...daReceita };
    // Endereço já preenchido à mão na ficha não é sobrescrito pelo da Receita.
    if (receita?.endereco && !atual.endereco) patch.endereco = receita.endereco;
    await atualizarCliente?.(escolha, patch);
    return { ...atual, ...patch };
  };

  /**
   * Liga o lançamento ao cliente escolhido. Mesma descrição = mesmo tomador:
   * as outras entradas soltas com o mesmo texto ganham o vínculo junto, pra não
   * repetir o cadastro mês a mês. Mensalidade de contrato não muda de dono.
   */
  const vincularTomador = (item, cliente) => {
    if (item.origem === "contrato") return;
    const id = cliente?.id ?? null;
    if ((item.clienteId ?? null) !== id) materializar(item, { clienteId: id });
    if (!id) return;
    const chave = item.descricao.trim().toLowerCase();
    for (const l of lancamentos || []) {
      if (l.id !== item.id && l.tipo === "entrada" && !l.clienteId && l.descricao.trim().toLowerCase() === chave) {
        atualizar(l.id, { clienteId: id });
      }
    }
  };

  const abrirTomadorDoItem = (item) =>
    setTomador({
      descricao: item.descricao, clienteId: item.tomador?.id || "", nomeSugerido: item.descricao,
      travado: item.origem === "contrato",
      aoConcluir: (cliente) => vincularTomador(item, cliente),
    });

  /**
   * Cliente fixo não é um lançamento avulso: a linha vem do contrato e é
   * regerada todo mês. Apagar só o lançamento faz ela voltar (o "reset"), então
   * remover um fixo desativa o contrato. Lançamento avulso some direto.
   */
  const apagar = (item) => {
    const ehContrato = item.origem === "contrato";
    if (!ehContrato && item.recorrente && item.serieId) {
      const ok = window.confirm(
        `Remover "${item.descricao}"?\n\nEssa linha se repete todo mês: ela sai deste mês em diante. Os meses anteriores continuam no histórico.`
      );
      if (!ok) return;
      return removerSerie(item.serieId, item.gerado ? null : item.id);
    }
    if (!ehContrato) return remover(item.id);
    const nome = item.descricao.replace("Mensalidade — ", "");
    const ok = window.confirm(
      `Remover o cliente fixo "${nome}"?\n\nA mensalidade automática para de aparecer nos próximos meses. Os meses já pagos continuam no histórico.`
    );
    if (!ok) return;
    return removerContrato(item.clienteId, item.gerado ? null : item.id);
  };

  if (carregando) {
    return (
      <main className="flex min-w-0 flex-1 items-center justify-center bg-neutro-50 dark:bg-s1">
        <span className="text-[13px] text-neutro-500 dark:text-t2">Carregando o financeiro…</span>
      </main>
    );
  }

  return (
    <TomadorCtx.Provider value={{ clientes: clientes || [], abrir: setTomador, abrirDoItem: abrirTomadorDoItem }}>
    {/* min-h-0: quando o módulo é montado dentro de uma coluna flex (o shell
        mobile), sem isso o <main> cresce e a área de rolagem interna some. */}
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-s1">
      <TopBar icon={Wallet} logo={logo} titulo={titulo} subtitulo={subtitulo} className="border-b border-neutro-100 pb-3 dark:border-line">
        {/* Navegação de mês — controle segmentado; cresce pra ocupar a linha no
            celular, com alvos de toque de 40px. */}
        <div className={`${CTRL_CAIXA} flex-1 md:flex-none`}>
          <button onClick={() => setMes(mesVizinho(mes, -1))} aria-label="Mês anterior"
            className={`${CTRL_SEG} aspect-square shrink-0 cursor-pointer px-0 text-neutro-500 transition-colors duration-200 hover:bg-white hover:text-neutro-900 dark:text-t2 dark:hover:bg-s4 dark:hover:text-t1`}>
            <ChevronLeft size={16} />
          </button>
          <span className="flex-1 text-center text-[13px] font-semibold text-neutro-700 md:min-w-[104px] md:flex-none dark:text-t1">{mesLegivel(mes)}</span>
          <button onClick={() => setMes(mesVizinho(mes, 1))} aria-label="Próximo mês"
            className={`${CTRL_SEG} aspect-square shrink-0 cursor-pointer px-0 text-neutro-500 transition-colors duration-200 hover:bg-white hover:text-neutro-900 dark:text-t2 dark:hover:bg-s4 dark:hover:text-t1`}>
            <ChevronRight size={16} />
          </button>
        </div>

        {mes !== MES_ATUAL && (
          <ToolbarButton onClick={() => setMes(MES_ATUAL)} className={CTRL}>Hoje</ToolbarButton>
        )}

        <ToolbarButton icon={Tags} onClick={() => setEditorEstrutura(true)} title="Criar, renomear e apagar seções e categorias" className={CTRL_COMPACTO}>
          <span className="hidden md:inline">Categorias</span>
        </ToolbarButton>

        <ToolbarButton
          icon={oculto ? EyeOff : Eye}
          active={oculto}
          onClick={alternarOculto}
          aria-pressed={oculto}
          title={oculto ? "Mostrar valores" : "Ocultar valores"}
          className={CTRL_ICONE}
        />

        {/* Espaço do app hospedeiro: troca de tema, menu da conta, etc. */}
        {acoes}
      </TopBar>

      {editorEstrutura && (
        <EditorEstrutura
          rotulos={rotulos}
          ordens={ordens}
          usados={categoriasEmUso}
          onParcela={alternarParcelaCategoria}
          onRenomear={renomear}
          onAddCategoria={adicionarCategoria}
          onRemoveCategoria={removerCategoria}
          onAddGrupo={adicionarGrupo}
          onRemoveGrupo={removerGrupo}
          onFechar={() => setEditorEstrutura(false)}
        />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-neutro-50 p-4 sm:p-5 dark:bg-s1">
        <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-5">
          {/* Bento: à esquerda os números do mês e a meta empilhados; à direita
              o fluxo e, embaixo, "Falta 50%" ao lado das notas. */}
          <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(300px,1fr)_3fr]">
            <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
              <HeroSaldo
                saldo={saldoDisponivel}
                base={config?.saldoBase || 0}
                recebido={recebido}
                gasto={despesasPagas}
                lucro={recebido - despesasPagas}
                distribuido={lucroDistribuido}
                meta={config?.meta || 0}
                oculto={oculto}
                onEditarBase={(v) => salvarConfig({ saldoBase: v })}
              />
              <CartaoMeta
                meta={config?.meta || 0}
                recebido={recebido}
                oculto={oculto}
                onEditarMeta={(v) => salvarConfig({ meta: v })}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
              <GraficoFluxo dados={historico} janela={janela} setJanela={setJanela} oculto={oculto} />
              <div className="grid flex-1 gap-4 sm:gap-5 lg:grid-cols-2 [&>section]:h-full">
                <PainelParcelas
                  pendentes={sinaisPendentes(lancamentos)}
                  mes={mes}
                  oculto={oculto}
                  onMes={setMes}
                  onLancar={lancarSaldo}
                  onResolver={(l) => atualizar(l.id, { saldoQuitado: true })}
                />
                <PainelNotas entradas={entradas} oculto={oculto} onEmitir={(i) => materializar(i, { notaEmitida: true })} />
              </div>
            </div>
          </div>

          {(atrasadas.length > 0 || semValor > 0) && (
            <div className="flex flex-wrap items-start gap-x-5 gap-y-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:items-center sm:py-2.5 dark:border-amber-500/30 dark:bg-amber-500/[0.08]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600 sm:mt-0 dark:text-amber-400" />
              {atrasadas.length > 0 && (
                <span className="text-[13px] text-amber-800 dark:text-amber-200">
                  {atrasadas.length} cobrança(s) passaram do vencimento: {atrasadas.map((a) => a.descricao.replace("Mensalidade — ", "")).join(", ")}
                </span>
              )}
              {semValor > 0 && (
                <span className="text-[13px] text-amber-800 dark:text-amber-200">
                  {semValor} lançamento(s) ainda sem valor — clique em "definir" para preencher.
                </span>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
            <Bloco
              titulo="Entradas" tipo="entrada" itens={entradas} total={previsto}
              grupos={gruposEntrada} diaHoje={diaHoje} oculto={oculto} rotulos={rotulos}
              naturezas={naturezas} onNatureza={definirNatureza} onRestaurarNaturezas={restaurarNaturezas}
              ordemAsc={ordemEntrada} onAlternarOrdem={alternarOrdemEntrada}
              onReordenar={(ids) => reordenarGrupos("entrada", ids)}
              onValor={definirValor}
              onPago={(i, v) => materializar(i, { pago: v, pagoEm: v ? hojeISO() : null })}
              onData={(i, iso) => materializar(i, iso ? { pago: true, pagoEm: iso } : { pagoEm: null })}
              onRemover={apagar}
              onEditar={(i, patch) => materializar(i, patch)}
              onNota={(i, v) => materializar(i, { notaEmitida: v })}
              onCriar={criar("entrada")}
            />
            <Bloco
              titulo="Saídas" tipo="saida" itens={saidas} total={gasto}
              grupos={gruposSaida} diaHoje={diaHoje} oculto={oculto} rotulos={rotulos}
              naturezas={naturezas} onNatureza={definirNatureza} onRestaurarNaturezas={restaurarNaturezas}
              ordemAsc={ordemSaida} onAlternarOrdem={alternarOrdemSaida}
              onReordenar={(ids) => reordenarGrupos("saida", ids)}
              onValor={definirValor}
              onPago={(i, v) => materializar(i, { pago: v, pagoEm: v ? hojeISO() : null })}
              onData={(i, iso) => materializar(i, iso ? { pago: true, pagoEm: iso } : { pagoEm: null })}
              onRemover={apagar}
              onEditar={(i, patch) => materializar(i, patch)}
              onCriar={criar("saida")}
            />
          </div>

          <p className="pb-2 text-xs leading-relaxed text-neutro-400 dark:text-t3">
            As mensalidades aparecem sozinhas a cada mês a partir dos contratos. Mudar o valor de
            uma mensalidade atualiza o contrato e vale para os meses seguintes. Clientes fixos, saídas
            fixas e colaboradores também se repetem sozinhos a cada mês, sempre com o último valor
            lançado — para parar, remova a linha.
          </p>
        </div>
      </div>
    </main>
    {tomador && (
      <DialogoTomador alvo={tomador} clientes={clientes || []} onSalvar={salvarTomador} onFechar={() => setTomador(null)} />
    )}
    </TomadorCtx.Provider>
  );
}
