import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Zap, Crown, Users, Check, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const PLAN_META = {
  premium: {
    name: "Premium",
    days: 7,
    icon: Crown,
    color: "#9370DB",
    features: [
      "Social media auto-sync",
      "Ticketmaster & event integrations",
      "Advanced AI agents & research",
      "Real-time collaboration",
      "Ad-free shared pages",
    ],
  },
  family: {
    name: "Family Premium",
    days: 14,
    icon: Users,
    color: "#EC4899",
    features: [
      "Everything in Premium",
      "Up to 6 family members",
      "Child-safe content filters",
      "COPPA-compliant child accounts",
      "Family boards, saves & calendar",
    ],
  },
};

export default function TrialPrompt({ open, onOpenChange, plan = "premium" }) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const qc = useQueryClient();

  const meta = PLAN_META[plan] || PLAN_META.premium;
  const Icon = meta.icon;

  useEffect(() => {
    if (!open) return;
    base44.auth.me().then(async u => {
      setUser(u);
      if (u?.email) {
        const existing = await base44.entities.PremiumTrial.filter({
          user_email: u.email,
          trial_plan: plan,
        });
        setAlreadyUsed(existing.length > 0);
      }
    }).catch(() => {});
  }, [open, plan]);

  const handleStartTrial = async () => {
    if (!user?.email) { toast.error("Please log in first"); return; }
    if (alreadyUsed) { toast.error("You've already used a trial for this plan"); return; }

    setLoading(true);
    const now = new Date();
    const end = new Date(now.getTime() + meta.days * 86400_000);

    await base44.entities.PremiumTrial.create({
      user_email: user.email,
      trial_plan: plan,
      trial_start: now.toISOString(),
      trial_end: end.toISOString(),
      is_active: true,
      converted: false,
    });

    qc.invalidateQueries({ queryKey: ["trial"] });
    qc.invalidateQueries({ queryKey: ["currentUser"] });
    toast.success(`${meta.days}-day ${meta.name} trial started! Enjoy your access.`);
    setLoading(false);
    onOpenChange(false);
    // soft reload subscription context
    window.dispatchEvent(new Event("trialStarted"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ background: `${meta.color}20` }}>
              <Icon className="w-5 h-5" style={{ color: meta.color }} />
            </div>
            Free {meta.days}-Day {meta.name} Trial
          </DialogTitle>
          <DialogDescription className="text-[#8B8D97]">
            Full access, no credit card required. Auto-downgrade to Free when trial ends.
          </DialogDescription>
        </DialogHeader>

        {alreadyUsed && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-500/25 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-400">You've already used a {meta.name} trial. Upgrade to continue access.</p>
          </div>
        )}

        {/* Trial length badge */}
        <div className="flex items-center gap-2">
          <Badge className="gap-1" style={{ background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}30` }}>
            <Clock className="w-3 h-3" /> {meta.days} days free
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
            <Zap className="w-3 h-3" /> No card needed
          </Badge>
        </div>

        {/* Features */}
        <ul className="space-y-2.5 py-1">
          {meta.features.map((feat, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: `${meta.color}20` }}>
                <Check className="w-3 h-3" style={{ color: meta.color }} />
              </div>
              <span className="text-[#E8E8ED]">{feat}</span>
            </li>
          ))}
        </ul>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-[#FFB6C1]/5 border border-[#FFB6C1]/20 rounded-xl">
          <AlertCircle className="w-4 h-4 text-[#FFB6C1] mt-0.5 shrink-0" />
          <p className="text-xs text-[#FFB6C1]">
            After {meta.days} days, you'll automatically return to the Free tier. No surprise charges.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="border-[#2A2D3A] text-[#E8E8ED]"
            onClick={() => onOpenChange(false)} disabled={loading}>
            Maybe Later
          </Button>
          <Button
            className="flex-1 text-white font-bold gap-2"
            style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}
            onClick={handleStartTrial}
            disabled={loading || alreadyUsed}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {alreadyUsed ? "Trial Already Used" : `Start Free ${meta.days}-Day Trial`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}