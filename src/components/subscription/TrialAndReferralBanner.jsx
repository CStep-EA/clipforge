import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TrialCountdown from "./TrialCountdown";
import TrialPrompt from "./TrialPrompt";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

const makeCode = (email) => btoa(email).replace(/[^A-Z0-9]/gi, "").substring(0, 8).toUpperCase();

export default function TrialAndReferralBanner({ user }) {
  const [trialOpen, setTrialOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const { data: trials = [] } = useQuery({
    queryKey: ["trial", user?.email],
    queryFn: () => base44.entities.PremiumTrial.filter({ user_email: user.email, is_active: true }),
    enabled: !!user?.email,
  });

  if (!user) return null;

  const activeTrial = trials.find(t => new Date(t.trial_end) > new Date());
  const refCode = makeCode(user.email);

  const copyRef = () => {
    navigator.clipboard.writeText(`${window.location.origin}?ref=${refCode}`);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
    toast.success("Referral link copied!");
  };

  return (
    <div className="space-y-3">
      {/* Active trial countdown */}
      {activeTrial && <TrialCountdown trial={activeTrial} />}

      {/* Trial promo (no active trial) */}
      {!activeTrial && (
        <div className="glass-card p-4 rounded-xl border border-[#9370DB]/35 bg-gradient-to-r from-[#9370DB]/10 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#E8E8ED]">Try Premium Free — 7 Days</p>
              <p className="text-xs text-[#8B8D97]">Full access, no credit card required</p>
            </div>
            <Button size="sm" className="bg-[#9370DB] hover:bg-[#A080DB] text-white gap-1.5 shrink-0"
              onClick={() => setTrialOpen(true)}>
              <Sparkles className="w-3 h-3" /> Try Now
            </Button>
          </div>
        </div>
      )}

      {/* Referral banner */}
      <div className="glass-card p-4 rounded-xl border border-[#FFB6C1]/35 bg-gradient-to-r from-[#FFB6C1]/10 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#FFB6C1] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#E8E8ED]">Refer a Friend</p>
              <p className="text-xs text-[#8B8D97]">Earn 1 month free or $5 credit per signup</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={copyRef}
            className="border-[#FFB6C1]/40 text-[#FFB6C1] hover:bg-[#FFB6C1]/10 gap-1.5 shrink-0">
            {copiedRef ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedRef ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>

      <TrialPrompt open={trialOpen} onOpenChange={setTrialOpen} plan="premium" />
    </div>
  );
}