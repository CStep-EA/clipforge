import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Lock } from "lucide-react";

export default function FamilyUpgradePrompt({ feature = "family features" }) {
  return (
    <div className="p-4 rounded-2xl border border-[#EC4899]/25 bg-gradient-to-br from-[#EC4899]/5 to-[#9370DB]/5 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-[#EC4899]/10 flex items-center justify-center mx-auto">
        <Users className="w-6 h-6 text-[#EC4899]" />
      </div>
      <div>
        <p className="text-sm font-bold text-[#E8E8ED] flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#EC4899]" /> Family Premium Required
        </p>
        <p className="text-[11px] text-[#8B8D97] mt-1">
          Unlock {feature} with a Family Premium plan — multi-user accounts, parental controls & more.
        </p>
      </div>
      <Link to={createPageUrl("Pricing")}>
        <Button size="sm" className="bg-gradient-to-r from-[#EC4899] to-[#9370DB] text-white gap-1.5 text-xs">
          Upgrade to Family <ArrowRight className="w-3 h-3" />
        </Button>
      </Link>
    </div>
  );
}