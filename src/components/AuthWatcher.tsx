import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";

export default function AuthWatcher() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (loading) return;

    // If user is logged in and on login page, redirect to dashboard
    if (user && (pathname === "/app/login" || pathname === "/app/register")) {
      console.log('AuthWatcher: User logged in, redirecting to dashboard');
      navigate("/app/dashboard", { replace: true });
    }
  }, [user, pathname, navigate, loading]);

  return null;
}