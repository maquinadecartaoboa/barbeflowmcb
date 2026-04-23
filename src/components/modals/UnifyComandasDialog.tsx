import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Separator } from "@/components/ui/separator";
import { Loader2, Clock, Scissors, Users, Banknote, CreditCard, Smartphone } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatBRL } from "@/utils/formatBRL";

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credit", label: "Crédito", icon: CreditCard },
  { value: "debit", label: "Débito", icon: CreditCard },
] as const;

type PaymentMethod = typeof PAYMENT_METHODS[number]["value"];

export interface RelatedBookingItem {
  id: string;
  title: string;
  type: string;
  unit_price_cents: number;
  total_price_cents: number;
  discount_cents: number;
  quantity: number;
  staff_id: string | null;
  paid_status: "unpaid" | "paid" | "covered" | "courtesy";
}

export interface RelatedBooking {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  comanda_status?: string;
  service_name: string;
  service_price_cents: number;
  staff_id: string;
  staff_name: string;
  items: RelatedBookingItem[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  bookings: RelatedBooking[];
  currentBookingId: string;
  onCompleted: () => void;
}

function bookingSubtotalCents(b: RelatedBooking): number {
  if (b.items && b.items.length > 0) {
    return b.items.reduce((sum, item) => {
      const isCovered = item.paid_status === "covered" || item.paid_status === "courtesy";
      if (isCovered) return sum;
      return sum + ((item.total_price_cents || 0) - (item.discount_cents || 0));
    }, 0);
  }
  return b.service_price_cents || 0;
}

function isBookingFullyCovered(b: RelatedBooking): boolean {
  if (!b.items || b.items.length === 0) return false;
  return b.items.every((i) => i.paid_status === "covered" || i.paid_status === "courtesy");
}

function isBookingUnifiable(b: RelatedBooking): boolean {
  const statusOk = b.status === "confirmed" || b.status === "pending_payment";
  const comandaOk = !b.comanda_status || b.comanda_status === "open";
  return statusOk && comandaOk;
}

function unavailableReason(b: RelatedBooking): string | null {
  if (b.status === "cancelled") return "Cancelada";
  if (b.status === "no_show") return "Faltou";
  if (b.status === "completed" && b.comanda_status === "closed") return "Já fechada";
  if (b.status === "completed") return "Já concluído";
  if (b.comanda_status === "closed") return "Comanda fechada";
  if (!isBookingUnifiable(b)) return "Não disponível";
  return null;
}

export function UnifyComandasDialog({
  open,
  onOpenChange,
  customerName,
  bookings,
  currentBookingId,
  onCompleted,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [discountInput, setDiscountInput] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [tipMethod, setTipMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const defaults = new Set<string>();
    bookings.forEach((b) => {
      if (isBookingUnifiable(b)) defaults.add(b.id);
    });
    if (!defaults.has(currentBookingId) && bookings.some((b) => b.id === currentBookingId && isBookingUnifiable(b))) {
      defaults.add(currentBookingId);
    }
    setSelectedIds(defaults);
    setPaymentMethod("pix");
    setDiscountInput("");
    setTipInput("");
    setTipMethod("cash");
    setNotes("");
  }, [open, bookings, currentBookingId]);

  const discountCents = Math.max(0, Math.round(parseFloat(discountInput || "0") * 100));
  const tipCents = Math.max(0, Math.round(parseFloat(tipInput || "0") * 100));

  const subtotalCents = useMemo(
    () =>
      bookings
        .filter((b) => selectedIds.has(b.id))
        .reduce((sum, b) => sum + bookingSubtotalCents(b), 0),
    [bookings, selectedIds],
  );

  const clampedDiscount = Math.min(discountCents, subtotalCents);
  const discountOver = discountCents > subtotalCents;
  const finalCents = Math.max(0, subtotalCents - clampedDiscount) + tipCents;
  const selectedCount = selectedIds.size;

  const toggleBooking = (bookingId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  };

  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [bookings],
  );

  const handleConfirm = async () => {
    if (selectedCount === 0 || !paymentMethod) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("conclude_unified_bookings", {
        p_booking_ids: Array.from(selectedIds),
        p_payment_method: paymentMethod,
        p_discount_cents: clampedDiscount,
        p_notes: notes.trim() || null,
        p_tip_cents: tipCents,
        p_tip_payment_method: tipCents > 0 ? tipMethod : null,
      } as any);

      if (error) throw error;
      const res = data as any;
      if (!res?.success) {
        const errCode: string = res?.error || "UNKNOWN";
        const msg =
          errCode === "MIXED_TENANT_OR_CUSTOMER"
            ? "Erro: atendimentos de clientes diferentes selecionados"
            : errCode === "SOME_BOOKINGS_NOT_UNIFIABLE"
              ? "Algum atendimento selecionado já foi fechado ou cancelado. Recarregue a página."
              : errCode === "BOOKING_NOT_FOUND"
                ? "Atendimento não encontrado"
                : `Erro ao fechar comandas (${errCode})`;
        toast({ title: "Erro", description: msg, variant: "destructive" });
        return;
      }

      const concluded = res.bookings_concluded ?? selectedCount;
      const total = res.final_cents ?? finalCents;
      toast({
        title: `${concluded} ${concluded === 1 ? "comanda fechada" : "comandas fechadas"}`,
        description: `${formatBRL(total)} registrado`,
      });

      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["staff-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["cash-entries"] });

      onCompleted();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Falha ao fechar comandas unificadas",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const confirmLabel = selectedCount === 0
    ? "Selecione ao menos uma"
    : `Fechar ${selectedCount} ${selectedCount === 1 ? "comanda" : "comandas"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Fechar comandas juntas — {customerName}
          </DialogTitle>
          <DialogDescription>
            Selecione os atendimentos que entram nesse pagamento. A gorjeta e o desconto são aplicados sobre o total.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bookings list */}
          <div className="space-y-2">
            {sortedBookings.map((b) => {
              const fullyCovered = isBookingFullyCovered(b);
              const unavailable = unavailableReason(b);
              const disabled = !!unavailable;
              const checked = selectedIds.has(b.id);
              const time = format(new Date(b.starts_at), "HH:mm");
              const subtotal = bookingSubtotalCents(b);

              return (
                <div
                  key={b.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    checked && !disabled
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background"
                  } ${disabled ? "opacity-60" : ""}`}
                >
                  <Checkbox
                    id={`unify-${b.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleBooking(b.id)}
                    disabled={disabled}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{time}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="truncate">{b.service_name}</span>
                      {b.id === currentBookingId && (
                        <Badge variant="outline" className="text-[10px]">Atual</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Scissors className="h-3 w-3" />
                      <span>{b.staff_name || "—"}</span>
                      <span>·</span>
                      <span className="tabular-nums">{formatBRL(subtotal)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {unavailable ? (
                        <Badge variant="secondary" className="text-[10px]">{unavailable}</Badge>
                      ) : fullyCovered ? (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Coberto por assinatura
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Em aberto</Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Financial summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="tabular-nums">{formatBRL(subtotalCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto:</span>
              <span className="tabular-nums text-destructive">-{formatBRL(clampedDiscount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gorjeta:</span>
              <span className="tabular-nums text-emerald-600">+{formatBRL(tipCents)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total:</span>
              <span className="tabular-nums">{formatBRL(finalCents)}</span>
            </div>
            {discountOver && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                Desconto maior que o subtotal — será aplicado o máximo possível ({formatBRL(subtotalCents)}).
              </p>
            )}
          </div>

          <Separator />

          {/* Payment inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Desconto (R$)</Label>
              <CurrencyInput value={discountInput} onChange={setDiscountInput} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gorjeta (R$)</Label>
              <CurrencyInput value={tipInput} onChange={setTipInput} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forma da gorjeta</Label>
              <Select
                value={tipMethod}
                onValueChange={(v) => setTipMethod(v as PaymentMethod)}
                disabled={tipCents === 0}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Observação (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex.: cliente pediu recibo por e-mail"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={processing || selectedCount === 0 || !paymentMethod}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
