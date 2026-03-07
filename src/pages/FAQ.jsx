/**
 * FAQ.jsx  — /FAQ  (or integrate into Support tabs as "FAQ" tab)
 * ─────────────────────────────────────────────────────────────────────────────
 * Searchable FAQ page with embedded walkthrough videos.
 * Each section covers a major Klip4ge feature with Q&A + video embeds.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useRef } from "react";
import { Search, ChevronDown, ChevronUp, Play, ExternalLink, BookOpen, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import OnboardingVideoPlayer from "@/components/onboarding/OnboardingVideoPlayer";
import { ONBOARDING_VIDEOS } from "@/hooks/useOnboarding";
import { motion, AnimatePresence } from "framer-motion";

// ── FAQ data ─────────────────────────────────────────────────────────────────

const FAQ_SECTIONS = [
  {
    id: "getting-started",
    emoji: "🚀",
    title: "Getting Started",
    videoKey: "dashboard",
    badge: "Start here",
    badgeColor: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
    questions: [
      {
        q: "What is Klip4ge?",
        a: "Klip4ge is your AI-powered save organiser. Clip anything — deals, recipes, events, articles — and let Klip4ge sort, summarise, and share it for you. Think of it as a smart, collaborative bookmarks app for the things that actually matter in your life.",
      },
      {
        q: "How do I create an account?",
        a: "Click Sign In on the top bar. Klip4ge uses secure OAuth (Google / Apple) — no new password to remember. Your account is created automatically on first login.",
      },
      {
        q: "Is Klip4ge free?",
        a: "Yes — the free plan gives you unlimited saves, AI summaries, and basic sharing. Pro ($4.99/mo) unlocks advanced AI, deep research, and premium integrations. Try Pro free for 7 days, no credit card required.",
      },
      {
        q: "What devices does Klip4ge support?",
        a: "Klip4ge works in any modern browser on desktop, tablet, or mobile. A native iOS and Android app is in development.",
      },
    ],
  },
  {
    id: "saving-items",
    emoji: "🔖",
    title: "Saving Items",
    videoKey: "saves",
    badge: "Core feature",
    badgeColor: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
    questions: [
      {
        q: "How do I save something?",
        a: "Click Quick Save on your Dashboard, paste a URL or type a title, and hit Save. Klip4ge automatically fetches the page title, generates an AI summary, and tags the item by category (deal, recipe, event, article, etc.).",
      },
      {
        q: "Can I save from my phone?",
        a: "Yes — use the Share Sheet on iOS/Android and share any link to the Klip4ge web app. The browser's 'Add to Home Screen' creates a shortcut that behaves like a native app.",
      },
      {
        q: "What are the save categories?",
        a: "Klip4ge supports: Deal, Product, Recipe, Event, Travel, Article, Gift Idea, and Other. The AI auto-categorises based on the URL and content — you can edit it at any time.",
      },
      {
        q: "Can I add notes to a saved item?",
        a: "Yes — open any saved item card and click the edit icon. You can add a custom description, tags, a personal rating (1–10), and mark it as a favourite.",
      },
      {
        q: "Is there a save limit?",
        a: "Free users get unlimited saves. Heavy users with thousands of items may see pagination. Your most recently saved 50 items appear on the Dashboard, with full history in the Saves page.",
      },
    ],
  },
  {
    id: "sharing",
    emoji: "👥",
    title: "Sharing & Collaboration",
    videoKey: "sharing",
    badge: "Fan favourite",
    badgeColor: "bg-[#9370DB]/15 text-[#9370DB] border-[#9370DB]/30",
    questions: [
      {
        q: "How do I share a saved item?",
        a: "Click the Share icon on any saved item card. You can share via a public link, email, or directly to a friend's Klip4ge account. Public shares let non-users view (with optional ad support).",
      },
      {
        q: "What are Sharing Boards?",
        a: "Boards are shared collections. Create a Couples board for date-night ideas, a Family board for the holidays wishlist, or a Friends board for group trip planning. All members see saves in real time.",
      },
      {
        q: "Can I share with someone who doesn't have Klip4ge?",
        a: "Yes — public share links work for anyone. The recipient sees a read-only view of the item or board. They can sign up with one click to start saving their own clips.",
      },
      {
        q: "How many people can join a board?",
        a: "Free: up to 3 members per board. Pro: up to 10 members. Family plan: up to 6 household members with child-safe profiles.",
      },
    ],
  },
  {
    id: "ai-features",
    emoji: "✨",
    title: "AI Features",
    videoKey: "dashboard",
    badge: "Pro feature",
    badgeColor: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
    questions: [
      {
        q: "What does the AI Summary do?",
        a: "When you save a URL, Klip4ge's AI reads the page and writes a 2–3 sentence summary so you remember why you saved it. Summaries appear on every item card.",
      },
      {
        q: "What is Deep Research?",
        a: "Deep Research (Pro) runs a multi-step AI analysis on a saved item — cross-referencing with current web data, identifying pros/cons, and producing a full research report. Great for big purchases or travel planning.",
      },
      {
        q: "Can I search my saves with natural language?",
        a: "Yes — type something like 'Italian recipes I saved last month' or 'deals under $50 for gifts' in the search bar. The AI understands your intent and surfaces the most relevant saves.",
      },
      {
        q: "Is my data used to train AI models?",
        a: "No. Your saved content is processed transiently for AI generation and never used to train models. See the AI Transparency section in the Documentation tab for full details.",
      },
    ],
  },
  {
    id: "subscription",
    emoji: "💎",
    title: "Plans & Billing",
    videoKey: "subscription",
    badge: "Billing",
    badgeColor: "bg-pink-400/15 text-pink-400 border-pink-400/30",
    questions: [
      {
        q: "How does the 7-day free trial work?",
        a: "Click Try Now on the Dashboard banner or in Settings. You get full Pro access for 7 days — no credit card required. After 7 days you return to the free plan unless you upgrade.",
      },
      {
        q: "What's included in Pro?",
        a: "Pro ($4.99/mo) includes: Deep Research AI, Smart Reminders, Yahoo Calendar integration, advanced search, unlimited board members (10), and priority support.",
      },
      {
        q: "What is the Family plan?",
        a: "Family ($9.99/mo) covers up to 6 household members with individual accounts, child-safe profiles (COPPA-compliant), parental controls, and a shared family board.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes — cancel anytime from Settings → Subscription. You keep Pro access until the end of your current billing period.",
      },
      {
        q: "Do you offer a referral program?",
        a: "Yes! Share your referral link from the Dashboard banner and earn 1 free month of Pro for every friend who signs up and stays for 30 days.",
      },
    ],
  },
  {
    id: "support",
    emoji: "🎧",
    title: "Support & Help",
    videoKey: "support",
    badge: "Help",
    badgeColor: "bg-sky-400/15 text-sky-400 border-sky-400/30",
    questions: [
      {
        q: "How do I contact support?",
        a: "Go to Support → New Ticket. Fill in your subject and message and submit. Our team responds within 24 hours on weekdays. For urgent issues, use the AI Support Bot for instant answers.",
      },
      {
        q: "What is the AI Support Bot?",
        a: "The support bot (💬 icon, bottom-right) answers questions about Klip4ge instantly using AI. It can escalate to a human ticket if your issue needs hands-on help.",
      },
      {
        q: "Where can I see my open tickets?",
        a: "Support → My Tickets lists all your open and resolved tickets. Click any ticket to view replies, update status, or add more information.",
      },
      {
        q: "Is there a public roadmap?",
        a: "Yes — Support → Roadmap shows features currently planned, in development, and recently shipped. Vote on features you want most or submit a feature request directly.",
      },
      {
        q: "How do I report a bug?",
        a: "Support → Report Bug. Include your browser, OS, and steps to reproduce. Screenshots or screen recordings are very helpful. We triage all bug reports within 48 hours.",
      },
    ],
  },
  {
    id: "events",
    emoji: "🎟️",
    title: "Events & Calendar",
    videoKey: "events",
    badge: "New",
    badgeColor: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
    questions: [
      {
        q: "How do I save an event?",
        a: "On the Events page, browse AI-curated local events or paste a Ticketmaster/Eventbrite link. Click Save to add it to your clips with date, venue, and AI-generated review.",
      },
      {
        q: "How do I add an event to my calendar?",
        a: "Open a saved event card and click Add to Calendar. Choose Google Calendar, Apple Calendar (.ics), or Outlook. Pro users also get Yahoo Calendar.",
      },
      {
        q: "What are event reminders?",
        a: "Enable reminders (Pro) on any event to get an email notification before the event date — reminding you to buy tickets before they sell out.",
      },
    ],
  },
  // ── NEW: Browser Extension & Facebook Sync ───────────────────────────────
  {
    id: "extension-fb-sync",
    emoji: "🔌",
    title: "Browser Extension & Facebook Sync",
    videoKey: "saves",
    badge: "New in v1.1",
    badgeColor: "bg-[#1877F2]/15 text-[#1877F2] border-[#1877F2]/30",
    questions: [
      {
        q: "What is the Klip4ge Browser Extension?",
        a: "The Klip4ge browser extension is a small add-on you install in Chrome (or any Chromium-based browser like Edge or Brave). Once installed, it sits in your toolbar and lets you save any webpage to your vault in one click — or by pressing Alt+S. It also runs silently in the background to detect when you save something on Facebook.",
      },
      {
        q: "How do I install the extension?",
        a: "1. Download the extension folder from the Klip4ge GitHub repo (or from the Settings → Extensions page). 2. Open Chrome and go to chrome://extensions. 3. Turn on \"Developer mode\" (top-right toggle). 4. Click \"Load unpacked\" and select the extension folder. 5. The Klip4ge icon will appear in your browser toolbar. You're good to go! A Chrome Web Store version is coming soon.",
      },
      {
        q: "How does the Facebook real-time sync work?",
        a: "Here's the plain-English version: Facebook stopped letting third-party apps read your saved posts back in 2018 — so we had to get creative. When you're logged into Facebook in your browser AND the Klip4ge extension is installed, the extension watches for the moment you click Facebook's own \"Save\" button on any post. The instant that happens, it silently captures that post's details (title, URL, image, description) and sends it straight to your Klip4ge vault. No scraping, no passwords, no API keys — it just watches what you're already doing.",
      },
      {
        q: "Will Facebook know I'm using Klip4ge?",
        a: "No. The extension reads information that's already visible on your screen — it doesn't send any data to Facebook or use Facebook's API. It works the same way a friend sitting next to you would see what you saved. Your Klip4ge account never connects to Facebook directly.",
      },
      {
        q: "What is the Facebook Sync Agent?",
        a: "The Sync Agent is an optional desktop tool for power users who want to import ALL of their existing Facebook saves in one go. It runs on your own computer, opens a browser window where you log in manually (your password never leaves your machine), scrolls through your Facebook Saved page automatically, and exports everything as a file you can upload to Klip4ge. After the initial import, the browser extension handles new saves in real time — so you typically only run the Agent once.",
      },
      {
        q: "How do I set up the Facebook Sync Agent?",
        a: "1. Make sure you have Node.js installed on your computer. 2. Open the Klip4ge project folder you downloaded, navigate to tools/fb-saves-scraper, and run: npm install && npm run setup. 3. A browser window opens — log in to Facebook normally. 4. The agent automatically scrolls and collects your saves. 5. When done, go to Integrations → Facebook → Import from JSON and upload the file it created. That's it! The agent can also run on a schedule (every hour) to catch anything new.",
      },
      {
        q: "What are the four ways the extension detects Facebook saves?",
        a: "The extension uses four detection methods to make sure it never misses a save: (1) Toast watcher — it looks for Facebook's own \"Saved\" confirmation popup that appears after you click Save. (2) Click interceptor — it monitors clicks on any Save button on the page. (3) Network hook — it silently watches for the background API call Facebook makes when you save something. (4) Page watcher — when you visit your facebook.com/saved page, it scrapes all your existing saves in bulk. These four layers work together so even if one method doesn't fire, another catches it.",
      },
      {
        q: "Do I need Facebook connected under Integrations for the extension to work?",
        a: "No. The extension works completely independently of the Integrations page. You don't need to connect Facebook, grant any OAuth permissions, or enter any credentials in Klip4ge. Just install the extension, browse Facebook as normal, and your saves appear in your vault automatically.",
      },
      {
        q: "Can I use the extension to save from other websites too?",
        a: "Yes! The extension saves from ANY website, not just Facebook. Just click the Klip4ge icon in your toolbar while you're on any page, confirm the title and category, and hit Save. It auto-fills the URL, page title, and even fetches the preview image for you.",
      },
      {
        q: "Why does the extension popup show a Facebook tab?",
        a: "The Facebook tab in the extension popup shows you the live status of your Facebook sync — whether it's active, how many items have been captured in this session, and quick links to open your Facebook Saved page or manually trigger a bulk scrape. It turns green (🟢 Active) the moment the extension detects its first Facebook save action in your browser.",
      },
      {
        q: "What about saving from the mobile Facebook app?",
        a: "Browser extensions can't run inside mobile apps — that's a system restriction, not a Klip4ge limitation. On mobile, use the Share Sheet instead: tap the Share button on any Facebook post or link, then choose Klip4ge from the list. If Klip4ge doesn't appear in your share sheet, open klip4ge.app in your phone's browser and add it to your Home Screen first (iOS: Safari → Share → Add to Home Screen; Android: Chrome → menu → Add to Home Screen).",
      },
    ],
  },

  // ── Mobile App (PWA) ──────────────────────────────────────────────────────
  {
    id: "mobile-pwa",
    emoji: "📱",
    title: "Mobile & PWA",
    videoKey: "saves",
    badge: "Mobile",
    badgeColor: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
    questions: [
      {
        q: "How do I install Klip4ge on my phone?",
        a: "Klip4ge is a Progressive Web App (PWA) — it works like a native app without needing the App Store. On iPhone/iPad: open klip4ge.app in Safari → tap the Share icon → \"Add to Home Screen\". On Android: open klip4ge.app in Chrome → tap the menu (⋮) → \"Add to Home Screen\" or \"Install App\". Once installed, Klip4ge appears on your home screen, opens full-screen, and works offline.",
      },
      {
        q: "How do I share something to Klip4ge from my phone?",
        a: "After installing Klip4ge as a PWA, it shows up in your phone's native Share Sheet. On any app (browser, Facebook, Instagram, news app) tap the Share button and choose Klip4ge. A save screen opens, auto-fills the title and URL, and lets you confirm with one tap.",
      },
      {
        q: "Does Klip4ge work offline on mobile?",
        a: "Yes — if you save something while offline (e.g. on a plane), Klip4ge queues it in the background. As soon as your connection comes back, it automatically uploads the save to your vault. You'll see a \"Saving…\" indicator until the sync completes.",
      },
      {
        q: "Will there be native iOS and Android apps?",
        a: "Yes — native apps are on the roadmap. They will use Capacitor (a technology that wraps the Klip4ge web app in a native shell) and will unlock extra features like background sync, faster share sheets, and deeper system integration. The PWA already covers ~90% of the experience today.",
      },
    ],
  },

  {
    id: "privacy-security",
    emoji: "🔒",
    title: "Privacy & Security",
    videoKey: "dashboard",
    badge: "Important",
    badgeColor: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
    questions: [
      {
        q: "Is Klip4ge GDPR compliant?",
        a: "Yes. Klip4ge is fully GDPR, CCPA, and COPPA compliant. We store only the data you explicitly provide. You can export or delete your data at any time from Settings → Privacy.",
      },
      {
        q: "Who can see my saved items?",
        a: "Only you — unless you share a specific item or board. Shared items are visible only to the people you explicitly invite or share a link with.",
      },
      {
        q: "Does Klip4ge sell my data?",
        a: "Never. We do not sell or share your personal data with third parties for advertising. Revenue comes from subscriptions only.",
      },
      {
        q: "How do I delete my account?",
        a: "Settings → Account → Delete Account. This permanently removes all your data within 30 days, per GDPR Article 17 (Right to Erasure).",
      },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function VideoEmbed({ videoKey, title }) {
  const [showPlayer, setShowPlayer] = useState(false);
  const video = ONBOARDING_VIDEOS[videoKey];

  if (!video) return null;

  if (showPlayer) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden">
        <OnboardingVideoPlayer
          video={video}
          onClose={() => setShowPlayer(false)}
          autoPlay={true}
          compact={true}
          showWalkthroughLink={true}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowPlayer(true)}
      className={cn(
        "w-full mt-4 rounded-xl overflow-hidden relative group cursor-pointer",
        "border border-[#2A2D3A] hover:border-[#00BFFF]/40 transition-colors"
      )}
      aria-label={`Watch video: ${title}`}
    >
      {/* Poster image */}
      <div
        className="aspect-video bg-gradient-to-br from-[#0F1117] to-[#1A1D27] flex items-center justify-center"
        style={{
          backgroundImage: video.poster ? `url(${video.poster})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            "bg-[#00BFFF]/20 border-2 border-[#00BFFF]/60",
            "group-hover:bg-[#00BFFF]/30 group-hover:scale-110 transition-all"
          )}>
            <Play className="w-6 h-6 text-white ml-1" fill="white" />
          </div>
          <span className="text-xs text-white/70 font-medium">{video.duration}s walkthrough</span>
        </div>
      </div>

      {/* Label bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1A1D27] border-t border-[#2A2D3A]">
        <span className="text-xs text-[#8B8D97] flex items-center gap-1.5">
          <Play className="w-3 h-3 text-[#00BFFF]" />
          {title} — Quick Walkthrough
        </span>
        <span className="text-[10px] text-[#00BFFF] font-medium">{video.duration}s</span>
      </div>
    </button>
  );
}

function FAQItem({ q, a, index }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#2A2D3A] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-3 py-4 text-left group"
        aria-expanded={open}
      >
        <span className={cn(
          "text-sm font-medium leading-relaxed transition-colors",
          open ? "text-[#00BFFF]" : "text-[#E8E8ED] group-hover:text-[#00BFFF]"
        )}>
          {q}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#00BFFF] mt-0.5 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#8B8D97] mt-0.5 flex-shrink-0 group-hover:text-[#00BFFF]" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-sm text-[#8B8D97] leading-relaxed pb-4 pr-7">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export default function FAQ() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState(null);
  const sectionRefs = useRef({});

  // Filter FAQ data by search query
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      questions: section.questions.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q)
      ),
    })).filter((s) => s.questions.length > 0);
  }, [search]);

  const scrollToSection = (id) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#E8E8ED]">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-16">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00BFFF]/10 border border-[#00BFFF]/20 text-[#00BFFF] text-xs font-medium mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Help Centre
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#E8E8ED] mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-[#8B8D97] max-w-lg mx-auto leading-relaxed">
            Everything you need to know about Klip4ge — with short walkthrough videos
            for every major feature.
          </p>
        </div>

        {/* ── Search ────────────────────────────────────────────── */}
        <div className="relative mb-8 max-w-xl mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8D97]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions — e.g. 'how to save', 'cancel subscription'..."
            className="pl-10 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/60 focus:border-[#00BFFF]/50 h-11"
            aria-label="Search FAQ"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8D97] hover:text-[#E8E8ED] transition-colors"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Section nav pills ─────────────────────────────────── */}
        {!search && (
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {FAQ_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  activeSection === s.id
                    ? "bg-[#00BFFF]/15 border-[#00BFFF]/40 text-[#00BFFF]"
                    : "bg-[#1A1D27] border-[#2A2D3A] text-[#8B8D97] hover:border-[#00BFFF]/30 hover:text-[#E8E8ED]"
                )}
              >
                {s.emoji} {s.title}
              </button>
            ))}
          </div>
        )}

        {/* ── Sections ──────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#8B8D97] text-sm">No questions match "{search}"</p>
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-[#00BFFF] text-xs hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {filtered.map((section) => (
              <div
                key={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
                className="glass-card rounded-2xl p-6 sm:p-8 scroll-mt-6"
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-5 pb-5 border-b border-[#2A2D3A]">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{section.emoji}</span>
                    <div>
                      <h2 className="text-base font-bold text-[#E8E8ED]">{section.title}</h2>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] mt-0.5 border font-medium px-2 py-0.5", section.badgeColor)}
                      >
                        {section.badge}
                      </Badge>
                    </div>
                  </div>

                  {/* Watch full walkthrough link */}
                  <a
                    href={`/${ONBOARDING_VIDEOS[section.videoKey]?.page}`}
                    className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#9370DB] hover:text-[#a78bfa] transition-colors"
                    aria-label={`Watch full walkthrough for ${section.title}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Full walkthrough
                  </a>
                </div>

                {/* Video embed for this section */}
                <VideoEmbed videoKey={section.videoKey} title={section.title} />

                {/* FAQ items */}
                <div className="mt-5">
                  {section.questions.map((item, idx) => (
                    <FAQItem key={idx} q={item.q} a={item.a} index={idx} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer CTA ────────────────────────────────────────── */}
        <div className="mt-14 text-center glass-card rounded-2xl p-8 border border-[#2A2D3A]">
          <Sparkles className="w-8 h-8 text-[#00BFFF] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#E8E8ED] mb-2">Still have questions?</h3>
          <p className="text-sm text-[#8B8D97] mb-5">
            Our support team responds within 24 hours. Or try the AI support bot for instant answers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white font-semibold"
            >
              <a href="/Support">Open a Support Ticket</a>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED]"
            >
              <a href="/Support?tab=bot">Chat with AI Bot</a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
