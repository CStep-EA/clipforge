import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSubscription } from "@/components/shared/useSubscription";
import FriendsPanel from "@/components/friends/FriendsPanel";
import ReferralPanel from "@/components/referral/ReferralPanel";
import TrialBanner from "@/components/subscription/TrialBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Gift, UserPlus, Sparkles } from "lucide-react";
import ClipForgeLogo from "@/components/shared/ClipForgeLogo";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Friends() {
  const [user, setUser] = useState(null);
  const { plan, isPro, isFamily } = useSubscription();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <TrialBanner user={user} plan={plan} />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#00BFFF]/15 to-[#9370DB]/15 border border-[#00BFFF]/20">
            <UserPlus className="w-6 h-6 text-[#00BFFF]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Friends & Referrals</h1>
            <p className="text-sm text-[#8B8D97]">Connect with friends · earn rewards · share saves</p>
          </div>
        </motion.div>

        {/* Family Premium CTA if not on family plan */}
        {!isFamily && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Link to={createPageUrl("Pricing")}
              className="block p-4 rounded-2xl border border-[#9370DB]/30 hover:border-[#9370DB]/60 transition-all animate-gradient-shift"
              style={{ background: "linear-gradient(135deg, rgba(147,112,219,0.1), rgba(255,182,193,0.08), rgba(0,191,255,0.06))", backgroundSize: "200% 200%" }}
            >
              <div className="flex items-center gap-3">
                <ClipForgeLogo size={28} variant="morph" />
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-wide" style={{ background: "linear-gradient(135deg,#9370DB,#FFB6C1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                    Unlock Family Premium
                  </p>
                  <p className="text-xs text-[#8B8D97]">Share with up to 6 family members · child-safe mode · shared boards</p>
                </div>
                <Sparkles className="w-5 h-5 text-[#9370DB] animate-pulse flex-shrink-0" />
              </div>
            </Link>
          </motion.div>
        )}

        <Tabs defaultValue="friends">
          <TabsList className="bg-[#1A1D27] border border-[#2A2D3A] w-full">
            <TabsTrigger value="friends" className="flex-1 gap-1.5 data-[state=active]:bg-[#2A2D3A] data-[state=active]:text-[#00BFFF]">
              <Users className="w-3.5 h-3.5" /> Friends
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex-1 gap-1.5 data-[state=active]:bg-[#2A2D3A] data-[state=active]:text-[#9370DB]">
              <Gift className="w-3.5 h-3.5" /> Referrals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            <FriendsPanel user={user} plan={plan} />
          </TabsContent>

          <TabsContent value="referrals" className="mt-4">
            <ReferralPanel user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}