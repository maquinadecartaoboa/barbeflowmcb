import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { dashPath } from "@/lib/hostname";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Sparkles, AlertTriangle, Scissors } from "lucide-react";
import { ServiceCard } from "@/components/orderbump/ServiceCard";
import type { OrderBumpService } from "@/components/orderbump/types";

const STALE_TIME = 5 * 60 * 1000;

export default function OrderBumpAdmin() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;
  const allowOnlinePayment =
    (currentTenant?.settings as any)?.allow_online_payment === true;
  const [search, setSearch] = useState("");

  const { data: services, isLoading: servicesLoading } = useQuery<OrderBumpService[]>({
    queryKey: ["orderbump", "services", tenantId],
    enabled: !!tenantId,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price_cents, photo_url")
        .eq("tenant_id", tenantId!)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as OrderBumpService[];
    },
  });

  const { data: mpConnected } = useQuery<boolean>({
    queryKey: ["orderbump", "mp", tenantId],
    enabled: !!tenantId,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data } = await supabase
        .from("mercadopago_connections")
        .select("id")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      return !!data;
    },
  });

  const onlinePaymentReady = mpConnected === true && allowOnlinePayment;
  const filtered = (services ?? []).filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-300" />
          Order Bump — Aumente seu ticket médio
        </h1>
        <p className="text-sm text-muted-foreground">
          Sugira produtos que combinam com cada serviço. Quando seu cliente paga online,
          ele vê esses produtos como recomendação e leva tudo junto.
        </p>
      </header>

      {tenantId && !onlinePaymentReady && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-amber-200">
              Order Bump só funciona com pagamento online ativo
            </p>
            <p className="text-xs text-amber-100/80">
              Configure o Mercado Pago e habilite pagamento online em Pagamentos.
              Você pode preparar os mappings agora — eles ficam prontos pra quando o
              pagamento online estiver ativo.
            </p>
            <Button asChild variant="link" className="h-auto p-0 text-amber-200 text-xs">
              <Link to={dashPath("/app/settings?tab=payments")}>Ir para Pagamentos →</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar serviço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {servicesLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (services ?? []).length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Scissors className="h-12 w-12 mx-auto text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Você precisa cadastrar serviços antes de configurar order bump.
          </p>
          <Button asChild>
            <Link to={dashPath("/app/services")}>Ir para Catálogo</Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum serviço encontrado para "{search}".
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <ServiceCard key={s.id} service={s} tenantId={tenantId!} />
          ))}
        </div>
      )}
    </div>
  );
}
