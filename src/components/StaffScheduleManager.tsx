import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Plus, Edit, Trash2 } from "lucide-react";

interface Schedule {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  active: boolean;
}

interface StaffScheduleManagerProps {
  staffId: string;
  staffName: string;
}

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira", 
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

export const StaffScheduleManager = ({ staffId, staffName }: StaffScheduleManagerProps) => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    weekday: 0,
    start_time: "09:00",
    end_time: "18:00",
    break_start: "",
    break_end: "",
    active: true
  });

  useEffect(() => {
    loadSchedules();
  }, [staffId]);

  const loadSchedules = async () => {
    if (!currentTenant || !staffId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('staff_id', staffId)
        .order('weekday');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar horários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    try {
      setFormLoading(true);

      // Validate times
      if (formData.start_time >= formData.end_time) {
        toast({
          title: "Erro",
          description: "O horário de início deve ser anterior ao horário de fim",
          variant: "destructive",
        });
        return;
      }

      if (formData.break_start && formData.break_end) {
        if (formData.break_start >= formData.break_end) {
          toast({
            title: "Erro",
            description: "O início do intervalo deve ser anterior ao fim do intervalo",
            variant: "destructive",
          });
          return;
        }
      }

      // Check if schedule already exists for this weekday
      const existingSchedule = schedules.find(s => 
        s.weekday === formData.weekday && s.id !== editingSchedule?.id
      );

      if (existingSchedule) {
        toast({
          title: "Erro",
          description: `Já existe um horário para ${WEEKDAYS[formData.weekday]}`,
          variant: "destructive",
        });
        return;
      }

      const scheduleData = {
        tenant_id: currentTenant.id,
        staff_id: staffId,
        weekday: formData.weekday,
        start_time: formData.start_time,
        end_time: formData.end_time,
        break_start: formData.break_start || null,
        break_end: formData.break_end || null,
        active: formData.active
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Horário atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert(scheduleData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Horário adicionado com sucesso",
        });
      }

      setShowForm(false);
      setEditingSchedule(null);
      setFormData({
        weekday: 0,
        start_time: "09:00",
        end_time: "18:00",
        break_start: "",
        break_end: "",
        active: true
      });
      loadSchedules();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar horário",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      weekday: schedule.weekday,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_start: schedule.break_start || "",
      break_end: schedule.break_end || "",
      active: schedule.active
    });
    setShowForm(true);
  };

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm(`Excluir horário de ${WEEKDAYS[schedule.weekday]}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Horário excluído com sucesso",
      });

      loadSchedules();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir horário",
        variant: "destructive",
      });
    }
  };

  const toggleScheduleStatus = async (schedule: Schedule) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ active: !schedule.active })
        .eq('id', schedule.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Horário ${!schedule.active ? 'ativado' : 'desativado'} com sucesso`,
      });

      loadSchedules();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Horários de Trabalho
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure os horários de trabalho de {staffName}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingSchedule(null);
                setFormData({
                  weekday: 0,
                  start_time: "09:00",
                  end_time: "18:00",
                  break_start: "",
                  break_end: "",
                  active: true
                });
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Horário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">Nenhum horário configurado</p>
              <p className="text-sm">
                Configure os horários de trabalho para permitir agendamentos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={schedule.active ? "default" : "secondary"}>
                      {WEEKDAYS[schedule.weekday]}
                    </Badge>
                    <div className="text-sm">
                      <span className="font-medium">
                        {schedule.start_time} - {schedule.end_time}
                      </span>
                      {schedule.break_start && schedule.break_end && (
                        <span className="ml-2 text-muted-foreground">
                          (Intervalo: {schedule.break_start} - {schedule.break_end})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedule.active}
                      onCheckedChange={() => toggleScheduleStatus(schedule)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(schedule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Editar Horário' : 'Novo Horário'}
            </DialogTitle>
            <DialogDescription>
              Configure o horário de trabalho para {staffName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="weekday">Dia da Semana</Label>
              <select
                id="weekday"
                className="w-full mt-1 p-2 border border-border rounded-md bg-background"
                value={formData.weekday}
                onChange={(e) => setFormData({ ...formData, weekday: parseInt(e.target.value) })}
              >
                {WEEKDAYS.map((day, index) => (
                  <option key={index} value={index}>
                    {day}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Hora de Início</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">Hora de Fim</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="break_start">Início do Intervalo (opcional)</Label>
                <Input
                  id="break_start"
                  type="time"
                  value={formData.break_start}
                  onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="break_end">Fim do Intervalo (opcional)</Label>
                <Input
                  id="break_end"
                  type="time"
                  value={formData.break_end}
                  onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Horário ativo</Label>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Salvando..." : editingSchedule ? "Atualizar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};