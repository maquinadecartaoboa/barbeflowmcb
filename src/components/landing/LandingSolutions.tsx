import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const solucoes = [
  {
    icon: "📅",
    title: "Agendamento 24h online",
    desc: "Seus clientes agendam sozinhos pelo celular. Sem WhatsApp. Sem ligação. Sem confusão.",
  },
  {
    icon: "💳",
    title: "Pagamento antecipado",
    desc: "Cliente paga antes e ganha desconto. Você recebe na hora. No Mercado Pago.",
  },
  {
    icon: "🛡️",
    title: "Proteção anti-falta",
    desc: "Marcou e não apareceu? Você retém uma parte e devolve o resto. Justo para todos.",
  },
  {
    icon: "📲",
    title: "WhatsApp automático",
    desc: "Confirmação, lembrete e cancelamento. Tudo automático. Zero esforço.",
  },
  {
    icon: "💰",
    title: "Financeiro completo",
    desc: "Saiba quanto cada barbeiro faturou. Caixa diário. Comissão calculada automaticamente.",
  },
  {
    icon: "🏆",
    title: "Fidelidade digital",
    desc: "Cartão de selos digital. A cada X cortes, o cliente ganha um grátis. Volta garantida.",
  },
];

export default function LandingSolutions() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 px-4 sm:px-6 bg-[#0a0a0a]" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-4">
          O modoGESTOR resolve cada uma dessas dores.
        </h2>
        <p className="text-zinc-500 text-center mb-12 text-sm sm:text-base">
          Tudo integrado. Tudo no celular.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {solucoes.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#d4a843]/30 transition-colors"
            >
              <span className="text-3xl mb-3 block">{s.icon}</span>
              <h3 className="text-base font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
