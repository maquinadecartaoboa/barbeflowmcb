import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardAdmin } from "@/components/dashboard/v2/DashboardAdmin";
import { DashboardStaff } from "@/components/dashboard/v2/DashboardStaff";
import { MOCK_ADMIN, MOCK_STAFF } from "@/components/dashboard/v2/mocks";

type Role = "admin" | "staff";

/**
 * Mock-only dashboard playground. Kept around for QA / design iteration —
 * does not query any RPC, just renders deterministic fake data so we can
 * compare layouts side by side without touching real numbers.
 */
export default function DashboardPreview() {
  usePageTitle("Dashboard preview");
  const [role, setRole] = useState<Role>("admin");

  return (
    <div className="space-y-4 px-4 md:px-0">
      <div
        role="alert"
        className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
      >
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-200">Dashboard preview — dados mock</p>
          <p className="text-amber-200/80 text-xs mt-0.5">
            Modo QA. Nenhum dado real é consultado nesta rota.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Preview</h1>
          <Badge variant="outline" className="text-[10px]">MOCK</Badge>
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
