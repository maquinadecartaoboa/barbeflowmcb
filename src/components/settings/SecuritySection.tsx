import { useEffect, useState } from "react";
import { Lock, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SetPinModal } from "@/components/security/SetPinModal";

const PROTECTABLE_PAGES: { slug: string; label: string; description: string }[] = [
  {
    slug: "financeiro",
    label: "Financeiro / Caixa",
    description: "Bloqueia as páginas Financeiro e Caixa.",
  },
];

export function SecuritySection() {
  const { currentTenant, refetch } = useTenant();
  const [hasPin, setHasPin] = useState(false);
  const [loadingHasPin, setLoadingHasPin] = useState(true);
  const [showSetModal, setShowSetModal] = useState(false);
  const [isChange, setIsChange] = useState(false);
  const [savingToggle, setSavingToggle] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const protectedPages: string[] =
    (currentTenant?.settings as any)?.protected_pages || [];

  const loadHasPin = async () => {
    if (!currentTenant) return;
    try {
      setLoadingHasPin(true);
      const { data, error } = await supabase.rpc("tenant_has_pin" as any, {
        p_tenant_id: currentTenant.id,
      });
      if (error) throw error;
      setHasPin(!!data);
    } catch (err) {
      console.error("tenant_has_pin error:", err);
      setHasPin(false);
    } finally {
      setLoadingHasPin(false);
    }
  };

  useEffect(() => {
    if (currentTenant) loadHasPin();
  }, [currentTenant?.id]);

  const handlePinSuccess = async () => {
    setHasPin(true);
    await loadHasPin();
  };

  const togglePageProtection = async (slug: string, enabled: boolean) => {
    if (!currentTenant) return;
    setSavingToggle(slug);
    try {
      const current: string[] =
        (currentTenant.settings as any)?.protected_pages || [];
      const next = enabled
        ? Array.from(new Set([...current, slug]))
        : current.filter((p) => p !== slug);

      const { error } = await supabase
        .from("tenants")
        .update({
          settings: {
            ...(currentTenant.settings as any),
            protected_pages: next,
          },
        })
        .eq("id", currentTenant.id);

      if (error) throw error;
      toast.success(enabled ? "Proteção ativada" : "Proteção desativada");
      refetch();
    } catch (err: any) {
      console.error("toggle protected page error:", err);
      toast.error(err.message || "Erro ao atualizar proteção");
    } finally {
      setSavingToggle(null);
    }
  };

  const handleClearPin = async () => {
    if (!currentTenant) return;
    if (
      !window.confirm(
        "Remover o PIN também desativa a proteção em todas as páginas. Continuar?"
      )
    )
      return;

    setClearing(true);
    try {
      const { error: rpcError } = await supabase.rpc(
        "clear_tenant_pin" as any,
        { p_tenant_id: currentTenant.id }
      );
      if (rpcError) throw rpcError;

      const { error: updateError } = await supabase
        .from("tenants")
        .update({
          settings: {
            ...(currentTenant.settings as any),
            protected_pages: [],
          },
        })
        .eq("id", currentTenant.id);
      if (updateError) throw updateError;

      // Drop any cached session unlocks for this tenant
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith(`pin_unlocked_${currentTenant.id}_`))
        .forEach((k) => sessionStorage.removeItem(k));

      toast.success("Proteção por PIN removida");
      setHasPin(false);
      refetch();
    } catch (err: any) {
      console.error("clear pin error:", err);
      toast.error(err.message || "Erro ao remover PIN");
    } finally {
      setClearing(false);
    }
  };

  if (!currentTenant) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lock className="h-5 w-5 mr-2" />
          Proteção por PIN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loadingHasPin ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando configuração...
          </div>
        ) : !hasPin ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bloqueie o acesso a páginas sensíveis (como Financeiro) com um PIN
              de 4 a 8 dígitos.
            </p>
            <Button
              onClick={() => {
                setIsChange(false);
                setShowSetModal(true);
              }}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Configurar PIN
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500 font-medium">
                PIN configurado
              </span>
            </div>

            <div className="space-y-3">
              <Label className="text-base">Páginas protegidas</Label>
              {PROTECTABLE_PAGES.map((page) => {
                const enabled = protectedPages.includes(page.slug);
                const isSaving = savingToggle === page.slug;
                return (
                  <div
                    key={page.slug}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-0.5">
                      <p className="text-base font-medium">{page.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {page.description}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      disabled={isSaving}
                      onCheckedChange={(next) =>
                        togglePageProtection(page.slug, next)
                      }
                    />
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsChange(true);
                  setShowSetModal(true);
                }}
              >
                Alterar PIN
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearPin}
                disabled={clearing}
              >
                {clearing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Removendo...
                  </>
                ) : (
                  "Remover proteção"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <SetPinModal
        open={showSetModal}
        onClose={() => setShowSetModal(false)}
        onSuccess={handlePinSuccess}
        tenantId={currentTenant.id}
        isChange={isChange}
      />
    </Card>
  );
}
