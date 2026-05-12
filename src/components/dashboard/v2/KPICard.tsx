import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardKPI } from "./types";

interface KPICardProps {
  label: string;
  data: DashboardKPI;
  format: "currency" | "integer" | "percent";
  invertDelta?: boolean; // true when "lower is better" (e.g. no-show count)
  hint?: string;
  loading?: boolean;
  /**
   * Human-readable period label for the comparison ("01–12 abr").
   * Rendered as a faint legend below the delta. Hidden when previous
   * is null (KPIs without history like ocupacao/retencao).
   */
  previousLabel?: string;
}

function formatValue(value: number, kind: KPICardProps["format"]): string {
  switch (kind) {
    case "currency":
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value / 100);
    case "percent":
      return `${value.toFixed(0)}%`;
    case "integer":
    default:
      return new Intl.NumberFormat("pt-BR").format(Math.round(value));
  }
}

function formatDelta(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function KPICard({
  label,
  data,
  format,
  invertDelta = false,
  hint,
  loading,
  previousLabel,
}: KPICardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-7 w-32 bg-muted rounded animate-pulse" />
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const delta = data.delta_pct;
  const hasDelta = delta !== null && Number.isFinite(delta);
  const isPositive = hasDelta && (invertDelta ? delta! < 0 : delta! > 0);
  const isNeutral = !hasDelta || delta === 0;
  const Icon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;

  const deltaClass = isNeutral
    ? "text-muted-foreground"
    : isPositive
    ? "text-emerald-400"
    : "text-red-400";

  return (
    <Card>
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          {hint && <span className="text-[10px] text-muted-foreground/60">{hint}</span>}
        </div>
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {formatValue(data.current, format)}
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-medium", deltaClass)}>
          <Icon className="h-3.5 w-3.5" />
          <span>{hasDelta ? formatDelta(delta!) : "—"}</span>
        </div>
        {data.previous !== null && (
          <p className="text-[10px] text-muted-foreground/70 font-normal leading-tight">
            vs {formatValue(data.previous, format)}
            {previousLabel ? ` em ${previousLabel}` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
