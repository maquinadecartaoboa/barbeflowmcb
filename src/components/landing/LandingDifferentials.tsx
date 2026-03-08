import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, Shield, Trophy } from "lucide-react";

const diferenciais = [
  {
    tag: "EXCLUSIVO",
    icon: Sparkles,
    title: "Desconto Inteligente",
    desc: "Ofereça desconto para quem paga online antes do atendimento. Mais pré-pagamentos = menos faltas = mais dinheiro certo no caixa.",
    align: "left" as const,
  },
  {
    tag: "EXCLUSIVO",
    icon: Shield,
    title: "Proteção Anti-Falta",
    desc: "Cliente não apareceu? O sistema retém automaticamente uma parte do valor pago e devolve o resto. Sem constrangimento. Sem prejuízo.",
    align: "right" as const,
  },
  {
    tag: "ILIMITADO",
    icon: Trophy,
    title: "Cartão Fidelidade Digital",
    desc: "Seus clientes acumulam selos a cada corte. Completou o cartão? Ganha um serviço grátis. Volta garantida.",
    align: "left" as const,
  },
];

export default function LandingDifferentials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref}>
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-lg mx-auto">
            Funcionalidades que só o modoGESTOR oferece.
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 mt-4 max-w-md mx-auto">
            Criadas para fazer sua barbearia faturar mais — não só organizar melhor.
          </p>
        </motion.div>

        {/* Feature rows */}
        <div className="space-y-16 sm:space-y-24 mt-16 sm:mt-20">
          {diferenciais.map((d, i) => {
            const Icon = d.icon;
            const isRight = d.align === "right";
            return (
              <motion.div
                key={d.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.15 }}
                className={`flex flex-col ${isRight ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-8 lg:gap-16`}
              >
                {/* Text side */}
                <div className="flex-1 max-w-md lg:max-w-none">
                  <span className="inline-block text-[10px] font-bold text-[#d4a843] bg-[#d4a843]/10 px-3 py-1 rounded-full uppercase tracking-[0.15em] mb-5">
                    {d.tag}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white leading-tight mb-4">
                    {d.title}
                  </h3>
                  <p className="text-zinc-400 text-base leading-relaxed max-w-md">
                    {d.desc}
                  </p>
                </div>

                {/* Visual placeholder */}
                <div className="flex-1 w-full max-w-md lg:max-w-none">
                  <div className="relative aspect-[4/3] rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-center overflow-hidden group">
                    {/* Subtle glow */}
                    <div className="absolute -inset-4 bg-[#d4a843]/[0.02] rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="relative flex flex-col items-center gap-3 text-zinc-600">
                      <Icon className="h-10 w-10 text-[#d4a843]/30" />
                      <span className="text-xs tracking-wider uppercase">Screenshot em breve</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
