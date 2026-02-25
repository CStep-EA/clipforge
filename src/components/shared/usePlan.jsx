import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState, useEffect } from "react";

/**
 * Hook that returns the current user's plan and helpers.
 * planLevel: 0 = free, 1 = pro, 2 = premium
 */
export function usePlan() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: subData = [] } = useQuery({
    queryKey: ["subscription", user?.email],
    queryFn: () => base44.entities.UserSubscription.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const plan = subData[0]?.plan || "free";
  const planLevel = plan === "premium" ? 2 : plan === "pro" ? 1 : 0;

  return {
    plan,
    planLevel,
    user,
    isPro: planLevel >= 1,
    isPremium: planLevel >= 2,
    isFree: planLevel === 0,
  };
}