import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  MessageCircle,
  TrendingDown,
  XCircle,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashPath } from "@/lib/hostname";
import { KPICard } from "./KPICard";
import { Avatar } from "./Avatar";
import { ServiceImage } from "./ServiceImage";
import { formatPeriodLabel } from "./formatters";
import {
  AniversariantesCompactCard,
  MixReceitaCard,
  TopClientesCard,
} from "./Widgets";
import type {
  AgendaAmanha,
  ClienteEmRisco,
  DashboardAdminPayload,
  ServicoRow,
  StaffRankingRow,
} from "./types";

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

const MEDALS = ["🥇", "🥈", "🥉"] as const;

export function DashboardAdmin({ data }: DashboardAdminProps) {
  const navigate = useNavigate();
  const timelineData = data.receita_timeline.map((p) => ({
    date: p.date,
    receita: p.value_cents / 100,
  }));
  const previousLabel = formatPeriodLabel(data.period.previous_from, data.period.previous_to);

  return (
    <div className="space-y-6">
      {/* Linha 1 — KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Faturamento" format="currency" data={data.kpis.faturamento_cents}  previousLabel={previousLabel} />
        <KPICard label="Atendimentos" format="integer"  data={data.kpis.atendimentos}       previousLabel={previousLabel} />
        <KPICard label="Ticket médio" format="currency" data={data.kpis.ticket_medio_cents} previousLabel={previousLabel} />
        <KPICard label="Ocupação"     format="percent"  data={data.kpis.ocupacao_pct} />
      </div>

      {/* Linha 2 — Clientes em risco (full width) */}
      <ClientesEmRiscoCard clientes={data.clientes_em_risco} />

      {/* Linha 3 — Agenda de amanhã (compacta, full width) */}
      <AgendaAmanhaCard
        agenda={data.agenda_amanha}
        onOpenAgenda={() => navigate(dashPath("/app/bookings"))}
      />

      {/* Linha 4 — Alertas operacionais */}
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
          label="Clientes sumidos > 30 dias"
          value={data.alertas.clientes_sumidos_30d}
          tone="orange"
        />
      </div>

      {/* Linha 5 — Análise financeira: timeline (2/3) + mix (1/3) */}
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

        <MixReceitaCard items={data.mix_receita} />
      </div>

      {/* Linha 6 — Análise operacional: top serviços + ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopServicosCard servicos={data.top_servicos} />
        <RankingStaffCard ranking={data.ranking_staff} />
      </div>

      {/* Linha 7 — Relacionamento: top clientes + aniversariantes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopClientesCard clientes={data.top_clientes_periodo} />
        <AniversariantesCompactCard aniversariantes={data.aniversariantes_semana} />
      </div>
    </div>
  );
}

// ───────────────────────── Clientes em risco ─────────────────────────

function ClientesEmRiscoCard({ clientes }: { clientes: ClienteEmRisco[] }) {
  // Group by severity when the list is long enough to justify it.
  const critical = clientes.filter((c) => c.ratio >= 3);
  const attention = clientes.filter((c) => c.ratio < 3);
  const shouldGroup = clientes.length >= 6;

  return (
    <Card className="border-red-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-400" />
          Clientes em risco
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ordenados por urgência (dias sem visita ÷ frequência habitual)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente em risco no momento.</p>
        ) : shouldGroup ? (
          <>
            {critical.length > 0 && (
              <RiskGroup label="Crítico" emoji="🚨" tone="critical" clientes={critical} />
            )}
            {attention.length > 0 && (
              <RiskGroup label="Atenção" emoji="⚠️" tone="attention" clientes={attention} />
            )}
          </>
        ) : (
          <ul className="space-y-2">
            {clientes.map((c) => (
              <ClienteRiscoRow key={c.customer_id} cliente={c} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RiskGroup({
  label,
  emoji,
  tone,
  clientes,
}: {
  label: string;
  emoji: string;
  tone: "critical" | "attention";
  clientes: ClienteEmRisco[];
}) {
  const toneClass =
    tone === "critical"
      ? "text-red-300 border-red-500/30"
      : "text-orange-300 border-orange-500/30";
  return (
    <div>
      <p className={`text-xs font-semibold mb-2 pb-1 border-b ${toneClass}`}>
        <span aria-hidden>{emoji}</span> {label} ({clientes.length})
      </p>
      <ul className="space-y-2">
        {clientes.map((c) => (
          <ClienteRiscoRow key={c.customer_id} cliente={c} />
        ))}
      </ul>
    </div>
  );
}

function ClienteRiscoRow({ cliente }: { cliente: ClienteEmRisco }) {
  const critical = cliente.ratio >= 3;
  const severityClass = critical
    ? "bg-red-500/15 text-red-300 border-red-500/40"
    : "bg-orange-500/15 text-orange-300 border-orange-500/40";
  const severityLabel = critical ? "🚨 crítico" : "⚠️ atenção";

  const waMsg = `Olá ${cliente.name.split(" ")[0]}, sentimos sua falta — vamos marcar um horário?`;
  const href = whatsAppHref(cliente.phone, waMsg);

  return (
    <li className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
      <Avatar name={cliente.name} size="md" seed={cliente.customer_id} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-foreground truncate">{cliente.name}</p>
          <Badge className={`${severityClass} text-[10px] font-medium border`}>{severityLabel}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Vem a cada {cliente.freq_dias} dias · sumido há {cliente.dias_sem_visita} dias ·{" "}
          {cliente.total_visitas} visitas
        </p>
      </div>
      {cliente.last_staff_name && (
        <div
          className="hidden sm:flex flex-col items-center gap-0.5"
          title={`Atendido por ${cliente.last_staff_name}`}
        >
          <Avatar
            name={cliente.last_staff_name}
            photoUrl={cliente.last_staff_photo_url}
            size="xs"
            seed={cliente.last_staff_id ?? cliente.last_staff_name}
          />
          <span className="text-[9px] text-muted-foreground truncate max-w-[60px]">
            {cliente.last_staff_name.split(" ")[0]}
          </span>
        </div>
      )}
      {href ? (
        <Button
          asChild
          size="sm"
          className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 hover:text-emerald-200 gap-1.5 shrink-0"
        >
          <a href={href} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </Button>
      ) : (
        <Button size="sm" variant="outline" disabled className="gap-1.5 shrink-0">
          <MessageCircle className="h-4 w-4" />
          Sem fone
        </Button>
      )}
    </li>
  );
}

// ───────────────────────── Agenda amanhã ─────────────────────────

function AgendaAmanhaCard({
  agenda,
  onOpenAgenda,
}: {
  agenda: AgendaAmanha;
  onOpenAgenda: () => void;
}) {
  const horasVagasStr = `${agenda.horas_vagas.toFixed(1).replace(/\.0$/, "")}h`;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Agenda de amanhã
        </CardTitle>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onOpenAgenda}>
          Abrir agenda
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <CompactStat label="Agendados" value={agenda.total} />
          <CompactStat
            label="Vagos"
            valueText={horasVagasStr}
            sub={`de ${agenda.horas_disponiveis}h disponíveis`}
          />
          <CompactStat label="A confirmar" value={agenda.sem_confirmacao} />
          <CompactStat
            label="Receita estimada"
            valueText={formatBRL(agenda.total_revenue_estimado_cents)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Top serviços ─────────────────────────

function TopServicosCard({ servicos }: { servicos: ServicoRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Top serviços</CardTitle>
        <p className="text-xs text-muted-foreground">Por receita no período</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {servicos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem serviços no período.</p>
        ) : (
          servicos.map((s, i) => (
            <div
              key={`${s.service_id ?? s.name}-${i}`}
              className="flex items-center gap-3 py-1.5 border-b border-border last:border-0"
            >
              <ServiceImage name={s.name} photoUrl={s.photo_url} size="md" rounded="full" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-[11px] text-muted-foreground">{s.qtd} atendimentos</p>
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">
                {formatBRL(s.receita_cents)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────── Ranking staff ─────────────────────────

function RankingStaffCard({ ranking }: { ranking: StaffRankingRow[] }) {
  const max = ranking.reduce((m, s) => Math.max(m, s.receita_cents), 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Ranking de profissionais</CardTitle>
        <p className="text-xs text-muted-foreground">Por receita gerada</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum atendimento no período.</p>
        ) : (
          ranking.map((s, i) => {
            const pct = max > 0 ? (s.receita_cents / max) * 100 : 0;
            const medal = i < 3 ? MEDALS[i] : null;
            return (
              <div key={s.staff_id} className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={s.name}
                    photoUrl={s.photo_url}
                    size="sm"
                    seed={s.staff_id}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {medal && <span className="text-xs" aria-hidden>{medal}</span>}
                      <p className="text-sm font-medium truncate">{s.name}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {s.atendimentos} atendimentos
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {formatBRL(s.receita_cents)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
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

// ───────────────────────── Reusables ─────────────────────────

function CompactStat({
  label,
  value,
  valueText,
  sub,
}: {
  label: string;
  value?: number | null;
  valueText?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-muted/30 px-2.5 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      <p className="text-base font-bold tabular-nums truncate">
        {valueText ?? (value === null || value === undefined ? "—" : value)}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground/70 truncate">{sub}</p>}
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
