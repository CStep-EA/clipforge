import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TrialCountdown({ trial }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(trial.trial_end) - new Date();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, expired: true }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400_000),
        hours: Math.floor((diff % 86400_000) / 3600_000),
        minutes: Math.floor((diff % 3600_000) / 60_000),
        expired: false,
      });
    };
    calc();
    const id = setInterval(calc, 60_000);
    return () => clearInterval(id);
  }, [trial.trial_end]);

  const isFamily = trial.trial_plan === "family";
  const planName = isFamily ? "Family Premium" : "Premium";
  const accent = isFamily ? "#EC4899" : "#9370DB";
  const isUrgent = timeLeft.days <= 2 && !timeLeft.expired;

  if (timeLeft.expired) return null;

  return (
    <div
      className="p-4 rounded-2xl border flex items-center gap-4 flex-wrap"
      style={{ background: `${accent}10`, borderColor: `${accent}35` }}
    >
      {/* Icon */}
      <div className="p-2 rounded-xl shrink-0" style={{ background: `${accent}20` }}>
        <Crown className="w-5 h-5" style={{ color: accent }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-[#E8E8ED]">{planName} Trial Active</p>
          {isUrgent && (
            <Badge className="text-[9px] gap-0.5 animate-pink-pulse" style={{ background: "#FFB6C120", color: "#FFB6C1", border: "1px solid #FFB6C130" }}>
              Expiring Soon
            </Badge>
          )}
        </div>

        {/* Clock segments */}
        <div className="flex items-center gap-2 mt-1">
          {[
            { value: timeLeft.days,    label: "d" },
            { value: timeLeft.hours,   label: "h" },
            { value: timeLeft.minutes, label: "m" },
          ].map(({ value, label }, i) => (
            <React.Fragment key={label}>
              {i > 0 && <span className="text-[#2A2D3A] font-bold text-xs">:</span>}
              <div className="flex items-baseline gap-0.5">
                <span className="font-mono font-bold text-sm" style={{ color: isUrgent ? "#FFB6C1" : accent }}>
                  {String(value).padStart(2, "0")}
                </span>
                <span className="text-[9px] text-[#8B8D97]">{label}</span>
              </div>
            </React.Fragment>
          ))}
          <span className="text-[10px] text-[#8B8D97] ml-1">remaining</span>
        </div>
      </div>

      {/* CTA */}
      <Link to={createPageUrl("Pricing")} className="shrink-0">
        <Button size="sm" className="gap-1.5 text-white font-semibold text-xs"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
          <Zap className="w-3 h-3" /> Subscribe & Keep Access
        </Button>
      </Link>
    </div>
  );
}