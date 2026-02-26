import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import TrialCountdown from "@/components/subscription/TrialCountdown";
import TrialPrompt from "@/components/subscription/TrialPrompt";
import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";

export default function TrialAndReferralBanner() {
  const [user, setUser] = useState(null);
  const [activeTrial, setActiveTrial] = useState(null);
  const [trialPromptOpen, setTrialPromptOpen] = useState(false);
  const [trialPlan, setTrialPlan] = useState("premium");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (!u?.email) return;

      // Load active trial
      const trials = await base44.entities.PremiumTrial.filter({
        user_email: u.email,
        is_active: true,
      });
      if (trials.length > 0) {
        setActiveTrial(trials[0]);
      }

      // Generate referral code
      const code = btoa(u.email).substring(0, 8).toUpperCase();
      setReferralCode(code);
    }).catch(() => {});
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-3">
      {/* Active Trial */}
      {activeTrial && <TrialCountdown trial={activeTrial} />}

      {/* Trial Promo (if no active trial) */}
      {!activeTrial && (
        <div className="glass-card p-4 rounded-lg border border-[#9370DB]/40 bg-gradient-to-r from-[#9370DB]/10 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Try Premium Free</p>
              <p className="text-xs text-[#8B8D97]">7 days full access, no credit card needed</p>
            </div>
            <Button
              size="sm"
              className="bg-[#9370DB] hover:bg-[#A080DB] text-white"
              onClick={() => {
                setTrialPlan("premium");
                setTrialPromptOpen(true);
              }}
            >
              Try Now
            </Button>
          </div>
        </div>
      )}

      {/* Referral Banner */}
      <div className="glass-card p-4 rounded-lg border border-[#FFB6C1]/40 bg-gradient-to-r from-[#FFB6C1]/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-[#FFB6C1]" />
            <div>
              <p className="text-sm font-semibold">Refer a Friend</p>
              <p className="text-xs text-[#8B8D97]">Earn free months & credits</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-[#FFB6C1]/40 text-[#FFB6C1] hover:bg-[#FFB6C1]/5"
            onClick={() => window.location.href = "#settings-referral"}
          >
            Share
          </Button>
        </div>
      </div>

      <TrialPrompt open={trialPromptOpen} onOpenChange={setTrialPromptOpen} plan={trialPlan} />
    </div>
  );
}