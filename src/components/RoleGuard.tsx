import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { dashPath } from "@/lib/hostname";

interface RoleGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export default function RoleGuard({ children, requireAdmin }: RoleGuardProps) {
  const { isAdmin, isStaff, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    if (isStaff) return <Navigate to={dashPath("/app/bookings")} replace />;
    return <Navigate to={dashPath("/app/login")} replace />;
  }

  return <>{children}</>;
}
