import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook to get the current user's subscription plan.
 * Returns { plan, isPro, isPremium, isFamily, isTrialing, isLoading }
 */
export function useSubscription() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
  });

  const { data: subs = [], isLoading: subLoading } = useQuery({
    queryKey: ["userSubscription", user?.email],
    queryFn: () => base44.entities.UserSubscription.filter({ user_email: user.email }),
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const { data: trials = [] } = useQuery({
    queryKey: ["trial", user?.email],
    queryFn: () => base44.entities.PremiumTrial.filter({ user_email: user.email }),
    enabled: !!user?.email,
    staleTime: 30_000,
  });

  const sub = subs?.[0];
  let plan = sub?.plan || "free";
  const status = sub?.status || "active";
  const isActive = status === "active" || status === "trialing";

  // Check active trial — temporarily elevate plan
  const activeTrial = trials.find(t => t.is_active && new Date(t.trial_end) > new Date());
  const isTrialing = !!activeTrial;
  if (isTrialing && plan === "free") {
    plan = activeTrial.trial_plan; // "premium" or "family"
  }

  return {
    plan,
    isPro: isActive && (plan === "pro" || plan === "premium" || plan === "family"),
    isPremium: isActive && (plan === "premium" || plan === "family"),
    isFamily: isActive && plan === "family",
    isTrialing,
    isLoading: userLoading || subLoading,
    user,
  };
}