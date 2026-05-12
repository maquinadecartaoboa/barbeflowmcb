import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useTenant } from "@/hooks/useTenant";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";
import { supabase } from "@/integrations/supabase/client";
import { NoTenantState } from "@/components/NoTenantState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageCircle, Search, Users } from "lucide-react";

type Sort = "distancia" | "recencia" | "nome";

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  ultima_visita: string | null;
  total_atendimentos: number;
}

interface StatusInfo {
  label: string;
  className: string;
  emoji: string;
}

function getCustomerStatus(ultimaVisita: string | null): StatusInfo {
  if (!ultimaVisita) {
    return {
      label: "Sem atendimento",
      className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
      emoji: "⚪",
    };
  }
  const days = Math.floor((Date.now() - new Date(ultimaVisita).getTime()) / 86400000);
  if (days <= 30) {
    return {
      label: `${days}d • Ativo`,
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      emoji: "🟢",
    };
  }
  if (days <= 60) {
    return {
      label: `${days}d • Atenção`,
      className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      emoji: "🟡",
    };
  }
  if (days <= 90) {
    return {
      label: `${days}d • Distante`,
      className: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      emoji: "🟠",
    };
  }
  return {
    label: `${days}d • Sumido`,
    className: "bg-red-500/10 text-red-400 border-red-500/30",
    emoji: "🔴",
  };
}

// Normalize Brazilian phone to digits-only with country code 55.
function phoneForWhatsApp(phone: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // Strip leading 55 if it's already there to normalize, then re-add.
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 11) return null;
  return `55${digits}`;
}

export default function CustomersStaff() {
  usePageTitle("Meus Clientes");
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { staff: currentStaff, isLoading: staffLoading } = useCurrentStaff();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("distancia");

  const tenantId = currentTenant?.id ?? null;
  const staffId = currentStaff?.id ?? null;
  const tenantName = currentTenant?.name ?? "";

  const { data, isLoading: queryLoading } = useQuery<CustomerRow[]>({
    queryKey: ["staff-customers", tenantId, staffId],
    enabled: !!tenantId && !!staffId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      // RLS already scopes bookings to the current staff; the explicit
      // staff_id filter is defense-in-depth + clarity.
      const { data, error } = await supabase
        .from("bookings")
        .select("customer_id, starts_at, customer:customers(id, name, phone)")
        .eq("tenant_id", tenantId!)
        .eq("staff_id", staffId!)
        .eq("status", "completed");

      if (error) throw error;

      // Aggregate client-side: latest starts_at + count per customer.
      const byId = new Map<string, CustomerRow>();
      for (const row of (data ?? []) as any[]) {
        const cust = row.customer;
        if (!cust?.id) continue;
        const existing = byId.get(cust.id);
        if (existing) {
          existing.total_atendimentos += 1;
          if (
            row.starts_at &&
            (!existing.ultima_visita || row.starts_at > existing.ultima_visita)
          ) {
            existing.ultima_visita = row.starts_at;
          }
        } else {
          byId.set(cust.id, {
            id: cust.id,
            name: cust.name ?? "Sem nome",
            phone: cust.phone ?? null,
            ultima_visita: row.starts_at ?? null,
            total_atendimentos: 1,
          });
        }
      }
      return Array.from(byId.values());
    },
  });

  const customers = useMemo(() => {
    const rows = data ?? [];
    const filtered = search.trim()
      ? rows.filter((c) => {
          const q = search.trim().toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            (c.phone ?? "").includes(q)
          );
        })
      : rows;

    const sorted = [...filtered];
    if (sort === "nome") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    } else if (sort === "recencia") {
      // Recência: most recent first. Null vai pro final.
      sorted.sort((a, b) => {
        if (!a.ultima_visita && !b.ultima_visita) return 0;
        if (!a.ultima_visita) return 1;
        if (!b.ultima_visita) return -1;
        return b.ultima_visita.localeCompare(a.ultima_visita);
      });
    } else {
      // distancia (default): mais sumido (data mais antiga) primeiro. Null no fim.
      sorted.sort((a, b) => {
        if (!a.ultima_visita && !b.ultima_visita) return 0;
        if (!a.ultima_visita) return 1;
        if (!b.ultima_visita) return -1;
        return a.ultima_visita.localeCompare(b.ultima_visita);
      });
    }
    return sorted;
  }, [data, search, sort]);

  const buildWhatsAppUrl = (customer: CustomerRow): string | null => {
    const phone = phoneForWhatsApp(customer.phone);
    if (!phone) return null;
    const firstName = customer.name.trim().split(/\s+/)[0] || "tudo bem";
    const business = tenantName || "sua barbearia";
    const message =
      `Olá ${firstName}, aqui é da ${business}! Tudo bem? ` +
      `Sentimos sua falta — vamos marcar um horário? 😊`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  if (tenantLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  const loading = staffLoading || queryLoading;

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Meus Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Clientes que você atendeu — sumidos no topo pra você chamar
        </p>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="distancia">Distância (sumidos primeiro)</SelectItem>
            <SelectItem value="recencia">Recência (recentes primeiro)</SelectItem>
            <SelectItem value="nome">Nome (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {search.trim()
              ? "Nenhum cliente encontrado pra essa busca."
              : "Você ainda não tem atendimentos registrados."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {customers.map((c) => {
            const status = getCustomerStatus(c.ultima_visita);
            const waUrl = buildWhatsAppUrl(c);
            return (
              <Card key={c.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.total_atendimentos} atendimento{c.total_atendimentos !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge className={`${status.className} text-[10px] gap-1 shrink-0`}>
                      <span aria-hidden>{status.emoji}</span>
                      {status.label}
                    </Badge>
                  </div>

                  {waUrl ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    >
                      <a href={waUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled
                      className="w-full gap-2"
                      title="Cliente sem telefone cadastrado"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Sem telefone
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
