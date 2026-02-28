import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Bookmark, Search, Plug, MoreHorizontal,
  Users, ShoppingCart, BarChart3, Sparkles, Calendar,
  UserPlus, Settings, MessageCircle, Info, Zap, X,
  TrendingUp, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const primaryItems = [
  { name: "Home",    icon: LayoutDashboard, page: "Dashboard" },
  { name: "Saves",   icon: Bookmark,        page: "Saves" },
  { name: "Search",  icon: Search,          page: "Search" },
  { name: "Connect", icon: Plug,            page: "Integrations" },
];

const moreItems = [
  { name: "Friends",      icon: UserPlus,     page: "Friends" },
  { name: "Boards",       icon: Users,        page: "Boards" },
  { name: "Events",       icon: Calendar,     page: "Events" },
  { name: "Shopping",     icon: ShoppingCart, page: "ShoppingLists" },
  { name: "Analytics",    icon: BarChart3,    page: "Analytics" },
  { name: "AI Assistant", icon: Sparkles,     page: "Assistant" },
  { name: "Upgrade",      icon: Zap,          page: "Pricing" },
  { name: "Settings",     icon: Settings,     page: "Settings" },
  { name: "Support",      icon: MessageCircle,page: "Support" },
  { name: "About",        icon: Info,         page: "About" },
];

const adminMoreItems = [
  { name: "Admin",     icon: Shield,     page: "Admin",         adminOnly: true },
  { name: "Marketing", icon: TrendingUp, page: "MarketingLaunch", adminOnly: true },
];

export default function MobileNav({ currentPage, userRole }) {
  const [open, setOpen] = useState(false);

  const isMoreActive = [...moreItems, ...adminMoreItems].some(i => i.page === currentPage);

  const allMoreItems = userRole === "admin"
    ? [...moreItems, ...adminMoreItems]
    : moreItems;

  return (
    <>
      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* More drawer */}
      <div
        className={cn(
          "fixed bottom-[64px] left-0 right-0 z-50 md:hidden transition-all duration-300",
          open ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-4 opacity-0 pointer-events-none"
        )}
      >
        <div className="mx-3 mb-2 bg-[#1A1D27]/98 backdrop-blur-xl border border-[#2A2D3A] rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8B8D97] uppercase tracking-widest">All Pages</span>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-[#8B8D97] hover:text-[#E8E8ED]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {allMoreItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all",
                    isActive
                      ? "bg-[#00BFFF]/10 text-[#00BFFF]"
                      : "text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#2A2D3A]"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]")} />
                  <span className="text-[9px] font-medium text-center leading-tight">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0F1117]/97 backdrop-blur-xl border-t border-[#2A2D3A] px-2 pb-[env(safe-area-inset-bottom,8px)]">
        <div className="flex items-center justify-around py-1.5">
          {primaryItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[52px]",
                  isActive ? "text-[#00BFFF]" : "text-[#8B8D97]"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]")} />
                <span className="text-[10px] font-medium">{item.name}</span>
                {isActive && <div className="w-4 h-0.5 rounded-full bg-[#00BFFF]" />}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setOpen(v => !v)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[52px]",
              open || isMoreActive ? "text-[#00BFFF]" : "text-[#8B8D97]"
            )}
          >
            <MoreHorizontal className={cn("w-5 h-5", (open || isMoreActive) && "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]")} />
            <span className="text-[10px] font-medium">More</span>
            {isMoreActive && !open && <div className="w-4 h-0.5 rounded-full bg-[#00BFFF]" />}
          </button>
        </div>
      </nav>
    </>
  );
}