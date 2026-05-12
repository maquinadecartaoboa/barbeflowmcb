import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Cake, Calendar, MessageCircle, TrendingDown, XCircle } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KPICard } from "./KPICard";
import { HeatmapWeekHour } from "./HeatmapWeekHour";
import { formatPeriodLabel } from "./formatters";
import type { DashboardAdminPayload } from "./types";

interface DashboardAdminProps {
  data: DashboardAdminPayload;
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

export function DashboardAdmin({ data }: DashboardAdminProps) {
  const timelineData = data.receita_timeline.map((p) => ({
    date: p.date,
    receita: p.value_cents / 100,
  }));
  const previousLabel = formatPeriodLabel(data.period.previous_from, data.period.previous_to);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Faturamento" format="currency" data={data.kpis.faturamento_cents}  previousLabel={previousLabel} />
        <KPICard label="Atendimentos" format="integer"  data={data.kpis.atendimentos}       previousLabel={previousLabel} />
        <KPICard label="Ticket médio" format="currency" data={data.kpis.ticket_medio_cents} previousLabel={previousLabel} />
        <KPICard label="Ocupação"     format="percent"  data={data.kpis.ocupacao_pct} />
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AlertCardItem
          icon={<AlertCircle className="h-4 w-4 text-amber-400" />}
          label="Pagamentos pendentes"
          value={data.alertas.pagamentos_pendentes}
          tone="amber"
        />
        <AlertCardItem
          icon={<XCircle className="h-4 w-4 text-red-400" />}
          label="Cancelamentos nas últimas 24h"
          value={data.alertas.bookings_cancelados_24h}
          tone="red"
        />
        <AlertCardItem
          icon={<TrendingDown className="h-4 w-4 text-orange-400" />}
          label="Clientes sumidos > 90d"
          value={data.alertas.clientes_sumidos_90d}
          tone="orange"
        />
      </div>

      {/* Timeline + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Receita ao longo do período</CardTitle>
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
                    dataKey="receita"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <HeatmapWeekHour cells={data.heatmap} />
      </div>

      {/* Agenda amanhã + Top serviços */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Agenda de amanhã
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Stat label="Agendados" value={data.agenda_amanha.total} />
              <Stat label="Vagos" value={data.agenda_amanha.vagos} />
              <Stat label="A confirmar" value={data.agenda_amanha.sem_confirmacao} />
            </div>
            {data.agenda_amanha.total === 0 && (
              <p className="text-xs text-muted-foreground mb-2">Sem agendamentos pra amanhã ainda.</p>
            )}
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Receita estimada: </span>
              <span className="font-semibold text-emerald-400">
                {formatBRL(data.agenda_amanha.total_revenue_estimado_cents)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.top_servicos.map((s) => (
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

      {/* Clientes em risco + Ranking staff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-400" /> Clientes em risco
            </CardTitle>
            <p className="text-xs text-muted-foreground">Ordenados por urgência (ratio = dias sem visita / freq.)</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.clientes_em_risco.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente em risco no momento.</p>
            ) : (
              data.clientes_em_risco.map((c) => {
                const href = whatsAppHref(
                  c.phone,
                  `Olá ${c.name.split(" ")[0]}, sentimos sua falta — vamos marcar?`
                );
                return (
                  <div key={c.customer_id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.dias_sem_visita}d sem visita · costuma a cada {c.freq_dias}d · {c.total_visitas} visitas
                        {c.last_staff_name && ` · com ${c.last_staff_name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] tabular-nums">
                        {c.ratio.toFixed(1)}×
                      </Badge>
                      {href ? (
                        <Button asChild size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:text-emerald-300">
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Ranking de profissionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.ranking_staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atendimento no período.</p>
            ) : (
              data.ranking_staff.map((s, i) => (
                <div key={s.staff_id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                    <span className="truncate">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground tabular-nums">
                      {s.atendimentos} atend.
                    </span>
                    <span className="font-medium tabular-nums">{formatBRL(s.receita_cents)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aniversariantes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Cake className="h-4 w-4 text-pink-400" /> Aniversariantes da semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.aniversariantes_semana.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aniversariante esta semana.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.aniversariantes_semana.map((b) => {
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
                return (
                  <div key={b.customer_id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{label}</p>
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

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-muted/30 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value === null ? "—" : value}</p>
    </div>
  );
}

function AlertCardItem({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "amber" | "red" | "orange";
}) {
  const ring =
    tone === "red"
      ? "border-red-500/30 bg-red-500/5"
      : tone === "orange"
      ? "border-orange-500/30 bg-orange-500/5"
      : "border-amber-500/30 bg-amber-500/5";
  return (
    <Card className={`border ${ring}`}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
