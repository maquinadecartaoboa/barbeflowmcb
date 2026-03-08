import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { dashPath } from "@/lib/hostname";
import logoBranca from "@/assets/modoGESTOR_branca.png";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  key: string;
  title: string;
  options: { label: string; value: string }[];
}

const QUESTIONS: Question[] = [
  {
    key: "weeklyClients",
    title: "Quantos clientes você atende por semana?",
    options: [
      { label: "Até 20 clientes", value: "0-20" },
      { label: "20 a 50 clientes", value: "20-50" },
      { label: "50 a 100 clientes", value: "50-100" },
      { label: "Mais de 100 clientes", value: "100+" },
    ],
  },
  {
    key: "monthlyRevenue",
    title: "Qual o faturamento mensal da sua barbearia hoje?",
    options: [
      { label: "Até R$ 3.000", value: "under_3k" },
      { label: "R$ 3.000 a R$ 8.000", value: "3k_8k" },
      { label: "R$ 8.000 a R$ 15.000", value: "8k_15k" },
      { label: "R$ 15.000 a R$ 30.000", value: "15k_30k" },
      { label: "Acima de R$ 30.000", value: "30k_plus" },
    ],
  },
  {
    key: "bookingMethod",
    title: "Como seus clientes agendam hoje?",
    options: [
      { label: "Pelo WhatsApp", value: "whatsapp" },
      { label: "Por telefone/ligação", value: "phone" },
      { label: "Chegam sem agendar", value: "walkin" },
      { label: "Outro app de agendamento", value: "other_app" },
    ],
  },
  {
    key: "challenge",
    title: "Qual o maior desafio do seu negócio hoje?",
    options: [
      { label: "Clientes que faltam (no-show)", value: "no_shows" },
      { label: "Organizar a agenda", value: "scheduling" },
      { label: "Receber pagamentos", value: "payments" },
      { label: "Atrair novos clientes", value: "marketing" },
      { label: "Controlar o financeiro", value: "management" },
    ],
  },
  {
    key: "teamSize",
    title: "Quantos profissionais trabalham com você?",
    options: [
      { label: "Só eu", value: "solo" },
      { label: "2 a 3 profissionais", value: "2-3" },
      { label: "4 a 6 profissionais", value: "4-6" },
      { label: "7 ou mais", value: "7+" },
    ],
  },
  {
    key: "heardFrom",
    title: "Como conheceu o modoGESTOR?",
    options: [
      { label: "YouTube", value: "youtube" },
      { label: "Instagram", value: "instagram" },
      { label: "Pesquisa no Google", value: "google" },
      { label: "Indicação de amigo", value: "friend" },
      { label: "Outro", value: "other" },
    ],
  },
];

export default function Questionnaire() {
  usePageTitle("Questionário");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const current = QUESTIONS[step];
  const total = QUESTIONS.length;

  const selectAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [current.key]: value }));
    // Auto-advance after short delay
    if (step < total - 1) {
      setTimeout(() => setStep((s) => s + 1), 300);
    } else {
      // Last question — save
      setTimeout(() => handleFinish({ ...answers, [current.key]: value }), 300);
    }
  };

  const handleFinish = async (finalAnswers: Record<string, string>) => {
    setSaving(true);
    try {
      const { error } = await supabase.rpc("save_onboarding_questionnaire", {
        p_weekly_clients: finalAnswers.weeklyClients || null,
        p_monthly_revenue: finalAnswers.monthlyRevenue || null,
        p_current_booking_method: finalAnswers.bookingMethod || null,
        p_biggest_challenge: finalAnswers.challenge || null,
        p_team_size: finalAnswers.teamSize || null,
        p_heard_from: finalAnswers.heardFrom || null,
      });
      if (error) throw error;
      navigate(dashPath("/app/onboarding-wizard"), { replace: true });
    } catch (err: any) {
      console.error("Error saving questionnaire:", err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await supabase.rpc("skip_onboarding");
      navigate(dashPath("/app/dashboard"), { replace: true });
    } catch {
      navigate(dashPath("/app/dashboard"), { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img src={logoBranca} alt="modoGESTOR" className="h-7 mx-auto dark:block hidden" />
          <img src={logoBranca} alt="modoGESTOR" className="h-7 mx-auto dark:hidden block invert" />
        </div>

        {/* Progress */}
        <div className="text-center space-y-3">
          <p className="text-xs text-muted-foreground">Pergunta {step + 1} de {total}</p>
          <div className="flex justify-center gap-1.5">
            {QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? "bg-primary scale-125" : i < step ? "bg-primary/50" : "bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-foreground text-center">{current.title}</h2>
            <div className="space-y-2">
              {current.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => selectAnswer(opt.value)}
                  disabled={saving}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                    answers[current.key] === opt.value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Skip */}
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={saving} className="text-muted-foreground">
            Pular questionário
          </Button>
        </div>
      </div>
    </div>
  );
}
