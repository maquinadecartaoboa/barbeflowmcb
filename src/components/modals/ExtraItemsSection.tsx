import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Package, Scissors, Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface ExtraItem {
  id: string;
  localId: string;
  type: "product" | "service";
  name: string;
  price_cents: number;
  purchase_price_cents?: number;
  staff_id: string | null;
  quantity: number;
}

interface Props {
  tenantId: string;
  onItemsChange: (items: ExtraItem[]) => void;
}

export function ExtraItemsSection({ tenantId, onItemsChange }: Props) {
  const [items, setItems] = useState<ExtraItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [prodRes, svcRes, staffRes] = await Promise.all([
        supabase.from("products").select("id, name, sale_price_cents, purchase_price_cents").eq("tenant_id", tenantId).eq("active", true).order("name"),
        supabase.from("services").select("id, name, price_cents").eq("tenant_id", tenantId).eq("active", true).order("name"),
        supabase.from("staff").select("id, name").eq("tenant_id", tenantId).eq("active", true).order("name"),
      ]);
      setProducts(prodRes.data || []);
      setServices(svcRes.data || []);
      setStaffList(staffRes.data || []);
    };
    load();
  }, [tenantId]);

  const addItem = (type: "product" | "service", item: any) => {
    const newItem: ExtraItem = {
      id: item.id,
      localId: crypto.randomUUID(),
      type,
      name: item.name,
      price_cents: type === "product" ? item.sale_price_cents : item.price_cents,
      purchase_price_cents: type === "product" ? item.purchase_price_cents : undefined,
      staff_id: null,
      quantity: 1,
    };
    const updated = [...items, newItem];
    setItems(updated);
    onItemsChange(updated);
    setSearchOpen(false);
  };

  const removeItem = (localId: string) => {
    const updated = items.filter(i => i.localId !== localId);
    setItems(updated);
    onItemsChange(updated);
  };

  const updateStaff = (localId: string, staffId: string) => {
    const updated = items.map(i => i.localId === localId ? { ...i, staff_id: staffId } : i);
    setItems(updated);
    onItemsChange(updated);
  };

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;
  const totalExtras = items.reduce((sum, i) => sum + i.price_cents, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" /> Itens extras
        </Label>
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" /> Adicionar item
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <Command>
              <CommandInput placeholder="Buscar produto ou serviço..." />
              <CommandList>
                <CommandEmpty>Nenhum item encontrado</CommandEmpty>
                {products.length > 0 && (
                  <CommandGroup heading="Produtos">
                    {products.map(p => (
                      <CommandItem key={`p-${p.id}`} onSelect={() => addItem("product", p)} className="cursor-pointer">
                        <Package className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{fmt(p.sale_price_cents)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {services.length > 0 && (
                  <CommandGroup heading="Serviços">
                    {services.map(s => (
                      <CommandItem key={`s-${s.id}`} onSelect={() => addItem("service", s)} className="cursor-pointer">
                        <Scissors className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{fmt(s.price_cents)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.localId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {item.type === "product"
                    ? <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    : <Scissors className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                  <span className="text-xs font-medium truncate">{item.name}</span>
                  <span className="text-xs font-semibold text-primary ml-auto flex-shrink-0">{fmt(item.price_cents)}</span>
                </div>
                <div className="mt-1.5">
                  <Select value={item.staff_id || ""} onValueChange={(v) => updateStaff(item.localId, v)}>
                    <SelectTrigger className="h-7 text-[11px] w-full">
                      <Users className="h-3 w-3 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Quem vendeu/fez?" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => removeItem(item.localId)}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted-foreground">Total extras</span>
            <span className="font-semibold text-primary">{fmt(totalExtras)}</span>
          </div>
        </div>
      )}
    </div>
  );
}