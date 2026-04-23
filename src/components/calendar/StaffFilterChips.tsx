import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface StaffChipMember {
  id: string;
  name: string;
  color?: string | null;
  photo_url?: string | null;
}

interface Props {
  staff: StaffChipMember[];
  visibleStaffIds: string[];
  onToggle: (staffId: string) => void;
  onToggleAll: () => void;
  className?: string;
}

const DEFAULT_COLOR = "#10B981";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StaffFilterChips({
  staff,
  visibleStaffIds,
  onToggle,
  onToggleAll,
  className,
}: Props) {
  if (staff.length === 0) return null;

  const allSelected = visibleStaffIds.length === staff.length;

  return (
    <div
      role="toolbar"
      aria-label="Filtro de profissionais"
      className={cn(
        "flex items-center gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mb-1",
        "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={allSelected}
        onClick={onToggleAll}
        className={cn(
          "snap-start shrink-0 inline-flex items-center gap-2 px-3 h-8 rounded-full border text-xs font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          allSelected
            ? "bg-primary/10 border-primary text-primary"
            : "bg-transparent border-border text-muted-foreground opacity-60 hover:opacity-100",
        )}
      >
        Todos
      </button>

      {staff.map((s) => {
        const isActive = visibleStaffIds.includes(s.id);
        const color = s.color || DEFAULT_COLOR;
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={isActive}
            aria-label={s.name}
            onClick={() => onToggle(s.id)}
            className={cn(
              "snap-start shrink-0 inline-flex items-center gap-2 pl-1 pr-3 h-8 rounded-full border text-xs font-medium transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive ? "" : "bg-transparent border-border text-muted-foreground opacity-60 hover:opacity-100",
            )}
            style={
              isActive
                ? { backgroundColor: `${color}20`, borderColor: color, color }
                : undefined
            }
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={s.photo_url || undefined} />
              <AvatarFallback
                className="text-[9px] font-semibold"
                style={{ backgroundColor: `${color}30`, color }}
              >
                {initials(s.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[10rem]">{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}
