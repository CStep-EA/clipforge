import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Crown, Clock, Gift, Copy, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";
import TrialPrompt from "./TrialPrompt";

const makeCode = (email) => btoa(email).replace(/[^A-Z0-9]/gi, "").substring(0, 8).toUpperCase();

export default function TrialBanner({ user, plan }) {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const { data: trials = [] } = useQuery({
    queryKey: ["trial", user?.email],
    queryFn: () => base44.entities.PremiumTrial.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  if (dismissed || !user || plan !== "free") return null;

  const activeTrial = trials.find(t => t.is_active && new Date(t.trial_end) > new Date());
  const usedTrial   = trials.length > 0;
  const refCode     = makeCode(user.email);

  const copyRef = () => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${refCode}`);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
    toast.success("Referral link copied!");
  };

  // ── Active trial countdown banner ──────────────────────
  if (activeTrial) {
    const daysLeft = differenceInDays(new Date(activeTrial.trial_end), new Date());
    const isUrgent = daysLeft <= 2;
    return (
      <div className={`mx-4 md:mx-8 mt-4 p-3 rounded-2xl border flex items-center gap-3 transition-all ${isUrgent ? "border-[#FFB6C1]/40 bg-gradient-to-r from-[#FFB6C1]/10 to-transparent" : "border-[#9370DB]/30 bg-gradient-to-r from-[#9370DB]/12 to-transparent"}`}>
        <div className={`p-1.5 rounded-lg shrink-0 ${isUrgent ? "bg-[#FFB6C1]/20" : "bg-[#9370DB]/20"}`}>
          <Clock className={`w-4 h-4 ${isUrgent ? "text-[#FFB6C1]" : "text-[#9370DB]"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#E8E8ED]">
            {activeTrial.trial_plan === "family" ? "Family Premium" : "Premium"} Trial Active
          </p>
          <p className={`text-[10px] ${isUrgent ? "text-[#FFB6C1]" : "text-[#8B8D97]"}`}>
            {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : "Expires today"} —{" "}
            <Link to={createPageUrl("Pricing")} className="underline text-[#9370DB]">
              subscribe to keep access
            </Link>
          </p>
        </div>
        <Badge className="bg-[#9370DB]/20 text-[#9370DB] border-[#9370DB]/30 text-[10px] shrink-0">TRIAL</Badge>
        <button onClick={() => setDismissed(true)} className="text-[#8B8D97] hover:text-[#E8E8ED] shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (usedTrial) return null;

  // ── Trial offer + referral strip ───────────────────────
  return (
    <>
      <div className="mx-4 md:mx-8 mt-4 space-y-2">
        {/* Trial offer */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-[#9370DB]/12 to-[#EC4899]/8 border border-[#9370DB]/25 flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-[#9370DB]/20 shrink-0">
            <Crown className="w-4 h-4 text-[#9370DB]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#E8E8ED]">Try Premium Free for 7 Days</p>
            <p className="text-[10px] text-[#8B8D97]">AI summaries, ad-free shares, unlimited saves. No card needed.</p>
          </div>
          <Button size="sm" onClick={() => setTrialOpen(true)}
            className="bg-gradient-to-r from-[#9370DB] to-[#EC4899] text-white text-xs gap-1 shrink-0">
            <Sparkles className="w-3 h-3" /> Start Trial
          </Button>
          <button onClick={() => setDismissed(true)} className="text-[#8B8D97] hover:text-[#E8E8ED] shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Referral strip */}
        <div className="p-2.5 rounded-xl border border-[#FFB6C1]/20 bg-[#FFB6C1]/5 flex items-center gap-2.5">
          <Gift className="w-3.5 h-3.5 text-[#FFB6C1] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#E8E8ED]">
              <span className="font-semibold">Invite friends</span> · earn 1 month free or $5 credit each
            </p>
          </div>
          <button onClick={copyRef}
            className="flex items-center gap-1 text-[10px] text-[#FFB6C1] font-semibold hover:text-white transition-colors shrink-0">
            {copiedRef ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedRef ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      <TrialPrompt open={trialOpen} onOpenChange={setTrialOpen} plan="premium" />
    </>
  );
}