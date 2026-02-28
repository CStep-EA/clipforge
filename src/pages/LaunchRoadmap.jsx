import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Rocket, Flame, Globe2, TrendingUp, ArrowRight, Check, Clock, Globe, Mail, Play, Leaf, Hammer, Heart } from "lucide-react";
import PublicFooter from "@/components/shared/PublicFooter";

const futureIntegrations = [
  {
    icon: Globe,
    color: "#00BFFF",
    title: "Browser Extensions",
    subtitle: "Chrome · Edge · Firefox · Safari",
    description: "Clip content from anywhere on the web with one click — add to saves, boards, or family shares instantly.",
    eta: "Q2 2026",
  },
  {
    icon: Mail,
    color: "#9370DB",
    title: "Mailbox Extensions",
    subtitle: "Gmail · Outlook · Apple Mail",
    description: "Automatically save emails, receipts, newsletters, and attachments to ClipForge — keep life organized across inbox and social.",
    eta: "Q3 2026",
  },
  {
    icon: Play,
    color: "#EC4899",
    title: "Video Stream Accounts",
    subtitle: "Netflix · Paramount · HBO · Disney · YouTube TV",
    description: "Connect your streaming accounts to save shows & movies, track watch-later lists, rate content, and get recommendations across all top 10 video services.",
    eta: "Q4 2026",
  },
];

const platformIntegrations = [
  {
    category: "Gardening Inspiration",
    color: "#10B981",
    icon: Leaf,
    platforms: [
      {
        title: "Houzz",
        description: "Save garden design ideas, plant photos, project plans, and professional landscaping tips.",
      },
      {
        title: "iScape",
        description: "Save garden layouts, plant palettes, outdoor projects, and landscape visualizations.",
      },
    ],
  },
  {
    category: "Home Improvement",
    color: "#F59E0B",
    icon: Hammer,
    platforms: [
      {
        title: "Houzz",
        description: "Save renovation ideas, before/after photos, material selections, and contractor inspiration.",
      },
      {
        title: "Planner 5D",
        description: "Save 3D room layouts, furniture ideas, design concepts, and remodeling plans.",
      },
    ],
  },
  {
    category: "Wellness & Beauty",
    color: "#EC4899",
    icon: Heart,
    platforms: [
      {
        title: "RealSelf",
        description: "Save cosmetic procedure inspiration, before/after photos, reviews, and treatment ideas.",
      },
      {
        title: "YouCam Makeup",
        description: "Save makeup looks, skincare routines, hairstyles, and beauty product ideas.",
      },
    ],
  },
];

const phases = [
  {
    phase: "Phase 1",
    title: "Grassroots",
    icon: Flame,
    color: "#FFB6C1",
    status: "active",
    statusLabel: "In progress",
    items: [
      "Core save & organize features",
      "AI auto-categorization",
      "Shared boards & friends",
      "PWA + web app launch",
      "Privacy-first architecture",
      "Free & Pro tiers",
    ],
  },
  {
    phase: "Phase 2",
    title: "Viral Loops",
    icon: Rocket,
    color: "#00BFFF",
    status: "upcoming",
    statusLabel: "Starting soon",
    items: [
      "Referral program (earn free months)",
      "Public shared boards (shareable URLs)",
      "Social proof & review widgets",
      "App Store & Google Play release",
      "Chrome & Safari extensions",
    ],
  },
  {
    phase: "Phase 3",
    title: "Community",
    icon: Globe2,
    color: "#9370DB",
    status: "planned",
    statusLabel: "Planned",
    items: [
      "Community boards (public curation)",
      "Creator monetization tools",
      "Affiliate link detection & tracking",
      "Family premium growth features",
      "Partner integrations (Ticketmaster, Spotify)",
    ],
  },
  {
    phase: "Phase 4",
    title: "Scale",
    icon: TrendingUp,
    color: "#10B981",
    status: "planned",
    statusLabel: "Future",
    items: [
      "Enterprise & team workspaces",
      "API access for developers",
      "White-label options",
      "International expansion",
      "B2B & brand partnerships",
    ],
  },
];

const statusStyles = {
  active: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  upcoming: { bg: "bg-[#00BFFF]/10", text: "text-[#00BFFF]", border: "border-[#00BFFF]/30" },
  planned: { bg: "bg-[#2A2D3A]", text: "text-[#8B8D97]", border: "border-[#2A2D3A]" },
};

export default function LaunchRoadmap() {
  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-10 pt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <h1 className="text-4xl font-black">
          <span className="gradient-text">Launch Roadmap</span>
        </h1>
        <p className="text-[#8B8D97] max-w-lg mx-auto">
          Our journey from garage prototype to global platform — four phases, one mission.
        </p>
      </motion.div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[22px] top-8 bottom-8 w-px bg-gradient-to-b from-[#FFB6C1]/40 via-[#00BFFF]/40 to-transparent hidden md:block" />

        <div className="space-y-6">
          {phases.map((phase, i) => {
            const Icon = phase.icon;
            const style = statusStyles[phase.status];
            return (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.12 }}
                className="relative md:pl-14"
              >
                {/* Phase dot */}
                <div
                  className="hidden md:flex absolute left-0 top-5 w-11 h-11 rounded-full items-center justify-center shrink-0"
                  style={{ background: `${phase.color}15`, border: `2px solid ${phase.color}40` }}
                >
                  <Icon className="w-5 h-5" style={{ color: phase.color }} />
                </div>

                <div
                  className="glass-card rounded-2xl p-6 space-y-4"
                  style={{ borderColor: phase.status === "active" ? `${phase.color}30` : undefined }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="md:hidden p-2 rounded-xl" style={{ background: `${phase.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: phase.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: phase.color }}>{phase.phase}</p>
                        <h3 className="text-lg font-black">{phase.title}</h3>
                      </div>
                    </div>
                    <Badge className={`${style.bg} ${style.text} border ${style.border} text-xs`}>
                      {phase.status === "active" ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse" /></> : null}
                      {phase.statusLabel}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {phase.items.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm">
                        {phase.status === "active" ? (
                          <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: phase.color }} />
                        ) : (
                          <Clock className="w-4 h-4 mt-0.5 shrink-0 text-[#8B8D97]" />
                        )}
                        <span className={phase.status === "active" ? "text-[#E8E8ED]" : "text-[#8B8D97]"}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Future Integrations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#00BFFF]" />
          <h2 className="text-sm font-black uppercase tracking-widest text-[#8B8D97]">Future Integrations</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {futureIntegrations.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.1 }}
                className="glass-card rounded-2xl p-5 space-y-3"
                style={{ borderColor: `${item.color}25` }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl shrink-0" style={{ background: `${item.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">{item.title}</h3>
                    <p className="text-[10px] font-medium" style={{ color: item.color }}>{item.subtitle}</p>
                  </div>
                  <Badge className="ml-auto text-[9px] bg-[#2A2D3A] text-[#8B8D97] border-[#2A2D3A] whitespace-nowrap">
                    <Clock className="w-2.5 h-2.5 mr-1" />{item.eta}
                  </Badge>
                </div>
                <p className="text-xs text-[#8B8D97] leading-relaxed">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Platform Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-[#10B981]" />
          <h2 className="text-sm font-black uppercase tracking-widest text-[#8B8D97]">Coming Soon — Platform Integrations</h2>
        </div>
        <div className="space-y-6">
          {platformIntegrations.map((category, catIdx) => {
            const CategoryIcon = category.icon;
            return (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 + catIdx * 0.12 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ background: `${category.color}15` }}>
                    <CategoryIcon className="w-4 h-4" style={{ color: category.color }} />
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: category.color }}>{category.category}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {category.platforms.map((platform, idx) => (
                    <motion.div
                      key={platform.title}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.77 + catIdx * 0.12 + idx * 0.06 }}
                      className="glass-card rounded-xl p-4 space-y-2"
                      style={{ borderColor: `${category.color}20` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-[#E8E8ED]">{platform.title}</h4>
                        <Badge className="text-[8px] bg-[#2A2D3A] text-[#8B8D97] border-[#2A2D3A] whitespace-nowrap">
                          <Clock className="w-2 h-2 mr-0.5" /> Q2/Q3
                        </Badge>
                      </div>
                      <p className="text-xs text-[#8B8D97] leading-relaxed">Users will be able to ethically import and organize saves from {platform.title} — ideas, photos, products, and tips — directly into personal/family boards.</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <div className="glass-card rounded-2xl p-5 text-center space-y-2 border border-[#FFB6C1]/20">
        <p className="text-sm font-semibold text-[#FFB6C1]">Want to shape the roadmap?</p>
        <p className="text-xs text-[#8B8D97]">Submit feature requests and vote on what ships next via our Support page.</p>
        <Link to={createPageUrl("Support")}>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#00BFFF] hover:underline mt-1">
            Go to Support <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      <PublicFooter />
    </div>
  );
}