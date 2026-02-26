import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSubscription } from "@/components/shared/useSubscription";
import FriendsPanel from "@/components/friends/FriendsPanel";
import ReferralPanel from "@/components/referral/ReferralPanel";
import TrialBanner from "@/components/subscription/TrialBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Gift } from "lucide-react";

export default function Friends() {
  const [user, setUser] = useState(null);
  const { plan, isPro } = useSubscription();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <TrialBanner user={user} plan={plan} />
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Friends & Referrals</h1>
          <p className="text-sm text-[#8B8D97] mt-1">Connect with friends and earn rewards</p>
        </div>

        <Tabs defaultValue="friends">
          <TabsList className="bg-[#1A1D27] border border-[#2A2D3A]">
            <TabsTrigger value="friends" className="gap-1.5 data-[state=active]:bg-[#2A2D3A]">
              <Users className="w-3.5 h-3.5" /> Friends
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-1.5 data-[state=active]:bg-[#2A2D3A]">
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