import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Package, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export interface PublicOrderBumpItem {
  product_id: string;
  name: string;
  sale_price_cents: number;
  photo_url: string | null;
}

interface RpcRow {
  product_id: string;
  name: string;
  photo_url: string | null;
  sale_price_cents: number;
  pitch_text: string | null;
}

interface Props {
  tenantId: string;
  serviceId: string;
  serviceName: string;
  onSelectionChange: (items: PublicOrderBumpItem[]) => void;
}

const STALE_TIME = 5 * 60 * 1000;

function fmtBRL(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function PublicOrderBumpCard({
  tenantId,
  serviceId,
  serviceName,
  onSelectionChange,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: products, isLoading, isError } = useQuery<RpcRow[]>({
    queryKey: ["public-orderbump", tenantId, serviceId],
    enabled: !!tenantId && !!serviceId,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_service_recommendations", {
        p_tenant_id: tenantId,
        p_service_id: serviceId,
      });
      // Backend already returns [] when tenant has no MP, online payment is
      // disabled, or service has no mappings. On error we also fail silently —
      // the order bump must never block the booking flow.
      if (error) return [];
      return (data ?? []) as RpcRow[];
    },
  });

  // Reset selection whenever the service changes (selections for service A
  // don't make sense after switching to service B).
  useEffect(() => {
    setSelectedIds(new Set());
    onSelectionChange([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const toggle = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      const items: PublicOrderBumpItem[] = (products ?? [])
        .filter((p) => next.has(p.product_id))
        .map((p) => ({
          product_id: p.product_id,
          name: p.name,
          sale_price_cents: p.sale_price_cents,
          photo_url: p.photo_url,
        }));
      onSelectionChange(items);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl space-y-3">
        <Skeleton className="h-5 w-44 bg-zinc-800" />
        <Skeleton className="h-16 w-full bg-zinc-800" />
        <Skeleton className="h-16 w-full bg-zinc-800" />
      </div>
    );
  }

  if (isError || !products || products.length === 0) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-300" />
        <span className="text-sm font-medium">Aproveite e leve também</span>
      </div>

      <div className="space-y-2">
        {products.map((p) => {
          const checked = selectedIds.has(p.product_id);
          const pitch =
            p.pitch_text && p.pitch_text.trim().length > 0
              ? p.pitch_text
              : `Combine com seu ${serviceName} e leve pra casa.`;
          return (
            <button
              key={p.product_id}
              type="button"
              onClick={() => toggle(p.product_id)}
              aria-pressed={checked}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
                checked
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  checked ? "bg-emerald-500 border-emerald-500" : "border-zinc-600"
                }`}
              >
                {checked && <Check className="h-3 w-3 text-white" />}
              </div>
              {p.photo_url ? (
                <img
                  src={p.photo_url}
                  alt={p.name}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-zinc-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap flex-shrink-0">
                    + {fmtBRL(p.sale_price_cents)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{pitch}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
