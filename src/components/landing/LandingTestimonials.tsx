import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const depoimentos = [
  {
    text: "Antes eu ficava o dia todo no WhatsApp tentando organizar a agenda. Agora meus clientes agendam sozinhos e eu recebo antes do atendimento. Mudou meu negócio.",
    name: "Adriano Alves",
    role: "Barbearia Adriano Alves",
    city: "Feira de Santana/BA",
  },
  {
    text: "O sistema é simples de usar. Meus barbeiros se adaptaram rápido e o controle financeiro ficou muito mais claro. Agora sei exatamente quanto cada um fatura.",
    name: "Wendson",
    role: "WS Barbearia",
    city: "Feira de Santana/BA",
  },
];

export default function LandingTestimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 px-4 sm:px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-12">
          Quem usa, <span className="text-[#d4a843]">recomenda.</span>
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {depoimentos.map((d, i) => (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6"
            >
              <span className="text-4xl text-[#d4a843]/40 leading-none block mb-3">"</span>
              <p className="text-sm text-zinc-300 leading-relaxed mb-4">{d.text}</p>
              <div>
                <p className="text-sm font-semibold text-white">{d.name}</p>
                <p className="text-xs text-zinc-500">
                  {d.role} · {d.city}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
