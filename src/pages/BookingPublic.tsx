import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarRac } from "@/components/ui/calendar-rac";
import { 
  Calendar, 
  Clock, 
  Scissors, 
  Star, 
  MapPin, 
  Phone, 
  Mail,
  User,
  CheckCircle,
  Loader2,
  X
} from "lucide-react";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateValue } from "react-aria-components";

const BookingPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  
  const [tenant, setTenant] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<DateValue | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
  const [allTimeSlots, setAllTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  useEffect(() => {
    if (slug) {
      loadTenantData();
    }
  }, [slug]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedService, selectedStaff, selectedDate]);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      
      // Get tenant by slug
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tenantError || !tenantData) {
        toast({
          title: "Barbearia não encontrada",
          description: "Verifique o link e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      setTenant(tenantData);

      // Load services and staff
      const [servicesRes, staffRes] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('active', true)
          .order('name'),
        
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('active', true)
          .order('name')
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;

      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);
    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedService || !selectedDate || !tenant) return;

    try {
      setSlotsLoading(true);
      console.log('Loading slots for:', {
        tenant_id: tenant.id,
        service_id: selectedService,
        staff_id: selectedStaff || null,
        date: selectedDate
      });
      
      const { data, error } = await supabase.functions.invoke('get-available-slots', {
        body: {
          tenant_id: tenant.id,
          service_id: selectedService,
          staff_id: selectedStaff || null,
          date: selectedDate,
        },
      });

      if (error) {
        console.error('Error from function:', error);
        throw error;
      }
      
      console.log('Received slots data:', data);
      
      // Separate available and occupied slots
      const available = data.available_slots || [];
      const occupied = data.occupied_slots || [];
      
      setAvailableSlots(available);
      setOccupiedSlots(occupied);
      
      // Create combined list for display
      const allSlots = [...available.map((slot: any) => ({ ...slot, available: true }))];
      
      // Add occupied slots if they exist
      if (occupied.length > 0) {
        occupied.forEach((occupiedSlot: any) => {
          const isAlreadyInList = allSlots.some(slot => slot.time === occupiedSlot.time);
          if (!isAlreadyInList) {
            allSlots.push({ ...occupiedSlot, available: false });
          }
        });
      }
      
      // Sort all slots by time
      allSlots.sort((a, b) => a.time.localeCompare(b.time));
      setAllTimeSlots(allSlots);
      
    } catch (error) {
      console.error('Error loading slots:', error);
      toast({
        title: "Erro ao carregar horários",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setSelectedTime(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
    
    // Set default date to tomorrow if today is too late
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    setSelectedDate(tomorrowStr);
    setSelectedCalendarDate(parseDate(tomorrowStr));
    
    setStep(2);
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId === "any" ? null : staffId);
    setSelectedTime(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
    
    // Set default date if not already set
    if (!selectedDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setSelectedDate(tomorrowStr);
      setSelectedCalendarDate(parseDate(tomorrowStr));
    }
    
    setStep(3);
  };

  const handleDateSelect = (date: DateValue | null) => {
    setSelectedCalendarDate(date);
    if (date) {
      const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      setSelectedDate(dateStr);
    }
    setSelectedTime(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
  };

  const goToNextStep = () => {
    setStep(prev => Math.min(prev + 1, 5));
  };

  const goToPreviousStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate('');
    setSelectedCalendarDate(null);
    setSelectedTime(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
    setCreatedBooking(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant || !selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Combine date and time into ISO string for starts_at
      const [hours, minutes] = selectedTime.split(':');
      
      // Parse the selected date properly to avoid timezone issues
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startsAt = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);
      
      console.log('Submitting booking with:', {
        slug: slug,
        service_id: selectedService,
        staff_id: selectedStaff,
        customer_name: customerName,
        customer_phone: customerPhone,
        starts_at: startsAt.toISOString(),
        selected_date_string: selectedDate,
        selected_time: selectedTime,
        constructed_date: startsAt
      });
      
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          slug: slug,
          service_id: selectedService,
          staff_id: selectedStaff,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || undefined,
          starts_at: startsAt.toISOString(),
          notes: notes || undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        setCreatedBooking(data.booking);
        setStep(5);
        toast({
          title: "Agendamento confirmado!",
          description: "Você receberá uma confirmação em breve.",
        });
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: "Erro no agendamento",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Format dates and times consistently with timezone
  const TIMEZONE = 'America/Bahia';
  
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      const date = new Date(dateString + 'T00:00:00');
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Amanhã';
      } else {
        return formatInTimeZone(date, TIMEZONE, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data inválida';
    }
  };

  const formatTimeForDisplay = (time: string) => {
    if (!time) return 'Horário não disponível';
    return time;
  };

  const formatBookingDateTime = (booking: any) => {
    if (!booking?.starts_at) return { date: 'Data não disponível', time: 'Horário não disponível' };
    
    try {
      const startDate = new Date(booking.starts_at);
      const bahiaTime = formatInTimeZone(startDate, TIMEZONE, "yyyy-MM-dd HH:mm", { locale: ptBR });
      const [datePart, timePart] = bahiaTime.split(' ');
      
      const dateFormatted = formatDateForDisplay(datePart);
      const timeFormatted = timePart;
      
      return { date: dateFormatted, time: timeFormatted };
    } catch (error) {
      console.error('Error formatting booking date time:', error);
      return { date: 'Data não disponível', time: 'Horário não disponível' };
    }
  };

  const formatSelectedDateTime = () => {
    if (!selectedDate || !selectedTime) return 'Data e horário não selecionados';
    
    const dateFormatted = formatDateForDisplay(selectedDate);
    const timeFormatted = formatTimeForDisplay(selectedTime);
    
    return `${dateFormatted} às ${timeFormatted}`;
  };

  const generateCalendarFile = (booking: any) => {
    if (!booking) return;

    const startDate = new Date(booking.starts_at);
    const endDate = new Date(booking.ends_at);
    
    // Format for ICS file (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Booking//Booking Event//EN
BEGIN:VEVENT
UID:booking-${booking.id}@${tenant?.slug || 'barbearia'}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${booking.service?.name || 'Agendamento'} - ${tenant?.name || 'Barbearia'}
DESCRIPTION:Agendamento confirmado\\n\\nServiço: ${booking.service?.name || 'N/A'}\\nProfissional: ${booking.staff?.name || 'N/A'}\\nCliente: ${booking.customer?.name || 'N/A'}\\nTelefone: ${booking.customer?.phone || 'N/A'}${booking.notes ? `\\nObservações: ${booking.notes}` : ''}
LOCATION:${tenant?.address || tenant?.name || 'Barbearia'}
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Lembrete: ${booking.service?.name || 'Agendamento'} em 30 minutos
END:VALARM
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `agendamento-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Arquivo baixado!",
      description: "O arquivo do calendário foi baixado. Abra-o para adicionar o agendamento ao seu calendário.",
    });
  };

  if (step === 5) {
    const bookingDateTime = formatBookingDateTime(createdBooking);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-success/20 shadow-large rounded-2xl overflow-hidden">
          <CardContent className="px-6 py-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-success/20 to-success/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-soft">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Agendamento Confirmado!
            </h1>
            <p className="text-muted-foreground mb-8 text-base leading-relaxed px-2">
              Seu horário foi reservado com sucesso. Você receberá uma confirmação por WhatsApp.
            </p>
            
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10 rounded-2xl shadow-soft mb-8">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Scissors className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">Serviço</span>
                    </div>
                    <span className="font-semibold text-foreground">{createdBooking?.service?.name || 'N/A'}</span>
                  </div>
                  
                  <Separator className="opacity-50" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-sm text-muted-foreground">Profissional</span>
                    </div>
                    <span className="font-semibold text-foreground">{createdBooking?.staff?.name || 'Qualquer disponível'}</span>
                  </div>
                  
                  <Separator className="opacity-50" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">Data e hora</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">{bookingDateTime.date}</div>
                      <div className="text-sm font-medium text-primary">{bookingDateTime.time}</div>
                    </div>
                  </div>
                  
                  <Separator className="opacity-50" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Valor total</span>
                    <span className="text-xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                      R$ {((createdBooking?.service?.price_cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-4 px-2">
              <Button 
                className="w-full h-14 text-base font-semibold rounded-2xl" 
                variant="hero"
                onClick={() => generateCalendarFile(createdBooking)}
                disabled={!createdBooking}
              >
                <Calendar className="h-5 w-5 mr-3" />
                Adicionar ao Calendário
              </Button>
              
              <Button 
                className="w-full h-12 text-base rounded-xl" 
                variant="outline"
                onClick={resetBooking}
              >
                Fazer Novo Agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Premium */}
      <header className="relative h-48 sm:h-64 bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-8 lg:px-8 h-full flex items-end pb-6 sm:pb-10">
          <div className="text-primary-foreground w-full">
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4 tracking-tight">{tenant?.name || "Carregando..."}</h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-1 sm:space-y-0 text-xs sm:text-sm opacity-95">
              {tenant?.address && (
                <div className="flex items-center">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">{tenant.address}</span>
                </div>
              )}
              {tenant?.phone && (
                <div className="flex items-center">
                  <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span>{tenant.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Booking Summary Premium - Show after step 1 */}
        {step > 1 && (
          <Card className="mb-10 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-medium rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center text-foreground">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                Resumo do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-6 sm:grid-cols-2">
                {selectedService && (
                  <div className="flex items-center space-x-4 p-3 rounded-xl bg-background/60 border border-primary/10">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-soft"
                      style={{ 
                        backgroundColor: `${services.find(s => s.id === selectedService)?.color}20`,
                        color: services.find(s => s.id === selectedService)?.color 
                      }}
                    >
                      <Scissors className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Serviço</p>
                      <p className="font-semibold text-foreground truncate">{services.find(s => s.id === selectedService)?.name}</p>
                    </div>
                  </div>
                )}
                
                {(selectedStaff || step >= 3) && (
                  <div className="flex items-center space-x-4 p-3 rounded-xl bg-background/60 border border-accent/10">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-soft"
                      style={{ 
                        backgroundColor: selectedStaff ? `${staff.find(s => s.id === selectedStaff)?.color}20` : 'hsl(var(--muted))',
                        color: selectedStaff ? staff.find(s => s.id === selectedStaff)?.color : 'hsl(var(--muted-foreground))'
                      }}
                    >
                      <User className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Profissional</p>
                      <p className="font-semibold text-foreground truncate">
                        {selectedStaff ? staff.find(s => s.id === selectedStaff)?.name : 'Qualquer disponível'}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedDate && step >= 3 && (
                  <div className="flex items-center space-x-4 p-3 rounded-xl bg-background/60 border border-primary/10">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-soft">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Data</p>
                      <p className="font-semibold text-foreground">
                        {formatDateForDisplay(selectedDate)}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedTime && (
                  <div className="flex items-center space-x-4 p-3 rounded-xl bg-background/60 border border-accent/10">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shadow-soft">
                      <Clock className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Horário</p>
                      <p className="font-semibold text-foreground">{selectedTime}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedService && (
                <>
                  <Separator className="my-6 opacity-30" />
                  <div className="flex justify-between items-center p-4 rounded-xl bg-accent/5 border border-accent/20">
                    <span className="text-base font-medium text-muted-foreground">Valor do serviço</span>
                    <span className="text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                      R$ {((services.find(s => s.id === selectedService)?.price_cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress Indicator Premium */}
        <div className="flex items-center justify-center mb-8 px-4">
          <div className="flex items-center space-x-3 sm:space-x-6 px-4 py-3 bg-background border rounded-2xl shadow-soft">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 shadow-soft ${
                  step >= i 
                    ? 'bg-gradient-primary text-primary-foreground scale-110' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}>
                  {i}
                </div>
                {i < 4 && (
                  <div className={`w-8 sm:w-16 h-1 mx-1 sm:mx-3 rounded-full transition-all duration-300 ${
                    step > i 
                      ? 'bg-gradient-primary shadow-accent' 
                      : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Service Premium */}
        {step === 1 && (
          <div className="px-4 sm:px-0">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 tracking-tight">
                Escolha seu serviço
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
                Selecione o serviço que deseja agendar
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <p className="text-muted-foreground text-lg">Carregando serviços...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground text-lg">Nenhum serviço disponível no momento.</p>
                </div>
              ) : (
                services.map((service) => (
                  <Card 
                    key={service.id} 
                    className="cursor-pointer border-border/50 hover:border-primary/50 hover:shadow-large transition-all duration-500 rounded-2xl overflow-hidden bg-gradient-to-br from-background to-background/80 hover:scale-[1.02] active:scale-[0.98] w-full"
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <CardContent className="p-4 sm:p-6 lg:p-8">
                      <div className="flex items-start justify-between mb-4 sm:mb-6">
                        <div 
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-soft flex-shrink-0"
                          style={{ 
                            backgroundColor: `${service.color}20`,
                            color: service.color 
                          }}
                        >
                          <Scissors className="h-6 w-6 sm:h-8 sm:w-8" />
                        </div>
                        <div className="bg-gradient-accent px-3 py-1 sm:px-4 sm:py-2 rounded-full ml-2">
                          <span className="text-accent-foreground font-bold text-sm sm:text-lg">
                            R$ {(service.price_cents / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg sm:text-xl text-foreground mb-2 sm:mb-3 leading-tight">{service.name}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">{service.description}</p>
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl w-fit">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="font-medium">{service.duration_minutes} minutos</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Staff Premium */}
        {step === 2 && (
          <div className="px-2 sm:px-0">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
                Escolha o profissional
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto px-2">
                Selecione quem você prefere que faça o atendimento
              </p>
            </div>
            
            <div className="max-w-xl mx-auto space-y-4 sm:space-y-6">
              <Card className="border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 shadow-medium rounded-2xl overflow-hidden mx-2 sm:mx-0">
                <CardContent className="p-4 sm:p-6">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Star className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-3 text-sm sm:text-base">Sem preferência?</h3>
                    <Button 
                      variant="hero" 
                      onClick={() => handleStaffSelect("any")}
                      className="h-10 sm:h-12 px-6 sm:px-8 rounded-xl font-semibold text-sm sm:text-base w-full sm:w-auto"
                    >
                      Qualquer profissional disponível
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="relative py-3 sm:py-4 mx-4">
                <Separator className="absolute top-1/2 left-0 right-0" />
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 sm:px-4 text-xs sm:text-sm text-muted-foreground font-medium">
                    ou escolha um profissional específico
                  </span>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4 mx-2 sm:mx-0">
                {loading ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                    </div>
                    <p className="text-muted-foreground text-base sm:text-lg">Carregando profissionais...</p>
                  </div>
                ) : (
                  staff.map((member) => (
                    <Card 
                      key={member.id}
                      className="cursor-pointer border-border/50 hover:border-primary/50 hover:shadow-large transition-all duration-500 rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-background to-background/80 hover:scale-[1.01] active:scale-[0.99] w-full"
                      onClick={() => handleStaffSelect(member.id)}
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center space-x-3 sm:space-x-6">
                          <div 
                            className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-soft flex-shrink-0"
                            style={{ 
                              backgroundColor: `${member.color}20`,
                              color: member.color 
                            }}
                          >
                            <User className="h-7 w-7 sm:h-10 sm:w-10" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg sm:text-xl text-foreground mb-1 sm:mb-2 truncate">{member.name}</h3>
                            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed line-clamp-2">{member.bio}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
            
            {/* Navigation Buttons Premium */}
            <div className="flex justify-center mt-8 sm:mt-12 px-4">
              <div className="flex space-x-3 sm:space-x-4 w-full max-w-xs sm:max-w-sm">
                <Button 
                  variant="outline" 
                  onClick={goToPreviousStep}
                  className="flex-1 h-11 sm:h-12 rounded-xl font-semibold text-sm sm:text-base"
                >
                  Voltar
                </Button>
                <Button 
                  variant="hero" 
                  onClick={goToNextStep}
                  disabled={!selectedService}
                  className="flex-1 h-11 sm:h-12 rounded-xl font-semibold text-sm sm:text-base"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Time Premium */}
        {step === 3 && (
          <div className="px-2 sm:px-0">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
                Escolha data e horário
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto px-2">
                Selecione o melhor horário para você
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <Card className="shadow-large rounded-2xl overflow-hidden border-border/50 mx-2 sm:mx-0">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="text-xl sm:text-2xl font-bold flex items-center text-foreground">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center mr-3 sm:mr-4">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    Selecione a data
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-6 sm:pb-8">
                  <div className="mb-6 sm:mb-8">
                    <CalendarRac
                      value={selectedCalendarDate}
                      onChange={handleDateSelect}
                      minValue={today(getLocalTimeZone())}
                      className="rounded-xl sm:rounded-2xl border border-border/50 p-2 sm:p-4 mx-auto w-fit shadow-soft"
                    />
                  </div>
                  
                   {slotsLoading ? (
                     <div className="text-center py-8 sm:py-12">
                       <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                         <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
                       </div>
                       <p className="text-muted-foreground text-base sm:text-lg">Carregando horários disponíveis...</p>
                     </div>
                   ) : allTimeSlots.length === 0 ? (
                     <div className="text-center py-8 sm:py-12 text-muted-foreground">
                       <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                         <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
                       </div>
                       <p className="text-base sm:text-lg">
                         {selectedDate ? "Nenhum horário disponível para esta data." : "Selecione uma data para ver os horários."}
                       </p>
                     </div>
                   ) : (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 sm:mb-6 text-center">Horários disponíveis</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                          {allTimeSlots.map((slot) => (
                            <Button
                              key={slot.time}
                              variant={slot.available ? "outline" : "secondary"}
                              onClick={slot.available ? () => handleTimeSelect(slot.time) : undefined}
                              disabled={!slot.available}
                              className={`h-12 sm:h-14 relative rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base ${
                                slot.available 
                                  ? "border-border/50 hover:border-primary hover:bg-primary/10 hover:scale-105 active:scale-95 shadow-soft hover:shadow-medium" 
                                  : "bg-destructive/10 border-destructive/30 text-destructive/80 cursor-not-allowed opacity-75"
                              }`}
                            >
                              {slot.available ? (
                                <span>{slot.time}</span>
                              ) : (
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="text-xs sm:text-sm">{slot.time}</span>
                                </div>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                   )}
                </CardContent>
              </Card>
            </div>
            
            {/* Navigation Buttons Premium */}
            <div className="flex justify-center mt-8 sm:mt-12 px-4">
              <div className="flex space-x-3 sm:space-x-4 w-full max-w-xs sm:max-w-sm">
                <Button 
                  variant="outline" 
                  onClick={goToPreviousStep}
                  className="flex-1 h-11 sm:h-12 rounded-xl font-semibold text-sm sm:text-base"
                >
                  Voltar
                </Button>
                <Button 
                  variant="hero" 
                  onClick={goToNextStep}
                  disabled={!selectedDate || !selectedTime}
                  className="flex-1 h-11 sm:h-12 rounded-xl font-semibold text-sm sm:text-base"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Contact Information Premium */}
        {step === 4 && (
          <div className="px-2 sm:px-0">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 tracking-tight">
                Seus dados de contato
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto px-2">
                Precisamos dessas informações para confirmar seu agendamento
              </p>
            </div>
            
            <div className="max-w-xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                <Card className="shadow-large rounded-2xl overflow-hidden border-border/50 mx-2 sm:mx-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg sm:text-xl font-bold flex items-center text-foreground">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      Informações de contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="name" className="text-sm sm:text-base font-semibold">Nome completo *</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome completo"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="h-12 sm:h-14 text-sm sm:text-base rounded-xl border-border/50 focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="phone" className="text-sm sm:text-base font-semibold">WhatsApp *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                        className="h-12 sm:h-14 text-sm sm:text-base rounded-xl border-border/50 focus:border-primary"
                      />
                      <p className="text-xs sm:text-sm text-muted-foreground pl-1">
                        📱 Enviaremos a confirmação por WhatsApp
                      </p>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="email" className="text-sm sm:text-base font-semibold">E-mail (opcional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="h-12 sm:h-14 text-sm sm:text-base rounded-xl border-border/50 focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="notes" className="text-sm sm:text-base font-semibold">Observações (opcional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Alguma observação especial?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="text-sm sm:text-base rounded-xl border-border/50 focus:border-primary resize-none"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Summary Premium */}
                <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5 shadow-large rounded-2xl overflow-hidden mx-2 sm:mx-0">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg sm:text-xl font-bold flex items-center text-foreground">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/20 rounded-lg flex items-center justify-center mr-3">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      Resumo do agendamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <div className="space-y-4 sm:space-y-5">
                      <div className="flex justify-between items-center py-1 sm:py-2">
                        <span className="text-sm sm:text-base text-muted-foreground font-medium">Serviço</span>
                        <span className="font-bold text-foreground text-right text-sm sm:text-base">
                          {services.find(s => s.id === selectedService)?.name || 'Não selecionado'}
                        </span>
                      </div>
                      <Separator className="opacity-30" />
                      <div className="flex justify-between items-center py-1 sm:py-2">
                        <span className="text-sm sm:text-base text-muted-foreground font-medium">Profissional</span>
                        <span className="font-bold text-foreground text-right text-sm sm:text-base">
                          {selectedStaff ? staff.find(s => s.id === selectedStaff)?.name : 'Qualquer disponível'}
                        </span>
                      </div>
                      <Separator className="opacity-30" />
                      <div className="flex justify-between items-center py-1 sm:py-2">
                        <span className="text-sm sm:text-base text-muted-foreground font-medium">Data e hora</span>
                        <div className="text-right">
                          <div className="font-bold text-foreground text-sm sm:text-base">{formatSelectedDateTime()}</div>
                        </div>
                      </div>
                      <Separator className="opacity-30" />
                      <div className="flex justify-between items-center py-2 sm:py-3 px-3 sm:px-4 bg-accent/10 rounded-xl">
                        <span className="text-base sm:text-lg font-bold text-foreground">Total</span>
                        <span className="text-xl sm:text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
                          R$ {((services.find(s => s.id === selectedService)?.price_cents || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex space-x-3 sm:space-x-4 pt-4 px-2 sm:px-0">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={goToPreviousStep}
                    className="flex-1 h-12 sm:h-14 rounded-xl font-semibold text-sm sm:text-base"
                    disabled={submitting}
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-12 sm:h-14 rounded-xl font-bold text-sm sm:text-base" 
                    variant="hero" 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 animate-spin" />
                        <span className="hidden sm:inline">Processando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                        <span className="hidden sm:inline">Confirmar Agendamento</span>
                        <span className="sm:hidden">Confirmar</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPublic;