/**
 * CommandPalette.jsx — Global Cmd+K / Ctrl+K command palette
 *
 * Competitive gap: Raindrop.io, Notion, and Linear all have Cmd+K command
 * palettes. Power users expect this; it dramatically reduces navigation friction.
 *
 * Features:
 * - Open with Cmd+K (macOS) or Ctrl+K (Windows/Linux)
 * - Navigate to any page instantly
 * - Jump to Add Save dialog
 * - Search saved items
 * - Close with Escape
 *
 * Uses cmdk (already installed as a dependency).
 */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Bookmark, Plug, Users, Calendar,
  ShoppingCart, BarChart3, Sparkles, Settings, HelpCircle,
  Plus, Search, Zap, MessageCircle, Info, ArrowRight,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",      icon: LayoutDashboard, page: "Dashboard",     group: "Pages" },
  { label: "My Saves",       icon: Bookmark,        page: "Saves",         group: "Pages" },
  { label: "Events",         icon: Calendar,        page: "Events",        group: "Pages" },
  { label: "Shopping Lists", icon: ShoppingCart,    page: "ShoppingLists", group: "Pages" },
  { label: "Analytics",      icon: BarChart3,       page: "Analytics",     group: "Pages" },
  { label: "Integrations",   icon: Plug,            page: "Integrations",  group: "Pages" },
  { label: "AI Assistant",   icon: Sparkles,        page: "Assistant",     group: "Pages" },
  { label: "Friends",        icon: Users,           page: "Friends",       group: "Pages" },
  { label: "Settings",       icon: Settings,        page: "Settings",      group: "Pages" },
  { label: "AI Search",      icon: Search,          page: "Search",        group: "Pages" },
  { label: "Support",        icon: MessageCircle,   page: "Support",       group: "Help" },
  { label: "FAQ",            icon: HelpCircle,      page: "FAQ",           group: "Help" },
  { label: "About Klip4ge",icon: Info,            page: "About",         group: "Help" },
  { label: "Pricing",        icon: Zap,             page: "Pricing",       group: "Help" },
];

// Custom event so other components (e.g. a "+" button) can open the palette
export const OPEN_COMMAND_PALETTE_EVENT = "cf:open-command-palette";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // ── Keyboard shortcut: Cmd+K / Ctrl+K ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Custom event from other components ────────────────────────────────
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handler);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handler);
  }, []);

  const runCommand = useCallback((fn) => {
    setOpen(false);
    fn();
  }, []);

  const groups = [...new Set(NAV_ITEMS.map((i) => i.group))];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions, saves…" />
      <CommandList>
        <CommandEmpty>
          <span className="text-[#8B8D97] text-sm">No results found.</span>
        </CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.dispatchEvent(new CustomEvent("cf:open-add-dialog"))
              )
            }
          >
            <Plus className="mr-2 h-4 w-4 text-[#00BFFF]" />
            <span>Add New Save</span>
            <kbd className="ml-auto text-[10px] text-[#8B8D97] bg-[#2A2D3A] px-1.5 py-0.5 rounded">
              N
            </kbd>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => navigate(createPageUrl("Search")))
            }
          >
            <Search className="mr-2 h-4 w-4 text-[#9370DB]" />
            <span>AI Search my saves</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation groups */}
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.page}
                  onSelect={() =>
                    runCommand(() => navigate(createPageUrl(item.page)))
                  }
                >
                  <Icon className="mr-2 h-4 w-4 text-[#8B8D97]" />
                  <span>{item.label}</span>
                  <ArrowRight className="ml-auto h-3 w-3 text-[#8B8D97] opacity-50" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>

      {/* Footer hint */}
      <div className="flex items-center justify-between border-t border-[#2A2D3A] px-4 py-2">
        <span className="text-[10px] text-[#8B8D97]">
          <kbd className="bg-[#2A2D3A] px-1.5 py-0.5 rounded text-[10px] mr-1">↵</kbd>
          select
          <kbd className="bg-[#2A2D3A] px-1.5 py-0.5 rounded text-[10px] mx-1 ml-2">↑↓</kbd>
          navigate
          <kbd className="bg-[#2A2D3A] px-1.5 py-0.5 rounded text-[10px] mx-1 ml-2">Esc</kbd>
          close
        </span>
        <span className="text-[10px] text-[#8B8D97]">
          <kbd className="bg-[#2A2D3A] px-1.5 py-0.5 rounded text-[10px]">⌘K</kbd>
        </span>
      </div>
    </CommandDialog>
  );
}
