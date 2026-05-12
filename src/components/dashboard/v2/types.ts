// Payload shapes for the two RPCs that drive Dashboard v2.
//
// Money values are always integer cents with a `_cents` suffix.
// Frontend divides by 100 only at the display layer.

export interface DashboardKPI {
  current: number;
  previous: number;
  delta_pct: number; // computed server-side to avoid divide-by-zero on the client
}

export interface HeatmapCell {
  weekday: number; // 0 = Sunday … 6 = Saturday
  hour: number;    // 0–23
  count: number;
}

export interface ClienteEmRisco {
  customer_id: string;
  name: string;
  phone: string | null;
  freq_dias: number;          // avg days between visits
  dias_sem_visita: number;
  ratio: number;              // dias_sem_visita / freq_dias
  last_visit_date: string;    // ISO with tz offset
}

export interface AgendaAmanha {
  total: number;
  vagos: number;              // available slots remaining
  sem_confirmacao: number;
  total_revenue_estimado_cents: number;
}

export interface ServicoRow {
  service_id: string;
  name: string;
  qtd: number;
  receita_cents: number;
}

export interface StaffRankingRow {
  staff_id: string;
  name: string;
  receita_cents: number;
  ocupacao: number; // 0–1
}

export interface AniversarianteRow {
  customer_id: string;
  name: string;
  phone: string | null;
  data: string; // ISO date (YYYY-MM-DD)
}

export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  value_cents: number;
}

// ─────── Admin payload ───────

export interface DashboardAdminPayload {
  kpis: {
    faturamento_cents: DashboardKPI;
    atendimentos: DashboardKPI;
    ticket_medio_cents: DashboardKPI;
    ocupacao_pct: DashboardKPI; // 0–100
  };
  receita_timeline: TimelinePoint[];
  heatmap: HeatmapCell[];
  clientes_em_risco: ClienteEmRisco[];
  agenda_amanha: AgendaAmanha;
  top_servicos: ServicoRow[];
  ranking_staff: StaffRankingRow[];
  aniversariantes_semana: AniversarianteRow[];
  alertas: {
    pagamentos_pendentes: number;
    no_shows_24h: number;
    clientes_sumidos_90d: number;
  };
}

// ─────── Staff payload ───────

export interface ComissaoProjetada {
  pendente_cents: number;       // confirmados ainda não realizados
  projecao_total_cents: number; // current + se tudo for realizado
}

export interface ProximoHoje {
  booking_id: string;
  customer_name: string;
  service_name: string;
  starts_at: string; // ISO
  status: string;
}

export interface DashboardStaffPayload {
  kpis: {
    minha_comissao_cents: DashboardKPI;
    atendimentos: DashboardKPI;
    ticket_medio_cents: DashboardKPI;
    retencao_pct: DashboardKPI; // 0–100
  };
  comissao_projetada: ComissaoProjetada;
  receita_timeline: TimelinePoint[];
  heatmap: HeatmapCell[];
  meus_clientes_em_risco: ClienteEmRisco[];
  proximos_hoje: ProximoHoje[];
  meus_top_servicos: ServicoRow[];
  aniversariantes_meus: AniversarianteRow[];
}
