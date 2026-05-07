import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { isDashboardDomain, dashPath } from "@/lib/hostname";
import { supabase } from "@/integrations/supabase/client";

export default function AuthWatcher() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (loading || !user) return;

    const loginPath = dashPath("/app/login");
    const registerPath = dashPath("/app/register");
    const isOnLoginPage = pathname === loginPath || pathname === registerPath;
    const isOnRoot = pathname === "/";

    // Only redirect from login/root pages
    if (!isOnLoginPage && !(isOnRoot && isDashboardDomain())) return;

    const route = async () => {
      // Staff users (login próprio, role='staff' em users_tenant) vão direto
      // pra agenda — não passam por onboarding e não têm Dashboard.
      try {
        const { data: roles } = await supabase
          .from("users_tenant")
          .select("role")
          .eq("user_id", user.id);
        const hasAdminRole = (roles ?? []).some((r) =>
          ["owner", "admin", "manager"].includes(r.role as string),
        );
        const isStaffOnly = (roles ?? []).length > 0 && !hasAdminRole;
        if (isStaffOnly) {
          navigate(dashPath("/app/bookings"), { replace: true });
          return;
        }
      } catch {
        // role lookup failed — fall through to default flow
      }

      try {
        const { data: progress } = await supabase
          .from("onboarding_progress")
          .select("questionnaire_completed, onboarding_completed, onboarding_skipped")
          .eq("user_id", user.id)
          .maybeSingle();

        if (progress && !progress.onboarding_skipped) {
          if (!progress.questionnaire_completed) {
            navigate(dashPath("/app/questionnaire"), { replace: true });
            return;
          }
          if (!progress.onboarding_completed) {
            navigate(dashPath("/app/onboarding-wizard"), { replace: true });
            return;
          }
        }
      } catch {
        // No onboarding progress row — proceed to dashboard
      }

      console.log("AuthWatcher: User logged in, redirecting to dashboard");
      navigate(dashPath("/app/dashboard"), { replace: true });
    };

    route();
  }, [user, pathname, navigate, loading]);

  return null;
}
