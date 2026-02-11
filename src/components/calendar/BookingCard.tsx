import { formatInTimeZone } from "date-fns-tz";
import { UserCheck } from "lucide-react";
import type { BookingData } from "@/hooks/useBookingsByDate";

const TZ = "America/Bahia";

const statusStyles: Record<string, string> = {
  confirmed: "bg-blue-500/15 border-l-[3px] border-l-blue-500",
  completed: "bg-emerald-500/15 border-l-[3px] border-l-emerald-500",
  pending: "bg-amber-500/15 border-l-[3px] border-l-amber-500",
  no_show: "bg-red-500/15 border-l-[3px] border-l-red-500",
  pending_payment: "bg-purple-500/15 border-l-[3px] border-l-purple-500",
};

interface BookingCardProps {
  booking: BookingData;
  onClick: () => void;
  isRecurring?: boolean;
}

export function BookingCard({ booking, onClick, isRecurring }: BookingCardProps) {
  const startTime = formatInTimeZone(new Date(booking.starts_at), TZ, "HH:mm");
  const endTime = formatInTimeZone(new Date(booking.ends_at), TZ, "HH:mm");
  const style = statusStyles[booking.status] || statusStyles.confirmed;

  return (
    <button
      onClick={onClick}
      className={`w-full h-full rounded-lg px-2 py-1.5 text-left transition-all hover:brightness-110 cursor-pointer overflow-hidden ${style}`}
    >
      <div className="flex items-center gap-1">
        <p className="text-xs font-semibold text-foreground truncate">
          {booking.customer?.name || "Cliente"}
        </p>
        {isRecurring && (
          <span className="flex-shrink-0 text-[9px] font-semibold bg-violet-500/20 text-violet-400 px-1 rounded">
            Fixo
          </span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground truncate">
        {booking.service?.name}
      </p>
      <p className="text-[10px] text-muted-foreground/70">
        {startTime} - {endTime}
      </p>
    </button>
  );
}
