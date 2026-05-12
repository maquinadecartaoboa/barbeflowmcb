import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderBumpProduct } from "./types";

const STALE_TIME = 5 * 60 * 1000;

function fmtBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  excludedProductIds: Set<string>;
  onPick: (productId: string) => void;
}

export function AddProductDialog({
  open,
  onOpenChange,
  tenantId,
  excludedProductIds,
  onPick,
}: Props) {
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = useQuery<OrderBumpProduct[]>({
    queryKey: ["orderbump", "products", tenantId],
    enabled: open && !!tenantId,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sale_price_cents, photo_url, description")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .gt("sale_price_cents", 0)
        .order("name");
      if (error) throw error;
      return (data ?? []) as OrderBumpProduct[];
    },
  });

  const filtered = useMemo(() => {
    const list = (products ?? []).filter((p) => !excludedProductIds.has(p.id));
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, excludedProductIds, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar produto recomendado</DialogTitle>
          <DialogDescription>
            Selecione um produto pra sugerir neste serviço. O pitch será gerado pela IA
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1">
          {isLoading ? (
            <>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {(products ?? []).length === 0
                ? "Nenhum produto cadastrado com preço acima de R$ 0,00."
                : "Nenhum produto disponível pra adicionar."}
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p.id)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
              >
                {p.photo_url ? (
                  <img
                    src={p.photo_url}
                    alt={p.name}
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {fmtBRL(p.sale_price_cents)}
                </span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
