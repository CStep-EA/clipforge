import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Shield, Lock, Eye, UserCheck, Globe, Baby } from "lucide-react";

const sections = [
  {
    icon: Eye,
    title: "Data We Collect",
    color: "#00BFFF",
    content: `ClipForge collects only the minimum data required to provide our service:
• Account information: email address, display name
• Content you save: URLs, titles, descriptions, tags, images
• Usage data: feature interactions, save/share activity (anonymized)
• Payment data: handled exclusively by Stripe (we never store card numbers)
• Optional: platform connection tokens for Discord, Twitch, YouTube, Spotify (encrypted at rest)`
  },
  {
    icon: UserCheck,
    title: "How We Use Your Data",
    color: "#9370DB",
    content: `We use your data solely to provide and improve ClipForge:
• AI summaries and smart categorization of your saved content
• Personalized recommendations and smart search
• Sharing and collaboration features (boards, friends)
• Transactional emails (receipts, password reset, alerts)
• Aggregate analytics to improve the product (never sold to third parties)

We do NOT sell, rent, or share your personal data with advertisers.`
  },
  {
    icon: Shield,
    title: "GDPR & Your Rights",
    color: "#00BFFF",
    content: `If you are in the EU/EEA, you have the following rights under GDPR:
• Right to Access: Request a copy of your personal data
• Right to Rectification: Correct inaccurate data
• Right to Erasure: Request deletion of your account and data
• Right to Portability: Export your saved items as JSON/CSV
• Right to Object: Opt out of analytics processing

To exercise any of these rights, email privacy@clipforge.app or submit a support ticket.`
  },
  {
    icon: Baby,
    title: "COPPA & Children's Privacy",
    color: "#FFB6C1",
    content: `ClipForge complies with the Children's Online Privacy Protection Act (COPPA):
• The service is not directed at children under 13
• Family plan child accounts require verified parental consent before activation
• Child accounts operate in "Safe Mode" with content filters enabled
• We do not knowingly collect data from children under 13 without parental consent
• Parents may review, modify, or delete child account data at any time via the Family Management panel`
  },
  {
    icon: Lock,
    title: "Data Security",
    color: "#10B981",
    content: `We take security seriously:
• All data transmitted over HTTPS/TLS 1.3
• OAuth tokens encrypted at rest using AES-256
• Payment processing via Stripe (PCI DSS Level 1 certified)
• Regular security audits and dependency updates
• No PHI (Protected Health Information) is collected or stored
• Access tokens are scoped to minimum required permissions`
  },
  {
    icon: Globe,
    title: "Cookies & Tracking",
    color: "#F59E0B",
    content: `ClipForge uses minimal cookies:
• Essential cookies: Session authentication (required for login)
• Preference cookies: Theme and layout preferences (local storage)
• Analytics: We use privacy-respecting analytics with IP anonymization

We do NOT use:
• Third-party advertising cookies
• Cross-site tracking pixels
• Behavioral profiling for ad targeting`
  },
  {
    icon: Globe,
    title: "Third-Party Services",
    color: "#9370DB",
    content: `ClipForge integrates with select third-party services to provide functionality:
• Stripe — payment processing (their privacy policy applies to payment data)
• OpenAI — AI-powered summaries (content is processed transiently, not stored by OpenAI for training)
• Ticketmaster — event discovery (subject to their terms)
• Spotify, YouTube, Twitch, Discord — optional integrations (OAuth tokens stored encrypted)
• Spoonacular — recipe data

We only share the minimum data necessary with each third party. We do not sell your data to any third party, ever.`
  },
  {
    icon: UserCheck,
    title: "No Medical / Legal / Financial Advice",
    color: "#EF4444",
    content: `ClipForge and its AI features do not provide medical, legal, financial, dietary, or professional advice of any kind.

Content saved through ClipForge (articles, recipes, health tips, financial news) is user-curated and presented for personal reference only. Always consult a qualified professional before making health, legal, or financial decisions.

AI-generated summaries are informational only and may contain errors or omissions.`
  },
];

export default function Privacy() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <Link to={createPageUrl("Support")} className="text-xs text-[#8B8D97] hover:text-[#00BFFF] flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> Back to Support
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00BFFF] to-[#9370DB] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Privacy Policy</h1>
            <p className="text-xs text-[#8B8D97]">Last updated: February 2026</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/20">
          <p className="text-sm text-[#8B8D97] leading-relaxed">
            ClipForge ("we", "us", "our") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our service.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5" style={{ color: s.color }} />
                <h2 className="font-semibold">{s.title}</h2>
              </div>
              <p className="text-sm text-[#8B8D97] whitespace-pre-line leading-relaxed">{s.content}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-2xl p-5 text-center space-y-3">
        <p className="text-sm font-semibold">Questions about your privacy?</p>
        <p className="text-xs text-[#8B8D97]">Contact our privacy team or submit a support ticket</p>
        <Link to={createPageUrl("Support")}>
          <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/30 hover:bg-[#00BFFF]/25 transition-all">
            Open Support Ticket
          </button>
        </Link>
      </div>

      <div className="flex gap-4 text-xs text-[#8B8D97] justify-center flex-wrap pt-2">
        <Link to={createPageUrl("Terms")} className="hover:text-[#9370DB]">Terms of Service</Link>
        <span>·</span>
        <Link to={createPageUrl("Cookies")} className="hover:text-[#F59E0B]">Cookie Policy</Link>
        <span>·</span>
        <Link to={createPageUrl("Support")} className="hover:text-[#00BFFF]">Support</Link>
        <span>·</span>
        <span>© 2026 ClipForge</span>
      </div>
    </div>
  );
}