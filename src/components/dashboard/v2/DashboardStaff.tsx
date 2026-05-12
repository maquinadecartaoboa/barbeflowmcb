import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cake, Clock, MessageCircle, TrendingDown, Wallet } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { KPICard } from "./KPICard";
import { HeatmapWeekHour } from "./HeatmapWeekHour";
import type { DashboardStaffPayload } from "./types";

interface DashboardStaffProps {
  data: DashboardStaffPayload;
}

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

export function DashboardStaff({ data }: DashboardStaffProps) {
  const timelineData = data.receita_timeline.map((p) => ({
    date: p.date,
    valor: p.value_cents / 100,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Minha comissão" format="currency" data={data.kpis.minha_comissao_cents} />
        <KPICard label="Atendimentos"   format="integer"  data={data.kpis.atendimentos} />
        <KPICard label="Ticket médio"   format="currency" data={data.kpis.ticket_medio_cents} />
        <KPICard label="Retenção"       format="percent"  data={data.kpis.retencao_pct} />
      </div>

      {/* Comissão projetada */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Comissão projetada</p>
              <p className="text-xs text-muted-foreground">
                Se todos os confirmados do período forem realizados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 ml-auto">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pendente</p>
              <p className="text-lg font-bold tabular-nums">
                {formatBRL(data.comissao_projetada.pendente_cents)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Projeção total</p>
              <p className="text-lg font-bold text-primary tabular-nums">
                {formatBRL(data.comissao_projetada.projecao_total_cents)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Minha comissão ao longo do período</CardTitle>
            <p className="text-xs text-muted-foreground">Valor diário (R$)</p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => formatBRL(value * 100)}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <HeatmapWeekHour
          cells={data.heatmap}
          title="Seus picos"
          description="Dia × hora dos seus atendimentos"
        />
      </div>

      {/* Próximos hoje + Top serviços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Próximos atendimentos hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.proximos_hoje.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem atendimentos restantes hoje.</p>
            ) : (
              data.proximos_hoje.map((p) => (
                <div
                  key={p.booking_id}
                  className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.customer_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{p.service_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-foreground">
                      {format(new Date(p.starts_at), "HH:mm", { locale: ptBR })}
                    </span>
                    <Badge
                      className={
                        p.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]"
                      }
                    >
                      {p.status === "confirmed" ? "Confirmado" : "Aguardando"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Meus top serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.meus_top_servicos.map((s) => (
              <div key={s.service_id} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground tabular-nums">{s.qtd}×</span>
                  <span className="font-medium tabular-nums">{formatBRL(s.receita_cents)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Meus clientes em risco */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" /> Meus clientes em risco
          </CardTitle>
          <p className="text-xs text-muted-foreground">Chame de volta antes que esfrie</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.meus_clientes_em_risco.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem clientes em risco no período.</p>
          ) : (
            data.meus_clientes_em_risco.map((c) => {
              const href = whatsAppHref(
                c.phone,
                `Olá ${c.name.split(" ")[0]}, sentimos sua falta — vamos marcar?`
              );
              return (
                <div
                  key={c.customer_id}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.dias_sem_visita}d sem visita · costuma vir a cada {c.freq_dias}d
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] tabular-nums">
                      {c.ratio.toFixed(1)}×
                    </Badge>
                    {href ? (
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                      >
                        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`}>
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Aniversariantes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-400" /> Meus aniversariantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.aniversariantes_meus.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aniversariante seu agora.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.aniversariantes_meus.map((b) => {
                const href = whatsAppHref(
                  b.phone,
                  `Olá ${b.name.split(" ")[0]}, feliz aniversário! 🎂 Te esperamos pra comemorar.`
                );
                return (
                  <div
                    key={b.customer_id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{b.data}</p>
                    </div>
                    {href ? (
                      <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-emerald-400">
                        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${b.name}`}>
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
