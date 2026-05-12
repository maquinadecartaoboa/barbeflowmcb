// Payload shapes returned by get_dashboard_admin_metrics and
// get_dashboard_staff_metrics RPCs. Money is always integer cents
// suffixed `_cents`; frontend divides by 100 only at display layer.
//
// `previous` and `delta_pct` are nullable: NULL when there's no prior
// period to compare (e.g. ocupacao_pct, retencao_pct) or when previous
// is zero (avoids divide-by-zero).

export interface Period {
  from: string;          // 'YYYY-MM-DD' — start of the requested range
  to: string;            // 'YYYY-MM-DD' — end of the requested range
  /**
   * Effective end of the range with data: capped at today's date so the
   * comparison period matches the actual elapsed days, not the full month
   * that hasn't happened yet.
   */
  actual_to: string;     // 'YYYY-MM-DD'
  days: number;
  previous_from: string; // 'YYYY-MM-DD'
  previous_to: string;   // 'YYYY-MM-DD'
}

export interface DashboardKPI {
  current: number;
  previous: number | null;
  delta_pct: number | null;
}

export interface HeatmapCell {
  weekday: number; // 0 = Sunday … 6 = Saturday (Postgres DOW convention)
  hour: number;    // 0–23
  count: number;
}

// Admin-side: includes last_staff_id/name so we can show who attended last.
export interface ClienteEmRisco {
  customer_id: string;
  name: string;
  phone: string | null;
  last_staff_id: string | null;
  last_staff_name: string | null;
  last_staff_photo_url: string | null;
  freq_dias: number;
  dias_sem_visita: number;
  ratio: number;
  last_visit_date: string; // ISO timestamp
  total_visitas: number;
}

// Staff-side: omits last_staff_* (it's always "me").
export interface MeuClienteEmRisco {
  customer_id: string;
  name: string;
  phone: string | null;
  freq_dias: number;
  dias_sem_visita: number;
  ratio: number;
  last_visit_date: string;
  total_visitas: number;
}

export interface BookingAmanha {
  booking_id: string;
  starts_at: string; // ISO
  customer_name: string;
  customer_phone: string | null;
  staff_id: string | null;
  staff_name: string | null;
  staff_photo_url: string | null;
  service_name: string;
  service_photo_url: string | null;
  price_cents: number;
  status: string;
}

export interface AgendaAmanha {
  total: number;
  vagos: number | null; // RPC returns NULL until slot computation lands
  sem_confirmacao: number;
  total_revenue_estimado_cents: number;
  bookings: BookingAmanha[];
}

export interface ServicoRow {
  service_id: string | null;
  name: string;
  photo_url: string | null;
  qtd: number;
  receita_cents: number;
}

export interface StaffRankingRow {
  staff_id: string;
  name: string;
  photo_url: string | null;
  atendimentos: number;
  receita_cents: number;
}

export interface AniversarianteRow {
  customer_id: string;
  name: string;
  phone: string | null;
  birthday: string;   // 'YYYY-MM-DD'
  days_until: number; // 0 = today
}

export interface TimelinePoint {
  date: string;        // 'YYYY-MM-DD'
  value_cents: number;
}

export interface ProximoHoje {
  booking_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  service_photo_url: string | null;
  starts_at: string; // ISO timestamp
  status: string;
}

export interface ComissaoProjetada {
  pendente_cents: number;
  projecao_total_cents: number;
}

// ─────── Admin payload ───────

export interface DashboardAdminPayload {
  period: Period;
  kpis: {
    faturamento_cents: DashboardKPI;
    atendimentos: DashboardKPI;
    ticket_medio_cents: DashboardKPI;
    ocupacao_pct: DashboardKPI; // previous + delta_pct sempre null
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
    bookings_cancelados_24h: number;
    clientes_sumidos_90d: number;
  };
  generated_at: string;
}

// ─────── Staff payload ───────

export interface DashboardStaffPayload {
  period: Period;
  staff_id: string;
  kpis: {
    minha_comissao_cents: DashboardKPI;
    atendimentos: DashboardKPI;
    ticket_medio_cents: DashboardKPI;
    retencao_pct: DashboardKPI; // previous + delta_pct sempre null
  };
  comissao_projetada: ComissaoProjetada;
  receita_timeline: TimelinePoint[];
  heatmap: HeatmapCell[];
  meus_clientes_em_risco: MeuClienteEmRisco[];
  proximos_hoje: ProximoHoje[];
  meus_top_servicos: ServicoRow[];
  aniversariantes_meus: AniversarianteRow[];
  generated_at: string;
}
