import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { isDashboardDomain, dashPath } from "@/lib/hostname";

export default function AuthWatcher() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (loading) return;

    const loginPath = dashPath("/app/login");
    const registerPath = dashPath("/app/register");
    const isOnLoginPage = pathname === loginPath || pathname === registerPath;
    const isOnRoot = pathname === "/";

    // If user is logged in and on login page (or root on dashboard domain), redirect to dashboard
    if (user && (isOnLoginPage || (isOnRoot && isDashboardDomain()))) {
      console.log('AuthWatcher: User logged in, redirecting to dashboard');
      navigate(dashPath("/app/dashboard"), { replace: true });
    }
  }, [user, pathname, navigate, loading]);

  return null;
}
