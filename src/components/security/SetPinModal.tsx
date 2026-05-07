import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SetPinModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  tenantId: string;
  isChange: boolean;
}

const PIN_REGEX = /^\d{4,8}$/;

export function SetPinModal({
  open,
  onClose,
  onSuccess,
  tenantId,
  isChange,
}: SetPinModalProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPin("");
      setPin("");
      setConfirmPin("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!PIN_REGEX.test(pin)) {
      toast.error("PIN deve ter entre 4 e 8 dígitos");
      return;
    }

    if (pin !== confirmPin) {
      toast.error("Os PINs não coincidem");
      return;
    }

    setSaving(true);
    try {
      if (isChange) {
        const { data: valid, error: verifyError } = await supabase.rpc(
          "verify_tenant_pin" as any,
          { p_tenant_id: tenantId, p_pin: currentPin }
        );
        if (verifyError) throw verifyError;
        if (!valid) {
          toast.error("PIN atual incorreto");
          setSaving(false);
          return;
        }
      }

      const { error } = await supabase.rpc("set_tenant_pin" as any, {
        p_tenant_id: tenantId,
        p_new_pin: pin,
      });
      if (error) throw error;

      toast.success(
        isChange ? "PIN alterado com sucesso" : "PIN configurado com sucesso"
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error("Set PIN error:", err);
      toast.error(err.message || "Erro ao salvar PIN");
    } finally {
      setSaving(false);
    }
  };

  const onlyDigits = (v: string) => v.replace(/\D/g, "");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onClose();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {isChange ? "Alterar PIN" : "Configurar PIN"}
          </DialogTitle>
          <DialogDescription>
            Use entre 4 e 8 dígitos. Anote em local seguro — sem o PIN, páginas
            protegidas ficam inacessíveis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isChange && (
            <div className="space-y-2">
              <Label htmlFor="current-pin">PIN atual</Label>
              <Input
                id="current-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                value={currentPin}
                onChange={(e) => setCurrentPin(onlyDigits(e.target.value))}
                placeholder="••••"
                disabled={saving}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-pin">{isChange ? "Novo PIN" : "PIN"}</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value))}
              placeholder="4 a 8 dígitos"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pin">Confirmar PIN</Label>
            <Input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(onlyDigits(e.target.value))}
              placeholder="Repita o PIN"
              disabled={saving}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar PIN"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
