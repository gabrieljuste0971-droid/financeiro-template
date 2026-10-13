import React, { useId, useRef, useState, useEffect } from "react";
import { useEstreito } from "./useMediaQuery";

/* ──────────────────────────────────────────────────────────────────────────
   AreaChart — gráfico de área/linha comparativo, interativo.

   Curvas suaves (Catmull-Rom → Bézier), gradiente sob a série principal,
   grade, crosshair e tooltip que seguem o ponteiro. Usado no fluxo de caixa
   do Financeiro; serve a qualquer série mensal.

   Animações:
   · Resposta imediata — o hover atualiza 1:1 com o ponteiro, sem latência.
   · Comportamento por mola — o marcador NÃO salta entre meses; ele desliza
     via mola criticamente amortizada (response ~0.28s), interrompível: ao
     mudar de alvo no meio do caminho a velocidade é carregada, sem "parede".
   · Materialização — a linha se desenha e a área surge (blur/opacidade) no
     mount, em vez de um corte seco.
   · Reduced-motion — tudo vira corte/fade curto, sem deslize nem desenho.
   ────────────────────────────────────────────────────────────────────────── */

/* O viewBox é escolhido pela largura da tela: num card de ~340px o viewBox de
   720 encolheria a fonte 10 para menos de 5px reais. O viewBox estreito mantém
   rótulos legíveis (~10px na tela) sem media query no SVG. */
const GEO = {
  amplo:    { W: 720, H: 250, padL: 12, padR: 12, padT: 16, padB: 30, fonte: 10 },
  estreito: { W: 360, H: 208, padL: 10, padR: 10, padT: 14, padB: 24, fonte: 11 },
};

const semMovimento = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** true após o primeiro paint — dispara as transições de entrada. */
function useMontado() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return m;
}

/**
 * Mola criticamente amortizada (damping ratio 1.0), integrada por rAF.
 * `response` é o tempo aproximado até assentar, à la Apple (não é "duração").
 * Devolve [valor, snap] — snap posiciona sem animar (uso: 1ª entrada do hover).
 * Ao retomar um novo alvo mid-flight, parte da posição/velocidade atuais.
 */
function useMola(alvo, response = 0.28) {
  const [val, setVal] = useState(alvo);
  const est = useRef({ pos: alvo, vel: 0, raf: 0 });

  useEffect(() => {
    if (semMovimento()) { est.current.pos = alvo; est.current.vel = 0; setVal(alvo); return; }
    const omega = (2 * Math.PI) / response;
    let last = performance.now();
    const passo = (t) => {
      const dt = Math.min((t - last) / 1000, 1 / 30); last = t;
      const e = est.current;
      // aceleração de mola crítica: -2ωv - ω²(x-alvo)
      const a = -2 * omega * e.vel - omega * omega * (e.pos - alvo);
      e.vel += a * dt;
      e.pos += e.vel * dt;
      if (Math.abs(e.pos - alvo) < 0.0005 && Math.abs(e.vel) < 0.0005) {
        e.pos = alvo; e.vel = 0; setVal(alvo); return;
      }
      setVal(e.pos);
      e.raf = requestAnimationFrame(passo);
    };
    est.current.raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(est.current.raf);
  }, [alvo, response]);

  const snap = (v) => { est.current.pos = v; est.current.vel = 0; setVal(v); };
  return [val, snap];
}

/** Catmull-Rom → cúbicas de Bézier: curva suave passando por todos os pontos. */
function linhaSuave(pts) {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
  const d = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

export default function AreaChart({
  labels,
  series,                 // [{ key, label, values:number[], color, area?, dashed? }]
  formatValor = (v) => String(v),
  formatEixo = (v) => String(v),
  oculto = false,
  vazioTexto,
  alturaAmpla,
}) {
  const uid = useId().replace(/[:]/g, "");
  const montado = useMontado();
  const [hover, setHover] = useState(null); // índice inteiro ou null
  const escondido = useRef(true);

  const estreito = useEstreito();
  const geo = estreito ? GEO.estreito : GEO.amplo;
  // alturaAmpla: deixa o gráfico mais "deitado" no card largo, pra tela caber sem rolar.
  const { W, padL, padR, padT, padB, fonte } = geo;
  const H = !estreito && alturaAmpla ? alturaAmpla : geo.H;
  const plotW = W - padL - padR, plotH = H - padT - padB;

  /* Quanto o SVG está ampliado na tela (largura real ÷ largura do viewBox).
     As linhas usam traço de espessura fixa (non-scaling-stroke) e, nesse modo,
     o Chrome mede o tracejado em pixels de tela sem reescalar o `pathLength`:
     num card mais largo que o viewBox, um traço de "1" cobre só 1/escala da
     curva e a linha acaba antes do último mês. O traço acompanha a escala
     (nunca menor que 1) pra linha fechar inteira em qualquer largura. */
  const svgRef = useRef(null);
  const [escala, setEscala] = useState(1);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setEscala(el.getBoundingClientRect().width / W || 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);
  const traco = Math.max(1, escala) * 1.02;

  const n = labels.length;
  const px = (i) => padL + (n > 1 ? (i / (n - 1)) : 0.5) * plotW;
  // Com 12 meses em tela estreita os rótulos colidem — mostra um sim, um não.
  const passoRotulo = estreito && n > 7 ? 2 : 1;

  const maxY = Math.max(1, ...series.flatMap((s) => s.values));
  const py = (v) => padT + (1 - v / maxY) * plotH;
  const temValores = series.some((s) => s.values.some((v) => v > 0));

  // marcador desliza entre meses via mola (índice fracionário)
  const [springX, snapX] = useMola(hover ?? 0);
  const idxVis = hover != null ? hover : Math.round(springX);

  /** y na curva para um índice fracionário (interpola linear entre vizinhos). */
  const valorEm = (vals, xf) => {
    const i0 = Math.max(0, Math.min(n - 1, Math.floor(xf)));
    const i1 = Math.min(n - 1, i0 + 1);
    const f = xf - i0;
    return vals[i0] + (vals[i1] - vals[i0]) * f;
  };

  function aoMover(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    const relPlot = (rel * W - padL) / plotW;
    const i = Math.max(0, Math.min(n - 1, Math.round(relPlot * (n - 1))));
    if (escondido.current) { snapX(i); escondido.current = false; }
    setHover(i);
  }
  function aoSair() { setHover(null); escondido.current = true; }
  // No toque não existe "pointerleave" ao soltar o dedo: o crosshair só some
  // quando o gesto termina.
  const aoSoltar = (e) => { if (e.pointerType !== "mouse") aoSair(); };

  const grade = [0, 0.25, 0.5, 0.75, 1];
  const leftPct = (px(springX) / W) * 100;

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        // No mobile o gesto vertical continua rolando a página; só o arrasto
        // horizontal é capturado pra varrer os meses.
        className={`w-full ${estreito ? "touch-pan-y" : "touch-none"}`}
        onPointerMove={aoMover}
        onPointerLeave={aoSair}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        <defs>
          {series.filter((s) => s.area).map((s) => (
            <linearGradient key={s.key} id={`area-${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* grade horizontal + eixo Y */}
        {grade.map((g) => {
          const y = padT + g * plotH;
          const val = maxY * (1 - g);
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} className="stroke-neutro-100 dark:stroke-white/[0.06]" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text x={padL} y={y - 4} className="fill-neutro-400 dark:fill-neutro-500" fontSize={fonte}>
                {oculto ? "•••" : formatEixo(val)}
              </text>
            </g>
          );
        })}

        {/* crosshair — desliza com a mola */}
        {hover != null && (
          <line
            x1={px(springX)} y1={padT} x2={px(springX)} y2={padT + plotH}
            className="stroke-neutro-300 dark:stroke-neutro-600" strokeWidth="1" strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* áreas (materializam: opacidade + leve subida) */}
        {series.filter((s) => s.area).map((s) => {
          const pts = s.values.map((v, i) => ({ x: px(i), y: py(v) }));
          const d = `${linhaSuave(pts)} L ${px(n - 1)} ${padT + plotH} L ${px(0)} ${padT + plotH} Z`;
          return (
            <path
              key={s.key} d={d} fill={`url(#area-${uid}-${s.key})`}
              style={{
                opacity: montado ? 1 : 0,
                transform: montado ? "translateY(0)" : "translateY(8px)",
                transition: "opacity .9s ease .25s, transform .9s cubic-bezier(.22,1,.36,1) .25s",
              }}
            />
          );
        })}

        {/* linhas — desenham do início ao fim no mount */}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => ({ x: px(i), y: py(v) }));
          return (
            <path
              key={s.key} d={linhaSuave(pts)} fill="none" stroke={s.color}
              strokeWidth={s.area ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={s.dashed ? "5 4" : traco}
              pathLength="1"
              vectorEffect="non-scaling-stroke"
              style={{
                strokeDashoffset: montado || s.dashed ? 0 : traco,
                opacity: montado ? 1 : (s.dashed ? 0 : 1),
                transition: `stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1) ${si * 0.12}s, opacity .8s ease ${si * 0.12}s`,
              }}
            />
          );
        })}

        {/* marcadores no ponto sob o cursor — deslizam com a mola */}
        {hover != null && series.map((s) => (
          <circle
            key={s.key}
            cx={px(springX)} cy={py(valorEm(s.values, springX))}
            r={s.area ? 4.5 : 3.5} fill={s.color} stroke="#fff"
            strokeWidth={s.area ? 2 : 1.5} className="dark:stroke-neutro-900"
          />
        ))}

        {/* rótulos do eixo X */}
        {labels.map((m, i) => (
          i % passoRotulo === 0 && (
            <text key={i} x={px(i)} y={H - 7} textAnchor="middle" className="fill-neutro-400 dark:fill-neutro-500" fontSize={fonte}>{m}</text>
          )
        ))}
      </svg>

      {/* tooltip (HTML para texto nítido) — segue a mola e materializa */}
      {hover != null && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-xl bg-neutro-900 px-3 py-2 text-white shadow-lg dark:bg-s4 dark:ring-1 dark:ring-line"
          style={{
            // margem maior no estreito: o balão ocupa quase metade do card
            left: `${Math.min(estreito ? 74 : 88, Math.max(estreito ? 26 : 12, leftPct))}%`,
            transition: "opacity .18s ease, transform .18s cubic-bezier(.22,1,.36,1)",
          }}
        >
          <div className="mb-1 text-[11px] font-medium text-white/60">{labels[idxVis]}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 text-[12px]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="whitespace-nowrap text-white/70">{s.label}</span>
              <span className="ml-auto pl-3 font-semibold tabular-nums">
                {oculto ? "R$ ••••" : formatValor(s.values[idxVis])}
              </span>
            </div>
          ))}
        </div>
      )}

      {!temValores && vazioTexto && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-white/80 px-3 py-1 text-[12px] text-neutro-500 backdrop-blur dark:bg-s2/80 dark:text-t2">
            {vazioTexto}
          </span>
        </div>
      )}
    </div>
  );
}
