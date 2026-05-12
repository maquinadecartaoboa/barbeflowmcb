import type { DashboardAdminPayload, DashboardStaffPayload, HeatmapCell, TimelinePoint } from "./types";

// Deterministic mock payloads, shaped exactly like the RPCs return.
// Used only by /dashboard/preview for QA — never reaches the live page.

function pseudo(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildTimeline(days: number, base: number, jitter: number): TimelinePoint[] {
  const out: TimelinePoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const noise = (pseudo(i + 1) - 0.5) * 2 * jitter;
    out.push({
      date: d.toISOString().slice(0, 10),
      value_cents: Math.max(0, Math.round(base + noise)),
    });
  }
  return out;
}

function buildHeatmap(weekdayPeaks: number[], hourPeaks: number[]): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let w = 0; w < 7; w++) {
    for (let h = 8; h <= 20; h++) {
      const peak = weekdayPeaks.includes(w) && hourPeaks.includes(h);
      const mid = !peak && hourPeaks.includes(h);
      const count = peak
        ? 6 + Math.round(pseudo(w * 24 + h) * 4)
        : mid
        ? 2 + Math.round(pseudo(w * 24 + h + 0.5) * 3)
        : Math.round(pseudo(w * 24 + h + 0.7) * 2);
      if (count > 0) cells.push({ weekday: w, hour: h, count });
    }
  }
  return cells;
}

const PERIOD = {
  from: "2026-05-01",
  to: "2026-05-31",
  days: 31,
  previous_from: "2026-03-31",
  previous_to: "2026-04-30",
};

export const MOCK_ADMIN: DashboardAdminPayload = {
  period: PERIOD,
  kpis: {
    faturamento_cents: { current: 423_050, previous: 377_020, delta_pct: 12.2 },
    atendimentos:       { current: 184,    previous: 162,    delta_pct: 13.6 },
    ticket_medio_cents: { current: 2_300,  previous: 2_330,  delta_pct: -1.3 },
    ocupacao_pct:       { current: 72,     previous: null,   delta_pct: null },
  },
  receita_timeline: buildTimeline(30, 14_000, 6_000),
  heatmap: buildHeatmap([5, 6], [10, 11, 14, 15, 17, 18]),
  clientes_em_risco: [
    { customer_id: "c1", name: "Bruno Almeida",  phone: "5575999991111", last_staff_id: "st1", last_staff_name: "Adriano", freq_dias: 14, dias_sem_visita: 38, ratio: 2.71, last_visit_date: "2026-04-04T15:00:00-03:00", total_visitas: 12 },
    { customer_id: "c2", name: "Carlos Eduardo", phone: "5575999992222", last_staff_id: "st2", last_staff_name: "Carlos",  freq_dias: 21, dias_sem_visita: 47, ratio: 2.24, last_visit_date: "2026-03-26T11:00:00-03:00", total_visitas:  8 },
    { customer_id: "c3", name: "Diego Santos",   phone: "5575999993333", last_staff_id: "st1", last_staff_name: "Adriano", freq_dias: 15, dias_sem_visita: 31, ratio: 2.07, last_visit_date: "2026-04-11T16:30:00-03:00", total_visitas:  6 },
    { customer_id: "c4", name: "Eduardo Lima",   phone: null,            last_staff_id: null,  last_staff_name: null,      freq_dias: 18, dias_sem_visita: 35, ratio: 1.94, last_visit_date: "2026-04-07T10:00:00-03:00", total_visitas:  4 },
    { customer_id: "c5", name: "Fábio Rocha",    phone: "5575999995555", last_staff_id: "st3", last_staff_name: "Daniel",  freq_dias: 12, dias_sem_visita: 22, ratio: 1.83, last_visit_date: "2026-04-20T18:00:00-03:00", total_visitas:  5 },
  ],
  agenda_amanha: {
    total: 12,
    vagos: null,
    sem_confirmacao: 5,
    total_revenue_estimado_cents: 48_000,
  },
  top_servicos: [
    { service_id: "s1", name: "Corte + Barba",        qtd: 38, receita_cents: 152_000 },
    { service_id: "s2", name: "Corte simples",        qtd: 31, receita_cents:  93_000 },
    { service_id: "s3", name: "Barba completa",       qtd: 22, receita_cents:  66_000 },
    { service_id: "s4", name: "Sobrancelha",          qtd: 18, receita_cents:  27_000 },
    { service_id: "s5", name: "Pigmentação de barba", qtd: 11, receita_cents:  77_000 },
  ],
  ranking_staff: [
    { staff_id: "st1", name: "Adriano", atendimentos: 84, receita_cents: 210_000 },
    { staff_id: "st2", name: "Carlos",  atendimentos: 67, receita_cents: 168_500 },
    { staff_id: "st3", name: "Daniel",  atendimentos: 38, receita_cents:  94_300 },
    { staff_id: "st4", name: "Eduardo", atendimentos: 17, receita_cents:  41_700 },
  ],
  aniversariantes_semana: [
    { customer_id: "b1", name: "Gustavo Pires",  phone: "5575999996666", birthday: "1990-05-13", days_until: 1 },
    { customer_id: "b2", name: "Henrique Souza", phone: "5575999997777", birthday: "1988-05-15", days_until: 3 },
    { customer_id: "b3", name: "Igor Mendes",    phone: null,             birthday: "1995-05-17", days_until: 5 },
  ],
  alertas: {
    pagamentos_pendentes: 4,
    bookings_cancelados_24h: 2,
    clientes_sumidos_90d: 8,
  },
  generated_at: "2026-05-12T16:30:00-03:00",
};

export const MOCK_STAFF: DashboardStaffPayload = {
  period: PERIOD,
  staff_id: "st-mock-1",
  kpis: {
    minha_comissao_cents: { current: 184_000, previous: 160_000, delta_pct: 15.0 },
    atendimentos:         { current: 47,      previous: 41,      delta_pct: 14.6 },
    ticket_medio_cents:   { current: 3_915,   previous: 3_902,   delta_pct: 0.3 },
    retencao_pct:         { current: 62,      previous: null,    delta_pct: null },
  },
  comissao_projetada: {
    pendente_cents: 28_000,
    projecao_total_cents: 212_000,
  },
  receita_timeline: buildTimeline(30, 6_500, 3_500),
  heatmap: buildHeatmap([2, 5, 6], [10, 14, 17]),
  meus_clientes_em_risco: [
    { customer_id: "mc1", name: "Bruno Almeida", phone: "5575999991111", freq_dias: 14, dias_sem_visita: 38, ratio: 2.71, last_visit_date: "2026-04-04T15:00:00-03:00", total_visitas: 12 },
    { customer_id: "mc2", name: "Fábio Rocha",   phone: "5575999995555", freq_dias: 12, dias_sem_visita: 22, ratio: 1.83, last_visit_date: "2026-04-20T18:00:00-03:00", total_visitas:  5 },
    { customer_id: "mc3", name: "João Carvalho", phone: "5575999998888", freq_dias: 30, dias_sem_visita: 51, ratio: 1.70, last_visit_date: "2026-03-22T19:00:00-03:00", total_visitas:  3 },
  ],
  proximos_hoje: [
    { booking_id: "b-h-1", customer_id: "cx1", customer_name: "Lucas Pinheiro", customer_phone: "5575999990001", service_name: "Corte + Barba",  starts_at: "2026-05-12T15:00:00-03:00", status: "confirmed" },
    { booking_id: "b-h-2", customer_id: "cx2", customer_name: "Marcos Vieira",  customer_phone: "5575999990002", service_name: "Barba completa", starts_at: "2026-05-12T16:00:00-03:00", status: "expired" },
    { booking_id: "b-h-3", customer_id: "cx3", customer_name: "Nelson Cardoso", customer_phone: null,            service_name: "Corte simples",  starts_at: "2026-05-12T17:30:00-03:00", status: "confirmed" },
  ],
  meus_top_servicos: [
    { service_id: "s1", name: "Corte + Barba",  qtd: 21, receita_cents: 84_000 },
    { service_id: "s2", name: "Corte simples",  qtd: 14, receita_cents: 42_000 },
    { service_id: "s3", name: "Barba completa", qtd:  8, receita_cents: 24_000 },
  ],
  aniversariantes_meus: [
    { customer_id: "mb1", name: "Gustavo Pires", phone: "5575999996666", birthday: "1990-05-13", days_until: 1 },
    { customer_id: "mb2", name: "Igor Mendes",   phone: null,             birthday: "1995-05-17", days_until: 5 },
  ],
  generated_at: "2026-05-12T16:30:00-03:00",
};
