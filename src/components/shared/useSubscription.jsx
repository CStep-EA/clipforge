import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook to get the current user's subscription plan.
 * Returns { plan, isPro, isPremium, isLoading }
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

  const plan = subs?.[0]?.plan || "free";
  const status = subs?.[0]?.status || "active";
  const isActive = status === "active" || status === "trialing";

  return {
    plan,
    isPro: isActive && (plan === "pro" || plan === "premium"),
    isPremium: isActive && plan === "premium",
    isLoading: userLoading || subLoading,
    user,
  };
}