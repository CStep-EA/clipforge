import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Bookmark,
  Users,
  ShoppingCart,
  BarChart3,
  Search,
  Settings,
  Shield,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "My Saves", icon: Bookmark, page: "Saves" },
  { name: "Boards", icon: Users, page: "Boards" },
  { name: "Shopping", icon: ShoppingCart, page: "ShoppingLists" },
  { name: "Analytics", icon: BarChart3, page: "Analytics" },
  { name: "Search", icon: Search, page: "Search" },
  { name: "AI Assistant", icon: Sparkles, page: "Assistant" },
];

const bottomItems = [
  { name: "Settings", icon: Settings, page: "Settings" },
  { name: "Admin", icon: Shield, page: "Admin", adminOnly: true },
  { name: "Support", icon: MessageCircle, page: "Support" },
];

export default function Sidebar({ currentPage, userRole }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300",
        "bg-[#0F1117] border-r border-[#2A2D3A]",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#2A2D3A]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00BFFF] to-[#9370DB] flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg gradient-text tracking-tight">ClipForge</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-[#00BFFF]/10 text-[#00BFFF]"
                  : "text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#1A1D27]"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(0,191,255,0.5)]")} />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="py-3 px-2 border-t border-[#2A2D3A] space-y-1">
        {bottomItems.map((item) => {
          if (item.adminOnly && userRole !== "admin") return null;
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-[#00BFFF]/10 text-[#00BFFF]"
                  : "text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#1A1D27]"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center text-[#8B8D97] hover:text-[#00BFFF] transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}