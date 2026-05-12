import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  RefreshCcw,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Bot,
  History,
  Package,
  Scissors,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AddProductDialog } from "./AddProductDialog";
import { EditPitchDialog } from "./EditPitchDialog";
import {
  MAX_ACTIVE_PER_SERVICE,
  type OrderBumpHistorySuggestion,
  type OrderBumpMapping,
  type OrderBumpService,
} from "./types";

const STALE_TIME = 5 * 60 * 1000;

function fmtBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100
  );
}

interface Props {
  service: OrderBumpService;
  tenantId: string;
}

export function ServiceCard({ service, tenantId }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editPitchFor, setEditPitchFor] = useState<OrderBumpMapping | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const mappingsKey = ["orderbump", "mappings", tenantId, service.id];
  const suggestionsKey = ["orderbump", "suggestions", tenantId, service.id];

  // Mappings + pitch_cache merged in JS (no FK between the two tables, so
  // PostgREST nested select isn't reliable here).
  const { data: mappings, isLoading: mappingsLoading } = useQuery<OrderBumpMapping[]>({
    queryKey: mappingsKey,
    enabled: expanded,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("service_product_recommendations")
        .select(
          "id, product_id, sort_order, active, custom_pitch, product:products(id, name, sale_price_cents, photo_url, description)"
        )
        .eq("tenant_id", tenantId)
        .eq("service_id", service.id)
        .order("sort_order");
      if (error) throw error;

      const list = (rows ?? []) as any[];
      if (list.length === 0) return [];

      const productIds = list.map((r) => r.product_id);
      const { data: pitches } = await supabase
        .from("service_product_pitch_cache")
        .select("product_id, pitch_text, generated_at, model_used")
        .eq("tenant_id", tenantId)
        .eq("service_id", service.id)
        .in("product_id", productIds);

      const pitchByProduct = new Map<string, any>();
      (pitches ?? []).forEach((p: any) => pitchByProduct.set(p.product_id, p));

      return list.map((r) => {
        const cached = pitchByProduct.get(r.product_id);
        return {
          id: r.id,
          product_id: r.product_id,
          sort_order: r.sort_order,
          active: r.active,
          custom_pitch: r.custom_pitch,
          product: r.product ?? null,
          pitch_text: cached?.pitch_text ?? null,
          pitch_generated_at: cached?.generated_at ?? null,
          pitch_model: cached?.model_used ?? null,
        } as OrderBumpMapping;
      });
    },
  });

  const { data: suggestions } = useQuery<OrderBumpHistorySuggestion[]>({
    queryKey: suggestionsKey,
    enabled: expanded,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "get_orderbump_suggestions_from_history",
        { p_tenant_id: tenantId, p_service_id: service.id }
      );
      if (error) {
        // Silent fail — suggestions are optional.
        return [];
      }
      return (data ?? []) as OrderBumpHistorySuggestion[];
    },
  });

  const activeCount = (mappings ?? []).filter((m) => m.active).length;
  const canAddMore = activeCount < MAX_ACTIVE_PER_SERVICE;
  const mappedProductIds = new Set((mappings ?? []).map((m) => m.product_id));

  // Mutations
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: mappingsKey });
    qc.invalidateQueries({ queryKey: suggestionsKey });
  };

  const generatePitch = async (productId: string, force = false) => {
    const { error } = await supabase.functions.invoke("generate-product-pitch", {
      body: {
        tenant_id: tenantId,
        service_id: service.id,
        product_id: productId,
        force_regenerate: force,
      },
    });
    if (error) throw error;
  };

  const handleAdd = async (productId: string) => {
    if (!canAddMore) {
      toast.error(`Limite de ${MAX_ACTIVE_PER_SERVICE} produtos por serviço atingido`);
      return;
    }
    const nextSort = (mappings ?? []).reduce((max, m) => Math.max(max, m.sort_order), -1) + 1;
    const { error } = await supabase.from("service_product_recommendations").insert({
      tenant_id: tenantId,
      service_id: service.id,
      product_id: productId,
      sort_order: nextSort,
      active: true,
    });
    if (error) {
      // UNIQUE constraint catches duplicate
      if (error.code === "23505") {
        toast.error("Esse produto já está mapeado nesse serviço");
      } else {
        toast.error("Erro ao adicionar produto");
      }
      return;
    }
    invalidateAll();
    setAddOpen(false);
    toast.success("Produto adicionado. Gerando pitch com IA...");
    try {
      await generatePitch(productId);
      invalidateAll();
    } catch (e) {
      toast.error("Não conseguimos gerar o pitch agora. Tente regenerar depois.");
    }
  };

  const handleRemove = async (mappingId: string) => {
    const { error } = await supabase
      .from("service_product_recommendations")
      .delete()
      .eq("id", mappingId);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    invalidateAll();
    toast.success("Recomendação removida");
  };

  const handleMove = async (mapping: OrderBumpMapping, direction: "up" | "down") => {
    const list = mappings ?? [];
    const idx = list.findIndex((m) => m.id === mapping.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const other = list[swapIdx];

    // Persist swap of sort_order
    const a = supabase
      .from("service_product_recommendations")
      .update({ sort_order: other.sort_order })
      .eq("id", mapping.id);
    const b = supabase
      .from("service_product_recommendations")
      .update({ sort_order: mapping.sort_order })
      .eq("id", other.id);
    const [ra, rb] = await Promise.all([a, b]);
    if (ra.error || rb.error) {
      toast.error("Erro ao reordenar");
      return;
    }
    invalidateAll();
  };

  const handleRegenerate = async (mapping: OrderBumpMapping) => {
    setRegeneratingId(mapping.id);
    try {
      await generatePitch(mapping.product_id, true);
      invalidateAll();
      toast.success("Pitch regenerado");
    } catch {
      toast.error("IA indisponível agora. O texto antigo foi mantido. Tente em alguns minutos.");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleSavePitch = async (mappingId: string, text: string) => {
    const { error } = await supabase
      .from("service_product_recommendations")
      .update({ custom_pitch: text })
      .eq("id", mappingId);
    if (error) {
      toast.error("Erro ao salvar pitch");
      return;
    }
    invalidateAll();
    setEditPitchFor(null);
    toast.success("Pitch personalizado salvo");
  };

  const handleClearPitch = async (mappingId: string) => {
    const { error } = await supabase
      .from("service_product_recommendations")
      .update({ custom_pitch: null })
      .eq("id", mappingId);
    if (error) {
      toast.error("Erro ao apagar pitch manual");
      return;
    }
    invalidateAll();
    setEditPitchFor(null);
    toast.success("Pitch manual removido — agora usa a IA");
  };

  return (
    <>
      <Card>
        <CardHeader
          className="cursor-pointer flex flex-row items-center gap-3 py-3"
          onClick={() => setExpanded((v) => !v)}
        >
          {service.photo_url ? (
            <img
              src={service.photo_url}
              alt={service.name}
              className="w-10 h-10 rounded object-cover flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{service.name}</p>
            <p className="text-xs text-muted-foreground">{fmtBRL(service.price_cents)}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {activeCount}/{MAX_ACTIVE_PER_SERVICE} produtos
          </Badge>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 space-y-4">
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">
                Produtos recomendados (até {MAX_ACTIVE_PER_SERVICE}):
              </p>

              {mappingsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (mappings ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Nenhum produto recomendado ainda. Mapeie até {MAX_ACTIVE_PER_SERVICE}{" "}
                  produtos que combinam com esse atendimento.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(mappings ?? []).map((m, idx) => {
                    const displayPitch = m.custom_pitch ?? m.pitch_text;
                    const isManual = !!m.custom_pitch;
                    const isFirst = idx === 0;
                    const isLast = idx === (mappings ?? []).length - 1;
                    const isRegenerating = regeneratingId === m.id;
                    return (
                      <li
                        key={m.id}
                        className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-0.5 pt-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={isFirst}
                              onClick={() => handleMove(m, "up")}
                              aria-label="Mover para cima"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              disabled={isLast}
                              onClick={() => handleMove(m, "down")}
                              aria-label="Mover para baixo"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                          {m.product?.photo_url ? (
                            <img
                              src={m.product.photo_url}
                              alt={m.product.name}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {idx + 1}.
                              </span>
                              <p className="text-sm font-medium truncate">
                                {m.product?.name ?? "Produto removido"}
                              </p>
                              <span className="text-sm font-semibold tabular-nums ml-auto shrink-0">
                                {fmtBRL(m.product?.sale_price_cents ?? 0)}
                              </span>
                            </div>
                            {displayPitch ? (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                "{displayPitch}"
                              </p>
                            ) : isRegenerating ? (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                <Loader2 className="h-3 w-3 animate-spin" /> Gerando com IA...
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground/60 mt-1 italic">
                                Sem pitch ainda. Clique em Regenerar.
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {isManual ? (
                                <Badge className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-300 border-violet-500/30">
                                  <Pencil className="h-2.5 w-2.5 mr-1" /> Personalizado
                                </Badge>
                              ) : m.pitch_text ? (
                                <Badge className="text-[10px] px-1.5 py-0 bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                                  <Bot className="h-2.5 w-2.5 mr-1" /> IA
                                  {m.pitch_generated_at && (
                                    <span className="ml-1 opacity-70">
                                      ·{" "}
                                      {format(parseISO(m.pitch_generated_at), "dd MMM", {
                                        locale: ptBR,
                                      })}
                                    </span>
                                  )}
                                </Badge>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setEditPitchFor(m)}
                              >
                                <Pencil className="h-3 w-3 mr-1" /> Editar pitch
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                disabled={isRegenerating}
                                onClick={() => handleRegenerate(m)}
                              >
                                {isRegenerating ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCcw className="h-3 w-3 mr-1" />
                                )}
                                Regenerar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" /> Remover
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover esta recomendação?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      "{m.product?.name}" não vai mais aparecer como sugestão
                                      ao reservar "{service.name}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRemove(m.id)}>
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
                disabled={!canAddMore}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {canAddMore
                  ? "Adicionar produto"
                  : `Limite de ${MAX_ACTIVE_PER_SERVICE} atingido`}
              </Button>
            </div>

            {(suggestions ?? []).length > 0 && (
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Sugestões baseadas no seu histórico
                </div>
                <p className="text-xs text-muted-foreground/80">
                  Produtos vendidos junto com esse serviço no caixa nos últimos meses:
                </p>
                <ul className="space-y-2">
                  {(suggestions ?? [])
                    .filter((s) => !mappedProductIds.has(s.product_id))
                    .map((s) => (
                      <li
                        key={s.product_id}
                        className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-center gap-3"
                      >
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={s.name}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            📊 Vendido {s.sales_count}x · última venda{" "}
                            {format(parseISO(s.last_sold_at), "dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums shrink-0">
                          {fmtBRL(s.sale_price_cents)}
                        </span>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs shrink-0"
                          disabled={!canAddMore}
                          onClick={() => handleAdd(s.product_id)}
                        >
                          <Sparkles className="h-3 w-3 mr-1" /> Recomendar
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <AddProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tenantId={tenantId}
        excludedProductIds={mappedProductIds}
        onPick={handleAdd}
      />

      <EditPitchDialog
        mapping={editPitchFor}
        onOpenChange={(open) => !open && setEditPitchFor(null)}
        onSave={handleSavePitch}
        onClear={handleClearPitch}
      />
    </>
  );
}
