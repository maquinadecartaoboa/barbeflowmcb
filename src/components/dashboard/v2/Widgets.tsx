import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cake, MessageCircle, PieChart, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import type { AniversarianteRow, MixReceitaItem, TopClienteRow } from "./types";

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function whatsAppHref(phone: string | null, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

const MEDALS = ["🥇", "🥈", "🥉"] as const;

// ───────────────────────── Top clientes ─────────────────────────

interface TopClientesCardProps {
  clientes: TopClienteRow[];
}

export function TopClientesCard({ clientes }: TopClientesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-300" /> Top clientes do período
        </CardTitle>
        <p className="text-xs text-muted-foreground">Quem mais gastou no período</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem atendimentos no período.</p>
        ) : (
          clientes.map((c, i) => {
            const href = whatsAppHref(
              c.phone,
              `Olá ${c.name.split(" ")[0]}, obrigado pela preferência este mês! 🙏`
            );
            const medal = i < 3 ? MEDALS[i] : null;
            return (
              <div
                key={c.customer_id}
                className="flex items-center gap-3 py-1.5 border-b border-border last:border-0"
              >
                <Avatar name={c.name} size="sm" seed={c.customer_id} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {medal && <span className="text-xs" aria-hidden>{medal}</span>}
                    <p className="text-sm font-medium truncate">{c.name}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {c.visitas} visita{c.visitas !== 1 ? "s" : ""} · ticket {formatBRL(c.ticket_medio_cents)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatBRL(c.gasto_cents)}
                </span>
                {href ? (
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 shrink-0">
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`}>
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <div className="h-8 w-8 shrink-0" aria-hidden />
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Mix de receita ─────────────────────────

// Consistent color per stable source_key. Anything unknown falls back to muted.
const MIX_PALETTE: Record<string, { bar: string; label: string }> = {
  atendimentos: { bar: "bg-primary",         label: "text-primary" },
  assinaturas:  { bar: "bg-violet-500",      label: "text-violet-300" },
  produtos:     { bar: "bg-cyan-500",        label: "text-cyan-300" },
  pacotes:      { bar: "bg-emerald-500",     label: "text-emerald-300" },
  cortesia:     { bar: "bg-pink-500",        label: "text-pink-300" },
  outros:       { bar: "bg-zinc-500",        label: "text-zinc-300" },
};

function mixColor(key: string) {
  return MIX_PALETTE[key] ?? MIX_PALETTE.outros;
}

interface MixReceitaCardProps {
  items: MixReceitaItem[];
}

export function MixReceitaCard({ items }: MixReceitaCardProps) {
  const total = items.reduce((s, i) => s + i.value_cents, 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" /> Mix de receita
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          De onde vem o faturamento — total {formatBRL(total)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem receita no período.</p>
        ) : (
          items.map((it) => {
            const palette = mixColor(it.source_key);
            return (
              <div key={it.source_key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn("font-medium", palette.label)}>{it.source}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {it.pct.toFixed(1)}% · {formatBRL(it.value_cents)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", palette.bar)}
                    style={{ width: `${Math.min(it.pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Aniversariantes compactos ─────────────────────────

interface AniversariantesCompactCardProps {
  aniversariantes: AniversarianteRow[];
  title?: string;
  /** Number of birthdays visible before "Ver toda a semana" expands the list. */
  visibleCount?: number;
}

export function AniversariantesCompactCard({
  aniversariantes,
  title = "Aniversariantes da semana",
  visibleCount = 6,
}: AniversariantesCompactCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (aniversariantes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-400" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum aniversariante esta semana.</p>
        </CardContent>
      </Card>
    );
  }

  // Priority: today first (days_until = 0), then by days_until asc.
  const sorted = [...aniversariantes].sort((a, b) => a.days_until - b.days_until);
  const visible = expanded ? sorted : sorted.slice(0, visibleCount);
  const hidden = sorted.length - visible.length;

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Cake className="h-4 w-4 text-pink-400" /> {title}
        </CardTitle>
        <span className="text-[10px] text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? "pessoa" : "pessoas"}
        </span>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {visible.map((b) => {
          const href = whatsAppHref(
            b.phone,
            `Olá ${b.name.split(" ")[0]}, feliz aniversário! 🎂 Te esperamos pra comemorar.`
          );
          const label =
            b.days_until === 0
              ? "Hoje 🎂"
              : b.days_until === 1
              ? "Amanhã"
              : `Em ${b.days_until} dias`;
          const labelClass =
            b.days_until === 0
              ? "text-pink-300 font-medium"
              : "text-muted-foreground";
          return (
            <div
              key={b.customer_id}
              className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-muted/30 transition-colors"
            >
              <Avatar name={b.name} size="xs" seed={b.customer_id} />
              <p className="text-sm font-medium truncate flex-1 min-w-0">{b.name}</p>
              <span className={cn("text-[11px] shrink-0", labelClass)}>{label}</span>
              {href ? (
                <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 shrink-0">
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${b.name}`}>
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </Button>
              ) : (
                <div className="h-7 w-7 shrink-0" aria-hidden />
              )}
            </div>
          );
        })}
        {hidden > 0 && !expanded && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7 mt-1"
            onClick={() => setExpanded(true)}
          >
            Ver toda a semana ({hidden} {hidden === 1 ? "a mais" : "a mais"})
          </Button>
        )}
        {expanded && sorted.length > visibleCount && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7 mt-1"
            onClick={() => setExpanded(false)}
          >
            Mostrar menos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
