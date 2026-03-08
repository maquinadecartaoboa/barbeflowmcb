import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { dashPath } from "@/lib/hostname";
import logoBranca from "@/assets/modoGESTOR_branca.png";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Scissors, Clock, Plug, Check, Plus, Trash2, Copy, Loader2,
  CreditCard, MessageCircle, PartyPopper, Share2,
} from "lucide-react";

const STEPS = [
  { icon: Store, label: "Seu Negócio" },
  { icon: Scissors, label: "Serviços" },
  { icon: Clock, label: "Horários" },
  { icon: Plug, label: "Ferramentas" },
];

const SERVICE_SUGGESTIONS = [
  { name: "Corte de Cabelo", duration: 30, price: 4000 },
  { name: "Barba", duration: 20, price: 2500 },
  { name: "Corte + Barba", duration: 45, price: 5500 },
  { name: "Sobrancelha", duration: 15, price: 1500 },
  { name: "Hidratação", duration: 30, price: 3500 },
];

const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

interface AddedService {
  id?: string;
  name: string;
  duration: number;
  price: number;
}

export default function OnboardingWizard() {
  usePageTitle("Configuração");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentTenant } = useTenant();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Step 1 — Profile
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 — Services
  const [services, setServices] = useState<AddedService[]>([]);
  const [newName, setNewName] = useState("");
  const [newDuration, setNewDuration] = useState("30");
  const [newPrice, setNewPrice] = useState("");

  // Step 3 — Schedule
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("19:00");
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");
  const [hasBreak, setHasBreak] = useState(true);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5, 6]);

  // Pre-fill from tenant
  useEffect(() => {
    if (currentTenant) {
      setBusinessName(currentTenant.name || "");
      setPhone(currentTenant.phone || "");
      setAddress(currentTenant.address || "");
    }
  }, [currentTenant]);

  const tenantId = currentTenant?.id;

  const getOwnerStaffId = async (): Promise<string | null> => {
    if (!tenantId) return null;
    const { data } = await supabase
      .from("staff")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("is_owner", true)
      .single();
    return data?.id || null;
  };

  // ─── Step handlers ───

  const handleStep1Next = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      await supabase.from("tenants").update({
        name: businessName,
        phone,
        address,
      }).eq("id", tenantId);
      await supabase.rpc("update_onboarding_step", { p_step: "profile", p_value: true });
      setStep(1);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addSuggestion = async (svc: typeof SERVICE_SUGGESTIONS[0]) => {
    if (!tenantId) return;
    const { data, error } = await supabase.from("services").insert({
      tenant_id: tenantId,
      name: svc.name,
      duration_minutes: svc.duration,
      price_cents: svc.price,
      active: true,
    }).select("id").single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    // Link to owner staff
    const ownerId = await getOwnerStaffId();
    if (ownerId && data) {
      await supabase.from("staff_services").insert({ staff_id: ownerId, service_id: data.id });
    }
    setServices((prev) => [...prev, { id: data?.id, name: svc.name, duration: svc.duration, price: svc.price }]);
  };

  const addManualService = async () => {
    if (!newName.trim() || !tenantId) return;
    const priceCents = Math.round(parseFloat(newPrice.replace(",", ".") || "0") * 100);
    const dur = parseInt(newDuration) || 30;
    const { data, error } = await supabase.from("services").insert({
      tenant_id: tenantId,
      name: newName.trim(),
      duration_minutes: dur,
      price_cents: priceCents,
      active: true,
    }).select("id").single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    const ownerId = await getOwnerStaffId();
    if (ownerId && data) {
      await supabase.from("staff_services").insert({ staff_id: ownerId, service_id: data.id });
    }
    setServices((prev) => [...prev, { id: data?.id, name: newName.trim(), duration: dur, price: priceCents }]);
    setNewName("");
    setNewPrice("");
  };

  const removeService = async (idx: number) => {
    const svc = services[idx];
    if (svc.id) {
      await supabase.from("services").update({ active: false }).eq("id", svc.id);
    }
    setServices((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleStep2Next = async () => {
    if (services.length === 0) {
      toast({ title: "Adicione pelo menos 1 serviço", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await supabase.rpc("update_onboarding_step", { p_step: "services", p_value: true });
      setStep(2);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStep3Next = async () => {
    if (!tenantId || selectedDays.length === 0) return;
    setSaving(true);
    try {
      const ownerId = await getOwnerStaffId();
      if (!ownerId) throw new Error("Staff owner não encontrado");

      // Delete existing schedules for this staff
      await supabase.from("schedules").delete().eq("staff_id", ownerId).eq("tenant_id", tenantId);

      // Create new schedules
      const inserts = selectedDays.map((day) => ({
        tenant_id: tenantId,
        staff_id: ownerId,
        weekday: day,
        start_time: startTime,
        end_time: endTime,
        break_start: hasBreak ? breakStart : null,
        break_end: hasBreak ? breakEnd : null,
      }));
      const { error } = await supabase.from("schedules").insert(inserts);
      if (error) throw error;
      await supabase.rpc("update_onboarding_step", { p_step: "schedule", p_value: true });
      setStep(3);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Mark onboarding as completed
      await supabase
        .from("onboarding_progress")
        .update({ onboarding_completed: true, completed_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);
      setCompleted(true);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      await supabase.rpc("skip_onboarding");
    } catch { /* ignore */ }
    navigate(dashPath("/app/dashboard"), { replace: true });
  };

  const slug = currentTenant?.slug || "";
  const publicUrl = `https://modogestor.com.br/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast({ title: "Link copiado!" });
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Agende comigo pelo link: ${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // ─── Completion screen ───
  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <PartyPopper className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Tudo pronto para receber clientes!</h1>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Seu link de agendamento:</p>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
              <span className="text-sm text-foreground truncate flex-1">{publicUrl}</span>
              <Button variant="ghost" size="icon" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Compartilhe com seus clientes por WhatsApp, Instagram ou onde preferir!
          </p>
          <div className="space-y-2">
            <Button onClick={shareWhatsApp} variant="outline" className="w-full">
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar no WhatsApp
            </Button>
            <Button onClick={() => navigate(dashPath("/app/dashboard"), { replace: true })} className="w-full">
              Ir para o Dashboard →
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Wizard ───
  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 py-8">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <img src={logoBranca} alt="modoGESTOR" className="h-6 dark:block hidden" />
          <img src={logoBranca} alt="modoGESTOR" className="h-6 dark:hidden block invert" />
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground text-xs">
            Pular setup →
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={i} className="flex-1 flex items-center gap-1">
                <div className={`h-1.5 flex-1 rounded-full transition-all ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {(() => { const Icon = STEPS[step].icon; return <Icon className="h-4 w-4 text-primary" />; })()}
            <span className="text-sm text-muted-foreground">Passo {step + 1} de {STEPS.length}</span>
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <StepProfile
                businessName={businessName}
                setBusinessName={setBusinessName}
                phone={phone}
                setPhone={setPhone}
                address={address}
                setAddress={setAddress}
              />
            )}
            {step === 1 && (
              <StepServices
                services={services}
                onAddSuggestion={addSuggestion}
                onAddManual={addManualService}
                onRemove={removeService}
                newName={newName}
                setNewName={setNewName}
                newDuration={newDuration}
                setNewDuration={setNewDuration}
                newPrice={newPrice}
                setNewPrice={setNewPrice}
              />
            )}
            {step === 2 && (
              <StepSchedule
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                breakStart={breakStart}
                setBreakStart={setBreakStart}
                breakEnd={breakEnd}
                setBreakEnd={setBreakEnd}
                hasBreak={hasBreak}
                setHasBreak={setHasBreak}
                selectedDays={selectedDays}
                setSelectedDays={setSelectedDays}
              />
            )}
            {step === 3 && <StepTools />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={saving}>
              ← Voltar
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={
              step === 0 ? handleStep1Next
              : step === 1 ? handleStep2Next
              : step === 2 ? handleStep3Next
              : handleFinish
            }
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {step < STEPS.length - 1 ? "Próximo →" : "Concluir 🎉"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function StepProfile({
  businessName, setBusinessName, phone, setPhone, address, setAddress,
}: {
  businessName: string; setBusinessName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  address: string; setAddress: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Seu Negócio</h2>
        <p className="text-sm text-muted-foreground">Complete as informações do seu estabelecimento</p>
      </div>
      <div className="space-y-3">
        <div>
          <Label>Nome do negócio</Label>
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ex: Barbearia do João" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <Label>Endereço</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número — Bairro, Cidade" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        💡 Uma boa foto de capa atrai mais clientes na página de agendamento!
      </p>
    </div>
  );
}

function StepServices({
  services, onAddSuggestion, onAddManual, onRemove,
  newName, setNewName, newDuration, setNewDuration, newPrice, setNewPrice,
}: {
  services: AddedService[];
  onAddSuggestion: (s: typeof SERVICE_SUGGESTIONS[0]) => void;
  onAddManual: () => void;
  onRemove: (i: number) => void;
  newName: string; setNewName: (v: string) => void;
  newDuration: string; setNewDuration: (v: string) => void;
  newPrice: string; setNewPrice: (v: string) => void;
}) {
  const addedNames = services.map((s) => s.name);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Seus Serviços</h2>
        <p className="text-sm text-muted-foreground">O que seus clientes podem agendar?</p>
      </div>

      {/* Quick suggestions */}
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium">Sugestões rápidas (clique para adicionar):</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_SUGGESTIONS.filter((s) => !addedNames.includes(s.name)).map((svc) => (
            <button
              key={svc.name}
              onClick={() => onAddSuggestion(svc)}
              className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground transition-all"
            >
              + {svc.name} — {svc.duration}min — {(svc.price / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </button>
          ))}
        </div>
      </div>

      {/* Added services */}
      {services.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Serviços adicionados ({services.length}):</p>
          {services.map((svc, i) => (
            <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-3.5 w-3.5 text-primary" />
                <span className="text-foreground">{svc.name}</span>
                <span className="text-muted-foreground">— {svc.duration}min — {(svc.price / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Manual add */}
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground font-medium">Ou adicione manualmente:</p>
        <div className="grid grid-cols-[1fr_70px_90px] gap-2">
          <Input placeholder="Nome do serviço" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-sm" />
          <Input placeholder="Min" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} className="text-sm" type="number" />
          <Input placeholder="R$ 0,00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={onAddManual} disabled={!newName.trim()}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">💡 Você pode editar tudo depois nas Configurações.</p>
    </div>
  );
}

function StepSchedule({
  startTime, setStartTime, endTime, setEndTime,
  breakStart, setBreakStart, breakEnd, setBreakEnd,
  hasBreak, setHasBreak, selectedDays, setSelectedDays,
}: {
  startTime: string; setStartTime: (v: string) => void;
  endTime: string; setEndTime: (v: string) => void;
  breakStart: string; setBreakStart: (v: string) => void;
  breakEnd: string; setBreakEnd: (v: string) => void;
  hasBreak: boolean; setHasBreak: (v: boolean) => void;
  selectedDays: number[]; setSelectedDays: (v: number[]) => void;
}) {
  const toggleDay = (day: number) => {
    setSelectedDays(
      selectedDays.includes(day)
        ? selectedDays.filter((d) => d !== day)
        : [...selectedDays, day]
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Seus Horários</h2>
        <p className="text-sm text-muted-foreground">Quando você atende?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Início</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <Label>Fim</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox checked={hasBreak} onCheckedChange={(c) => setHasBreak(!!c)} />
        <Label className="cursor-pointer">Intervalo (almoço)</Label>
      </div>

      {hasBreak && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Início intervalo</Label>
            <Input type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
          </div>
          <div>
            <Label>Fim intervalo</Label>
            <Input type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <Label className="mb-2 block">Dias de atendimento</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <button
              key={d.value}
              onClick={() => toggleDay(d.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                selectedDays.includes(d.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-muted-foreground/40"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Você pode personalizar horários por dia e por profissional depois nas Configurações.
      </p>
    </div>
  );
}

function StepTools() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Conecte suas Ferramentas</h2>
        <p className="text-sm text-muted-foreground">Conecte para aproveitar ao máximo! (opcional)</p>
      </div>

      <Card>
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            <span className="font-medium text-foreground text-sm">Mercado Pago</span>
          </div>
          <p className="text-xs text-muted-foreground">Receba pagamentos online dos seus clientes</p>
          <p className="text-[11px] text-muted-foreground/70">Configure depois em Configurações → Pagamento</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 space-y-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium text-foreground text-sm">WhatsApp</span>
          </div>
          <p className="text-xs text-muted-foreground">Envie confirmações e lembretes automáticos</p>
          <p className="text-[11px] text-muted-foreground/70">Configure depois em Configurações → WhatsApp</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Essas conexões são opcionais. Você pode configurar depois a qualquer momento.
      </p>
    </div>
  );
}
