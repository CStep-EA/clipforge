/**
 * SaveFAB.jsx — Floating Action Button for quick saves
 *
 * - Renders a large (+) button fixed bottom-right on mobile
 * - Expands into two tap targets: "Save Link" and "Save Note"
 * - Stays out of the way of the MobileNav (bottom-nav sits at 64px)
 * - min-height / min-width ≥ 56px for accessibility
 * - Reduced-motion safe
 * - Accepts `onSaveLink` and `onSaveNote` callbacks (both open AddItemDialog)
 */
import React, { useState, useEffect, useRef } from "react";
import { Plus, Link2, FileText, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SaveFAB({ onSaveLink, onSaveNote }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSaveLink = () => {
    setOpen(false);
    onSaveLink?.();
  };

  const handleSaveNote = () => {
    setOpen(false);
    onSaveNote?.();
  };

  return (
    // Only visible on mobile (hidden md:hidden) — desktop uses sidebar quick-save
    <div
      ref={containerRef}
      // 88px from bottom so it clears the 64px MobileNav + 24px breathing room
      className="fixed bottom-[88px] right-4 z-40 flex flex-col items-end gap-3 md:hidden"
      aria-label="Quick save actions"
    >
      {/* ── Sub-actions ────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Save Note */}
            <motion.div
              key="note"
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              transition={{ delay: 0.05 }}
            >
              <SubAction
                icon={<FileText className="w-5 h-5" />}
                label="Save Note"
                color="#9370DB"
                onClick={handleSaveNote}
              />
            </motion.div>

            {/* Save Link */}
            <motion.div
              key="link"
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              transition={{ delay: 0 }}
            >
              <SubAction
                icon={<Link2 className="w-5 h-5" />}
                label="Save Link"
                color="#00BFFF"
                onClick={handleSaveLink}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main FAB button ────────────────────────────────────────── */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close quick save menu" : "Open quick save menu"}
        aria-expanded={open}
        whileTap={{ scale: 0.93 }}
        className={cn(
          "w-16 h-16 rounded-full shadow-2xl",
          "flex items-center justify-center",
          "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00BFFF]/50",
          "transition-all duration-200",
          open
            ? "bg-[#2A2D3A] text-[#E8E8ED]"
            : "bg-gradient-to-br from-[#00BFFF] to-[#9370DB] text-white animate-btn-pulse"
        )}
        style={
          open
            ? {}
            : { boxShadow: "0 8px 32px rgba(0,191,255,0.45), 0 4px 14px rgba(147,112,219,0.25)" }
        }
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.18 }}
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </motion.div>
      </motion.button>
    </div>
  );
}

// ── Sub-action button ─────────────────────────────────────────────────────
function SubAction({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center gap-3 pr-4 pl-3 h-12 rounded-full text-white text-sm font-semibold shadow-lg transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      style={{
        background: color,
        boxShadow: `0 4px 18px ${color}66`,
        minWidth: "130px",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
