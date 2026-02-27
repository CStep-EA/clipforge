import React from "react";
import { Lock, Crown, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const TIER_ORDER = ["free", "pro", "premium", "family"];
const TIER_CONFIG = {
  free: { label: "Free", color: "#8B8D97", icon: null },
  pro: { label: "Pro", color: "#00BFFF", icon: Zap },
  premium: { label: "Premium", color: "#9370DB", icon: Crown },
  family: { label: "Family", color: "#EC4899", icon: Crown },
};

/**
 * Wraps content with a tier gate.
 * required: "pro" | "premium" | "family"
 * currentTier: the user's current plan
 * feature: string description of what's locked
 */
export default function TierGate({ required = "pro", currentTier = "free", feature = "this feature", children, compact = false }) {
  const reqIdx = TIER_ORDER.indexOf(required);
  const curIdx = TIER_ORDER.indexOf(currentTier);
  const hasAccess = curIdx >= reqIdx;

  if (hasAccess) return children;

  const cfg = TIER_CONFIG[required];
  const Icon = cfg.icon || Lock;

  if (compact) {
    return (
      <div className="p-3 rounded-xl border border-dashed flex items-center gap-3"
        style={{ borderColor: `${cfg.color}30`, background: `${cfg.color}08` }}>
        <Lock className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
        <p className="text-xs text-[#8B8D97] flex-1">
          {feature} requires <strong className="text-[#E8E8ED]">{cfg.label}</strong>
        </p>
        <Link to={createPageUrl("Pricing")}>
          <Button size="sm" className="text-xs shrink-0" style={{ background: cfg.color, color: "#fff" }}>
            Upgrade <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl border text-center space-y-3"
      style={{ borderColor: `${cfg.color}20`, background: `${cfg.color}06` }}>
      <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center"
        style={{ background: `${cfg.color}15` }}>
        <Icon className="w-6 h-6" style={{ color: cfg.color }} />
      </div>
      <div>
        <p className="font-semibold text-sm">{feature}</p>
        <p className="text-xs text-[#8B8D97] mt-1">
          Requires <strong style={{ color: cfg.color }}>{cfg.label}</strong> plan or higher.
          {currentTier !== "free" && ` You're on ${TIER_CONFIG[currentTier]?.label}.`}
        </p>
      </div>
      <Link to={createPageUrl("Pricing")}>
        <Button size="sm" className="text-white mx-auto gap-1"
          style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}>
          Upgrade to {cfg.label} <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </div>
  );
}