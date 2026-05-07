import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { dashPath } from "@/lib/hostname";

/**
 * Lands here after a magic-link click. Supabase JS auto-detects the URL hash
 * and creates a session; we just wait for the user to materialize and route
 * by role: staff -> /app/bookings, admin -> /app/dashboard.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isStaff, isAdmin, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(dashPath("/app/login"), { replace: true });
      return;
    }
    if (roleLoading) return;
    if (isStaff) {
      navigate(dashPath("/app/bookings"), { replace: true });
    } else if (isAdmin) {
      navigate(dashPath("/app/dashboard"), { replace: true });
    } else {
      // No role row yet — fall back to dashboard so AuthWatcher can run onboarding flow.
      navigate(dashPath("/app/dashboard"), { replace: true });
    }
  }, [authLoading, roleLoading, user, isStaff, isAdmin, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Entrando…</p>
      </div>
    </div>
  );
}
