import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MessageSquare, UserX, FileQuestion, UserMinus } from "lucide-react";

const dores = [
  {
    icon: MessageSquare,
    title: "O dia todo no WhatsApp",
    desc: '"Tem horário amanhã?" "Que horas?" "Qual preço?" — você responde 50 vezes por dia enquanto poderia estar atendendo.',
    span: "sm:col-span-7",
  },
  {
    icon: UserX,
    title: "Cliente marca e não aparece",
    desc: "Cadeira vazia, horário perdido, dinheiro que não volta. E você não tem como cobrar.",
    span: "sm:col-span-5",
  },
  {
    icon: FileQuestion,
    title: "Controle financeiro no escuro",
    desc: "Não sabe quanto cada barbeiro faturou, comissão no chute, e no fim do mês a conta não fecha.",
    span: "sm:col-span-5",
  },
  {
    icon: UserMinus,
    title: "Perde cliente sem perceber",
    desc: "Aquele que vinha todo mês sumiu. Você não tem como saber quem parou de voltar — até que é tarde demais.",
    span: "sm:col-span-7",
  },
];

export default function LandingProblems() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref}>
      <div className="max-w-[1100px] mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14 sm:mb-16 max-w-2xl"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
            <span className="text-white">Se alguma dessas situações é a sua rotina,</span>
            <br />
            <span className="text-zinc-400">a gente precisa conversar.</span>
          </h2>
        </motion.div>

        {/* Asymmetric grid: 12-col base */}
        <div className="grid sm:grid-cols-12 gap-3 sm:gap-4">
          {dores.map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.div
                key={d.title}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.12 + i * 0.1 }}
                className={`${d.span} group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 hover:border-white/[0.12] transition-all duration-300 overflow-hidden`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5 text-zinc-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{d.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{d.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
