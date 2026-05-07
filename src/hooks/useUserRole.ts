import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";

export type UserRoleRaw = "owner" | "admin" | "manager" | "staff" | null;

const ADMIN_ROLES: ReadonlyArray<string> = ["owner", "admin", "manager"];

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const { currentTenant, loading: tenantLoading } = useTenant();

  const userId = user?.id ?? null;
  const tenantId = currentTenant?.id ?? null;
  const enabled = !!userId && !!tenantId;

  const query = useQuery<UserRoleRaw>({
    queryKey: ["user-role", userId, tenantId],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users_tenant")
        .select("role")
        .eq("user_id", userId!)
        .eq("tenant_id", tenantId!);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Defensive: if the user appears multiple times, prefer admin-ish over staff
      const roles = data.map((r) => r.role as string);
      for (const adminRole of ADMIN_ROLES) {
        if (roles.includes(adminRole)) return adminRole as UserRoleRaw;
      }
      return (roles[0] ?? null) as UserRoleRaw;
    },
  });

  const role = (query.data ?? null) as UserRoleRaw;
  const isAdmin = !!role && ADMIN_ROLES.includes(role);
  const isStaff = role === "staff";

  return {
    role,
    isAdmin,
    isStaff,
    isLoading: authLoading || tenantLoading || (enabled && query.isLoading),
  };
}
