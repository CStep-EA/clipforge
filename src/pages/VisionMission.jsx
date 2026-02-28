import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Eye, Target, ArrowRight } from "lucide-react";
import PublicFooter from "@/components/shared/PublicFooter";

const pillars = [
  { emoji: "🧠", label: "AI-native", desc: "Everything is smart by default" },
  { emoji: "🔒", label: "Private", desc: "Your saves, never sold" },
  { emoji: "👨‍👩‍👧", label: "Family-safe", desc: "COPPA-compliant, always" },
  { emoji: "⚡", label: "Instant", desc: "Sub-2s save from anywhere" },
];

export default function VisionMission() {
  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-12 pt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <h1 className="text-4xl font-black">
          <span className="gradient-text">Vision & Mission</span>
        </h1>
        <p className="text-[#8B8D97]">Why ClipForge exists — and where we're going.</p>
      </motion.div>

      {/* Vision */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-3xl p-8 border border-[#00BFFF]/20 space-y-4"
        style={{ boxShadow: "0 0 40px rgba(0,191,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#00BFFF]/10">
            <Eye className="w-6 h-6 text-[#00BFFF]" />
          </div>
          <h2 className="text-2xl font-bold text-[#00BFFF]">Vision</h2>
        </div>
        <p className="text-lg font-medium leading-relaxed">
          A world where anyone can effortlessly capture, organize, and act on the content that matters to them —
          without friction, without clutter, without compromise.
        </p>
        <p className="text-sm text-[#8B8D97]">
          We believe the internet is full of genuinely useful things — and that everyone deserves a smarter way to hold onto them.
        </p>
      </motion.div>

      {/* Mission */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-card rounded-3xl p-8 border border-[#9370DB]/20 space-y-4"
        style={{ boxShadow: "0 0 40px rgba(147,112,219,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#9370DB]/10">
            <Target className="w-6 h-6 text-[#9370DB]" />
          </div>
          <h2 className="text-2xl font-bold text-[#9370DB]">Mission</h2>
        </div>
        <p className="text-lg font-medium leading-relaxed">
          To build the world's most intuitive save-and-organize platform — powered by AI, loved by families,
          and trusted with privacy.
        </p>
        <p className="text-sm text-[#8B8D97]">
          We ship every week. We listen to every user. We build for the long term.
        </p>
      </motion.div>

      {/* Pillars */}
      <div>
        <h2 className="text-lg font-bold mb-4 text-center">Core Pillars</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {pillars.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.4 }}
              className="glass-card rounded-2xl p-5 text-center space-y-2"
            >
              <div className="text-3xl">{p.emoji}</div>
              <p className="font-bold text-sm">{p.label}</p>
              <p className="text-[10px] text-[#8B8D97]">{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Nav */}
      <div className="flex flex-wrap justify-center gap-4 text-sm pt-4">
        <Link to={createPageUrl("About")} className="flex items-center gap-1.5 text-[#00BFFF] hover:underline">
          <ArrowRight className="w-4 h-4 rotate-180" /> About us
        </Link>
        <Link to={createPageUrl("LaunchRoadmap")} className="flex items-center gap-1.5 text-[#9370DB] hover:underline">
          Roadmap <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <PublicFooter />
    </div>
  );
}