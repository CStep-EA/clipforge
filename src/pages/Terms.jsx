import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, FileText, CreditCard, AlertTriangle, Scale } from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "Acceptance of Terms",
    content: `By accessing or using ClipForge, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.

These terms apply to all users, including those on free and paid plans. We reserve the right to update these terms with 30 days notice.`
  },
  {
    icon: CreditCard,
    title: "Subscriptions & Billing",
    content: `ClipForge offers the following plans:
• Free: Limited saves, basic features
• Pro ($7.99/mo): Unlimited saves, AI research, friends
• Premium ($14.99/mo): All Pro features + streaming integrations, advanced AI
• Family ($19.99/mo): Up to 6 members, parental controls, child-safe mode

Subscriptions auto-renew unless cancelled. You may cancel at any time; access continues until the end of your billing period. No refunds for partial months unless required by law.

Payments are processed by Stripe. We do not store payment card information.`
  },
  {
    icon: FileText,
    title: "Acceptable Use",
    content: `You agree not to:
• Use ClipForge for illegal purposes or to distribute harmful content
• Attempt to reverse-engineer, scrape, or abuse the API
• Share account credentials with others (except via legitimate Family plan)
• Use automated tools to bulk-save content without consent
• Violate the intellectual property rights of others

We reserve the right to suspend accounts that violate these terms.`
  },
  {
    icon: AlertTriangle,
    title: "AI-Generated Content Disclaimer",
    content: `ClipForge uses AI to generate summaries, reviews, and recommendations. This content is:
• Provided "as-is" for informational purposes only
• Not professional legal, medical, financial, or investment advice
• Subject to AI limitations and may contain inaccuracies
• Not a substitute for professional consultation

Always verify important information from authoritative sources.`
  },
  {
    icon: Scale,
    title: "Limitation of Liability",
    content: `ClipForge is provided "as is" without warranties of any kind. To the maximum extent permitted by law:
• We are not liable for indirect, incidental, or consequential damages
• Our total liability shall not exceed the amount you paid us in the last 12 months
• We are not responsible for third-party content saved through our service
• Service availability is not guaranteed (we target 99.5% uptime)`
  },
  {
    icon: Scale,
    title: "Governing Law",
    content: `These terms are governed by the laws of the State of Delaware, USA. Any disputes shall be resolved through binding arbitration under JAMS rules, except where prohibited by law.

If you are an EU resident, you retain all rights granted under applicable EU consumer protection laws regardless of these terms.`
  },
];

export default function Terms() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <Link to={createPageUrl("Support")} className="text-xs text-[#8B8D97] hover:text-[#00BFFF] flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> Back to Support
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9370DB] to-[#FFB6C1] flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Terms of Service</h1>
            <p className="text-xs text-[#8B8D97]">Effective: February 2026</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-[#9370DB]" />
                <h2 className="font-semibold">{s.title}</h2>
              </div>
              <p className="text-sm text-[#8B8D97] whitespace-pre-line leading-relaxed">{s.content}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 text-xs text-[#8B8D97] justify-center flex-wrap pt-4">
        <Link to={createPageUrl("Privacy")} className="hover:text-[#00BFFF]">Privacy Policy</Link>
        <span>·</span>
        <Link to={createPageUrl("Support")} className="hover:text-[#00BFFF]">Support</Link>
        <span>·</span>
        <span>© 2026 ClipForge</span>
      </div>
    </div>
  );
}