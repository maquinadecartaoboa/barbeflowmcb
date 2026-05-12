import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardAdmin } from "@/components/dashboard/v2/DashboardAdmin";
import { DashboardStaff } from "@/components/dashboard/v2/DashboardStaff";
import { MOCK_ADMIN, MOCK_STAFF } from "@/components/dashboard/v2/mocks";

type Role = "admin" | "staff";

export default function DashboardPreview() {
  usePageTitle("Dashboard v2 (preview)");
  const [role, setRole] = useState<Role>("admin");

  return (
    <div className="space-y-4 px-4 md:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard v2 — preview</h1>
            <Badge variant="outline" className="text-[10px]">MOCK</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Dados estáticos. Substituídos pela RPC real assim que Vitor entregar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={role === "admin" ? "default" : "outline"}
            onClick={() => setRole("admin")}
          >
            Admin
          </Button>
          <Button
            size="sm"
            variant={role === "staff" ? "default" : "outline"}
            onClick={() => setRole("staff")}
          >
            Staff
          </Button>
        </div>
      </div>

      {role === "admin" ? (
        <DashboardAdmin data={MOCK_ADMIN} />
      ) : (
        <DashboardStaff data={MOCK_STAFF} />
      )}
    </div>
  );
}
