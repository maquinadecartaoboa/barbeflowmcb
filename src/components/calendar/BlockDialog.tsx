import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffMember } from "@/hooks/useBookingsByDate";

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  defaultDate?: string;
  onCreated: () => void;
}

export function BlockDialog({ open, onOpenChange, staff, defaultDate, onCreated }: BlockDialogProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [staffId, setStaffId] = useState<string>("all");
  const [date, setDate] = useState(defaultDate || "");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentTenant || !date) return;
    setSaving(true);
    try {
      const startsAt = `${date}T${startTime}:00-03:00`;
      const endsAt = `${date}T${endTime}:00-03:00`;

      const { error } = await supabase.from("blocks").insert({
        tenant_id: currentTenant.id,
        staff_id: staffId === "all" ? null : staffId,
        starts_at: startsAt,
        ends_at: endsAt,
        reason: reason || null,
      });

      if (error) throw error;

      toast({ title: "Bloqueio criado", description: "Horário bloqueado com sucesso" });
      onCreated();
      onOpenChange(false);
      // Reset
      setStaffId("all");
      setReason("");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao criar bloqueio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bloquear Horário</DialogTitle>
          <DialogDescription>Bloqueie um período para impedir agendamentos</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Profissional</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os profissionais</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Fim</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Reunião, Folga..." className="mt-1 resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !date}>
            {saving ? "Salvando..." : "Bloquear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
