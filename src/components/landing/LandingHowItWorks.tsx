import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { getDashboardUrl } from "@/lib/hostname";

const passos = [
  {
    num: "01",
    title: "Crie sua conta",
    desc: "Preencha seus dados, escolha seu plano e comece a testar. 14 dias grátis.",
  },
  {
    num: "02",
    title: "Configure seus serviços",
    desc: "Adicione serviços, horários e conecte o Mercado Pago. A gente guia você.",
  },
  {
    num: "03",
    title: "Compartilhe seu link",
    desc: "Mande para seus clientes por WhatsApp, Instagram ou onde preferir. Pronto.",
  },
];

export default function LandingHowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref} id="como-funciona">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 sm:mb-20"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Pronto para receber clientes em{" "}
            <span className="text-[#d4a843]">10 minutos.</span>
          </h2>
        </motion.div>

        {/* Steps — horizontal desktop, timeline mobile */}
        <div className="relative grid sm:grid-cols-3 gap-12 sm:gap-8">
          {/* Desktop connector line */}
          <div className="hidden sm:block absolute top-8 left-[16%] right-[16%] border-t border-dashed border-white/[0.08]" />

          {/* Mobile timeline line */}
          <div className="sm:hidden absolute left-[18px] top-4 bottom-4 w-px bg-white/[0.06]" />

          {passos.map((p, i) => (
            <motion.div
              key={p.num}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.2 }}
              className="relative sm:text-center pl-12 sm:pl-0"
            >
              {/* Big watermark number */}
              <span className="absolute sm:relative top-0 left-0 sm:mx-auto sm:block text-5xl sm:text-6xl font-extrabold text-[#d4a843]/[0.12] leading-none select-none pointer-events-none sm:mb-4">
                {p.num}
              </span>
              <h3 className="text-base sm:text-[15px] font-semibold text-white mb-2 mt-1 sm:mt-0">
                {p.title}
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-[280px] sm:mx-auto">
                {p.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center mt-16"
        >
          <a href={getDashboardUrl("/app/register")}>
            <button className="px-8 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-xl text-base transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.35)] hover:translate-y-[-1px]">
              Começar agora — é grátis
            </button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
