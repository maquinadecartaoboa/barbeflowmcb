import { useEffect, useRef, useState } from "react";

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1500;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {value.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

const stats = [
  { num: 2600, suffix: "+", label: "clientes atendidos" },
  { num: 940, suffix: "+", label: "agendamentos realizados" },
  { num: 100, suffix: "%", label: "brasileiro" },
  { num: 14, suffix: " dias", label: "grátis para testar" },
];

export default function LandingSocialProof() {
  return (
    <section className="border-y border-white/5 bg-[#111111]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {stats.map((item) => (
          <div key={item.label}>
            <p className="text-2xl sm:text-3xl font-bold text-[#d4a843]">
              <AnimatedNumber target={item.num} suffix={item.suffix} />
            </p>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
