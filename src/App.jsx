import React, { useEffect, useMemo, useState } from "react";
import { Moon, Sun, LogOut, X } from "lucide-react";
import Financeiro, {
  useFinanceiro, criarAdaptadorLocal, criarAdaptadorSupabase,
  ToolbarButton, PersonalizarAparencia, useLogo, aplicarTema, temaSalvo,
} from "./financeiro";
import { MARCA } from "./marca";
import { dadosDeExemplo } from "./demo";
import Entrar from "./Entrar";

/* Casca do app — só o mínimo em volta da tela: escolher onde os dados moram,
   trocar o tema, mostrar erro. Num sistema seu, isto aqui é substituído pelo
   seu próprio layout; o que interessa levar é a pasta `financeiro/`. */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
/** Com as duas variáveis no .env os dados vão pro Supabase; sem elas, ficam
 *  no navegador. */
const USA_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY);

const CTRL_ICONE = "h-10 w-10 justify-center max-md:px-0 md:h-9 md:w-9 md:px-0";

export default function App() {
  return USA_SUPABASE ? <ComSupabase /> : <Local />;
}

/* ── Dados no navegador ─────────────────────────────────────────────────── */
function Local() {
  // Tire `inicial` para a primeira abertura vir vazia, sem dados de exemplo.
  const adaptador = useMemo(() => criarAdaptadorLocal({ inicial: dadosDeExemplo }), []);
  return <Tela adaptador={adaptador} />;
}

/* ── Dados no Supabase (exige login) ────────────────────────────────────── */
function ComSupabase() {
  const [supabase, setSupabase] = useState(null);
  const [sessao, setSessao] = useState(undefined); // undefined = ainda verificando

  useEffect(() => {
    let vivo = true;
    let desligar = () => {};
    // Importado sob demanda: quem fica no modo local não carrega a biblioteca.
    import("@supabase/supabase-js").then(({ createClient }) => {
      if (!vivo) return;
      const cliente = createClient(SUPABASE_URL, SUPABASE_KEY);
      setSupabase(cliente);
      cliente.auth.getSession().then(({ data }) => vivo && setSessao(data.session ?? null));
      const { data } = cliente.auth.onAuthStateChange((_evento, s) => vivo && setSessao(s ?? null));
      desligar = () => data.subscription.unsubscribe();
    });
    return () => { vivo = false; desligar(); };
  }, []);

  // O adaptador só muda quando troca o usuário — não a cada renovação de token.
  const usuarioId = sessao?.user?.id || null;
  const adaptador = useMemo(
    () => (supabase && usuarioId ? criarAdaptadorSupabase(supabase) : null),
    [supabase, usuarioId]
  );

  if (!supabase || sessao === undefined) return <Aviso>Carregando…</Aviso>;
  if (!adaptador) return <Entrar supabase={supabase} />;
  return <Tela adaptador={adaptador} aoSair={() => supabase.auth.signOut()} />;
}

function Aviso({ children }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-neutro-50 text-[13px] text-neutro-500 dark:bg-s1 dark:text-t2">
      {children}
    </div>
  );
}

/* ── A tela em si ───────────────────────────────────────────────────────── */
function Tela({ adaptador, aoSair }) {
  const fin = useFinanceiro(adaptador);
  const [tema, setTema] = useState(() => temaSalvo(MARCA.temaPadrao));
  const [demo, setDemo] = useState(() => !!adaptador.ehDemo?.());
  // Logo enviado pelo usuário em "Personalizar aparência"; sem isso, o da marca.
  const logo = useLogo(MARCA.logo);

  const alternarTema = () => setTema(aplicarTema(tema === "escuro" ? "claro" : "escuro"));

  const comecarDoZero = async () => {
    if (!window.confirm("Apagar os dados de exemplo e começar vazio?")) return;
    adaptador.comecarDoZero();
    await fin.recarregar();
    setDemo(false);
  };
  const manterDados = () => { adaptador.manterDados(); setDemo(false); };

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden font-sans text-neutro-800 antialiased dark:text-t1">
      {demo && (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-brand-500/10 px-4 py-2 text-[12.5px] text-brand-700 dark:bg-acc/[.12] dark:text-acc-text">
          <span>Você está vendo dados de exemplo.</span>
          <button onClick={comecarDoZero} className="cursor-pointer font-semibold underline underline-offset-2 hover:no-underline">Começar do zero</button>
          <button onClick={manterDados} className="cursor-pointer underline underline-offset-2 hover:no-underline">Ficar com estes</button>
        </div>
      )}
      {fin.erro && (
        <div role="alert" className="flex shrink-0 items-center justify-center gap-2 bg-rose-500/10 px-4 py-2 text-[12.5px] text-rose-700 dark:bg-bad/[.14] dark:text-bad-text">
          <span>{fin.erro}</span>
          <button onClick={fin.limparErro} aria-label="Fechar aviso" className="cursor-pointer rounded p-0.5 hover:bg-rose-500/10"><X size={14} /></button>
        </div>
      )}
      <Financeiro
        {...fin}
        titulo={MARCA.titulo}
        subtitulo={MARCA.subtitulo}
        logo={logo}
        acoes={
          <>
            <PersonalizarAparencia marca={MARCA} className={CTRL_ICONE} />
            <ToolbarButton
              icon={tema === "escuro" ? Sun : Moon}
              onClick={alternarTema}
              title={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
              aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
              className={CTRL_ICONE}
            />
            {aoSair && <ToolbarButton icon={LogOut} onClick={aoSair} title="Sair" aria-label="Sair" className={CTRL_ICONE} />}
          </>
        }
      />
    </div>
  );
}
