import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Plus, 
  Clock, 
  Users, 
  TrendingUp, 
  Scissors, 
  Phone,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { NewServiceModal, NewStaffModal, BlockTimeModal } from "@/components/modals/QuickActions";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const Dashboard = () => {
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [periodBookings, setPeriodBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showNewService, setShowNewService] = useState(false);
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  
  const { user, signOut, loading: authLoading } = useAuth();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { dateRange } = useDateRange();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !tenantLoading) {
      loadDashboardData();
    }
  }, [user, currentTenant, tenantLoading, dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!currentTenant) {
        setTodayBookings([]);
        setPeriodBookings([]);
        setServices([]);
        setStaff([]);
        setLoading(false);
        return;
      }
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const [todayBookingsRes, periodBookingsRes, servicesRes, staffRes] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            service:services(name, color, price_cents),
            staff:staff(name),
            customer:customers(name, phone)
          `)
          .eq('tenant_id', currentTenant.id)
          .gte('starts_at', startOfDay.toISOString())
          .lt('starts_at', endOfDay.toISOString())
          .order('starts_at'),
        
        supabase
          .from('bookings')
          .select(`
            *,
            service:services(name, price_cents)
          `)
          .eq('tenant_id', currentTenant.id)
          .in('status', ['confirmed', 'completed'])
          .gte('starts_at', dateRange.from.toISOString())
          .lte('starts_at', dateRange.to.toISOString()),
        
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true),
        
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
      ]);

      if (todayBookingsRes.error) throw todayBookingsRes.error;
      if (periodBookingsRes.error) throw periodBookingsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;

      setTodayBookings(todayBookingsRes.data || []);
      setPeriodBookings(periodBookingsRes.data || []);
      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);
      
      const revenueValue = await calculateRevenue(periodBookingsRes.data || []);
      setRevenue(revenueValue);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenue = async (bookingsList: any[]) => {
    if (!bookingsList.length) return 0;
    
    const completedBookings = bookingsList.filter(booking => booking.status === 'completed');
    
    if (completedBookings.length === 0) return 0;
    
    try {
      const bookingIds = completedBookings.map(b => b.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('amount_cents, status')
        .in('booking_id', bookingIds)
        .eq('status', 'paid');

      const actualPayments = payments?.reduce((sum, payment) => sum + payment.amount_cents, 0) || 0;
      
      if (actualPayments > 0) {
        return actualPayments;
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
    
    return completedBookings.reduce((sum, booking) => {
      return sum + (booking.service?.price_cents || 0);
    }, 0);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  if (tenantLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      {/* Date Range Selector */}
      <DateRangeSelector />

      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">
          {getGreeting()}! 👋
        </h1>
        <p className="text-zinc-500">
          {loading 
            ? "Carregando dados..." 
            : `Você tem ${todayBookings.length} agendamentos hoje.`
          }
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <motion.div 
          variants={fadeInUp}
          onClick={() => navigate('/app/agenda')}
          className="group p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 mb-1">
            {loading ? "..." : todayBookings.length}
          </p>
          <p className="text-sm text-zinc-500">Agendamentos hoje</p>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          onClick={() => navigate('/app/services')}
          className="group p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Scissors className="h-5 w-5 text-emerald-400" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 mb-1">
            {loading ? "..." : services.length}
          </p>
          <p className="text-sm text-zinc-500">Serviços ativos</p>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          onClick={() => navigate('/app/staff')}
          className="group p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-400" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 mb-1">
            {loading ? "..." : staff.length}
          </p>
          <p className="text-sm text-zinc-500">Profissionais</p>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          onClick={() => navigate('/app/finance')}
          className="group p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-zinc-100 mb-1">
            {loading ? "..." : `R$ ${(revenue / 100).toFixed(0)}`}
          </p>
          <p className="text-sm text-zinc-500">Faturamento</p>
        </motion.div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/50">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Próximos Agendamentos</h2>
                <p className="text-sm text-zinc-500">Agendamentos de hoje</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/app/bookings')}
                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
              >
                Ver Todos
              </Button>
            </div>
            <div className="p-5">
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center text-zinc-500 py-8">
                    Carregando agendamentos...
                  </div>
                ) : todayBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-6 w-6 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500">Nenhum agendamento para hoje</p>
                  </div>
                ) : (
                  todayBookings.slice(0, 4).map((booking) => (
                    <div 
                      key={booking.id} 
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-700/50 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-zinc-100">{booking.customer?.name}</h4>
                          <p className="text-sm text-zinc-500">{booking.service?.name}</p>
                          <div className="flex items-center mt-1 gap-3">
                            <span className="text-xs text-zinc-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(booking.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-xs text-zinc-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {booking.customer?.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-zinc-700/50 text-zinc-400'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmado' : 
                         booking.status === 'pending' ? 'Pendente' : 
                         booking.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          {/* Top Services */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl">
            <div className="p-5 border-b border-zinc-800/50">
              <h2 className="text-lg font-semibold text-zinc-100">Serviços Populares</h2>
              <p className="text-sm text-zinc-500">Este mês</p>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center text-zinc-500">
                    Carregando...
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center text-zinc-500">
                    Nenhum serviço cadastrado
                  </div>
                ) : (
                  services.slice(0, 3).map((service) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: `${service.color}15`,
                            color: service.color 
                          }}
                        >
                          <Scissors className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200 text-sm">{service.name}</p>
                          <p className="text-xs text-zinc-500">{service.duration_minutes}min</p>
                        </div>
                      </div>
                      <p className="font-medium text-emerald-400 text-sm">
                        R$ {(service.price_cents / 100).toFixed(0)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl">
            <div className="p-5 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h2 className="text-lg font-semibold text-zinc-100">Ações Rápidas</h2>
              </div>
            </div>
            <div className="p-5 space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50" 
                size="sm"
                onClick={() => setShowNewService(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Serviço
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50" 
                size="sm"
                onClick={() => setShowNewStaff(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Adicionar Profissional
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50" 
                size="sm"
                onClick={() => setShowBlockTime(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Bloquear Horário
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <NewServiceModal 
        open={showNewService} 
        onOpenChange={setShowNewService}
        onSuccess={loadDashboardData}
      />
      <NewStaffModal 
        open={showNewStaff} 
        onOpenChange={setShowNewStaff}
        onSuccess={loadDashboardData}
      />
      <BlockTimeModal 
        open={showBlockTime} 
        onOpenChange={setShowBlockTime}
        onSuccess={loadDashboardData}
      />
    </div>
  );
};

export default Dashboard;
