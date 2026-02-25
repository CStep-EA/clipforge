import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Sparkles, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/month",
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
    price: "$7.99",
    period: "/month",
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
  },
  {
    id: "premium",
    name: "Premium",
    price: "$14.99",
    period: "/month",
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
  },
];

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(null);

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
    setLoading(plan);
    const res = await base44.functions.invoke("stripeCheckout", {
      plan,
      success_url: window.location.origin + window.location.pathname + "?upgraded=1",
      cancel_url: window.location.href,
    });
    if (res.data?.url) {
      window.location.href = res.data.url;
    }
    setLoading(null);
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white text-xs px-3">
                    Most Popular
                  </Badge>
                </div>
              )}
              <Card
                className={`glass-card p-6 h-full flex flex-col transition-all duration-300 ${plan.popular ? "border-[#00BFFF]/40" : ""}`}
                style={plan.popular ? { boxShadow: "0 0 30px rgba(0,191,255,0.1)" } : {}}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl" style={{ background: `${plan.accent}20` }}>
                    <Icon className="w-5 h-5" style={{ color: plan.accent }} />
                  </div>
                  <div>
                    <h3 className="font-bold">{plan.name}</h3>
                    <p className="text-[10px] text-[#8B8D97]">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold" style={{ color: plan.accent }}>{plan.price}</span>
                  <span className="text-[#8B8D97] text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: plan.accent }} />
                      <span className="text-[#E8E8ED]">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  disabled={isCurrentPlan || plan.disabled || loading === plan.id}
                  onClick={() => !isCurrentPlan && !plan.disabled && handleUpgrade(plan.id)}
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

      <p className="text-center text-xs text-[#8B8D97]">
        Cancel anytime · Secure payments via Stripe · Test with card 4242 4242 4242 4242
      </p>
    </div>
  );
}