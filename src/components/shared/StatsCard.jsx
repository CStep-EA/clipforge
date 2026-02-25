import React from "react";
import { cn } from "@/lib/utils";

export default function StatsCard({ title, value, icon: Icon, accent = "#00BFFF", trend, className = "" }) {
  return (
    <div className={cn("glass-card rounded-2xl p-5 relative overflow-hidden group transition-all duration-300", className)}
         style={{ borderColor: `${accent}30` }}>
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#8B8D97] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: accent }}>{value}</p>
          {trend && (
            <p className={cn("text-[10px] mt-1", trend > 0 ? "text-emerald-400" : "text-red-400")}>
              {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% this week
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: `${accent}15` }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
      </div>
    </div>
  );
}