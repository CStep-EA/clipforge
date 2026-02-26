import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Crown, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

export default function TrialBanner({ user, plan }) {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [starting, setStarting] = useState(false);

  const { data: trials = [] } = useQuery({
    queryKey: ["trial", user?.email],
    queryFn: () => base44.entities.PremiumTrial.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  if (dismissed || !user) return null;
  if (plan !== "free") return null; // only show to free users

  const activeTrial = trials.find(t => t.is_active && new Date(t.trial_end) > new Date());
  const usedTrial = trials.length > 0;

  const startTrial = async () => {
    if (usedTrial) { toast.error("You've already used your free trial."); return; }
    setStarting(true);
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    await base44.entities.PremiumTrial.create({
      user_email: user.email,
      trial_plan: "premium",
      trial_start: now.toISOString(),
      trial_end: end.toISOString(),
      is_active: true,
      converted: false,
    });
    qc.invalidateQueries({ queryKey: ["trial"] });
    toast.success("14-day Premium trial activated! Enjoy all premium features.");
    setStarting(false);
  };

  if (activeTrial) {
    const daysLeft = differenceInDays(new Date(activeTrial.trial_end), new Date());
    return (
      <div className="mx-4 md:mx-8 mt-4 p-3 rounded-2xl bg-gradient-to-r from-[#9370DB]/15 to-[#EC4899]/10 border border-[#9370DB]/30 flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-[#9370DB]/20 flex-shrink-0">
          <Clock className="w-4 h-4 text-[#9370DB]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#E8E8ED]">Premium Trial Active</p>
          <p className="text-[10px] text-[#8B8D97]">{daysLeft} day{daysLeft !== 1 ? "s" : ""} left — <Link to={createPageUrl("Pricing")} className="text-[#9370DB] underline">subscribe to keep access</Link></p>
        </div>
        <Badge className="bg-[#9370DB]/20 text-[#9370DB] border-[#9370DB]/30 text-[10px]">TRIAL</Badge>
        <button onClick={() => setDismissed(true)} className="text-[#8B8D97] hover:text-[#E8E8ED] flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (usedTrial) return null;

  return (
    <div className="mx-4 md:mx-8 mt-4 p-3 rounded-2xl bg-gradient-to-r from-[#9370DB]/10 to-[#EC4899]/8 border border-[#9370DB]/25 flex items-center gap-3">
      <div className="p-1.5 rounded-lg bg-[#9370DB]/20 flex-shrink-0">
        <Crown className="w-4 h-4 text-[#9370DB]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#E8E8ED]">Try Premium Free for 14 Days</p>
        <p className="text-[10px] text-[#8B8D97]">Unlimited saves, AI summaries, ad-free sharing & more. No credit card needed.</p>
      </div>
      <Button size="sm" disabled={starting} onClick={startTrial}
        className="bg-gradient-to-r from-[#9370DB] to-[#EC4899] text-white text-xs gap-1.5 flex-shrink-0">
        <Sparkles className="w-3 h-3" /> Start Trial
      </Button>
      <button onClick={() => setDismissed(true)} className="text-[#8B8D97] hover:text-[#E8E8ED] flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}