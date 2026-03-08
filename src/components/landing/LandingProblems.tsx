import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const dores = [
  {
    icon: "📱",
    title: "Passa o dia respondendo WhatsApp",
    desc: '"Tem horário amanhã?" "Que horas?" "Qual preço?" Enquanto poderia estar atendendo.',
  },
  {
    icon: "💸",
    title: "Cliente marca e não aparece",
    desc: "Cadeira vazia = dinheiro perdido. E você nem pode cobrar.",
  },
  {
    icon: "📊",
    title: "Não sabe quanto cada barbeiro fatura",
    desc: "Comissão no chute, controle no papel, e no fim do mês a conta não fecha.",
  },
  {
    icon: "🔄",
    title: "Perde cliente sem perceber",
    desc: "Aquele que vinha todo mês sumiu. E você nem notou.",
  },
];

export default function LandingProblems() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 px-4 sm:px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-12 leading-tight">
          Se alguma dessas situações é sua rotina,
          <br />
          <span className="text-[#d4a843]">você precisa do modoGESTOR.</span>
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {dores.map((d, i) => (
            <motion.div
              key={d.title}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-colors"
            >
              <span className="text-3xl mb-3 block">{d.icon}</span>
              <h3 className="text-base font-semibold text-white mb-2">{d.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{d.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
