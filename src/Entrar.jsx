import React, { useState } from "react";
import { Btn, Campo, CAMPO, CARD, logoSalvo } from "./financeiro";
import { MARCA } from "./marca";
import Logo from "./Logo";

/* Entrada mínima para o modo Supabase (e-mail + senha). Só existe porque a RLS
   do banco exige um usuário logado. Num sistema que já tem login, apague este
   arquivo e passe o cliente Supabase já autenticado pro adaptador. */
export default function Entrar({ supabase }) {
  const [modo, setModo] = useState("entrar"); // entrar | criar
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setErro(""); setAviso(""); setEnviando(true);
    const acao = modo === "entrar"
      ? supabase.auth.signInWithPassword({ email, password: senha })
      : supabase.auth.signUp({ email, password: senha });
    const { data, error } = await acao;
    setEnviando(false);
    if (error) return setErro(error.message);
    // Com confirmação de e-mail ligada no projeto, o cadastro não abre sessão.
    if (modo === "criar" && !data.session) setAviso("Conta criada. Confirme pelo link enviado ao seu e-mail e entre.");
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutro-50 p-4 font-sans dark:bg-s1">
      <form onSubmit={enviar} className={`${CARD} w-full max-w-[360px] space-y-4 p-6`}>
        <div>
          <h1 className="sr-only">{MARCA.nome}</h1>
          {/* Quem trocou o logo em "Personalizar aparência" vê o próprio aqui. */}
          {logoSalvo()
            ? <img src={logoSalvo()} alt="" className="h-10 w-10 rounded-[10px] object-contain" />
            : <Logo className="h-7 w-auto text-neutro-950 dark:text-white" />}
          <p className="mt-3 text-[12.5px] text-neutro-500 dark:text-t3">{modo === "entrar" ? "Entre para abrir o financeiro" : "Crie sua conta"}</p>
        </div>
        <Campo rotulo="E-mail" htmlFor="entrar-email">
          <input id="entrar-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${CAMPO} w-full`} />
        </Campo>
        <Campo rotulo="Senha" htmlFor="entrar-senha" erro={erro} ajuda={aviso}>
          <input id="entrar-senha" type="password" autoComplete={modo === "entrar" ? "current-password" : "new-password"} required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} className={`${CAMPO} w-full`} />
        </Campo>
        <Btn type="submit" variant="primary" size="lg" className="w-full" disabled={enviando}>
          {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
        </Btn>
        <button
          type="button"
          onClick={() => { setModo(modo === "entrar" ? "criar" : "entrar"); setErro(""); setAviso(""); }}
          className="block w-full cursor-pointer text-center text-[12.5px] text-neutro-500 hover:text-brand-600 dark:text-t2 dark:hover:text-acc-text"
        >
          {modo === "entrar" ? "Ainda não tenho conta" : "Já tenho conta"}
        </button>
      </form>
    </div>
  );
}
