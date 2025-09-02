import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDateRange, presetOptions } from "@/contexts/DateRangeContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Filter } from "lucide-react";

interface DateRangeSelectorProps {
  className?: string;
  showTitle?: boolean;
}

export function DateRangeSelector({ className, showTitle = true }: DateRangeSelectorProps) {
  const {
    preset,
    setPreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateRange,
  } = useDateRange();

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
              <Filter className="h-4 w-4 text-primary" />
            </div>
            Período de Análise
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? "pt-0" : "p-6"}>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === 'custom' && (
            <>
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input 
                  type="date" 
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input 
                  type="date" 
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Display current range */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            <span>
              Analisando de <strong>{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}</strong> até <strong>{format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}</strong>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}