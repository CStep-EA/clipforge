import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function TrialCountdown({ trial }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(trial.trial_end);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setDaysLeft(0);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      setDaysLeft(days);
      setTimeLeft(`${days}d ${hours}h ${minutes}m remaining`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [trial.trial_end]);

  const isExpiringSoon = daysLeft <= 2;

  return (
    <Card className={`glass-card p-4 border ${isExpiringSoon ? "border-[#FFB6C1]/40" : "border-[#00BFFF]/40"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 ${isExpiringSoon ? "text-[#FFB6C1]" : "text-[#00BFFF]"}`} />
          <div>
            <p className="text-sm font-semibold">
              {trial.trial_plan === "family" ? "Family Premium" : "Premium"} Trial Active
            </p>
            <p className={`text-xs ${isExpiringSoon ? "text-[#FFB6C1]" : "text-[#8B8D97]"}`}>
              {timeLeft}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white"
          onClick={() => window.location.href = createPageUrl("Pricing")}
        >
          Upgrade Now
        </Button>
      </div>
    </Card>
  );
}