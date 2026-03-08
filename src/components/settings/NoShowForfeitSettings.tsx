import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Props {
  currentTenant: any;
  onChange: (value: number) => void;
}

export function NoShowForfeitSettings({ currentTenant, onChange }: Props) {
  const settings = currentTenant?.settings || {};
  const [forfeitPercent, setForfeitPercent] = useState<number>(settings.no_show_forfeit_percent ?? 30);

  useEffect(() => {
    const s = currentTenant?.settings || {};
    setForfeitPercent(s.no_show_forfeit_percent ?? 30);
  }, [currentTenant]);

  useEffect(() => {
    onChange(Math.max(0, Math.min(100, forfeitPercent)));
  }, [forfeitPercent]);

  const examplePrice = 4000;
  const retentionCents = Math.round(examplePrice * forfeitPercent / 100);
  const refundCents = examplePrice - retentionCents;

  return (
    <div className="space-y-4">
      <Separator className="my-2" />

      <div className="space-y-1">
        <Label className="text-base font-medium">Política de Não Comparecimento (No-Show)</Label>
        <p className="text-xs text-muted-foreground">
          Quando o cliente paga antecipadamente e não comparece, qual percentual do valor será retido pela barbearia?
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <Label>Percentual de retenção</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type="number"
              min={0}
              max={100}
              value={forfeitPercent}
              onChange={(e) => setForfeitPercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            0% = reembolso total • 100% = sem reembolso
          </p>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <p className="font-medium">Exemplo: Serviço de R$ 40,00 pago online</p>
          <p className="text-destructive">→ Retenção: R$ {(retentionCents / 100).toFixed(2)} ({forfeitPercent}%)</p>
          <p className="text-emerald-600">→ Reembolso ao cliente: R$ {(refundCents / 100).toFixed(2)} ({100 - forfeitPercent}%)</p>
        </div>
      </div>
    </div>
  );
}
