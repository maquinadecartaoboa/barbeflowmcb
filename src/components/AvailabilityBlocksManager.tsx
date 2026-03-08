import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Plus,
  Calendar,
  CalendarDays,
  Clock,
  Trash2,
  Loader2,
  CalendarOff,
  Lock,
  X,
} from "lucide-react";
import { parseISO, isBefore, startOfDay, format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

type BlockMode = "dates" | "weekdays";
type RepeatMode = "dates" | "weekdays" | "everyday";

const WEEKDAY_LABELS = [
  { value: "0", short: "Dom", full: "Domingo" },
  { value: "1", short: "Seg", full: "Segunda-feira" },
  { value: "2", short: "Ter", full: "Terça-feira" },
  { value: "3", short: "Qua", full: "Quarta-feira" },
  { value: "4", short: "Qui", full: "Quinta-feira" },
  { value: "5", short: "Sex", full: "Sexta-feira" },
  { value: "6", short: "Sáb", full: "Sábado" },
];

const TIMEZONE = "America/Bahia";

interface Block {
  id: string;
  tenant_id: string;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
}

interface Staff {
  id: string;
  name: string;
}

interface BlockPattern {
  key: string;
  startTime: string;
  endTime: string;
  staffId: string | null;
  staffName: string;
  reason: string | null;
  dates: string[];
  blockIds: string[];
  isAllDay: boolean;
  lastDate: string;
}

interface AvailabilityBlocksManagerProps {
  tenantId: string;
}

/* ── Helper: detect weekday pattern ── */
function detectWeekdays(dates: string[]): string {
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dates) {
    const dow = new Date(d + "T12:00:00").getDay();
    dayCounts[dow]++;
  }

  const activeDays = dayCounts
    .map((count, i) => ({ day: i, count }))
    .filter((d) => d.count > 0);

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const hasWeekdays = [1, 2, 3, 4, 5].every((d) => dayCounts[d] > 0);
  const onlyWeekdays = hasWeekdays && !dayCounts[0] && !dayCounts[6];
  const onlySunday = dayCounts[0] > 0 && activeDays.length === 1;
  const onlySaturday = dayCounts[6] > 0 && activeDays.length === 1;
  const everyday = activeDays.length === 7;

  if (everyday) return "Todos os dias";
  if (onlyWeekdays) return "Seg a Sex";
  if (onlySunday) return "Domingos";
  if (onlySaturday) return "Sábados";

  return activeDays.map((d) => dayNames[d.day]).join(", ");
}

/* ── Group blocks into patterns ── */
function groupBlocksIntoPatterns(blocks: Block[], staff: Staff[]): { recurring: BlockPattern[]; single: BlockPattern[] } {
  const patterns = new Map<string, BlockPattern>();
  const getStaffName = (staffId: string | null) => {
    if (!staffId) return "Todos os profissionais";
    return staff.find((s) => s.id === staffId)?.name || "Profissional";
  };

  for (const block of blocks) {
    const start = parseISO(block.starts_at);
    const end = parseISO(block.ends_at);

    const startTime = formatInTimeZone(start, TIMEZONE, "HH:mm");
    const endTime = formatInTimeZone(end, TIMEZONE, "HH:mm");
    const dateStr = formatInTimeZone(start, TIMEZONE, "yyyy-MM-dd");

    const durationHours = (end.getTime() - start.getTime()) / 3600000;
    const isAllDay = durationHours >= 20;

    const key = `${startTime}-${endTime}-${block.staff_id || "all"}-${block.reason || ""}`;

    if (!patterns.has(key)) {
      patterns.set(key, {
        key,
        startTime,
        endTime,
        staffId: block.staff_id,
        staffName: getStaffName(block.staff_id),
        reason: block.reason,
        dates: [],
        blockIds: [],
        isAllDay,
        lastDate: dateStr,
      });
    }

    const p = patterns.get(key)!;
    p.dates.push(dateStr);
    p.blockIds.push(block.id);
    if (dateStr > p.lastDate) p.lastDate = dateStr;
  }

  const all = [...patterns.values()];
  const recurring = all.filter((p) => p.dates.length > 3).sort((a, b) => b.dates.length - a.dates.length);
  const single = all.filter((p) => p.dates.length <= 3);

  return { recurring, single };
}

export function AvailabilityBlocksManager({ tenantId }: AvailabilityBlocksManagerProps) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("weekdays");
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [duration, setDuration] = useState("26"); // weeks
  const [isFullDay, setIsFullDay] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [blocksResult, staffResult] = await Promise.all([
        supabase
          .from("blocks")
          .select("*")
          .eq("tenant_id", tenantId)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true }),
        supabase
          .from("staff")
          .select("id, name")
          .eq("tenant_id", tenantId)
          .eq("active", true)
          .order("name"),
      ]);

      if (blocksResult.error) throw blocksResult.error;
      if (staffResult.error) throw staffResult.error;

      setBlocks(blocksResult.data || []);
      setStaff(staffResult.data || []);
    } catch (error) {
      console.error("Error loading blocks:", error);
      toast({ title: "Erro", description: "Erro ao carregar bloqueios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const { recurring, single } = useMemo(() => groupBlocksIntoPatterns(blocks, staff), [blocks, staff]);

  /* ── Create block ── */
  const addDate = () => {
    if (dateInput && !dates.includes(dateInput)) {
      setDates((prev) => [...prev, dateInput].sort());
      setDateInput("");
    }
  };

  const removeDate = (d: string) => setDates((prev) => prev.filter((x) => x !== d));

  const generateDates = (): string[] => {
    const weeks = parseInt(duration) || 26;
    const result: string[] = [];
    const today = new Date();

    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dow = d.getDay().toString();

      if (repeatMode === "everyday") {
        result.push(d.toISOString().split("T")[0]);
      } else if (repeatMode === "weekdays" && selectedWeekdays.includes(dow)) {
        result.push(d.toISOString().split("T")[0]);
      }
    }
    return result;
  };

  const totalBlocks = repeatMode === "dates" ? dates.length : generateDates().length;

  const resetForm = () => {
    setRepeatMode("weekdays");
    setDates([]);
    setDateInput("");
    setSelectedWeekdays([]);
    setDuration("26");
    setIsFullDay(false);
    setStartTime("08:00");
    setEndTime("09:00");
    setSelectedStaff("all");
    setReason("");
  };

  const handleCreateBlock = async () => {
    const targetDates = repeatMode === "dates" ? dates : generateDates();
    if (targetDates.length === 0) {
      toast({ title: "Selecione ao menos uma data ou dia da semana", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const sTime = isFullDay ? "00:00" : startTime;
      const eTime = isFullDay ? "23:59" : endTime;

      const rows = targetDates.map((date) => ({
        tenant_id: tenantId,
        staff_id: selectedStaff === "all" ? null : selectedStaff,
        starts_at: `${date}T${sTime}:00-03:00`,
        ends_at: `${date}T${eTime}:00-03:00`,
        reason: reason || null,
      }));

      // Insert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        const { error } = await supabase.from("blocks").insert(batch);
        if (error) throw error;
      }

      toast({ title: "Bloqueio criado", description: `${targetDates.length} dia(s) bloqueado(s)` });
      resetForm();
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao criar bloqueio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete pattern (bulk) ── */
  const handleDeletePattern = async (pattern: BlockPattern) => {
    try {
      setDeleting(pattern.key);
      // Delete in batches of 500
      for (let i = 0; i < pattern.blockIds.length; i += 500) {
        const batch = pattern.blockIds.slice(i, i + 500);
        const { error } = await supabase.from("blocks").delete().in("id", batch);
        if (error) throw error;
      }

      toast({ title: `${pattern.dates.length} bloqueios removidos` });
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao excluir", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  /* ── Delete single block ── */
  const handleDeleteSingle = async (blockId: string) => {
    try {
      const { error } = await supabase.from("blocks").delete().eq("id", blockId);
      if (error) throw error;
      toast({ title: "Bloqueio removido" });
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao remover", variant: "destructive" });
    }
  };

  const formatDateBR = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const formatLastDateBR = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Bloqueios de Agenda</h3>
          <p className="text-sm text-muted-foreground">Gerencie os horários bloqueados do seu estabelecimento</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Bloqueio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Bloqueio</DialogTitle>
              <DialogDescription>Bloqueie horários para impedir agendamentos</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Type: full day or specific time */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Dia inteiro</Label>
                  <p className="text-xs text-muted-foreground">Bloquear o dia completo</p>
                </div>
                <Switch checked={isFullDay} onCheckedChange={setIsFullDay} />
              </div>

              {/* Time */}
              {!isFullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Início</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Fim</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Staff */}
              <div className="space-y-1.5">
                <Label className="text-sm">Profissional</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Repetition */}
              <div>
                <Label className="text-sm mb-2 block">Repetição</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRepeatMode("dates")}
                    className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center ${
                      repeatMode === "dates"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Calendar className="h-4 w-4 mx-auto mb-1" />
                    Data específica
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatMode("weekdays")}
                    className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center ${
                      repeatMode === "weekdays"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <CalendarDays className="h-4 w-4 mx-auto mb-1" />
                    Dias da semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatMode("everyday")}
                    className={`p-2.5 rounded-lg border text-xs font-medium transition-all text-center ${
                      repeatMode === "everyday"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <CalendarOff className="h-4 w-4 mx-auto mb-1" />
                    Todos os dias
                  </button>
                </div>
              </div>

              {/* Dates mode */}
              {repeatMode === "dates" && (
                <div className="space-y-2">
                  <Label className="text-sm">Datas</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      min={formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd")}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addDate();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addDate} disabled={!dateInput}>
                      Adicionar
                    </Button>
                  </div>
                  {dates.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {dates.map((d) => (
                        <Badge key={d} variant="secondary" className="gap-1 pr-1">
                          {formatDateBR(d)}
                          <button onClick={() => removeDate(d)} className="hover:text-destructive transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Weekdays mode */}
              {repeatMode === "weekdays" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm mb-2 block">Dias da semana</Label>
                    <ToggleGroup
                      type="multiple"
                      value={selectedWeekdays}
                      onValueChange={setSelectedWeekdays}
                      className="flex flex-wrap gap-1"
                    >
                      {WEEKDAY_LABELS.map((w) => (
                        <ToggleGroupItem
                          key={w.value}
                          value={w.value}
                          className="text-xs px-2.5 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                        >
                          {w.short}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </div>
              )}

              {/* Duration (for weekdays and everyday) */}
              {(repeatMode === "weekdays" || repeatMode === "everyday") && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Até quando</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="13">3 meses</SelectItem>
                      <SelectItem value="26">6 meses</SelectItem>
                      <SelectItem value="52">12 meses</SelectItem>
                    </SelectContent>
                  </Select>
                  {(repeatMode === "weekdays" ? selectedWeekdays.length > 0 : true) && (
                    <p className="text-xs text-muted-foreground">
                      {generateDates().length} dia(s) serão bloqueados
                    </p>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-sm">Motivo (opcional)</Label>
                <Textarea
                  placeholder="Ex: Intervalo, folga, férias..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleCreateBlock} disabled={saving || totalBlocks === 0}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  `Criar bloqueio${totalBlocks > 1 ? ` (${totalBlocks} dias)` : ""}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {blocks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarOff className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum bloqueio</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Adicione bloqueios para fechar dias ou horários específicos da sua agenda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Recurring patterns */}
          {recurring.length > 0 && (
            <div className="space-y-3">
              {recurring.map((pattern) => (
                <Card key={pattern.key} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Lock className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {pattern.reason || (pattern.isAllDay ? "Dia bloqueado" : `${pattern.startTime} — ${pattern.endTime}`)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pattern.isAllDay ? "Dia inteiro" : `${pattern.startTime} — ${pattern.endTime}`}
                            {" · "}
                            {detectWeekdays(pattern.dates)}
                            {" · "}
                            {pattern.staffName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pattern.dates.length} dias bloqueados · até {formatLastDateBR(pattern.lastDate)}
                          </p>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive flex-shrink-0"
                            disabled={deleting === pattern.key}
                          >
                            {deleting === pattern.key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir bloqueio</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remover {pattern.dates.length} bloqueios de{" "}
                              {pattern.isAllDay ? "dia inteiro" : `${pattern.startTime} às ${pattern.endTime}`}?
                              Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePattern(pattern)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir todos
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Single blocks */}
          {single.length > 0 && (
            <div className="space-y-3">
              {recurring.length > 0 && (
                <h4 className="text-sm font-medium text-muted-foreground">
                  Bloqueios avulsos ({single.reduce((acc, p) => acc + p.dates.length, 0)})
                </h4>
              )}
              {single.map((pattern) =>
                pattern.dates.map((dateStr, idx) => {
                  const blockId = pattern.blockIds[idx];
                  const dateObj = new Date(dateStr + "T12:00:00");
                  const dayLabel = formatInTimeZone(
                    dateObj,
                    TIMEZONE,
                    "EEEE, dd/MM",
                    { locale: ptBR }
                  );

                  return (
                    <Card key={blockId} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground capitalize">
                                {dayLabel}
                                {" · "}
                                {pattern.isAllDay ? "Dia inteiro" : `${pattern.startTime} — ${pattern.endTime}`}
                                {" · "}
                                {pattern.staffName}
                              </p>
                              {pattern.reason && (
                                <p className="text-xs text-muted-foreground">
                                  Motivo: {pattern.reason}
                                </p>
                              )}
                            </div>
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive flex-shrink-0">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover bloqueio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O período ficará disponível novamente para agendamentos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteSingle(blockId)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
