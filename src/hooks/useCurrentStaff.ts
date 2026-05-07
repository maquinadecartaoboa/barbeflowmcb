import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useUserRole } from "@/hooks/useUserRole";

export interface CurrentStaffRecord {
  id: string;
  name: string;
  color: string | null;
  photo_url: string | null;
  active: boolean;
  is_owner: boolean | null;
}

export function useCurrentStaff() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { isStaff } = useUserRole();

  const userId = user?.id ?? null;
  const tenantId = currentTenant?.id ?? null;
  const enabled = isStaff && !!userId && !!tenantId;

  const query = useQuery<CurrentStaffRecord | null>({
    queryKey: ["current-staff", userId, tenantId],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, name, color, photo_url, active, is_owner")
        .eq("user_id", userId!)
        .eq("tenant_id", tenantId!)
        .maybeSingle();

      if (error) throw error;
      return (data as CurrentStaffRecord | null) ?? null;
    },
  });

  return {
    staff: query.data ?? null,
    isLoading: enabled && query.isLoading,
  };
}
