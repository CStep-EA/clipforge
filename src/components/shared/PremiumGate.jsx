import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Wrap any premium feature with this component.
 * Pass `allowed={true}` when the user has the required plan.
 */
export default function PremiumGate({ allowed, plan = "pro", children, label }) {
  if (allowed) return children;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="opacity-30 pointer-events-none select-none blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F1117]/70 backdrop-blur-sm rounded-2xl">
        <div className="p-3 rounded-full bg-gradient-to-br from-[#00BFFF]/20 to-[#9370DB]/20 mb-3">
          {plan === "premium" ? (
            <Crown className="w-6 h-6 text-[#9370DB]" />
          ) : (
            <Lock className="w-6 h-6 text-[#00BFFF]" />
          )}
        </div>
        <p className="text-sm font-bold gradient-text mb-1">
          {plan === "premium" ? "Premium Feature" : "Pro Feature"}
        </p>
        {label && <p className="text-xs text-[#8B8D97] mb-3 text-center px-4">{label}</p>}
        <Link to={createPageUrl("Pricing")}>
          <Button size="sm" className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white text-xs h-8">
            Upgrade — from $7.99/mo
          </Button>
        </Link>
      </div>
    </div>
  );
}