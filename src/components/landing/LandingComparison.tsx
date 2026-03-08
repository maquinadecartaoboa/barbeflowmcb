import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, AlertTriangle } from "lucide-react";

const comparacao = [
  { feature: "Agendamento online", modogestor: true, concorrentes: true },
  { feature: "WhatsApp automático", modogestor: true, concorrentes: "partial" },
  { feature: "Pagamento online (Mercado Pago)", modogestor: true, concorrentes: false },
  { feature: "Proteção anti-falta", modogestor: true, concorrentes: false },
  { feature: "Desconto inteligente", modogestor: true, concorrentes: false },
  { feature: "Cartão fidelidade digital", modogestor: true, concorrentes: "partial" },
  { feature: "Comanda digital", modogestor: true, concorrentes: "partial" },
  { feature: "Comissão automática", modogestor: true, concorrentes: true },
  { feature: "Relatórios por barbeiro", modogestor: true, concorrentes: true },
  { feature: "App no celular (PWA)", modogestor: true, concorrentes: "partial" },
  { feature: "A partir de", modogestor: "R$ 59,90", concorrentes: "R$ 65-150+" },
];

function StatusIcon({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-emerald-400" />;
  if (value === false) return <X className="h-4 w-4 text-red-400" />;
  if (value === "partial") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return <span className="text-sm font-semibold text-white">{value}</span>;
}

export default function LandingComparison() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 px-4 sm:px-6 bg-[#0a0a0a]" ref={ref}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-12">
          Compare e <span className="text-[#d4a843]">escolha.</span>
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="overflow-x-auto"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left py-3 px-4 text-zinc-500 font-medium">Funcionalidade</th>
                <th className="text-center py-3 px-4">
                  <span className="text-[#d4a843] font-bold">modoGESTOR</span>
                </th>
                <th className="text-center py-3 px-4 text-zinc-500 font-medium">Outros</th>
              </tr>
            </thead>
            <tbody>
              {comparacao.map((row) => (
                <tr key={row.feature} className="border-b border-[#1a1a1a]">
                  <td className="py-3 px-4 text-zinc-300">{row.feature}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center bg-[#d4a843]/5 rounded">
                      <StatusIcon value={row.modogestor} />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-center">
                      <StatusIcon value={row.concorrentes} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
