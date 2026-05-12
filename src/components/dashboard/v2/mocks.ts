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
  actual_to: "2026-05-12", // capped at "today" so the comparison range matches elapsed days
  days: 31,
  previous_from: "2026-04-01",
  previous_to: "2026-04-12",
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
    { customer_id: "c1", name: "Bruno Almeida",  phone: "5575999991111", last_staff_id: "st1", last_staff_name: "Adriano", last_staff_photo_url: null, freq_dias: 14, dias_sem_visita: 38, ratio: 3.21, last_visit_date: "2026-04-04T15:00:00-03:00", total_visitas: 12 },
    { customer_id: "c2", name: "Carlos Eduardo", phone: "5575999992222", last_staff_id: "st2", last_staff_name: "Carlos",  last_staff_photo_url: null, freq_dias: 21, dias_sem_visita: 47, ratio: 2.24, last_visit_date: "2026-03-26T11:00:00-03:00", total_visitas:  8 },
    { customer_id: "c3", name: "Diego Santos",   phone: "5575999993333", last_staff_id: "st1", last_staff_name: "Adriano", last_staff_photo_url: null, freq_dias: 15, dias_sem_visita: 31, ratio: 2.07, last_visit_date: "2026-04-11T16:30:00-03:00", total_visitas:  6 },
    { customer_id: "c4", name: "Eduardo Lima",   phone: null,            last_staff_id: null,  last_staff_name: null,      last_staff_photo_url: null, freq_dias: 18, dias_sem_visita: 35, ratio: 1.94, last_visit_date: "2026-04-07T10:00:00-03:00", total_visitas:  4 },
    { customer_id: "c5", name: "Fábio Rocha",    phone: "5575999995555", last_staff_id: "st3", last_staff_name: "Daniel",  last_staff_photo_url: null, freq_dias: 12, dias_sem_visita: 22, ratio: 1.83, last_visit_date: "2026-04-20T18:00:00-03:00", total_visitas:  5 },
  ],
  agenda_amanha: {
    total: 6,
    vagos: null,
    sem_confirmacao: 1,
    total_revenue_estimado_cents: 44_000,
    horas_disponiveis: 48,
    horas_ocupadas: 7,
    horas_vagas: 41,
    ocupacao_estimada_pct: 14.6,
    bookings: [
      { booking_id: "ba1", starts_at: "2026-05-13T10:00:00-03:00", customer_name: "Daniela Sanches",  customer_phone: "5575999990010", staff_id: "st1", staff_name: "Adriano", staff_photo_url: null, service_name: "Corte feminino",  service_photo_url: null, price_cents:  8_000, status: "confirmed" },
      { booking_id: "ba2", starts_at: "2026-05-13T10:30:00-03:00", customer_name: "João Pereira",     customer_phone: "5575999990011", staff_id: "st2", staff_name: "Carlos",  staff_photo_url: null, service_name: "Corte + Barba",   service_photo_url: null, price_cents:  6_500, status: "confirmed" },
      { booking_id: "ba3", starts_at: "2026-05-13T11:00:00-03:00", customer_name: "Marcos Lima",      customer_phone: "5575999990012", staff_id: "st1", staff_name: "Adriano", staff_photo_url: null, service_name: "Barba completa",  service_photo_url: null, price_cents:  3_000, status: "expired" },
      { booking_id: "ba4", starts_at: "2026-05-13T14:00:00-03:00", customer_name: "Pedro Henrique",   customer_phone: "5575999990013", staff_id: "st3", staff_name: "Daniel",  staff_photo_url: null, service_name: "Corte simples",   service_photo_url: null, price_cents:  3_000, status: "confirmed" },
      { booking_id: "ba5", starts_at: "2026-05-13T15:30:00-03:00", customer_name: "Rafael Oliveira",  customer_phone: null,             staff_id: "st1", staff_name: "Adriano", staff_photo_url: null, service_name: "Pigmentação",     service_photo_url: null, price_cents:  7_000, status: "confirmed" },
      { booking_id: "ba6", starts_at: "2026-05-13T17:00:00-03:00", customer_name: "Sergio Almeida",   customer_phone: "5575999990015", staff_id: "st2", staff_name: "Carlos",  staff_photo_url: null, service_name: "Corte + Barba",   service_photo_url: null, price_cents: 16_500, status: "confirmed" },
    ],
  },
  top_servicos: [
    { service_id: "s1", name: "Corte + Barba",        photo_url: null, qtd: 38, receita_cents: 152_000 },
    { service_id: "s2", name: "Corte simples",        photo_url: null, qtd: 31, receita_cents:  93_000 },
    { service_id: "s3", name: "Barba completa",       photo_url: null, qtd: 22, receita_cents:  66_000 },
    { service_id: "s4", name: "Sobrancelha",          photo_url: null, qtd: 18, receita_cents:  27_000 },
    { service_id: "s5", name: "Pigmentação de barba", photo_url: null, qtd: 11, receita_cents:  77_000 },
  ],
  ranking_staff: [
    { staff_id: "st1", name: "Adriano", photo_url: null, atendimentos: 84, receita_cents: 210_000 },
    { staff_id: "st2", name: "Carlos",  photo_url: null, atendimentos: 67, receita_cents: 168_500 },
    { staff_id: "st3", name: "Daniel",  photo_url: null, atendimentos: 38, receita_cents:  94_300 },
    { staff_id: "st4", name: "Eduardo", photo_url: null, atendimentos: 17, receita_cents:  41_700 },
  ],
  top_clientes_periodo: [
    { customer_id: "tc1", name: "Paulo Oliveira", phone: "5575999990201", visitas: 3, gasto_cents: 22_500, ticket_medio_cents: 7_500 },
    { customer_id: "tc2", name: "Sandra Brito",   phone: "5575999990202", visitas: 3, gasto_cents: 21_500, ticket_medio_cents: 7_167 },
    { customer_id: "tc3", name: "Antonio Carlos", phone: "5575999990203", visitas: 3, gasto_cents: 20_000, ticket_medio_cents: 6_667 },
    { customer_id: "tc4", name: "Marina Costa",   phone: "5575999990204", visitas: 2, gasto_cents: 18_000, ticket_medio_cents: 9_000 },
    { customer_id: "tc5", name: "Roberto Silva",  phone: null,             visitas: 2, gasto_cents: 15_500, ticket_medio_cents: 7_750 },
  ],
  mix_receita: [
    { source: "Atendimentos",            source_key: "booking_service",   value_cents: 247_000, pct: 64.5 },
    { source: "Assinaturas",             source_key: "subscription",      value_cents: 122_295, pct: 31.9 },
    { source: "Produtos",                source_key: "booking_product",   value_cents:   8_500, pct:  2.2 },
    { source: "Atendimentos (legado)",   source_key: "booking",           value_cents:   5_000, pct:  1.3 },
  ],
  aniversariantes_semana: [
    { customer_id: "b1", name: "Gustavo Pires",   phone: "5575999996666", birthday: "1990-05-12", days_until: 0 },
    { customer_id: "b2", name: "Henrique Souza",  phone: "5575999997777", birthday: "1988-05-12", days_until: 0 },
    { customer_id: "b3", name: "Igor Mendes",     phone: null,             birthday: "1995-05-12", days_until: 0 },
    { customer_id: "b4", name: "João Vitor Lima", phone: "5575999997778", birthday: "1992-05-12", days_until: 0 },
    { customer_id: "b5", name: "Karen Sousa",     phone: "5575999997779", birthday: "1989-05-13", days_until: 1 },
    { customer_id: "b6", name: "Lucas Ribeiro",   phone: "5575999997780", birthday: "1993-05-13", days_until: 1 },
    { customer_id: "b7", name: "Mariana Dias",    phone: "5575999997781", birthday: "1991-05-15", days_until: 3 },
    { customer_id: "b8", name: "Nicolas Almeida", phone: null,             birthday: "1994-05-16", days_until: 4 },
    { customer_id: "b9", name: "Olivia Castro",   phone: "5575999997783", birthday: "1990-05-17", days_until: 5 },
  ],
  alertas: {
    pagamentos_pendentes: 4,
    bookings_cancelados_24h: 2,
    clientes_sumidos_30d: 119,
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
    { booking_id: "b-h-1", customer_id: "cx1", customer_name: "Lucas Pinheiro", customer_phone: "5575999990001", service_name: "Corte + Barba",  service_photo_url: null, starts_at: "2026-05-12T15:00:00-03:00", status: "confirmed" },
    { booking_id: "b-h-2", customer_id: "cx2", customer_name: "Marcos Vieira",  customer_phone: "5575999990002", service_name: "Barba completa", service_photo_url: null, starts_at: "2026-05-12T16:00:00-03:00", status: "expired" },
    { booking_id: "b-h-3", customer_id: "cx3", customer_name: "Nelson Cardoso", customer_phone: null,            service_name: "Corte simples",  service_photo_url: null, starts_at: "2026-05-12T17:30:00-03:00", status: "confirmed" },
  ],
  meus_top_servicos: [
    { service_id: "s1", name: "Corte + Barba",  photo_url: null, qtd: 21, receita_cents: 84_000 },
    { service_id: "s2", name: "Corte simples",  photo_url: null, qtd: 14, receita_cents: 42_000 },
    { service_id: "s3", name: "Barba completa", photo_url: null, qtd:  8, receita_cents: 24_000 },
  ],
  aniversariantes_meus: [
    { customer_id: "mb1", name: "Gustavo Pires", phone: "5575999996666", birthday: "1990-05-13", days_until: 1 },
    { customer_id: "mb2", name: "Igor Mendes",   phone: null,             birthday: "1995-05-17", days_until: 5 },
  ],
  generated_at: "2026-05-12T16:30:00-03:00",
};
