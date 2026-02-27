import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Cookie, ToggleLeft, BarChart2, Lock, Info } from "lucide-react";

const sections = [
  {
    icon: Cookie,
    color: "#F59E0B",
    title: "What Are Cookies?",
    content: `Cookies are small text files stored on your device when you visit a website. They help us recognize you between sessions and remember your preferences. ClipForge uses a minimal, privacy-first approach to cookies.`
  },
  {
    icon: Lock,
    color: "#00BFFF",
    title: "Essential Cookies (Required)",
    content: `These cookies are necessary for ClipForge to function. You cannot opt out of them without losing core functionality:
• Session authentication token — keeps you logged in
• CSRF protection token — prevents cross-site request forgery
• Load balancing cookies — ensure stable connections

These cookies expire when your session ends or within 30 days.`
  },
  {
    icon: ToggleLeft,
    color: "#9370DB",
    title: "Preference Cookies (Functional)",
    content: `These are stored in local storage (not classic cookies) and remember your preferences:
• Theme selection (dark/light mode) — key: cf-theme
• Debug mode toggle — key: cf_debug_mode
• Onboarding completion state
• Sidebar collapse state

You can clear these at any time through your browser's developer tools or our Settings page.`
  },
  {
    icon: BarChart2,
    color: "#10B981",
    title: "Analytics (Privacy-Respecting)",
    content: `We use anonymized, privacy-first analytics to understand feature usage and improve the product:
• IP addresses are anonymized before storage
• We do NOT use Google Analytics or Facebook Pixel
• No cross-site tracking or behavioral profiling
• Aggregate data only — we cannot identify individual users from analytics

You can opt out of analytics in Settings → Privacy.`
  },
  {
    icon: Info,
    color: "#FFB6C1",
    title: "What We Do NOT Use",
    content: `ClipForge explicitly does NOT use:
• Third-party advertising cookies
• Social media tracking pixels (Facebook, Twitter, TikTok)
• Retargeting or behavioral ad cookies
• Fingerprinting or device tracking
• Cookie syncing with ad networks

We will never monetize your browsing behavior.`
  },
];

export default function Cookies() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <Link to={createPageUrl("Support")} className="text-xs text-[#8B8D97] hover:text-[#00BFFF] flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3 h-3" /> Back to Support
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#9370DB] flex items-center justify-center">
            <Cookie className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cookie Policy</h1>
            <p className="text-xs text-[#8B8D97]">Last updated: February 2026</p>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/20">
          <p className="text-sm text-[#8B8D97] leading-relaxed">
            ClipForge is committed to minimal data collection. This policy explains exactly what cookies and storage mechanisms we use and why.
          </p>
        </div>
      </div>

      <div className="space-y-5">
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
        <p className="text-sm font-semibold">Questions about cookies or tracking?</p>
        <p className="text-xs text-[#8B8D97]">Contact our privacy team or submit a support ticket</p>
        <Link to={createPageUrl("Support")}>
          <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/25 transition-all">
            Open Support Ticket
          </button>
        </Link>
      </div>

      <div className="flex gap-4 text-xs text-[#8B8D97] justify-center flex-wrap pt-2">
        <Link to={createPageUrl("Privacy")} className="hover:text-[#00BFFF]">Privacy Policy</Link>
        <span>·</span>
        <Link to={createPageUrl("Terms")} className="hover:text-[#00BFFF]">Terms of Service</Link>
        <span>·</span>
        <Link to={createPageUrl("Support")} className="hover:text-[#00BFFF]">Support</Link>
        <span>·</span>
        <span>© 2026 ClipForge</span>
      </div>
    </div>
  );
}