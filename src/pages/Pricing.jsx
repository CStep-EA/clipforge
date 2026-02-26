import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Sparkles, Loader2, Users } from "lucide-react";
import { motion } from "framer-motion";
import TrialPrompt from "@/components/subscription/TrialPrompt";

const plans = [
  {
    id: "free",
    name: "Free",
    price: { monthly: "$0", yearly: "$0" },
    priceRaw: { monthly: 0, yearly: 0 },
    icon: Zap,
    accent: "#8B8D97",
    description: "Get started with core features",
    features: [
      "Up to 50 saves",
      "Manual categorization",
      "1 shared board",
      "Basic search",
      "Ad-supported",
    ],
    cta: "Current Plan",
    disabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: { monthly: "$7.99", yearly: "$71.99" },
    priceRaw: { monthly: 799, yearly: 7199 },
    icon: Sparkles,
    accent: "#00BFFF",
    popular: true,
    description: "For power users who save everything",
    features: [
      "Unlimited saves",
      "AI auto-categorization",
      "Unlimited boards",
      "AI search & summaries",
      "Recipe → shopping list export",
      "Event suggestions",
      "Ad-free experience",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    stripeId: { monthly: "pro", yearly: "pro" },
  },
  {
    id: "premium",
    name: "Premium",
    price: { monthly: "$14.99", yearly: "$134.99" },
    priceRaw: { monthly: 1499, yearly: 13499 },
    icon: Crown,
    accent: "#9370DB",
    description: "For teams and power collaborators",
    features: [
      "Everything in Pro",
      "Social media sync",
      "Ticketmaster integration",
      "Health app connections",
      "Advanced AI agents",
      "Real-time collaboration",
      "Shared shopping lists",
      "Dedicated support",
    ],
    cta: "Upgrade to Premium",
    stripeId: { monthly: "premium", yearly: "premium" },
  },
  {
    id: "family",
    name: "Family Premium",
    price: { monthly: "$19.99", yearly: "$179" },
    priceRaw: { monthly: 1999, yearly: 17900 },
    icon: Users,
    accent: "#EC4899",
    description: "For households & families",
    badge: "Best for Families",
    features: [
      "Everything in Premium",
      "Up to 6 family members",
      "Parent & child role controls",
      "Child-safe content filters",
      "COPPA-compliant child accounts",
      "Family shared boards & saves",
      "Health info summaries (WebMD, Mayo Clinic)",
      "Parental approval workflows",
      "Family calendar & reminders",
      "Aggregated family activity logs",
    ],
    cta: "Start Family Plan",
    stripeId: { monthly: "family_monthly", yearly: "family_yearly" },
  },
];

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(null);
  const [billing, setBilling] = useState("monthly");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: subData = [] } = useQuery({
    queryKey: ["subscription", user?.email],
    queryFn: () => base44.entities.UserSubscription.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const currentPlan = subData[0]?.plan || "free";

  const handleUpgrade = async (plan) => {
    if (window !== window.top) {
      alert("Checkout only works from the published app, not inside an iframe preview.");
      return;
    }
    setLoading(plan.id);
    const stripeKey = plan.stripeId?.[billing];
    if (!stripeKey) return setLoading(null);
    const res = await base44.functions.invoke("stripeCheckout", {
      plan: stripeKey,
      success_url: window.location.origin + window.location.pathname + "?upgraded=1",
      cancel_url: window.location.href,
    });
    if (res.data?.url) window.location.href = res.data.url;
    setLoading(null);
  };

  const yearSavings = (plan) => {
    if (!plan.priceRaw) return null;
    const monthlyCost = plan.priceRaw.monthly * 12;
    const yearlyCost = plan.priceRaw.yearly;
    if (!monthlyCost || !yearlyCost) return null;
    const saved = Math.round((monthlyCost - yearlyCost) / 100);
    return saved > 0 ? saved : null;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">ClipForge</span> Plans
        </h1>
        <p className="text-[#8B8D97]">Choose the plan that fits your saving habits</p>
        {currentPlan !== "free" && (
          <Badge className="mt-3 bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30">
            Current plan: {currentPlan}
          </Badge>
        )}
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${billing === "monthly" ? "bg-[#2A2D3A] text-[#E8E8ED]" : "text-[#8B8D97]"}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${billing === "yearly" ? "bg-[#2A2D3A] text-[#E8E8ED]" : "text-[#8B8D97]"}`}
        >
          Yearly
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">Save up to 25%</Badge>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan, i) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id || (currentPlan === "family" && plan.id === "family");
          const savings = yearSavings(plan);

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white text-xs px-3">
                    Most Popular
                  </Badge>
                </div>
              )}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-[#EC4899] to-[#9370DB] text-white text-xs px-3">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <Card
                className={`glass-card p-5 h-full flex flex-col transition-all duration-300 ${plan.popular ? "border-[#00BFFF]/40" : ""} ${plan.id === "family" ? "border-[#EC4899]/35" : ""}`}
                style={{
                  ...(plan.popular ? { boxShadow: "0 0 30px rgba(0,191,255,0.1)" } : {}),
                  ...(plan.id === "family" ? { boxShadow: "0 0 30px rgba(236,72,153,0.1)" } : {}),
                }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 rounded-xl" style={{ background: `${plan.accent}20` }}>
                    <Icon className="w-5 h-5" style={{ color: plan.accent }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{plan.name}</h3>
                    <p className="text-[10px] text-[#8B8D97]">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-bold" style={{ color: plan.accent }}>
                    {plan.price[billing]}
                  </span>
                  <span className="text-[#8B8D97] text-xs">/{billing === "monthly" ? "mo" : "yr"}</span>
                  {billing === "yearly" && savings && (
                    <p className="text-[10px] text-emerald-400 mt-0.5">Save ~${savings}/yr</p>
                  )}
                </div>

                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: plan.accent }} />
                      <span className="text-[#E8E8ED]">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full text-sm"
                  disabled={isCurrentPlan || plan.disabled || loading === plan.id}
                  onClick={() => !isCurrentPlan && !plan.disabled && handleUpgrade(plan)}
                  style={!isCurrentPlan && !plan.disabled ? {
                    background: `linear-gradient(135deg, ${plan.accent}, ${plan.accent}99)`,
                    color: "white",
                  } : {}}
                  variant={isCurrentPlan || plan.disabled ? "outline" : "default"}
                >
                  {loading === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrentPlan ? "Current Plan" : plan.cta}
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Family disclaimer */}
      <div className="glass-card rounded-2xl p-4 border border-[#EC4899]/20 text-xs text-[#8B8D97] space-y-1">
        <p className="font-semibold text-[#EC4899] flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Family Premium — Important Notes</p>
        <p>• Health summaries are general informational content only — not personalized medical advice. Always consult a healthcare professional.</p>
        <p>• Child accounts for users under 13 require verifiable parental consent (COPPA). We do not collect or process children's personal data beyond what is strictly necessary.</p>
        <p>• All family data is stored securely. You can remove members and delete data at any time.</p>
      </div>

      <p className="text-center text-xs text-[#8B8D97]">
        Cancel anytime · Secure payments via Stripe · Prorated billing on upgrades/downgrades
      </p>
    </div>
  );
}