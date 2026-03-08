import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const depoimentos = [
  {
    text: "Antes eu ficava o dia todo no WhatsApp tentando organizar a agenda. Agora meus clientes agendam sozinhos e eu recebo antes do atendimento. Mudou meu negócio.",
    name: "Adriano Alves",
    business: "Barbearia Adriano Alves",
    city: "Feira de Santana/BA",
    stats: "2.479 clientes · 439 agendamentos",
    plan: "Plano Ilimitado",
    featured: true,
  },
  {
    text: "O controle financeiro ficou muito mais claro. Agora sei exatamente quanto cada barbeiro fatura e a comissão sai certinha no final do mês.",
    name: "Wendson",
    business: "WS Barbearia",
    city: "Feira de Santana/BA",
    stats: "196 clientes · 405 agendamentos",
    plan: "Plano Profissional",
    featured: false,
  },
];

export default function LandingTestimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const featured = depoimentos.find((d) => d.featured);
  const others = depoimentos.filter((d) => !d.featured);

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8" ref={ref}>
      <div className="max-w-[900px] mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            Depoimentos
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Quem usa, <span className="text-[#d4a843]">recomenda.</span>
          </h2>
        </motion.div>

        {/* Featured testimonial */}
        {featured && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10 lg:p-12 mb-5"
          >
            {/* Decorative quote */}
            <span className="absolute top-4 left-6 text-[80px] leading-none text-[#d4a843]/[0.08] font-serif select-none pointer-events-none">
              "
            </span>

            <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed italic relative z-10 mb-8 max-w-2xl">
              "{featured.text}"
            </p>

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-11 h-11 rounded-full bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center text-[#d4a843] text-sm font-bold shrink-0">
                {featured.name.charAt(0)}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{featured.name}</p>
                <p className="text-zinc-500 text-xs">
                  {featured.business} · {featured.city}
                </p>
                <p className="text-[#d4a843] text-xs mt-0.5 font-medium">
                  {featured.stats} · {featured.plan}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Other testimonials */}
        {others.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-5">
            {others.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 hover:border-white/[0.1] transition-colors duration-300"
              >
                <p className="text-[15px] text-zinc-300 leading-relaxed italic mb-6">
                  "{d.text}"
                </p>

                <div className="flex items-center gap-3 pt-5 border-t border-white/[0.04]">
                  <div className="w-9 h-9 rounded-full bg-[#d4a843]/10 flex items-center justify-center text-[#d4a843] text-xs font-bold">
                    {d.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{d.name}</p>
                    <p className="text-xs text-zinc-500">
                      {d.business} · {d.city}
                    </p>
                    <p className="text-[#d4a843] text-[11px] mt-0.5 font-medium">
                      {d.stats} · {d.plan}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
