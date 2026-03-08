import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

const comparacao = [
  { feature: "Agendamento online", modogestor: true, outros: true },
  { feature: "WhatsApp automático", modogestor: true, outros: "partial" },
  { feature: "Pagamento online (Mercado Pago)", modogestor: true, outros: false, exclusive: true },
  { feature: "Proteção anti-falta", modogestor: true, outros: false, exclusive: true },
  { feature: "Desconto inteligente", modogestor: true, outros: false, exclusive: true },
  { feature: "Cartão fidelidade digital", modogestor: true, outros: "partial" },
  { feature: "Comanda digital", modogestor: true, outros: "partial" },
  { feature: "Comissão automática", modogestor: true, outros: true },
  { feature: "Relatórios por barbeiro", modogestor: true, outros: true },
  { feature: "App no celular (PWA)", modogestor: true, outros: "partial" },
  { feature: "A partir de", modogestor: "R$ 59,90", outros: "R$ 65-150+" },
];

function StatusCell({ value, ours }: { value: boolean | string; ours?: boolean }) {
  if (value === true)
    return (
      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
        <Check className={`h-3.5 w-3.5 ${ours ? "text-[#d4a843]" : "text-zinc-500"}`} />
      </div>
    );
  if (value === false)
    return (
      <div className="w-6 h-6 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto">
        <X className="h-3 w-3 text-zinc-700" />
      </div>
    );
  if (value === "partial")
    return (
      <div className="w-6 h-6 rounded-full bg-amber-500/5 flex items-center justify-center mx-auto">
        <Minus className="h-3 w-3 text-zinc-500" />
      </div>
    );
  return (
    <span className={`text-sm font-bold ${ours ? "text-[#d4a843]" : "text-zinc-400"}`}>
      {value}
    </span>
  );
}

export default function LandingComparison() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8" ref={ref}>
      <div className="max-w-[700px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            Comparação
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Compare e <span className="text-[#d4a843]">escolha.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-white/[0.06] overflow-hidden"
        >
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] border-b border-white/[0.06]">
            <div className="py-4 px-5 text-zinc-500 font-medium text-xs tracking-wide">
              Funcionalidade
            </div>
            <div className="py-4 px-3 text-center bg-[#d4a843]/[0.04] border-x border-[#d4a843]/10">
              <span className="text-[#d4a843] font-bold text-xs tracking-wide">modoGESTOR</span>
            </div>
            <div className="py-4 px-3 text-center text-zinc-600 font-medium text-xs tracking-wide">
              Outros
            </div>
          </div>

          {/* Rows */}
          {comparacao.map((row, i) => {
            const isExclusive = (row as any).exclusive;
            const isLast = i === comparacao.length - 1;
            return (
              <div
                key={row.feature}
                className={`grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] ${
                  !isLast ? "border-b border-white/[0.04]" : ""
                } ${isExclusive ? "bg-[#d4a843]/[0.02]" : ""}`}
              >
                <div className="py-3.5 px-5 text-zinc-300 text-[13px] flex items-center">
                  {row.feature}
                </div>
                <div className="py-3.5 px-3 flex items-center justify-center bg-[#d4a843]/[0.04] border-x border-[#d4a843]/10">
                  <StatusCell value={row.modogestor} ours />
                </div>
                <div className="py-3.5 px-3 flex items-center justify-center">
                  <StatusCell value={row.outros} />
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
