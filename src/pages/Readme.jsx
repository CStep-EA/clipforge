import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Zap, Bookmark, Calendar, Users, ShoppingCart, Sparkles, Bell, Shield, Gift, MessageCircle, Star, CheckCircle2 } from "lucide-react";

const FEATURES = [
  { icon: Bookmark, color: "#00BFFF", title: "Smart Vault", desc: "Save anything from the web: deals, recipes, events, products, podcasts, and more. AI auto-categorizes and summarizes every item instantly." },
  { icon: Sparkles, color: "#9370DB", title: "AI Assistant", desc: "Ask natural language questions across your saves. Deep research, price comparisons, gift ideas, personalized recommendations — all in one chat." },
  { icon: Calendar, color: "#9370DB", title: "Events & Reminders", desc: "Search live events via Ticketmaster, get AI-generated reviews, add to Google/Apple/Outlook calendar, and receive email reminders 7 days & 24 hours before." },
  { icon: Users, color: "#FFB6C1", title: "Shared Boards", desc: "Create collaborative boards for couples, roommates, or families. Real-time sync keeps everyone aligned on wishlists, date nights, and travel plans." },
  { icon: ShoppingCart, color: "#10B981", title: "Recipe → Shopping List", desc: "Save a recipe and ClipForge AI extracts every ingredient into a shareable shopping list. Perfect for grocery trips." },
  { icon: Bell, color: "#F59E0B", title: "Smart Reminders", desc: "Set reminder dates on any saved item. Event reminders send automatic emails at 7 days, 24 hours, and 1 hour (Premium) before the event." },
  { icon: Gift, color: "#EC4899", title: "Referrals & Trials", desc: "Invite friends with a unique referral link. Both parties earn a free month when a friend subscribes. 7-day Premium trial available — no credit card required." },
  { icon: Shield, color: "#9370DB", title: "Family Premium", desc: "Invite up to 5 family members. Parental controls, child-safe content filters, and COPPA compliance built in." },
  { icon: MessageCircle, color: "#FFB6C1", title: "AI Support Bot", desc: "Instant answers from an AI that knows ClipForge inside out. Escalate to human support tickets with one click. 24-hour response guarantee." },
];

const PLANS = [
  { name: "Free", price: "$0", features: ["50 saves/month", "Basic AI summaries", "1 shared board", "Manual saves only"] },
  { name: "Pro", price: "$7.99/mo", features: ["Unlimited saves", "AI deep research", "Event search (Ticketmaster)", "Social media import", "5 shared boards"], accent: "#00BFFF" },
  { name: "Premium", price: "$12.99/mo", features: ["Everything in Pro", "Event email reminders (7d + 24h)", "1-hour reminders", "Priority support", "AI assistant unlocked"], accent: "#9370DB" },
  { name: "Family", price: "$19.99/mo", features: ["Everything in Premium", "Up to 5 members", "Parental controls", "Child-safe mode (COPPA)", "Family shared boards"], accent: "#FFB6C1" },
];

export default function Readme() {
  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-12 pb-24">
      {/* Back */}
      <Link to={createPageUrl("Dashboard")} className="inline-flex items-center gap-1.5 text-xs text-[#8B8D97] hover:text-[#00BFFF] transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
      </Link>

      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00BFFF]/30 bg-[#00BFFF]/5 text-[#00BFFF] text-xs font-bold uppercase tracking-widest">
          <Zap className="w-3.5 h-3.5" /> ClipForge — App Documentation
        </div>
        <h1 className="text-4xl md:text-5xl font-black gradient-text leading-tight">ClipForge</h1>
        <p className="text-lg text-[#8B8D97] max-w-2xl mx-auto leading-relaxed">
          Your AI-powered digital vault. Save anything from the web and social media. Rediscover, organize, share, and never miss a deal, recipe, or event again.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {["React", "Tailwind CSS", "Base44", "Stripe", "Ticketmaster", "OpenAI"].map(t => (
            <span key={t} className="px-2.5 py-1 rounded-full bg-[#1A1D27] border border-[#2A2D3A] text-[#8B8D97]">{t}</span>
          ))}
        </div>
      </div>

      {/* Launch Note */}
      <div className="glass-card rounded-2xl p-6 border border-[#00BFFF]/20 space-y-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#F59E0B]" />
          <h2 className="text-lg font-bold text-[#F59E0B]">🚀 Launch Note</h2>
        </div>
        <p className="text-sm text-[#8B8D97] leading-relaxed">
          ClipForge launched in 2026 as an AI-first content management app designed for consumers who live across social media and the web. 
          Our mission: make saving, organizing, and acting on digital content effortless — whether that's buying concert tickets before they sell out, 
          cooking a recipe you bookmarked 3 months ago, or sharing gift ideas with your family.
        </p>
        <p className="text-sm text-[#8B8D97] leading-relaxed">
          This is a <strong className="text-[#E8E8ED]">live production app</strong> accepting real Stripe payments. 
          All integrations (Ticketmaster, Spotify, Discord, YouTube, Twitch) are live. 
          Email reminders run on automated cron jobs. The AI assistant uses real LLM calls.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link to={createPageUrl("Pricing")} className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white font-bold">View Pricing</Link>
          <Link to={createPageUrl("LaunchRoadmap")} className="text-xs px-3 py-1.5 rounded-lg border border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED] transition-colors">Roadmap</Link>
          <Link to={createPageUrl("Support")} className="text-xs px-3 py-1.5 rounded-lg border border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED] transition-colors">Support</Link>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="glass-card rounded-xl p-4 space-y-2 hover:border-[#00BFFF]/20 transition-all">
              <div className="flex items-center gap-2">
                <f.icon className="w-4 h-4 shrink-0" style={{ color: f.color }} />
                <h3 className="text-sm font-bold">{f.title}</h3>
              </div>
              <p className="text-xs text-[#8B8D97] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black">Pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {PLANS.map(p => (
            <div key={p.name} className="glass-card rounded-xl p-4 space-y-3" style={{ borderColor: p.accent ? `${p.accent}30` : undefined }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: p.accent || "#8B8D97" }}>{p.name}</p>
                <p className="text-xl font-black mt-0.5">{p.price}</p>
              </div>
              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px] text-[#8B8D97]">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" style={{ color: p.accent || "#8B8D97" }} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black">Tech Stack</h2>
        <div className="glass-card rounded-xl p-5 space-y-3">
          {[
            { label: "Frontend", val: "React 18, Tailwind CSS, shadcn/ui, framer-motion, Lucide icons" },
            { label: "Backend", val: "Base44 (Deno-based serverless functions, entity database, scheduled automations)" },
            { label: "AI", val: "Base44 InvokeLLM (OpenAI GPT models) — summaries, research, chat, event reviews" },
            { label: "Payments", val: "Stripe (Live mode) — Pro $7.99/mo, Premium $12.99/mo, Family $19.99/mo or $179/yr" },
            { label: "Events", val: "Ticketmaster Discovery API — live event search, venue, price, ticket links" },
            { label: "Streaming", val: "Discord, Twitch, YouTube, Spotify, Apple Podcasts — OAuth integrations" },
            { label: "Email", val: "Base44 SendEmail — event reminders (7d/24h/1h), support ticket responses, invites" },
            { label: "Automations", val: "Hourly cron: event reminders. Daily cron: feedback monitoring. Entity: stripe webhook handler" },
          ].map(row => (
            <div key={row.label} className="flex gap-3 text-xs">
              <span className="text-[#00BFFF] font-semibold w-24 shrink-0">{row.label}</span>
              <span className="text-[#8B8D97]">{row.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* End-to-End Test Flows */}
      <div className="space-y-4">
        <h2 className="text-2xl font-black">End-to-End Flows</h2>
        <div className="space-y-3">
          {[
            { flow: "Onboarding", steps: "Register → /Onboarding → 10 slides (welcome, save, boards, shopping, AI, events, support, referrals) → connect socials → monitoring → growth (trial/referral/family) → Dashboard" },
            { flow: "Save an Event", steps: "Quick Save → category: Event → fill date/venue/city → Save → calendar stub appears → Add to Google/Apple/Outlook → enable email reminder → Done" },
            { flow: "Event Discovery", steps: "Events page → Search city + genre (Pro required) → AI review → Add to Calendar → Enable Reminder (Premium gated) → Ticketmaster ticket link" },
            { flow: "Referral", steps: "Settings → copy referral link → friend registers via link → enters code in Onboarding Growth step → both get free month on subscription" },
            { flow: "Support Ticket", steps: "Support page → New Ticket → fill subject/message/category → Submit → AI bot may auto-respond → Admin sees ticket in Admin → Tickets" },
            { flow: "Family Setup", steps: "Pricing → Family plan → Stripe checkout → Friends page → Invite members → Members get email → Accept → Family boards shared" },
            { flow: "Stripe Checkout", steps: "Pricing → choose plan → checkout (blocked in iframe, works in published app) → Stripe webhook fires → UserSubscription created → features unlocked" },
          ].map(({ flow, steps }) => (
            <div key={flow} className="glass-card rounded-xl p-4 space-y-1">
              <p className="text-xs font-bold text-[#00BFFF]">{flow}</p>
              <p className="text-xs text-[#8B8D97] leading-relaxed">{steps}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-[#8B8D97] pt-4">© 2026 ClipForge · Built on Base44 · All rights reserved</p>
    </div>
  );
}