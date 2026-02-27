import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Calendar, ChevronDown, ExternalLink, Bell, BellOff, Lock, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import useSubscription from "@/components/shared/useSubscription";

// ── ICS helpers ──────────────────────────────────────────────────────────────

function formatICS(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function eventDate(ev) {
  return ev.date || ev.event_date || null;
}

function eventTitle(ev) {
  return ev.name || ev.title || "Event";
}

function eventLocation(ev) {
  return [ev.venue || ev.event_venue, ev.city || ev.event_city].filter(Boolean).join(", ");
}

function eventDesc(ev) {
  return ev.ai_review || ev.description || ev.ai_summary || "";
}

function buildICS(ev) {
  const start = formatICS(eventDate(ev));
  const end = formatICS(eventDate(ev) ? new Date(new Date(eventDate(ev)).getTime() + 7200000).toISOString() : null);
  const url = ev.ticketmaster_url || ev.ticket_url || ev.url || "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClipForge//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${eventTitle(ev)}`,
    `LOCATION:${eventLocation(ev)}`,
    `DESCRIPTION:${(eventDesc(ev) + (url ? `\n\nTickets: ${url}` : "")).replace(/\n/g, "\\n")}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildGoogleUrl(ev) {
  const start = formatICS(eventDate(ev));
  const end = formatICS(eventDate(ev) ? new Date(new Date(eventDate(ev)).getTime() + 7200000).toISOString() : null);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle(ev))}&dates=${start}/${end}&location=${encodeURIComponent(eventLocation(ev))}&details=${encodeURIComponent(eventDesc(ev))}`;
}

function buildOutlookUrl(ev) {
  const start = eventDate(ev) ? new Date(eventDate(ev)).toISOString() : new Date().toISOString();
  const end = eventDate(ev) ? new Date(new Date(eventDate(ev)).getTime() + 7200000).toISOString() : new Date().toISOString();
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(eventTitle(ev))}&startdt=${start}&enddt=${end}&location=${encodeURIComponent(eventLocation(ev))}`;
}

function buildYahooUrl(ev) {
  const start = formatICS(eventDate(ev));
  const end = formatICS(eventDate(ev) ? new Date(new Date(eventDate(ev)).getTime() + 7200000).toISOString() : null);
  return `https://calendar.yahoo.com/?v=60&title=${encodeURIComponent(eventTitle(ev))}&st=${start}&et=${end}&in_loc=${encodeURIComponent(eventLocation(ev))}`;
}

// ── Reminder popover ─────────────────────────────────────────────────────────

function ReminderConfig({ ev, entity, onSaved }) {
  const { isPremium, isFamily } = useSubscription();
  const isPremiumUser = isPremium || isFamily;
  const [enabled, setEnabled] = useState(ev.reminder_enabled || false);
  const [email, setEmail] = useState(ev.reminder_email || ev.created_by || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const update = { reminder_enabled: enabled, reminder_email: email };
    if (entity === "EventSuggestion") {
      await base44.entities.EventSuggestion.update(ev.id, update);
    } else {
      await base44.entities.SavedItem.update(ev.id, update);
    }
    toast.success(enabled ? "Reminders enabled!" : "Reminders disabled");
    onSaved?.({ ...ev, ...update });
    setSaving(false);
  };

  return (
    <div className="space-y-3 p-1">
      <p className="text-xs font-semibold text-[#E8E8ED] flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5 text-[#00BFFF]" /> Event Reminders
      </p>
      {!ev.ticket_purchased && (
        <p className="text-[10px] text-[#F59E0B]">
          🎟 No ticket purchase recorded — we'll remind you to buy!
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-[#E8E8ED]">Enable reminders</p>
          <p className="text-[10px] text-[#8B8D97]">7 days & 24 hours before</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Premium: 1-hour reminder */}
      <div className={`flex items-center justify-between gap-3 rounded-lg p-2 ${isPremiumUser ? "bg-[#9370DB]/5 border border-[#9370DB]/20" : "opacity-50"}`}>
        <div>
          <p className="text-xs text-[#E8E8ED] flex items-center gap-1">
            1-hour reminder
            {!isPremiumUser && <Lock className="w-3 h-3 text-[#8B8D97]" />}
          </p>
          <p className="text-[10px] text-[#8B8D97]">{isPremiumUser ? "Premium feature ✓" : "Premium / Family required"}</p>
        </div>
        <Badge variant="outline" className="text-[9px] border-[#9370DB]/30 text-[#9370DB]">
          {isPremiumUser ? "Enabled" : "Premium"}
        </Badge>
      </div>

      {enabled && (
        <div>
          <p className="text-[10px] text-[#8B8D97] mb-1">Send to email</p>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-[#0F1117] border border-[#2A2D3A] text-[#E8E8ED] text-xs rounded-lg px-2 py-1.5"
          />
        </div>
      )}

      <Button size="sm" onClick={save} disabled={saving}
        className="w-full h-7 text-xs bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-1">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        Save Preferences
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AddToCalendarButton({
  event,
  entity = "EventSuggestion",  // "EventSuggestion" | "SavedItem"
  size = "sm",
  onEventUpdated
}) {
  const { isPremium, isFamily } = useSubscription();
  const isPremiumUser = isPremium || isFamily;
  const [localEv, setLocalEv] = useState(event);

  const handleICS = () => {
    const ics = buildICS(localEv);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle(localEv).replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar file downloaded!");
  };

  const onSaved = (updated) => {
    setLocalEv(updated);
    onEventUpdated?.(updated);
  };

  const hasDate = !!eventDate(localEv);

  return (
    <div className="flex items-center gap-1">
      {/* Calendar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={size} variant="outline"
            className="border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] hover:border-[#00BFFF]/40 gap-1.5 text-xs">
            <Calendar className="w-3 h-3" />
            {size !== "icon" && "Add to Calendar"}
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-[#1A1D27] border-[#2A2D3A] min-w-[180px]">
          {!hasDate && (
            <div className="px-2 py-1.5 text-[10px] text-[#F59E0B]">⚠ No event date stored</div>
          )}
          <DropdownMenuItem className="text-[#E8E8ED] text-xs gap-2 cursor-pointer"
            onClick={() => window.open(buildGoogleUrl(localEv), "_blank")}>
            <ExternalLink className="w-3 h-3 text-[#00BFFF]" /> Google Calendar
          </DropdownMenuItem>
          <DropdownMenuItem className="text-[#E8E8ED] text-xs gap-2 cursor-pointer" onClick={handleICS}>
            <Calendar className="w-3 h-3 text-[#FFB6C1]" /> Apple Calendar (.ics)
          </DropdownMenuItem>
          <DropdownMenuItem className="text-[#E8E8ED] text-xs gap-2 cursor-pointer"
            onClick={() => window.open(buildOutlookUrl(localEv), "_blank")}>
            <ExternalLink className="w-3 h-3 text-[#9370DB]" /> Outlook Calendar
          </DropdownMenuItem>

          {/* Yahoo — Premium only */}
          <DropdownMenuSeparator className="bg-[#2A2D3A]" />
          {isPremiumUser ? (
            <DropdownMenuItem className="text-[#E8E8ED] text-xs gap-2 cursor-pointer"
              onClick={() => window.open(buildYahooUrl(localEv), "_blank")}>
              <ExternalLink className="w-3 h-3 text-[#F59E0B]" /> Yahoo Calendar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem className="text-[#8B8D97] text-xs gap-2 cursor-not-allowed" disabled>
              <Lock className="w-3 h-3" /> Yahoo Calendar <Badge variant="outline" className="ml-auto text-[8px] border-[#9370DB]/30 text-[#9370DB]">Pro+</Badge>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reminder bell */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost"
            className={`h-7 w-7 rounded-lg transition-all ${localEv.reminder_enabled ? "text-[#00BFFF] bg-[#00BFFF]/10" : "text-[#8B8D97] hover:text-[#00BFFF]"}`}
            title="Set reminder">
            {localEv.reminder_enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="bg-[#1A1D27] border-[#2A2D3A] w-64 p-3">
          <ReminderConfig ev={localEv} entity={entity} onSaved={onSaved} />
        </PopoverContent>
      </Popover>
    </div>
  );
}