import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CANCEL_REASONS = [
  { code: "cancel_client_requested", label: "Cliente pediu cancelamento" },
  { code: "cancel_client_no_response", label: "Cliente não respondeu" },
  { code: "cancel_barber_unavailable", label: "Barbeiro indisponível" },
  { code: "cancel_scheduling_error", label: "Erro de agendamento" },
  { code: "cancel_health_issue", label: "Problema de saúde" },
  { code: "cancel_weather_emergency", label: "Clima / emergência" },
  { code: "cancel_other", label: "Outro (descrever)" },
] as const;

type CancelReasonCode = typeof CANCEL_REASONS[number]["code"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  tenantId: string;
  tenantSettings?: any;
  onComplete: (result: { session_outcome?: string; hours_until_start?: number }) => void;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  bookingId,
  tenantId,
  tenantSettings,
  onComplete,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reasonCode, setReasonCode] = useState<CancelReasonCode | "">("");
  const [reasonNote, setReasonNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setReasonCode("");
    setReasonNote("");
  }, [open, bookingId]);

  const requiresNote = reasonCode === "cancel_other";
  const canConfirm = !!reasonCode && (!requiresNote || reasonNote.trim().length > 0);
  const cancellationMinHours = tenantSettings?.cancellation_min_hours ?? 4;

  const handleConfirm = async () => {
    if (!bookingId || !tenantId) return;
    setLoading(true);
    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        "cancel_booking_with_refund",
        {
          p_booking_id: bookingId,
          p_tenant_id: tenantId,
          p_cancellation_min_hours: cancellationMinHours,
          p_reason_code: reasonCode || null,
          p_reason_note: reasonNote.trim() || null,
        } as any,
      );
      if (rpcError) throw rpcError;
      const res = result as any;
      if (!res?.success) throw new Error(res?.error || "Erro ao cancelar");

      if (res.session_outcome === "refunded") {
        toast({
          title: "Sessão devolvida",
          description: `Cancelado com ${res.hours_until_start}h de antecedência. Sessão devolvida ao cliente.`,
        });
      } else if (res.session_outcome === "forfeited") {
        toast({
          title: "Sessão consumida",
          description: `Cancelamento tardio (menos de ${cancellationMinHours}h). Sessão não devolvida.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Agendamento cancelado" });
      }

      onComplete(res);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao cancelar agendamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe o motivo do cancelamento para registro.
              </p>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Motivo:</label>
                <Select
                  value={reasonCode}
                  onValueChange={(v) => setReasonCode(v as CancelReasonCode)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCEL_REASONS.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reasonCode && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Observação{requiresNote ? " (obrigatória)" : " (opcional)"}
                  </label>
                  <Textarea
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder={requiresNote ? "Descreva o motivo" : "Detalhes adicionais"}
                    rows={2}
                  />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading || !canConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelando...
              </>
            ) : (
              "Confirmar cancelamento"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
