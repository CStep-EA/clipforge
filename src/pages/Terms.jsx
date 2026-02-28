import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, FileText, CreditCard, AlertTriangle, Scale, Baby } from "lucide-react";

const sections = [
  {
    icon: AlertTriangle,
    title: "Alpha / Beta Software — Tester Agreement",
    color: "#F59E0B",
    content: `ClipForge is currently in alpha/beta ("early access"). By using ClipForge during this period you explicitly acknowledge and agree:

• THIS IS PRE-RELEASE SOFTWARE provided "as-is", with no warranty of any kind, express or implied.
• Features may be incomplete, change without notice, or be removed entirely.
• Data loss is possible. You should not rely on ClipForge as your sole copy of important content.
• Uptime and reliability are NOT guaranteed during alpha/beta.
• You will NOT hold ClipForge, its founders, employees, contractors, or affiliates liable for any loss, damage, or harm arising from your use of this software during the early-access period.
• Your feedback may be used to improve the product without compensation.
• Early-access pricing is subject to change when ClipForge reaches general availability.

BY CONTINUING TO USE CLIPFORGE YOU CONFIRM YOU HAVE READ, UNDERSTOOD, AND AGREED TO THIS TESTER AGREEMENT.`
  },
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
    title: "AI-Generated Content & No Professional Advice",
    content: `ClipForge uses AI to generate summaries, reviews, and recommendations. This content is:
• Provided "as-is" for informational purposes only
• NOT professional legal, medical, financial, dietary, or investment advice
• Subject to AI limitations and may contain inaccuracies
• Not a substitute for professional consultation

ClipForge expressly disclaims any liability for decisions made based on AI-generated content. Always consult a qualified professional for medical, legal, or financial matters.`
  },
  {
    icon: Baby,
    title: "Children's Privacy (COPPA)",
    content: `ClipForge is not directed at children under the age of 13.

• We do not knowingly collect personal information from children under 13 without verifiable parental consent
• Family plan child accounts require a parent or guardian to create and manage the account
• Parents may review, update, or request deletion of a child's data at any time via the Family Management panel or by contacting privacy@clipforge.app
• If we discover we have inadvertently collected data from a child under 13, we will delete it promptly

For questions about children's privacy, email privacy@clipforge.app`
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
    title: "Governing Law & Arbitration",
    content: `These terms are governed by the laws of the State of Delaware, USA.

ARBITRATION CLAUSE: Any dispute, claim, or controversy arising out of or relating to these Terms or the use of ClipForge shall be resolved by binding individual arbitration administered by JAMS under its Streamlined Arbitration Rules, except:
• Either party may seek injunctive relief in court for IP infringement or misappropriation.
• You may opt out of arbitration within 30 days of first account creation by emailing legal@clipforge.app.

CLASS ACTION WAIVER: You agree to resolve disputes individually. You waive any right to bring or participate in a class action or consolidated proceeding.

If you are an EU resident, you retain all rights granted under applicable EU consumer protection laws regardless of these terms. Nothing in this agreement limits statutory rights that cannot be waived under applicable law.`
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
            <p className="text-xs text-[#8B8D97]">Effective: February 2026 · Includes Alpha/Beta Tester Agreement</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {sections.map((s, i) => {
          const Icon = s.icon;
          const isAlpha = i === 0;
          return (
            <div key={i} className={`glass-card rounded-2xl p-5 space-y-3 ${isAlpha ? "border border-[#F59E0B]/40 bg-[#F59E0B]/5" : ""}`}>
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5" style={{ color: s.color || "#9370DB" }} />
                <h2 className="font-semibold">{s.title}</h2>
                {isAlpha && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-bold uppercase tracking-wide">Required</span>}
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