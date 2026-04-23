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

const NO_SHOW_REASONS = [
  { code: "no_show_no_contact", label: "Não apareceu sem aviso" },
  { code: "no_show_late_cancel", label: "Avisou em cima da hora" },
  { code: "no_show_client_unreachable", label: "Não consegui contatar" },
  { code: "no_show_other", label: "Outro (descrever)" },
] as const;

type NoShowReasonCode = typeof NO_SHOW_REASONS[number]["code"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  tenantId: string;
  tenantSettings: any;
  onComplete: () => void;
}

export function NoShowDialog({ open, onOpenChange, bookingId, tenantId, tenantSettings, onComplete }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);
  const [payment, setPayment] = useState<any>(null);
  const defaultForfeit = tenantSettings?.no_show_forfeit_percent ?? 30;
  const [forfeitPercent, setForfeitPercent] = useState(defaultForfeit);
  const [reasonCode, setReasonCode] = useState<NoShowReasonCode | "">("");
  const [reasonNote, setReasonNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setForfeitPercent(defaultForfeit);
    setReasonCode("");
    setReasonNote("");
    checkPayment();
  }, [open, bookingId]);

  const requiresNote = reasonCode === "no_show_other";
  const canConfirm =
    !!reasonCode && (!requiresNote || reasonNote.trim().length > 0);

  const checkPayment = async () => {
    setCheckingPayment(true);
    try {
      const { data } = await supabase
        .from("payments")
        .select("id, amount_cents, status, external_id")
        .eq("booking_id", bookingId)
        .eq("status", "paid")
        .maybeSingle();
      setPayment(data);
    } catch {
      setPayment(null);
    } finally {
      setCheckingPayment(false);
    }
  };

  const hasPaidOnline = !!payment?.external_id;
  const forfeitCents = hasPaidOnline ? Math.round(payment.amount_cents * forfeitPercent / 100) : 0;
  const refundCents = hasPaidOnline ? payment.amount_cents - forfeitCents : 0;

  // Build forfeit options, always include default
  const baseOptions = [0, 30, 50, 100];
  const forfeitOptions = Array.from(new Set([...baseOptions, defaultForfeit])).sort((a, b) => a - b);

  const getOptionLabel = (pct: number) => {
    const isDefault = pct === defaultForfeit;
    const suffix = isDefault ? " (padrão)" : "";
    if (pct === 0) return `0% — Devolver tudo${suffix}`;
    if (pct === 100) return `100% — Sem reembolso${suffix}`;
    if (hasPaidOnline) {
      return `${pct}% — Reter R$ ${((payment.amount_cents * pct / 100) / 100).toFixed(2)}${suffix}`;
    }
    return `${pct}%${suffix}`;
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Step 1: Mark no-show via RPC
      const { data: result, error: rpcError } = await supabase.rpc("mark_booking_no_show", {
        p_booking_id: bookingId,
        p_tenant_id: tenantId,
        p_forfeit_override: forfeitPercent,
        p_reason_code: reasonCode || null,
        p_reason_note: reasonNote.trim() || null,
      } as any);
      if (rpcError) throw rpcError;
      const res = result as any;
      if (!res?.success) throw new Error(res?.error || "Erro ao marcar no-show");

      // Step 2: If refund needed, call edge function
      if (res.has_refund) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const refundResp = await fetch(
            `${supabaseUrl}/functions/v1/mp-refund-payment`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                payment_id: res.payment_id,
                tenant_id: tenantId,
              }),
            }
          );
          const refundData = await refundResp.json();

          if (refundData.success) {
            toast({
              title: "No-show confirmado",
              description: `R$ ${(res.refund_cents / 100).toFixed(2)} será reembolsado ao cliente.`,
            });
          } else {
            toast({
              title: "No-show confirmado",
              description: "O reembolso falhou. Tente processar manualmente.",
              variant: "destructive",
            });
          }
        } catch {
          toast({
            title: "No-show confirmado",
            description: "Erro ao processar reembolso automático.",
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "No-show confirmado" });
      }

      onComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Erro ao marcar no-show",
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
          <AlertDialogTitle>Marcar como Não Compareceu?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {checkingPayment ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verificando pagamento...</span>
                </div>
              ) : hasPaidOnline ? (
                <>
                  <p>O cliente pagou <strong>R$ {(payment.amount_cents / 100).toFixed(2)}</strong> online.</p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Retenção:</label>
                    <Select
                      value={String(forfeitPercent)}
                      onValueChange={(v) => setForfeitPercent(parseInt(v))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {forfeitOptions.map((pct) => (
                          <SelectItem key={pct} value={String(pct)}>
                            {getOptionLabel(pct)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Retenção:</span>
                      <span className="font-medium text-destructive">R$ {(forfeitCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reembolso:</span>
                      <span className="font-medium text-emerald-600">R$ {(refundCents / 100).toFixed(2)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    O reembolso será processado automaticamente.
                    PIX: devolução imediata • Cartão: volta na próxima fatura.
                  </p>
                </>
              ) : (
                <p>O cliente não compareceu ao agendamento. Nenhum pagamento online para reembolsar.</p>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Motivo:</label>
                <Select
                  value={reasonCode}
                  onValueChange={(v) => setReasonCode(v as NoShowReasonCode)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {NO_SHOW_REASONS.map((r) => (
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
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading || checkingPayment || !canConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar No-Show"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
