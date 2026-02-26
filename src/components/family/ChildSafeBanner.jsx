import React from "react";
import { Shield, Star, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Simplified UI banner shown when child_safe_mode is active.
 * No ads, simplified layout, kid-friendly icons.
 */
export default function ChildSafeBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 md:mx-8 mt-4 p-3 rounded-2xl flex items-center gap-3"
      style={{ background: "linear-gradient(135deg, rgba(0,191,255,0.12), rgba(147,112,219,0.10))", border: "1px solid rgba(0,191,255,0.25)" }}
    >
      <div className="p-2 rounded-xl bg-[#00BFFF]/15 flex-shrink-0">
        <Shield className="w-5 h-5 text-[#00BFFF]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-[#E8E8ED] flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-yellow-400" /> Kid-Safe Mode Active
        </p>
        <p className="text-[11px] text-[#8B8D97]">Content filters on · No ads · Safe browsing enabled</p>
      </div>
      <BookOpen className="w-5 h-5 text-[#9370DB] flex-shrink-0 animate-pulse" />
    </motion.div>
  );
}