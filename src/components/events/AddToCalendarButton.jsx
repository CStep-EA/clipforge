import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function formatDateToICS(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildICS(event) {
  const start = formatDateToICS(event.date);
  // Default 2-hour event
  const end = formatDateToICS(event.date ? new Date(new Date(event.date).getTime() + 7200000).toISOString() : null);
  const title = event.name || event.title || "Event";
  const location = [event.venue, event.city].filter(Boolean).join(", ");
  const description = event.ai_review || event.description || "";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ClipForge//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildGoogleCalendarUrl(event) {
  const start = formatDateToICS(event.date);
  const end = formatDateToICS(event.date ? new Date(new Date(event.date).getTime() + 7200000).toISOString() : null);
  const title = encodeURIComponent(event.name || event.title || "Event");
  const location = encodeURIComponent([event.venue, event.city].filter(Boolean).join(", "));
  const details = encodeURIComponent(event.ai_review || event.description || "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${location}&details=${details}`;
}

function buildOutlookUrl(event) {
  const title = encodeURIComponent(event.name || event.title || "Event");
  const start = event.date ? new Date(event.date).toISOString() : new Date().toISOString();
  const end = event.date ? new Date(new Date(event.date).getTime() + 7200000).toISOString() : new Date().toISOString();
  const location = encodeURIComponent([event.venue, event.city].filter(Boolean).join(", "));
  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start}&enddt=${end}&location=${location}`;
}

export default function AddToCalendarButton({ event, size = "sm" }) {
  const handleICS = () => {
    const ics = buildICS(event);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(event.name || event.title || "event").replace(/\s+/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant="outline"
          className="border-[#2A2D3A] text-[#8B8D97] hover:text-[#00BFFF] hover:border-[#00BFFF]/40 gap-1.5 text-xs">
          <Calendar className="w-3 h-3" /> Add to Calendar <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-[#1A1D27] border-[#2A2D3A]">
        <DropdownMenuItem className="text-[#E8E8ED] text-xs gap-2 cursor-pointer"
          onClick={() => window.open(buildGoogleCalendarUrl(event), "_blank")}>
          <ExternalLink className="w-3 h-3 text-[#00BFFF]" /> Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem className="text-[#E8E8ED] text-xs gap-2 cursor-pointer"
          onClick={() => window.open(buildOutlookUrl(event), "_blank")}>
          <ExternalLink className="w-3 h-3 text-[#9370DB]" /> Outlook Calendar
        </DropdownMenuItem>
        <DropdownMenuItem className="text-[#E8E8ED] text-xs gap-2 cursor-pointer"
          onClick={handleICS}>
          <Calendar className="w-3 h-3 text-[#FFB6C1]" /> Apple Calendar (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}