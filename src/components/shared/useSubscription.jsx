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

  const { data: specialAccounts = [] } = useQuery({
    queryKey: ["specialAccount", user?.email],
    queryFn: () => base44.entities.SpecialAccount.filter({ email: user.email, is_active: true }),
    enabled: !!user?.email,
    staleTime: 60_000,
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

  // Check special account (dev/gift) — bypass all billing gates
  const specialAccount = specialAccounts.find(a =>
    a.is_active && (!a.expiration_date || new Date(a.expiration_date) > new Date())
  );
  const isSpecialAccount = !!specialAccount;
  if (isSpecialAccount) {
    plan = specialAccount.tier;
  }

  return {
    plan,
    isPro: isSpecialAccount || (isActive && (plan === "pro" || plan === "premium" || plan === "family")),
    isPremium: isSpecialAccount || (isActive && (plan === "premium" || plan === "family")),
    isFamily: isSpecialAccount ? specialAccount.tier === "family" : (isActive && plan === "family"),
    isTrialing,
    isSpecialAccount,
    specialAccountType: specialAccount?.account_type || null,
    isLoading: userLoading || subLoading,
    user,
  };
}