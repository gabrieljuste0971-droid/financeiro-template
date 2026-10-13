import { useEffect, useState } from "react";

/**
 * Assina uma media query e devolve se ela casa agora. Usado onde o layout não
 * dá pra resolver só no CSS — o AreaChart, por exemplo, precisa trocar o
 * viewBox no mobile pra que os rótulos do eixo não fiquem microscópicos.
 *
 * Prefira classes responsivas do Tailwind sempre que der; isto é a exceção.
 */
export function useMediaQuery(query) {
  const [casa, setCasa] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const aoMudar = (e) => setCasa(e.matches);
    setCasa(mq.matches);
    mq.addEventListener("change", aoMudar);
    return () => mq.removeEventListener("change", aoMudar);
  }, [query]);

  return casa;
}

/** Atalho: telas estreitas (abaixo do breakpoint `sm` do Tailwind). */
export const useEstreito = () => useMediaQuery("(max-width: 639px)");
