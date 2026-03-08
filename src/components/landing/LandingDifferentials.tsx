import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const diferenciais = [
  {
    icon: "💰",
    tag: "EXCLUSIVO",
    title: "Desconto Inteligente",
    desc: "Ofereça desconto para quem paga online. Mais pré-pagamentos = menos faltas = mais dinheiro certo.",
  },
  {
    icon: "🛡️",
    tag: "EXCLUSIVO",
    title: "Proteção Anti-Falta",
    desc: "Cliente não apareceu? Você retém 30% automaticamente e devolve o resto. Sem constrangimento. Sem prejuízo.",
  },
  {
    icon: "🏆",
    tag: "ILIMITADO",
    title: "Cartão Fidelidade Digital",
    desc: "Seus clientes acumulam selos a cada corte. Completou? Ganha um serviço grátis. Volta garantida.",
  },
  {
    icon: "📊",
    tag: "NOVO",
    title: "Resumo Semanal no WhatsApp",
    desc: "Todo sábado às 20h você recebe um resumo da semana: atendimentos, faturamento e performance da equipe.",
  },
];

export default function LandingDifferentials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 px-4 sm:px-6 bg-[#0a0a0a]" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-3">
          Funcionalidades que nenhum outro sistema oferece.
        </h2>
        <p className="text-zinc-500 text-center mb-12 text-sm sm:text-base">
          Criadas para fazer sua barbearia faturar mais, não só organizar melhor.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {diferenciais.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#d4a843]/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{d.icon}</span>
                <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20">
                  {d.tag}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{d.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{d.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
