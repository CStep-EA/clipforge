import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import {
  Globe, Download, Shield, Zap, Users, Heart,
  ArrowRight, Apple, Play
} from "lucide-react";
import PublicFooter from "@/components/shared/PublicFooter";

function usePWAInstall() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  };

  return { canInstall: !!prompt, install, installed };
}

const values = [
  { icon: Zap, color: "#00BFFF", title: "Speed first", desc: "Save anything in under 2 seconds, from any device." },
  { icon: Shield, color: "#9370DB", title: "Your data, your rules", desc: "We don't sell your data. Ever." },
  { icon: Users, color: "#FFB6C1", title: "Built for families", desc: "Share, collaborate, and keep kids safe online." },
  { icon: Heart, color: "#10B981", title: "Made with love", desc: "A garage project that grew into something real." },
];

export default function About() {
  const { canInstall, install, installed } = usePWAInstall();

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-14">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center pt-8 space-y-5"
      >
        <div className="flex justify-center">
          <ClipForgeLogo size={72} variant="morph" showText={false} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          <span className="gradient-text">ClipForge</span>
        </h1>
        <p className="text-[#8B8D97] text-lg max-w-xl mx-auto leading-relaxed">
          The ultimate save organizer — built in a garage, shipped to the world.
        </p>

        {/* Install buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {canInstall && !installed ? (
            <Button
              onClick={install}
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white font-bold gap-2 px-6 btn-glow animate-btn-pulse"
            >
              <Download className="w-4 h-4" /> Add to Home Screen
            </Button>
          ) : installed ? (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">
              ✓ ClipForge installed!
            </div>
          ) : (
            <Button
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white font-bold gap-2 px-6 btn-glow"
              onClick={() => window.open(window.location.origin, "_blank")}
            >
              <Globe className="w-4 h-4" /> Open Web App
            </Button>
          )}

          {/* App Store placeholders */}
          <Button variant="outline" className="border-[#2A2D3A] text-[#8B8D97] gap-2 cursor-not-allowed opacity-60" disabled>
            <Apple className="w-4 h-4" /> App Store (coming soon)
          </Button>
          <Button variant="outline" className="border-[#2A2D3A] text-[#8B8D97] gap-2 cursor-not-allowed opacity-60" disabled>
            <Play className="w-4 h-4" /> Google Play (coming soon)
          </Button>
        </div>
      </motion.div>

      {/* Story */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-3xl p-8 space-y-4"
      >
        <h2 className="text-2xl font-bold">Our Story</h2>
        <p className="text-[#8B8D97] leading-relaxed">
          ClipForge started as a personal frustration. We'd save links to 6 different apps, forget where things were,
          and miss deals, events, and recipes we genuinely cared about. So we built one place for all of it.
        </p>
        <p className="text-[#8B8D97] leading-relaxed">
          What started as a garage prototype is now a full-featured save organizer with AI search, social sharing,
          family accounts, streaming integrations, and event tracking — with more shipping every week.
        </p>
        <p className="text-sm text-[#00BFFF]">We're still a small team. We read every support ticket. We ship fast. 🚀</p>
      </motion.section>

      {/* Values */}
      <div>
        <h2 className="text-xl font-bold mb-5">What we stand for</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3 }}
              className="glass-card rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="p-2 rounded-xl shrink-0" style={{ background: `${v.color}18` }}>
                <v.icon className="w-5 h-5" style={{ color: v.color }} />
              </div>
              <div>
                <p className="font-semibold text-sm">{v.title}</p>
                <p className="text-xs text-[#8B8D97] mt-1">{v.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Navigation links */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-[#8B8D97] uppercase tracking-wider mb-4">Explore</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Vision & Mission", page: "VisionMission", color: "#9370DB" },
            { label: "Launch Roadmap", page: "LaunchRoadmap", color: "#00BFFF" },
            { label: "Pricing & Plans", page: "Pricing", color: "#FFB6C1" },
          ].map(item => (
            <Link key={item.page} to={createPageUrl(item.page)}>
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#2A2D3A] hover:border-opacity-60 transition-all group"
                style={{ "--hover-color": item.color }}>
                <span className="text-sm font-medium" style={{ color: item.color }}>{item.label}</span>
                <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: item.color }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div className="flex flex-wrap justify-center gap-4 text-xs text-[#8B8D97] pb-8">
        <Link to={createPageUrl("Privacy")} className="hover:text-[#00BFFF] transition-colors">Privacy</Link>
        <Link to={createPageUrl("Terms")} className="hover:text-[#00BFFF] transition-colors">Terms</Link>
        <Link to={createPageUrl("Cookies")} className="hover:text-[#00BFFF] transition-colors">Cookies</Link>
        <Link to={createPageUrl("Support")} className="hover:text-[#00BFFF] transition-colors">Support</Link>
        <span>© 2026 ClipForge</span>
      </div>
    </div>
  );
}