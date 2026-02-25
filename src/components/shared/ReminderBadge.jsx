import React from "react";
import { Bell, BellOff } from "lucide-react";
import { format, isPast, isToday, addDays } from "date-fns";

export default function ReminderBadge({ date, onClear }) {
  if (!date) return null;
  const d = new Date(date);
  const overdue = isPast(d) && !isToday(d);
  const today = isToday(d);
  const soon = !overdue && !today && d <= addDays(new Date(), 3);

  const color = overdue ? "text-red-400 bg-red-500/10 border-red-500/20"
              : today   ? "text-[#FFB6C1] bg-[#FFB6C1]/10 border-[#FFB6C1]/20"
              : soon    ? "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20"
              :           "text-[#8B8D97] bg-[#2A2D3A] border-[#2A2D3A]";

  return (
    <div className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${color}`}>
      <Bell className="w-2.5 h-2.5" />
      {overdue ? "Overdue · " : today ? "Today · " : ""}
      {format(d, "MMM d")}
      {onClear && (
        <button onClick={onClear} className="ml-1 hover:opacity-60">
          <BellOff className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}