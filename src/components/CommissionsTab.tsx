import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Users, DollarSign, ChevronRight, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Snapshot {
  id: string;
  booking_id: string;
  booking_item_id: string;
  staff_id: string;
  item_type: string;
  item_title: string;
  base_amount_cents: number;
  commission_percent: number;
  commission_cents: number;
  created_at: string;
}

interface StaffCommission {
  staffId: string;
  staffName: string;
  serviceRevenue: number;
  serviceCommission: number;
  productRevenue: number;
  productCommission: number;
  totalCommission: number;
  snapshots: Snapshot[];
}

export function CommissionsTab() {
  const { currentTenant } = useTenant();
  const { dateRange } = useDateRange();
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffCommission | null>(null);

  useEffect(() => {
    if (currentTenant) loadSnapshots();
  }, [currentTenant, dateRange]);

  const loadSnapshots = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const fromISO = dateRange.from.toISOString();
      const toISO = dateRange.to.toISOString();

      // 1. Fetch snapshots in period
      const { data: snaps, error } = await supabase
        .from("commission_snapshots")
        .select("*, staff:staff(name)")
        .eq("tenant_id", currentTenant.id)
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 2. Aggregate per staff
      const map: Record<string, StaffCommission> = {};

      (snaps || []).forEach((s: any) => {
        const staffId = s.staff_id;
        if (!map[staffId]) {
          map[staffId] = {
            staffId,
            staffName: s.staff?.name || "Profissional",
            serviceRevenue: 0,
            serviceCommission: 0,
            productRevenue: 0,
            productCommission: 0,
            totalCommission: 0,
            snapshots: [],
          };
        }

        const entry = map[staffId];
        entry.snapshots.push(s);
        entry.totalCommission += s.commission_cents;

        if (s.item_type === "service") {
          entry.serviceRevenue += s.base_amount_cents;
          entry.serviceCommission += s.commission_cents;
        } else {
          entry.productRevenue += s.base_amount_cents;
          entry.productCommission += s.commission_cents;
        }
      });

      setCommissions(
        Object.values(map)
          .filter(c => c.totalCommission > 0 || c.snapshots.length > 0)
          .sort((a, b) => b.totalCommission - a.totalCommission)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalCommission = commissions.reduce((s, c) => s + c.totalCommission, 0);
  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>
              Comissões são geradas automaticamente ao fechar cada comanda.
              Os valores são imutáveis (snapshot no momento do fechamento).
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profissionais</p>
                <p className="text-lg font-bold">{commissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Comissões</p>
                <p className="text-lg font-bold text-emerald-400">{fmt(totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma comissão gerada no período. Feche comandas para gerar comissões.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Com. Serv.</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Com. Prod.</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => (
                <TableRow
                  key={c.staffId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedStaff(c)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.staffName}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell>{fmt(c.serviceRevenue)}</TableCell>
                  <TableCell className="text-emerald-400">{fmt(c.serviceCommission)}</TableCell>
                  <TableCell>{fmt(c.productRevenue)}</TableCell>
                  <TableCell className="text-emerald-400">{fmt(c.productCommission)}</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      {fmt(c.totalCommission)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes — {selectedStaff?.staffName}
              <Badge variant="secondary" className="text-xs">
                <Lock className="h-3 w-3 mr-1" /> Snapshot
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground">Serviços</p>
                  <p className="font-bold">{fmt(selectedStaff.serviceRevenue)}</p>
                  <p className="text-xs text-emerald-400">Com: {fmt(selectedStaff.serviceCommission)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground">Produtos</p>
                  <p className="font-bold">{fmt(selectedStaff.productRevenue)}</p>
                  <p className="text-xs text-emerald-400">Com: {fmt(selectedStaff.productCommission)}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-xs text-muted-foreground">Total a Pagar</p>
                  <p className="font-bold text-emerald-400">{fmt(selectedStaff.totalCommission)}</p>
                </div>
              </div>

              {/* Service snapshots */}
              {selectedStaff.snapshots.filter(s => s.item_type === "service").length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Serviços ({selectedStaff.snapshots.filter(s => s.item_type === "service").length})
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedStaff.snapshots
                      .filter(s => s.item_type === "service")
                      .map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-2 px-3 text-sm rounded-lg bg-muted/20">
                          <div>
                            <span className="font-medium">{s.item_title}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {format(new Date(s.created_at), "dd/MM", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>{fmt(s.base_amount_cents)}</span>
                            <span className="text-xs text-muted-foreground">{s.commission_percent}%</span>
                            <span className="text-emerald-400 text-xs">+{fmt(s.commission_cents)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Product snapshots */}
              {selectedStaff.snapshots.filter(s => s.item_type === "product").length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Produtos ({selectedStaff.snapshots.filter(s => s.item_type === "product").length})
                  </h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedStaff.snapshots
                      .filter(s => s.item_type === "product")
                      .map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-2 px-3 text-sm rounded-lg bg-muted/20">
                          <div>
                            <span className="font-medium">{s.item_title}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {format(new Date(s.created_at), "dd/MM", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>{fmt(s.base_amount_cents)}</span>
                            <span className="text-xs text-muted-foreground">{s.commission_percent}%</span>
                            <span className="text-emerald-400 text-xs">+{fmt(s.commission_cents)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
