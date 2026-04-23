import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock, CreditCard, Scissors, AlertTriangle } from "lucide-react";

const DEFAULT_PREFS: Record<string, boolean> = {
  booking_confirmed: true,
  booking_cancelled: true,
  booking_expired: true,
  booking_no_show: true,
  payment_received: true,
  comanda_completed: true,
  booking_reminder_24h: true,
  booking_reminder_1h: true,
  recurring_weekly_summary: true,
  owner_weekly_summary: false, // managed in Alta Performance
  subscription_activated: true,
  subscription_renewed: true,
  subscription_payment_failed: true,
  subscription_cancelled_auto: true,
  subscription_near_block: true,
  subscription_cycle_reminder: true,
};

interface ToggleDef {
  key: string;
  label: string;
  description: string;
}

const CATEGORIES: { icon: typeof CalendarCheck; title: string; toggles: ToggleDef[] }[] = [
  {
    icon: CalendarCheck,
    title: "📅 Agendamentos",
    toggles: [
      { key: "booking_confirmed", label: "Confirmação de agendamento", description: "Envia mensagem quando o agendamento é confirmado" },
      { key: "booking_cancelled", label: "Cancelamento de agendamento", description: "Avisa o cliente quando seu agendamento é cancelado" },
      { key: "booking_expired", label: "Agendamento expirado", description: "Notifica quando o agendamento expira por falta de pagamento" },
      { key: "booking_no_show", label: "Falta registrada", description: "Avisa o cliente quando uma falta é registrada" },
      { key: "payment_received", label: "Pagamento confirmado", description: "Confirma o recebimento do pagamento online" },
    ],
  },
  {
    icon: Scissors,
    title: "✂️ Pós-atendimento",
    toggles: [
      { key: "comanda_completed", label: "Mensagem de conclusão", description: "Envia agradecimento ao cliente quando a comanda é fechada, com link para agendar novamente" },
    ],
  },
  {
    icon: Clock,
    title: "⏰ Lembretes",
    toggles: [
      { key: "booking_reminder_24h", label: "Lembrete 24h antes", description: "Envia lembrete automático 24 horas antes do horário" },
      { key: "booking_reminder_1h", label: "Lembrete 1h antes", description: "Envia lembrete automático 1 hora antes do horário" },
      { key: "recurring_weekly_summary", label: "Resumo semanal (recorrentes)", description: "Envia 1 mensagem por semana para clientes recorrentes com a agenda da semana" },
    ],
  },
  {
    icon: CreditCard,
    title: "💳 Assinaturas",
    toggles: [
      { key: "subscription_activated", label: "Assinatura ativada", description: "Confirma quando a assinatura do cliente é ativada" },
      { key: "subscription_renewed", label: "Assinatura renovada", description: "Notifica renovação automática da assinatura" },
      { key: "subscription_payment_failed", label: "Falha no pagamento", description: "Avisa o cliente sobre falha na cobrança da assinatura" },
      { key: "subscription_cancelled_auto", label: "Assinatura cancelada", description: "Notifica cancelamento automático por inadimplência" },
      { key: "subscription_near_block", label: "Aviso de bloqueio", description: "Avisa que a assinatura será bloqueada em breve" },
      { key: "subscription_cycle_reminder", label: "Lembrete de ciclo", description: "Lembra o cliente de usar suas sessões antes do ciclo acabar" },
    ],
  },
];

export function NotificationPreferencesSection() {
  const { currentTenant, refetch } = useTenant();
  const waConnected = useWhatsAppStatus();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentTenant?.settings) {
      const saved = (currentTenant.settings as any)?.notification_preferences || {};
      // Exclude owner_weekly_summary — managed in Alta Performance
      const { owner_weekly_summary, ...rest } = saved;
      setPrefs({ ...DEFAULT_PREFS, ...rest });
    }
  }, [currentTenant?.id, currentTenant?.settings]);

  const handleToggle = (key: string, checked: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSave = async () => {
    if (!currentTenant) return;
    setSaving(true);
    try {
      // Preserve owner_weekly_summary from Alta Performance
      const existingOwnerPref = (currentTenant.settings as any)?.notification_preferences?.owner_weekly_summary ?? false;
      const { error } = await supabase
        .from("tenants")
        .update({
          settings: {
            ...(currentTenant.settings as any),
            notification_preferences: {
              ...prefs,
              owner_weekly_summary: existingOwnerPref,
            },
            weekly_summary_enabled: prefs.recurring_weekly_summary,
            cycle_reminders_enabled: prefs.subscription_cycle_reminder,
          },
        })
        .eq("id", currentTenant.id);

      if (error) throw error;
      toast.success("Preferências de notificação salvas!");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar preferências");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* WhatsApp status banner */}
      {waConnected === false && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-500">WhatsApp não conectado</p>
            <p className="text-xs text-muted-foreground">
              Conecte o WhatsApp para ativar as notificações. As preferências podem ser configuradas agora e serão aplicadas quando conectar.
            </p>
          </div>
        </div>
      )}

      {CATEGORIES.map((cat, catIdx) => (
        <Card key={catIdx}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{cat.title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {cat.toggles.map((toggle, idx) => (
              <div key={toggle.key}>
                {idx > 0 && <Separator className="my-1" />}
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-medium">{toggle.label}</Label>
                    <p className="text-xs text-muted-foreground">{toggle.description}</p>
                  </div>
                  <Switch
                    checked={prefs[toggle.key] ?? true}
                    onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar preferências"}
        </Button>
      </div>
    </div>
  );
}
