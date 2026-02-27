import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Bookmark,
  UserPlus,
  Search,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileItems = [
  { name: "Home", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Saves", icon: Bookmark, page: "Saves" },
  { name: "Search", icon: Search, page: "Search" },
  { name: "Friends", icon: UserPlus, page: "Friends" },
  { name: "AI", icon: Sparkles, page: "Assistant" },
];

export default function MobileNav({ currentPage }) {
  const isDark = typeof document !== "undefined"
    ? document.documentElement.classList.contains("light") === false
    : true;

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-xl px-2 pb-[env(safe-area-inset-bottom)]",
      "bg-[#0F1117]/95 border-t border-[#2A2D3A]",
      ".light & bg-white/95 .light & border-t .light & border-gray-200"
    )}
    style={{
      background: document?.documentElement?.classList?.contains("light") ? "rgba(255,255,255,0.95)" : undefined,
      borderTopColor: document?.documentElement?.classList?.contains("light") ? "#e5e7eb" : undefined,
    }}>
      <div className="flex items-center justify-around py-2">
        {mobileItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all",
                isActive ? "text-[#00BFFF]" : "text-[#8B8D97]"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]")} />
              <span className="text-[10px] font-medium">{item.name}</span>
              {isActive && <div className="w-4 h-0.5 rounded-full bg-[#00BFFF]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}