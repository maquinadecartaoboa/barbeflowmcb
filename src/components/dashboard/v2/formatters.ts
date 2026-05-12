import { format, isSameDay, isSameMonth, isSameYear, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Pretty-print a date range in pt-BR using the most compact form that
 * keeps the meaning clear.
 *
 *   2026-04-01 → 2026-04-12  →  "01–12 abr"
 *   2026-03-31 → 2026-04-30  →  "31 mar – 30 abr"
 *   2026-12-20 → 2027-01-05  →  "20 dez 26 – 05 jan 27"
 *   2026-05-12 → 2026-05-12  →  "12 mai"
 */
export function formatPeriodLabel(fromIso: string, toIso: string): string {
  const f = parseISO(fromIso);
  const t = parseISO(toIso);

  if (isSameDay(f, t)) {
    return format(f, "dd MMM", { locale: ptBR });
  }
  if (isSameMonth(f, t)) {
    return `${format(f, "dd", { locale: ptBR })}–${format(t, "dd MMM", { locale: ptBR })}`;
  }
  if (isSameYear(f, t)) {
    return `${format(f, "dd MMM", { locale: ptBR })} – ${format(t, "dd MMM", { locale: ptBR })}`;
  }
  return `${format(f, "dd MMM yy", { locale: ptBR })} – ${format(t, "dd MMM yy", { locale: ptBR })}`;
}
