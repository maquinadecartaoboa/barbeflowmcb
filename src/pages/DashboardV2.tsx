import { useEffect } from "react";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUserRole } from "@/hooks/useUserRole";
import { useCurrentStaff } from "@/hooks/useCurrentStaff";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useDashboardAdminMetrics, useDashboardStaffMetrics } from "@/hooks/useDashboardV2";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { NoTenantState } from "@/components/NoTenantState";
import { DashboardAdmin } from "@/components/dashboard/v2/DashboardAdmin";
import { DashboardStaff } from "@/components/dashboard/v2/DashboardStaff";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardV2() {
  usePageTitle("Dashboard");
  const { isStaff, isLoading: roleLoading } = useUserRole();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { staff: currentStaff, isLoading: staffLoading } = useCurrentStaff();
  const { dateRange, setPreset } = useDateRange();

  // Default to "Este mês" when entering the dashboard.
  useEffect(() => {
    setPreset("month");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tenantId = currentTenant?.id ?? null;
  const from = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : null;
  const to = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : null;
  const staffId = currentStaff?.id ?? null;

  const adminQuery = useDashboardAdminMetrics(
    !isStaff ? tenantId : null,
    !isStaff ? from : null,
    !isStaff ? to : null
  );
  const staffQuery = useDashboardStaffMetrics(
    isStaff ? tenantId : null,
    isStaff ? staffId : null,
    isStaff ? from : null,
    isStaff ? to : null
  );

  if (tenantLoading || roleLoading || (isStaff && staffLoading)) {
    return <DashboardSkeleton />;
  }

  if (!currentTenant) return <NoTenantState />;

  if (isStaff && !staffId) {
    return (
      <PageShell>
        <ErrorState
          title="Não foi possível identificar seu perfil"
          message="Sua conta está marcada como profissional, mas não está vinculada a um cadastro de staff ativo. Peça ao administrador da barbearia para revisar seu cadastro."
        />
      </PageShell>
    );
  }

  const query = isStaff ? staffQuery : adminQuery;

  return (
    <PageShell>
      {query.isLoading ? (
        <DashboardSkeleton hideHeader />
      ) : query.isError ? (
        <ErrorState
          title="Não foi possível carregar o dashboard"
          message={errorMessage(query.error)}
        />
      ) : isStaff ? (
        staffQuery.data ? <DashboardStaff data={staffQuery.data} /> : null
      ) : (
        adminQuery.data ? <DashboardAdmin data={adminQuery.data} /> : null
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 px-4 md:px-0">
      <DateRangeSelector className="overflow-x-auto" />
      {children}
    </div>
  );
}

function DashboardSkeleton({ hideHeader }: { hideHeader?: boolean } = {}) {
  return (
    <div className="space-y-4 px-4 md:px-0">
      {!hideHeader && <div className="h-10 bg-muted rounded animate-pulse" />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 bg-muted rounded-xl animate-pulse" />
        <div className="h-72 bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="p-6 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-200">{title}</p>
          <p className="text-amber-200/80 text-sm mt-1">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function errorMessage(err: unknown): string {
  if (!err) return "Erro desconhecido. Tente recarregar a página.";
  const msg = err instanceof Error ? err.message : String(err);
  if (/Acesso negado/i.test(msg)) {
    return "Você não tem permissão para ver este dashboard. Verifique seu cadastro com o administrador.";
  }
  if (/JWT|auth/i.test(msg)) {
    return "Sua sessão expirou. Faça login novamente.";
  }
  return msg;
}
