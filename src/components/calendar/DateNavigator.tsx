import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarIcon, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateNavigatorProps {
  date: Date;
  onDateChange: (date: Date) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  children?: React.ReactNode;
}

export function DateNavigator({ date, onDateChange, viewMode, onViewModeChange, children }: DateNavigatorProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => onDateChange(subDays(date, 1))} className="h-9 w-9">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-center gap-2 font-semibold">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">
                {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { if (d) { onDateChange(d); setCalendarOpen(false); } }}
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" onClick={() => onDateChange(addDays(date, 1))} className="h-9 w-9">
          <ChevronRight className="h-4 w-4" />
        </Button>

        {!isToday && (
          <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())} className="text-xs">
            Hoje
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}

        <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("grid")}
            className="rounded-none h-8 px-3"
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Grade
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className="rounded-none h-8 px-3"
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            Lista
          </Button>
        </div>
      </div>
    </div>
  );
}
