import { getDashboardUrl } from "@/lib/hostname";
import { trackViewContent } from "@/lib/tracking";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

export default function LandingFinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const handleClick = () => {
    trackViewContent("cta_clicked");
    document.getElementById("precos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="py-24 sm:py-32 px-5 sm:px-8 relative"
      ref={ref}
      style={{
        background:
          "linear-gradient(to bottom, transparent 0%, rgba(212,168,67,0.03) 40%, rgba(212,168,67,0.03) 60%, transparent 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-[600px] mx-auto text-center"
      >
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
          Sua barbearia merece uma
          <br />
          <span className="text-[#d4a843]">gestão profissional.</span>
        </h2>

        <p className="text-zinc-400 mb-8 text-base sm:text-lg">
          Comece agora. É grátis por 14 dias.
        </p>

        <button
          onClick={handleClick}
          className="group inline-flex items-center gap-2 px-10 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-bold rounded-xl text-lg transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.35)] hover:translate-y-[-1px]"
        >
          Criar minha conta grátis
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </button>

        <p className="text-xs text-zinc-600 mt-5 tracking-wide">
          Sem compromisso · Cancele quando quiser
        </p>
      </motion.div>
    </section>
  );
}
