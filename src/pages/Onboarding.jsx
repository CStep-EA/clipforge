import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Bookmark, Users, ShoppingCart,
  Sparkles, ArrowRight, CheckCircle2, X
} from "lucide-react";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

const STEPS = [
  {
    id: "welcome",
    icon: Zap,
    accent: "#00BFFF",
    title: "Welcome to ClipForge! ⚡",
    subtitle: "Your AI-powered digital vault",
    description: "Save anything from the web and social media. AI automatically categorizes, summarizes, and helps you rediscover your saves.",
    action: "Get Started",
  },
  {
    id: "save",
    icon: Bookmark,
    accent: "#9370DB",
    title: "Save anything, anywhere",
    subtitle: "Deals, recipes, events, gifts & more",
    description: "Paste a URL or manually add content. AI analyzes it instantly — categorizing deals, extracting recipes, flagging events.",
    action: "Got it!",
  },
  {
    id: "boards",
    icon: Users,
    accent: "#FFB6C1",
    title: "Share with your people",
    subtitle: "Perfect for couples & roommates",
    description: "Create shared boards for date night ideas, wishlists, and home projects. Real-time sync keeps everyone on the same page.",
    action: "Love it!",
  },
  {
    id: "shopping",
    icon: ShoppingCart,
    accent: "#10B981",
    title: "Recipes → Shopping lists",
    subtitle: "Auto-generated grocery lists",
    description: "Save a recipe, and ClipForge AI automatically extracts every ingredient into a shareable shopping list.",
    action: "Amazing!",
  },
  {
    id: "ai",
    icon: Sparkles,
    accent: "#F59E0B",
    title: "Your AI assistant is ready",
    subtitle: "Research, summarize, suggest",
    description: "Ask anything about your saves. Get deeper research, price comparisons, gift ideas, and personalized recommendations.",
    action: "Let's go!",
  },
];

export default function Onboarding() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const currentStep = STEPS[step];
  const Icon = currentStep.icon;
  const progress = ((step) / (STEPS.length - 1)) * 100;

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      // Mark onboarding complete
      if (user) {
        const existing = await base44.entities.OnboardingProgress.filter({ user_email: user.email });
        if (existing.length > 0) {
          await base44.entities.OnboardingProgress.update(existing[0].id, { completed: true, current_step: STEPS.length });
        } else {
          await base44.entities.OnboardingProgress.create({
            user_email: user.email,
            completed: true,
            current_step: STEPS.length,
            completed_steps: STEPS.map(s => s.id),
          });
        }
      }
      navigate(createPageUrl("Dashboard"));
    }
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

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Y2K retro overlay */}
      <div className="pointer-events-none absolute inset-0 y2k-pattern" />
      {/* Floating orbs */}
      <div className="pointer-events-none absolute top-1/4 -left-20 w-64 h-64 rounded-full bg-[#00BFFF]/8 blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-1/4 -right-20 w-64 h-64 rounded-full bg-[#9370DB]/8 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
      <div className="pointer-events-none absolute top-3/4 left-1/3 w-40 h-40 rounded-full bg-[#FFB6C1]/6 blur-2xl animate-float" style={{ animationDelay: "3s" }} />
      {/* Logo top-left */}
      <div className="fixed top-4 left-4">
        <ClipForgeLogo size={28} showText variant="default" />
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="fixed top-4 right-4 flex items-center gap-1.5 text-xs text-[#8B8D97] hover:text-[#E8E8ED] transition-colors"
      >
        Skip <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress dots */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === step ? 24 : 6,
              background: i <= step ? currentStep.accent : "#2A2D3A",
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          className="max-w-sm w-full text-center space-y-8"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center relative"
            style={{ background: `${currentStep.accent}15` }}
          >
            <div
              className="absolute inset-0 rounded-3xl opacity-20 blur-xl"
              style={{ background: currentStep.accent }}
            />
            <Icon className="w-12 h-12 relative z-10" style={{ color: currentStep.accent }} />
          </motion.div>

          {/* Text */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{currentStep.title}</h1>
            <p className="text-sm font-medium" style={{ color: currentStep.accent }}>{currentStep.subtitle}</p>
            <p className="text-sm text-[#8B8D97] leading-relaxed">{currentStep.description}</p>
          </div>

          {/* CTA */}
          <Button
            onClick={handleNext}
            className="w-full text-white gap-2 py-6 text-base"
            style={{ background: `linear-gradient(135deg, ${currentStep.accent}, ${currentStep.accent}99)` }}
          >
            {currentStep.action}
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-xs text-[#8B8D97]">
            Step {step + 1} of {STEPS.length}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}