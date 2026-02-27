import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Bookmark, Users, ShoppingCart,
  Sparkles, ArrowRight, X, Plug, Bell, Check
} from "lucide-react";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { createPageUrl } from "@/utils";
import { useNavigate, Link } from "react-router-dom";

const PLATFORMS = [
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "pinterest", label: "Pinterest", emoji: "📌" },
  { id: "twitter", label: "X / Twitter", emoji: "🐦" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
];

const MONITORING_SOURCES = [
  { id: "reddit", label: "Reddit" },
  { id: "twitter", label: "Twitter/X" },
  { id: "cnet", label: "CNET" },
  { id: "pcmag", label: "PCMag" },
];

function StepGrowth({ onNext }) {
  const [choice, setChoice] = useState(null);
  const [referralCode, setReferralCode] = useState("");

  return (
    <div className="space-y-6 w-full">
      <motion.div
        className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center"
        style={{ background: "#EC489915" }}
        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
      >
        <Gift className="w-12 h-12 text-[#EC4899]" />
      </motion.div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Unlock more with friends</h1>
        <p className="text-sm font-bold uppercase tracking-widest text-[#EC4899]">Referrals · Trials · Family</p>
        <p className="text-sm text-[#8B8D97] leading-relaxed">Invite friends, start a free trial, or set up your family plan. More ways to save, together.</p>
      </div>

      <div className="space-y-3">
        {[
          { id: "trial", emoji: "⚡", label: "Start a 7-day free Premium trial", sub: "No credit card required" },
          { id: "referral", emoji: "🎁", label: "Enter a referral code", sub: "Get bonus features for signing up via invite" },
          { id: "family", emoji: "👨‍👩‍👧", label: "Set up Family Premium", sub: "Includes parental controls & child-safe mode" },
          { id: "skip", emoji: "→", label: "Skip for now", sub: "You can do this anytime in Settings" },
        ].map(opt => (
          <button
            key={opt.id}
            onClick={() => setChoice(opt.id)}
            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${choice === opt.id ? "border-[#EC4899]/60 bg-[#EC4899]/10" : "border-[#2A2D3A] bg-[#1A1D27] hover:border-[#EC4899]/30"}`}
          >
            <span className="text-xl">{opt.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-[10px] text-[#8B8D97]">{opt.sub}</p>
            </div>
            {choice === opt.id && <Check className="w-4 h-4 text-[#EC4899]" />}
          </button>
        ))}
      </div>

      {choice === "referral" && (
        <motion.input
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="w-full bg-[#0F1117] border border-[#2A2D3A] rounded-xl px-4 py-3 text-sm text-[#E8E8ED] placeholder-[#8B8D97] focus:outline-none focus:border-[#EC4899]/50"
          placeholder="Enter referral code (e.g. ALICE-CF)"
          value={referralCode}
          onChange={e => setReferralCode(e.target.value.toUpperCase())}
        />
      )}

      <Button
        onClick={() => onNext({ growthChoice: choice, referralCode })}
        disabled={!choice}
        className="w-full py-6 text-base font-black gap-2"
        style={{ background: choice ? "linear-gradient(135deg,#EC4899,#9370DB)" : undefined }}
      >
        {choice === "skip" ? "Continue" : "Let's Go!"} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StepConnections({ onNext }) {
  const [selected, setSelected] = useState([]);

  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="space-y-6 w-full">
      <motion.div
        className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center"
        style={{ background: "#3B82F615" }}
        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
      >
        <Plug className="w-12 h-12 text-[#3B82F6]" />
      </motion.div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Connect your socials</h1>
        <p className="text-sm font-bold uppercase tracking-widest text-[#3B82F6]">Import saves automatically</p>
        <p className="text-sm text-[#8B8D97] leading-relaxed">Select platforms you want to import content from. You can always update this in Settings.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map(p => {
          const active = selected.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${active ? "border-[#3B82F6]/60 bg-[#3B82F6]/10" : "border-[#2A2D3A] bg-[#1A1D27] hover:border-[#3B82F6]/30"}`}
            >
              <span className="text-2xl">{p.emoji}</span>
              <span className="text-sm font-semibold">{p.label}</span>
              {active && <Check className="w-4 h-4 text-[#3B82F6] ml-auto" />}
            </button>
          );
        })}
      </div>
      <Button onClick={() => onNext({ platforms: selected })} className="w-full py-6 text-base font-black gap-2 animate-btn-pulse" style={{ background: "linear-gradient(135deg,#3B82F6,#3B82F699)" }}>
        {selected.length > 0 ? `Connect ${selected.length} platform${selected.length > 1 ? "s" : ""}` : "Skip for now"}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function StepMonitoring({ onNext }) {
  const [optedIn, setOptedIn] = useState(true);
  const [sources, setSources] = useState(["reddit", "twitter"]);

  const toggleSource = (id) =>
    setSources(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="space-y-6 w-full">
      <motion.div
        className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center"
        style={{ background: "#F59E0B15" }}
        initial={{ scale: 0.8 }} animate={{ scale: 1 }}
      >
        <Bell className="w-12 h-12 text-[#F59E0B]" />
      </motion.div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Feedback monitoring</h1>
        <p className="text-sm font-bold uppercase tracking-widest text-[#F59E0B]">Stay in the loop</p>
        <p className="text-sm text-[#8B8D97] leading-relaxed">ClipForge can monitor mentions of your brand or keywords across the web and surface insights for you.</p>
      </div>

      {/* Opt-in toggle */}
      <button
        onClick={() => setOptedIn(v => !v)}
        className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${optedIn ? "border-[#F59E0B]/50 bg-[#F59E0B]/8" : "border-[#2A2D3A] bg-[#1A1D27]"}`}
      >
        <div className={`w-10 h-6 rounded-full transition-all flex items-center px-0.5 ${optedIn ? "bg-[#F59E0B]" : "bg-[#2A2D3A]"}`}>
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${optedIn ? "translate-x-4" : "translate-x-0"}`} />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold">{optedIn ? "Monitoring enabled" : "Monitoring disabled"}</p>
          <p className="text-[10px] text-[#8B8D97]">Daily scan of mentions & feedback</p>
        </div>
      </button>

      {optedIn && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <p className="text-xs text-[#8B8D97] font-medium">Sources to monitor:</p>
          <div className="grid grid-cols-2 gap-2">
            {MONITORING_SOURCES.map(s => {
              const active = sources.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSource(s.id)}
                  className={`text-xs px-3 py-2 rounded-lg border transition-all ${active ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B]" : "border-[#2A2D3A] text-[#8B8D97] hover:border-[#F59E0B]/30"}`}
                >
                  {active && "✓ "}{s.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      <Button onClick={() => onNext({ monitoring: optedIn, monitoringSources: sources })} className="w-full py-6 text-base font-black gap-2 animate-btn-pulse" style={{ background: "linear-gradient(135deg,#F59E0B,#F59E0B99)" }}>
        {optedIn ? "Enable monitoring" : "Skip"}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

const INFO_STEPS = [
  {
    id: "welcome", icon: Zap, accent: "#00BFFF",
    title: "Welcome to ClipForge! ⚡", subtitle: "Your AI-powered digital vault",
    description: "Save anything from the web and social media. AI automatically categorizes, summarizes, and helps you rediscover your saves.",
    action: "Get Started",
  },
  {
    id: "save", icon: Bookmark, accent: "#9370DB",
    title: "Save anything, anywhere", subtitle: "Deals, recipes, events, gifts & more",
    description: "Paste a URL or manually add content. AI analyzes it instantly — categorizing deals, extracting recipes, flagging events.",
    action: "Got it!",
  },
  {
    id: "boards", icon: Users, accent: "#FFB6C1",
    title: "Share with your people", subtitle: "Perfect for couples & roommates",
    description: "Create shared boards for date night ideas, wishlists, and home projects. Real-time sync keeps everyone on the same page.",
    action: "Love it!",
  },
  {
    id: "shopping", icon: ShoppingCart, accent: "#10B981",
    title: "Recipes → Shopping lists", subtitle: "Auto-generated grocery lists",
    description: "Save a recipe, and ClipForge AI automatically extracts every ingredient into a shareable shopping list.",
    action: "Amazing!",
  },
  {
    id: "ai", icon: Sparkles, accent: "#F59E0B",
    title: "Your AI assistant is ready", subtitle: "Research, summarize, suggest",
    description: "Ask anything about your saves. Get deeper research, price comparisons, gift ideas, and personalized recommendations.",
    action: "Let's set up!",
  },
];

// step indices: 0-4 = info slides, 5 = connections, 6 = monitoring
const TOTAL_STEPS = INFO_STEPS.length + 2;

export default function Onboarding() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const finishOnboarding = async (extraData = {}) => {
    if (user) {
      const existing = await base44.entities.OnboardingProgress.filter({ user_email: user.email });
      const payload = {
        completed: true,
        current_step: TOTAL_STEPS,
        completed_steps: [...INFO_STEPS.map(s => s.id), "connections", "monitoring"],
        ...extraData,
      };
      if (existing.length > 0) {
        await base44.entities.OnboardingProgress.update(existing[0].id, payload);
      } else {
        await base44.entities.OnboardingProgress.create({ user_email: user.email, ...payload });
      }
    }
    navigate(createPageUrl("Dashboard"));
  };

  const handleInfoNext = () => {
    if (step < INFO_STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      setStep(INFO_STEPS.length); // go to connections
    }
  };

  const handleConnectionsDone = (data) => {
    setStep(INFO_STEPS.length + 1); // go to monitoring
  };

  const handleMonitoringDone = async (data) => {
    await finishOnboarding(data);
  };

  const handleSkip = async () => {
    if (user) {
      const existing = await base44.entities.OnboardingProgress.filter({ user_email: user.email });
      if (existing.length > 0) {
        await base44.entities.OnboardingProgress.update(existing[0].id, { skipped: true });
      } else {
        await base44.entities.OnboardingProgress.create({ user_email: user.email, skipped: true, completed: false });
      }
    }
    navigate(createPageUrl("Dashboard"));
  };

  const isInfoStep = step < INFO_STEPS.length;
  const currentInfoStep = isInfoStep ? INFO_STEPS[step] : null;
  const Icon = currentInfoStep?.icon;

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 y2k-pattern" />
      <div className="pointer-events-none absolute inset-0 y2k-bg opacity-80" />
      <div className="pointer-events-none absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-[#00BFFF]/10 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-1/4 -right-20 w-72 h-72 rounded-full bg-[#9370DB]/10 blur-3xl animate-float-slow" style={{ animationDelay: "1.5s" }} />

      <div className="fixed top-4 left-4">
        <ClipForgeLogo size={30} showText variant="morph" />
      </div>

      <button onClick={handleSkip} className="fixed top-4 right-4 flex items-center gap-1.5 text-xs text-[#8B8D97] hover:text-[#E8E8ED] transition-colors">
        Skip <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress dots */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === step ? 24 : 6,
              background: i <= step
                ? (currentInfoStep?.accent || (step === INFO_STEPS.length ? "#3B82F6" : "#F59E0B"))
                : "#2A2D3A",
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {isInfoStep && currentInfoStep && (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="max-w-sm w-full text-center space-y-8"
          >
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center relative"
              style={{ background: `${currentInfoStep.accent}15` }}
            >
              <div className="absolute inset-0 rounded-3xl opacity-20 blur-xl" style={{ background: currentInfoStep.accent }} />
              <Icon className="w-12 h-12 relative z-10" style={{ color: currentInfoStep.accent }} />
            </motion.div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight leading-tight">{currentInfoStep.title}</h1>
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: currentInfoStep.accent }}>{currentInfoStep.subtitle}</p>
              <p className="text-sm text-[#8B8D97] leading-relaxed">{currentInfoStep.description}</p>
            </div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleInfoNext}
                className="w-full text-white gap-2 py-6 text-base font-black tracking-wide animate-btn-pulse"
                style={{ background: `linear-gradient(135deg, ${currentInfoStep.accent}, ${currentInfoStep.accent}99)` }}
              >
                {currentInfoStep.action} <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>

            <p className="text-xs text-[#8B8D97]">Step {step + 1} of {TOTAL_STEPS}</p>
          </motion.div>
        )}

        {step === INFO_STEPS.length && (
          <motion.div
            key="connections"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="max-w-sm w-full"
          >
            <StepConnections onNext={handleConnectionsDone} />
            <p className="text-xs text-[#8B8D97] text-center mt-4">Step {step + 1} of {TOTAL_STEPS}</p>
          </motion.div>
        )}

        {step === INFO_STEPS.length + 1 && (
          <motion.div
            key="monitoring"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="max-w-sm w-full"
          >
            <StepMonitoring onNext={handleMonitoringDone} />
            <p className="text-xs text-[#8B8D97] text-center mt-4">Step {step + 1} of {TOTAL_STEPS}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}