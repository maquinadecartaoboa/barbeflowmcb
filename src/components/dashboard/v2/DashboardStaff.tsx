import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { dashPath } from "@/lib/hostname";
import { KPICard } from "./KPICard";
import { HeatmapWeekHour } from "./HeatmapWeekHour";
import { Avatar } from "./Avatar";
import { ServiceImage } from "./ServiceImage";
import { formatPeriodLabel } from "./formatters";
import type {
  DashboardStaffPayload,
  MeuClienteEmRisco,
  ProximoHoje,
  ServicoRow,
} from "./types";

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
  const navigate = useNavigate();
  const timelineData = data.receita_timeline.map((p) => ({
    date: p.date,
    valor: p.value_cents / 100,
  }));
  const previousLabel = formatPeriodLabel(data.period.previous_from, data.period.previous_to);

  return (
    <div className="space-y-6">
      {/* 1. KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Minha comissão" format="currency" data={data.kpis.minha_comissao_cents} previousLabel={previousLabel} />
        <KPICard label="Atendimentos"   format="integer"  data={data.kpis.atendimentos}         previousLabel={previousLabel} />
        <KPICard label="Ticket médio"   format="currency" data={data.kpis.ticket_medio_cents}   previousLabel={previousLabel} />
        <KPICard label="Retenção"       format="percent"  data={data.kpis.retencao_pct} />
      </div>

      {/* 2. Meus clientes em risco — acionável */}
      <MeusClientesEmRiscoCard clientes={data.meus_clientes_em_risco} />

      {/* 3. Próximos atendimentos hoje — acionável */}
      <ProximosHojeCard
        proximos={data.proximos_hoje}
        onOpenAgenda={() => navigate(dashPath("/app/bookings"))}
      />

      {/* 4. Comissão projetada */}
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

      {/* 5. Análise — comissão diária + heatmap */}
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

      {/* 6. Análise — meus top serviços */}
      <MeusTopServicosCard servicos={data.meus_top_servicos} />

      {/* 7. Aniversariantes */}
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
                const label =
                  b.days_until === 0
                    ? "Hoje 🎂"
                    : b.days_until === 1
                    ? "Amanhã"
                    : `Em ${b.days_until} dias`;
                return (
                  <div
                    key={b.customer_id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30"
                  >
                    <Avatar name={b.name} size="sm" seed={b.customer_id} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">{label}</p>
                    </div>
                    {href && (
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-emerald-400 shrink-0">
                        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${b.name}`}>
                          <MessageCircle className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
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

// ───────────────────────── Meus clientes em risco ─────────────────────────

function MeusClientesEmRiscoCard({ clientes }: { clientes: MeuClienteEmRisco[] }) {
  const critical = clientes.filter((c) => c.ratio >= 3);
  const attention = clientes.filter((c) => c.ratio < 3);
  const shouldGroup = clientes.length >= 6;

  return (
    <Card className="border-red-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-400" /> Meus clientes em risco
        </CardTitle>
        <p className="text-xs text-muted-foreground">Chame de volta antes que esfrie</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {clientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem clientes em risco no período.</p>
        ) : shouldGroup ? (
          <>
            {critical.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2 pb-1 border-b text-red-300 border-red-500/30">
                  🚨 Crítico ({critical.length})
                </p>
                <ul className="space-y-2">
                  {critical.map((c) => <MeuClienteRiscoRow key={c.customer_id} cliente={c} />)}
                </ul>
              </div>
            )}
            {attention.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-2 pb-1 border-b text-orange-300 border-orange-500/30">
                  ⚠️ Atenção ({attention.length})
                </p>
                <ul className="space-y-2">
                  {attention.map((c) => <MeuClienteRiscoRow key={c.customer_id} cliente={c} />)}
                </ul>
              </div>
            )}
          </>
        ) : (
          <ul className="space-y-2">
            {clientes.map((c) => <MeuClienteRiscoRow key={c.customer_id} cliente={c} />)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MeuClienteRiscoRow({ cliente }: { cliente: MeuClienteEmRisco }) {
  const critical = cliente.ratio >= 3;
  const severityClass = critical
    ? "bg-red-500/15 text-red-300 border-red-500/40"
    : "bg-orange-500/15 text-orange-300 border-orange-500/40";
  const severityLabel = critical ? "🚨 crítico" : "⚠️ atenção";

  const href = whatsAppHref(
    cliente.phone,
    `Olá ${cliente.name.split(" ")[0]}, sentimos sua falta — vamos marcar?`
  );

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

// ───────────────────────── Próximos hoje ─────────────────────────

function ProximosHojeCard({
  proximos,
  onOpenAgenda,
}: {
  proximos: ProximoHoje[];
  onOpenAgenda: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Próximos atendimentos hoje
        </CardTitle>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onOpenAgenda}>
          Abrir agenda
        </Button>
      </CardHeader>
      <CardContent>
        {proximos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem atendimentos restantes hoje.
          </p>
        ) : (
          <ul className="relative">
            {/* Timeline rail */}
            <div className="absolute left-[42px] top-2 bottom-2 w-px bg-border" aria-hidden />
            {proximos.map((p) => (
              <ProximoHojeRow key={p.booking_id} proximo={p} onClick={onOpenAgenda} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProximoHojeRow({
  proximo,
  onClick,
}: {
  proximo: ProximoHoje;
  onClick: () => void;
}) {
  const time = format(parseISO(proximo.starts_at), "HH:mm", { locale: ptBR });
  const expired = proximo.status === "expired";
  const waHref = whatsAppHref(
    proximo.customer_phone,
    `Olá ${proximo.customer_name.split(" ")[0]}, confirmando seu horário hoje. Até já!`
  );

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="relative flex items-center gap-3 py-2.5 w-full text-left rounded-lg hover:bg-muted/40 transition-colors px-2"
      >
        <span className="text-xs font-mono font-semibold text-foreground w-10 tabular-nums shrink-0">
          {time}
        </span>
        <ServiceImage
          name={proximo.service_name}
          photoUrl={proximo.service_photo_url}
          size="md"
          rounded="full"
          className="z-10"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{proximo.customer_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {proximo.service_name}
            {expired && " · "}
            {expired && <span className="text-amber-400">aguardando confirmação</span>}
          </p>
        </div>
        {waHref && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              window.open(waHref, "_blank", "noopener,noreferrer");
            }}
            role="button"
            aria-label={`WhatsApp ${proximo.customer_name}`}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
          >
            <MessageCircle className="h-4 w-4" />
          </span>
        )}
      </button>
    </li>
  );
}

// ───────────────────────── Meus top serviços ─────────────────────────

function MeusTopServicosCard({ servicos }: { servicos: ServicoRow[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Meus top serviços</CardTitle>
        <p className="text-xs text-muted-foreground">Por receita gerada no período</p>
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
