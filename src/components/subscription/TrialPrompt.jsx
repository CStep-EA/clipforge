import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";

export default function TrialPrompt({ open, onOpenChange, plan = "premium" }) {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleStartTrial = async () => {
    if (!user?.email) {
      toast.error("Please log in first");
      return;
    }

    setLoading(true);
    try {
      // Check if trial already used
      const existingTrial = await base44.entities.PremiumTrial.filter({
        user_email: user.email,
        trial_plan: plan,
      });

      if (existingTrial.length > 0) {
        toast.error("You've already used a trial for this plan");
        setLoading(false);
        return;
      }

      // Create trial record
      const trialDays = plan === "family" ? 14 : 7;
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + trialDays * 24 * 60 * 60 * 1000);

      await base44.entities.PremiumTrial.create({
        user_email: user.email,
        trial_plan: plan,
        trial_start: startDate.toISOString(),
        trial_end: endDate.toISOString(),
        is_active: true,
        converted: false,
      });

      toast.success(`${trialDays}-day ${plan} trial started!`);
      onOpenChange(false);
    } catch (err) {
      console.error("Trial creation failed:", err);
      toast.error("Failed to start trial");
    } finally {
      setLoading(false);
    }
  };

  const trialDays = plan === "family" ? 14 : 7;
  const planName = plan === "family" ? "Family Premium" : "Premium";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#00BFFF]" />
            Free {trialDays}-Day Trial
          </DialogTitle>
          <DialogDescription className="text-[#8B8D97]">
            Try {planName} completely free. No credit card required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="glass-card p-4 rounded-lg border border-[#2A2D3A]">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[#00BFFF] font-bold">✓</span>
                <span>Full access to all {planName} features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00BFFF] font-bold">✓</span>
                <span>No payment method required</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00BFFF] font-bold">✓</span>
                <span>Auto-downgrade to Free when trial ends</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#00BFFF] font-bold">✓</span>
                <span>Cancel anytime, no strings attached</span>
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-2 p-3 bg-[#FFB6C1]/5 border border-[#FFB6C1]/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-[#FFB6C1] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#FFB6C1]">
              Your trial will end in {trialDays} days. You'll need to subscribe to continue using {planName}.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#2A2D3A] text-[#E8E8ED]"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Maybe Later
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white"
            onClick={handleStartTrial}
            disabled={loading}
          >
            {loading ? "Starting..." : `Start Free ${trialDays}-Day Trial`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}