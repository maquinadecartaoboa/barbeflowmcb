import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HeatmapCell } from "./types";

interface HeatmapWeekHourProps {
  cells: HeatmapCell[];
  title?: string;
  description?: string;
  hourRange?: [number, number]; // inclusive both ends; default [8, 20]
}

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function HeatmapWeekHour({
  cells,
  title = "Picos da semana",
  description = "Dia da semana × hora do dia",
  hourRange = [8, 20],
}: HeatmapWeekHourProps) {
  const [hStart, hEnd] = hourRange;

  // Pivot the sparse cells into a (7 × hours) lookup with max for color scale.
  const { matrix, max } = useMemo(() => {
    const m: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: hEnd - hStart + 1 }, () => 0)
    );
    let maxVal = 0;
    for (const c of cells) {
      if (c.hour < hStart || c.hour > hEnd) continue;
      m[c.weekday][c.hour - hStart] = c.count;
      if (c.count > maxVal) maxVal = c.count;
    }
    return { matrix: m, max: maxVal };
  }, [cells, hStart, hEnd]);

  const hours = useMemo(
    () => Array.from({ length: hEnd - hStart + 1 }, (_, i) => hStart + i),
    [hStart, hEnd]
  );

  const intensity = (count: number): string => {
    if (max === 0 || count === 0) return "bg-muted/40";
    const ratio = count / max;
    if (ratio >= 0.8) return "bg-primary/90 text-primary-foreground";
    if (ratio >= 0.6) return "bg-primary/70 text-primary-foreground";
    if (ratio >= 0.4) return "bg-primary/45 text-foreground";
    if (ratio >= 0.2) return "bg-primary/25 text-foreground";
    return "bg-primary/10 text-foreground";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hour header */}
            <div className="flex items-center gap-1 pl-8 mb-1">
              {hours.map((h) => (
                <div
                  key={h}
                  className="w-6 text-center text-[10px] text-muted-foreground tabular-nums"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Weekday rows */}
            {WEEKDAY_LABELS.map((label, w) => (
              <div key={w} className="flex items-center gap-1 mb-1">
                <div
                  className="w-7 text-xs font-medium text-muted-foreground"
                  title={WEEKDAY_FULL[w]}
                >
                  {label}
                </div>
                {hours.map((h, idx) => {
                  const count = matrix[w][idx];
                  return (
                    <div
                      key={h}
                      className={cn(
                        "w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-medium tabular-nums",
                        intensity(count)
                      )}
                      title={`${WEEKDAY_FULL[w]} ${h}:00 — ${count} atendimento${count !== 1 ? "s" : ""}`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
          <span>menos</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-muted/40" />
            <div className="w-3 h-3 rounded-sm bg-primary/10" />
            <div className="w-3 h-3 rounded-sm bg-primary/25" />
            <div className="w-3 h-3 rounded-sm bg-primary/45" />
            <div className="w-3 h-3 rounded-sm bg-primary/70" />
            <div className="w-3 h-3 rounded-sm bg-primary/90" />
          </div>
          <span>mais</span>
        </div>
      </CardContent>
    </Card>
  );
}
