import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { getDashboardUrl } from "@/lib/hostname";

export default function LandingMidCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="relative px-5 sm:px-8" ref={ref}>
      {/* Top line */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

      <div
        className="py-20 sm:py-28 relative"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(212,168,67,0.02) 0%, transparent 70%)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center max-w-xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
            Sua barbearia merece{" "}
            <span className="text-[#d4a843]">faturar mais.</span>
            <br />
            Comece com 14 dias grátis.
          </h2>

          <div className="mt-8">
            <a href={getDashboardUrl("/app/login")}>
              <button className="px-8 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-xl text-base transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.35)] hover:translate-y-[-1px]">
                Criar minha conta grátis
              </button>
            </a>
          </div>

          <p className="text-xs text-zinc-600 mt-4 tracking-wide">
            Sem compromisso · Cancele quando quiser
          </p>
        </motion.div>
      </div>

      {/* Bottom line */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
    </section>
  );
}
