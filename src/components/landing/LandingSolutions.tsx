import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Calendar,
  CreditCard,
  Shield,
  MessageCircle,
  BarChart3,
  Award,
} from "lucide-react";

const beneficios = [
  {
    icon: Calendar,
    title: "Agendamento 24h",
    desc: "Seus clientes agendam sozinhos pelo celular. Sem WhatsApp. Sem ligação.",
    highlight: false,
  },
  {
    icon: CreditCard,
    title: "Pagamento antecipado",
    desc: "Cliente paga antes via Mercado Pago. Você recebe na hora.",
    highlight: true,
  },
  {
    icon: Shield,
    title: "Proteção anti-falta",
    desc: "Não apareceu? Você retém parte do valor automaticamente.",
    highlight: true,
  },
  {
    icon: MessageCircle,
    title: "WhatsApp automático",
    desc: "Confirmação e lembrete sem você tocar no celular.",
    highlight: false,
  },
  {
    icon: BarChart3,
    title: "Financeiro completo",
    desc: "Quanto cada barbeiro faturou. Caixa diário. Comissão calculada.",
    highlight: false,
  },
  {
    icon: Award,
    title: "Fidelidade digital",
    desc: "Cartão de selos digital. Completou? Ganha um grátis.",
    highlight: false,
  },
];

export default function LandingSolutions() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref} id="solucoes">
      {/* Warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#d4a843]/[0.015] to-transparent pointer-events-none" />

      <div className="max-w-[1100px] mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16 sm:mb-20"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-xl mx-auto">
            Cada uma dessas dores tem solução.
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 mt-4">E ela cabe no seu celular.</p>
        </motion.div>

        {/* 3-col grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {beneficios.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                className={`group relative rounded-2xl p-6 sm:p-7 transition-all duration-300 overflow-hidden border ${
                  b.highlight
                    ? "border-[#d4a843]/20 bg-[#d4a843]/[0.03] hover:border-[#d4a843]/30"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                } hover:scale-[1.02]`}
              >
                {/* Badge */}
                {b.highlight && (
                  <span className="absolute top-5 right-5 text-[10px] font-bold text-[#d4a843] bg-[#d4a843]/10 px-2 py-0.5 rounded-full tracking-wider">
                    EXCLUSIVO
                  </span>
                )}

                {/* Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    b.highlight
                      ? "bg-[#d4a843]/[0.1] border border-[#d4a843]/[0.15] text-[#d4a843]"
                      : "bg-white/[0.04] border border-white/[0.06] text-zinc-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="text-base font-semibold text-white mt-4">{b.title}</h3>
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{b.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
