import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardAdminPayload, DashboardStaffPayload } from "@/components/dashboard/v2/types";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes — matches useUserRole

export function useDashboardAdminMetrics(
  tenantId: string | null,
  from: string | null,
  to: string | null
) {
  const enabled = !!tenantId && !!from && !!to;

  return useQuery<DashboardAdminPayload>({
    queryKey: ["dashboard-admin", tenantId, from, to],
    enabled,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_dashboard_admin_metrics", {
        p_tenant_id: tenantId,
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
      return data as DashboardAdminPayload;
    },
  });
}

export function useDashboardStaffMetrics(
  tenantId: string | null,
  staffId: string | null,
  from: string | null,
  to: string | null
) {
  const enabled = !!tenantId && !!staffId && !!from && !!to;

  return useQuery<DashboardStaffPayload>({
    queryKey: ["dashboard-staff", tenantId, staffId, from, to],
    enabled,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_dashboard_staff_metrics", {
        p_tenant_id: tenantId,
        p_staff_id: staffId,
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
      return data as DashboardStaffPayload;
    },
  });
}
