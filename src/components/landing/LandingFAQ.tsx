import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Preciso pagar para testar?",
    a: "Não. Os 14 dias de teste são 100% gratuitos — você só começa a pagar se decidir continuar após o período de teste.",
  },
  {
    q: "Meus clientes precisam baixar algum app?",
    a: "Não. Eles agendam pelo link direto no celular, sem instalar nada. Funciona como uma página web normal.",
  },
  {
    q: "Como funciona o pagamento online?",
    a: "Você conecta sua conta do Mercado Pago ao modoGESTOR. Quando o cliente agenda e paga online, o dinheiro cai direto na sua conta do Mercado Pago.",
  },
  {
    q: "E se o cliente marcar e não aparecer?",
    a: "Com a Proteção Anti-Falta, se o cliente pagou online e não compareceu, o sistema retém automaticamente uma parte do valor e devolve o restante. Sem constrangimento para ninguém.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa e sem burocracia. Direto pelo painel. Você mantém acesso até o fim do período que já pagou.",
  },
  {
    q: "Quantos barbeiros posso cadastrar?",
    a: "No Profissional, 1 profissional incluso com opção de adicionar mais por R$ 14,90/mês cada. No Ilimitado, sem limite de profissionais.",
  },
  {
    q: "Tem contrato de fidelidade?",
    a: "Não tem. Plano mensal ou anual, sem fidelidade obrigatória. No anual você ganha 2 meses grátis.",
  },
  {
    q: "Como funciona o suporte?",
    a: "Via WhatsApp e e-mail, de segunda a sexta, das 9h às 18h. A gente responde rápido.",
  },
];

export default function LandingFAQ() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8" ref={ref}>
      <div className="max-w-[640px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Ficou com alguma <span className="text-[#d4a843]">dúvida?</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-0">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-b border-white/[0.05] last:border-b-0"
              >
                <AccordionTrigger className="text-sm font-medium text-white hover:no-underline py-5 text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-zinc-400 pb-5 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
