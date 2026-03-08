import { motion } from "framer-motion";
import { getDashboardUrl } from "@/lib/hostname";
import mobileMockup from "@/assets/mobile-mockup.png";

export default function LandingHero() {
  return (
    <section className="relative pt-28 sm:pt-36 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-white">Sua barbearia pode</span>
            <br />
            <span className="text-[#d4a843]">faturar mais.</span>
            <br />
            <span className="text-zinc-400 text-[0.75em]">O modoGESTOR mostra como.</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 mb-8 max-w-lg leading-relaxed">
            Agendamento online, pagamento antecipado, proteção contra faltas e gestão completa.
            Tudo no celular, sem complicação.
          </p>

          <a href={getDashboardUrl("/app/login")}>
            <button className="w-full sm:w-auto px-8 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-black font-bold rounded-xl text-base transition-transform duration-200 hover:scale-105 shadow-lg shadow-[#d4a843]/20">
              Começar grátis — 14 dias sem custo
            </button>
          </a>

          <p className="text-xs text-zinc-500 mt-4">
            Sem cartão para testar · Cancele quando quiser
          </p>
        </motion.div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center lg:justify-end"
        >
          <div className="relative w-[260px] sm:w-[300px]">
            <div className="absolute -inset-8 bg-[#d4a843]/10 rounded-full blur-3xl" />
            <img
              src={mobileMockup}
              alt="modoGESTOR no celular"
              className="relative w-full drop-shadow-2xl"
              loading="eager"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
