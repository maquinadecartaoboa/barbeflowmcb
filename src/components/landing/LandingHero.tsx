import { useEffect, useRef, useState, useCallback } from "react";
import { getDashboardUrl } from "@/lib/hostname";
import { motion } from "framer-motion";

const rotatingTexts = [
  "faturar mais.",
  "acabar com as faltas.",
  "lotar a agenda.",
  "receber antecipado.",
  "fidelizar clientes.",
  "parar de perder tempo.",
];

export default function LandingHero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background: `
          radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,168,67,0.05) 0%, transparent 50%),
          #050505
        `,
      }}
    >
      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8 pt-28 sm:pt-36 pb-12 w-full">
        <div className="flex flex-col items-center text-center">
          {/* Heading */}

          {/* Heading with typewriter */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold leading-[1.06] tracking-[-0.03em] mb-6 max-w-[780px]"
            aria-label={`Sua barbearia pode ${rotatingTexts.join(", ")}`}
          >
            <span className="text-white">Sua barbearia pode</span>
            <br />
            <span className="min-h-[1.15em] inline-block">
              <TypewriterText />
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="text-base sm:text-lg md:text-xl text-zinc-400 mb-10 max-w-[460px] leading-relaxed font-normal"
          >
            Agendamento online, pagamento antecipado e gestão completa. Sem complicação.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="mb-4"
          >
            <a href={getDashboardUrl("/app/login")}>
              <button className="px-8 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-xl text-base transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.35)] hover:translate-y-[-1px]">
                Começar grátis — 14 dias
              </button>
            </a>
          </motion.div>

          {/* Microcopy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="text-xs text-zinc-600 mb-16 tracking-wide"
          >
            Teste grátis por 14 dias · Cancele quando quiser
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-wrap justify-center gap-6 sm:gap-10"
          >
            <StatItem number={2600} suffix="+" label="clientes atendidos" />
            <StatItem number={27} prefix="R$" suffix="mil" label="processados" highlight />
            <StatItem number={940} suffix="+" label="agendamentos" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Fade rotating text ── */
function TypewriterText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % rotatingTexts.length);
        setVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="bg-gradient-to-r from-[#d4a843] via-[#e8c066] to-[#d4a843] bg-clip-text text-transparent transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {rotatingTexts[currentIndex]}
    </span>
  );
}

/* ── Stat item with counter ── */
function StatItem({
  number,
  prefix = "",
  suffix = "",
  label,
  highlight = false,
}: {
  number: number;
  prefix?: string;
  suffix?: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center min-w-0 flex-1">
      <p
        className={`text-base sm:text-lg md:text-xl font-bold tracking-tight ${highlight ? "text-[#d4a843]" : "text-white"}`}
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        {prefix && <span className="text-[0.8em] mr-0.5">{prefix}</span>}
        <CountUp target={number} />
        {suffix && <span className="text-[0.8em] ml-0.5">{suffix}</span>}
      </p>
      <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.12em] mt-0.5 font-medium">{label}</p>
    </div>
  );
}

/* ── Counter animation ── */
function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1400;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{value.toLocaleString("pt-BR")}</span>;
}
