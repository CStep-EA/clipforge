import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plug, Zap, ChevronRight } from "lucide-react";

const PLATFORMS = [
  { id: "discord", emoji: "🎮", name: "Discord" },
  { id: "twitch", emoji: "📺", name: "Twitch" },
  { id: "youtube", emoji: "▶️", name: "YouTube" },
  { id: "spotify", emoji: "🎵", name: "Spotify" },
];

export default function IntegrationQuickBar({ connections = [] }) {
  const connectedIds = new Set(connections.filter(c => c.connected).map(c => c.platform));
  const connectedCount = connectedIds.size;

  if (connectedCount >= PLATFORMS.length) return null; // all connected, no need for prompt

  return (
    <Link to={createPageUrl("Integrations")} className="block group">
      <div className="rounded-2xl border border-[#9370DB]/20 p-3 flex items-center gap-3 hover:border-[#9370DB]/40 transition-all cursor-pointer"
        style={{ background: "linear-gradient(135deg, rgba(0,191,255,0.04), rgba(147,112,219,0.07))" }}>
        <div className="w-8 h-8 rounded-xl bg-[#9370DB]/15 flex items-center justify-center shrink-0">
          <Plug className="w-4 h-4 text-[#9370DB]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#E8E8ED]">
            {connectedCount === 0 ? "Connect streaming platforms" : `${connectedCount} platform${connectedCount > 1 ? "s" : ""} connected`}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {PLATFORMS.map(p => (
              <span key={p.id} className={`text-xs transition-opacity ${connectedIds.has(p.id) ? "opacity-100" : "opacity-30"}`} title={p.name}>
                {p.emoji}
              </span>
            ))}
            {connectedCount < PLATFORMS.length && (
              <span className="text-[10px] text-[#8B8D97] ml-1">
                +{PLATFORMS.length - connectedCount} more to connect
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97] group-hover:text-[#9370DB] transition-colors shrink-0" />
      </div>
    </Link>
  );
}