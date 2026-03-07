import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  MessageCircle, Plus, Clock, CheckCircle2, Search, Bug, Lightbulb,
  BookOpen, Map, Shield, FileText, Sparkles, ChevronRight, Loader2, Edit3, Info,
  Chrome, Smartphone, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import SupportBot from "@/components/support/SupportBot";
import TicketDetail from "@/components/support/TicketDetail";
import DocSearchResults from "@/components/support/DocSearchResults";
import OnboardingVideoPlayer from "@/components/onboarding/OnboardingVideoPlayer";
import { useOnboarding, ONBOARDING_VIDEOS } from "@/hooks/useOnboarding";

const statusColors = {
  open: "bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/30",
  in_progress: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30",
  resolved: "bg-emerald-400/15 text-emerald-400 border-emerald-400/30",
  closed: "bg-[#8B8D97]/15 text-[#8B8D97] border-[#8B8D97]/30",
};

const AI_DOC = `
## How Klip4ge Uses AI – Transparency Whitepaper

**AI for Content Saves & Summaries**
When you save a URL or piece of content, Klip4ge uses AI (large language models) to automatically generate a concise summary, suggest relevant tags, and assign a relevance score. This helps you quickly recall why you saved something weeks later. The AI processes only the content you explicitly save—it does not browse your history or monitor unrelated activity.

**AI for Smart Search**
Our AI-powered search understands natural language queries like "Italian recipes I saved last month" or "deals under $50". We use semantic embeddings to match your intent against your saved items, providing more relevant results than keyword search alone.

**AI for Event Reviews**
On the Events page, Klip4ge uses AI (with optional real-time web context) to generate brief event reviews to help you decide whether to buy tickets. These are clearly labeled as AI-generated and should not replace your own research.

**AI Support Bot**
The in-app support bot is powered by a large language model and is designed to answer questions about Klip4ge features. It is NOT a human agent. Responses may be inaccurate—always verify critical information. The bot may suggest creating a support ticket for complex issues, which routes to our human support team.

**Data Privacy in AI Processing**
- Your saved content is processed transiently for AI generation; we do not use it to train AI models
- We use reputable AI providers with data processing agreements aligned with GDPR
- AI-generated content is clearly marked with ✨ or 🤖 labels throughout the app
- You can disable AI summaries in Settings at any time

**Disclaimer**
AI-generated content in Klip4ge is for informational purposes only and does not constitute legal, medical, financial, or professional advice.
`;

// ─────────────────────────────────────────────────────────────────────────────
// Facebook Sync & Browser Extension — Plain-English Technical Documentation
// Shown in Support → Documentation tab
// ─────────────────────────────────────────────────────────────────────────────
const FB_SYNC_DOC = `
## 🔌 Browser Extension & Facebook Sync — How It Works

### The Short Version
Facebook stopped letting apps access your personal Saved posts years ago. So we built something smarter: a browser extension that watches what YOU do on Facebook and quietly saves it to your Klip4ge vault the instant you hit Facebook's own Save button. No passwords, no Facebook API, no scraping tricks — it just rides along with your normal browsing.

---

### The Browser Extension (Chrome / Edge / Brave)

**What it is:**
A small add-on that sits in your browser toolbar. You can save any webpage to Klip4ge in one click or by pressing Alt+S. It works on every website, not just Facebook.

**How to install:**
1. Download or clone the Klip4ge repo from GitHub
2. Open your browser and go to chrome://extensions
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked" → select the /extension folder
5. The Klip4ge icon appears in your toolbar — you're live!

> A Chrome Web Store listing is coming soon. For now, install manually using the steps above.

---

### How Facebook Real-Time Sync Works (Plain English)

When you're browsing Facebook in the same browser where the extension is installed, the extension runs a silent background content script on every Facebook page. Here's exactly what it does:

**Layer 1 — Toast Watcher**
When you click Facebook's Save button, a small "Saved" confirmation popup appears on screen. The extension watches for this popup using a MutationObserver (a browser-native tool that monitors page changes in real time). The moment it sees that popup, it captures the post details and sends them to your vault.

**Layer 2 — Click Interceptor**
The extension also listens for clicks on any element labeled "Save" on Facebook pages. If you click a save button before the popup appears, this layer catches it.

**Layer 3 — Network Hook**
Facebook's app makes a background API call every time you save something. The extension intercepts that network request (using a window.fetch hook) and extracts the saved item details directly from the request data — even faster than waiting for the UI.

**Layer 4 — Bulk Page Scrape**
When you visit facebook.com/saved, the extension automatically scrolls through your entire Saved page and imports everything in one go. Great for the first-time setup or catching up after a gap.

All four layers work simultaneously. If one misses something, another catches it. This makes the sync extremely reliable.

**What gets saved:** Title, URL, preview image, description, and category (auto-detected).
**What NEVER happens:** Your Facebook login, cookies, or session data are never sent to Klip4ge servers. Everything stays in your browser.

---

### The Facebook Sync Agent (Desktop — Optional)

The Sync Agent is for power users who want to do a one-time bulk import of ALL their existing Facebook saves.

**What it is:** A Node.js script that runs on your own computer. It opens a browser window (via Playwright), you log in to Facebook normally, and it scrolls through your saves automatically.

**How to run it:**
\`\`\`
cd tools/fb-saves-scraper
npm install
npm run setup      # registers it as a system background service
npm run scrape     # run a manual scrape right now
\`\`\`

After it completes, go to **Integrations → Facebook → Import from JSON** and upload the exported file.

**After the initial import:** The browser extension handles everything going forward. You typically only run the Agent once.

**Hourly Auto-Sync:** The Agent can also run every hour in the background. If it detects a recent extension heartbeat (the extension has been active within the last 2 hours), it skips the Playwright scrape and trusts the extension data instead — saving your computer resources.

---

### Privacy Guarantee

- The extension only activates on facebook.com — it does not run on other websites unless you manually click Save
- Your Facebook session cookies NEVER leave your device
- Klip4ge receives only the saved item data (title, URL, image, description) — nothing else
- You can disable Facebook sync at any time from the extension popup → Facebook tab
- All sync activity is shown transparently in the extension popup and in Integrations → Facebook

---

### Troubleshooting

| Problem | Fix |
|---|---|
| Extension not showing FB saves | Make sure you're logged into Facebook in the same browser profile where the extension is installed |
| Extension popup shows "⚫ Inactive" | This is normal until your first save action on Facebook. Try saving a post on Facebook to activate it |
| Agent shows "Needs re-login" | Open a terminal, run \`npm run scrape\` in the scraper folder, and log in to Facebook again |
| Share Sheet not showing Klip4ge on mobile | Add Klip4ge to your Home Screen first (iOS: Safari → Share → Add to Home Screen; Android: Chrome → Install App) |
| Save didn't appear in vault | Check your internet connection. Offline saves queue automatically and sync when you reconnect |

---

*For further help, open a Support Ticket or ask the AI Support Bot (💬 icon, bottom-right).*
`;

export default function Support() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ subject: "", message: "", category: "general", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("tickets");
  const [docSearch, setDocSearch] = useState("");

  // Onboarding video
  const onboarding = useOnboarding(user?.email);
  const [showSupportOnboarding, setShowSupportOnboarding] = useState(false);
  const [dontShowSupport, setDontShowSupport] = useState(false);

  // Show onboarding video once per user after auth resolves
  useEffect(() => {
    if (!authLoading && !onboarding.isLoading && onboarding.shouldShowVideo("support")) {
      const t = setTimeout(() => setShowSupportOnboarding(true), 1000);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, onboarding.isLoading]);

  // Pre-fill form with category shortcut
  const openTicketForm = (category, priority = "medium") => {
    setForm({ subject: "", message: "", category, priority });
    setCreateOpen(true);
  };
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {}).finally(() => setAuthLoading(false));
  }, []);

  const { data: tickets = [] } = useQuery({
    queryKey: ["supportTickets"],
    queryFn: () => base44.entities.SupportTicket.list("-created_date"),
    enabled: !!user,
  });

  const { data: roadmap = [] } = useQuery({
    queryKey: ["publicRoadmap"],
    queryFn: () => base44.entities.DevLog.filter({ is_public: true }, "-updated_date", 30),
  });

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Please fill in subject and message.");
      return;
    }
    setSaving(true);
    try {
      // Rate limit: max 10 tickets per hour per user
      const rateLimitRes = await base44.functions.invoke("rateLimiter", {
        userEmail: user.email,
        endpoint: "ticket_creation",
        limit: 10,
        windowMinutes: 60,
      });
      if (!rateLimitRes.data.allowed) {
        const retryIn = rateLimitRes.data.retryAfterSeconds;
        toast.error(`Rate limit exceeded. Please try again in ${Math.ceil(retryIn / 60)} minute${Math.ceil(retryIn / 60) > 1 ? 's' : ''}.`);
        setSaving(false);
        return;
      }
      await base44.entities.SupportTicket.create(form);
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
      setCreateOpen(false);
      setForm({ subject: "", message: "", category: "general", priority: "medium" });
      toast.success("Ticket submitted! We'll respond within 24 hours.");
    } catch (e) {
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredTickets = tickets
    .filter(t => filterStatus === "all" || t.status === filterStatus)
    .filter(t => !searchQuery || t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || t.message?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-[#00BFFF]" />
    </div>
  );

  if (!user) return (
    <div className="p-8 max-w-md mx-auto mt-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00BFFF]/20 to-[#9370DB]/20 flex items-center justify-center mx-auto">
        <MessageCircle className="w-8 h-8 text-[#00BFFF]" />
      </div>
      <h2 className="text-lg font-semibold">Sign in to access Support</h2>
      <p className="text-sm text-[#8B8D97]">You need to be logged in to create or track support tickets.</p>
      <Button onClick={() => base44.auth.redirectToLogin()} className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white">
        Sign In
      </Button>
    </div>
  );

  const roadmapStatusColors = {
    planned: "text-[#8B8D97]",
    in_progress: "text-[#00BFFF]",
    committed: "text-[#F59E0B]",
    shipped: "text-emerald-400",
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-[#8B8D97] text-sm">Get help, track tickets, and read docs</p>
        </div>
        {user && (
          <Button onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white gap-2">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        )}
      </div>

      {/* First-visit onboarding hint */}
      {user && tickets.length === 0 && (
        <div className="p-4 rounded-2xl border border-[#00BFFF]/20 bg-[#00BFFF]/5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Info className="w-5 h-5 text-[#00BFFF] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#E8E8ED]">First time here? Start with the AI Assistant</p>
            <p className="text-xs text-[#8B8D97]">Most questions are answered instantly. For billing, bugs, or account issues — submit a ticket and our team responds within 24h.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setActiveTab("bot")}
            className="border-[#00BFFF]/30 text-[#00BFFF] gap-1.5 shrink-0 w-full sm:w-auto">
            <Sparkles className="w-3.5 h-3.5" /> Try AI First
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1A1D27] border border-[#2A2D3A] flex-wrap h-auto gap-1 p-1">
          {user && (
            <TabsTrigger value="tickets" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] gap-1.5 text-xs">
              <MessageCircle className="w-3.5 h-3.5" /> My Tickets
              {tickets.filter(t => t.status === "open").length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-[9px] font-bold">
                  {tickets.filter(t => t.status === "open").length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="bot" className="data-[state=active]:bg-[#9370DB]/10 data-[state=active]:text-[#9370DB] gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" /> AI Assistant
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="data-[state=active]:bg-[#00BFFF]/10 data-[state=active]:text-[#00BFFF] gap-1.5 text-xs">
            <Map className="w-3.5 h-3.5" /> Roadmap
          </TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-[#9370DB]/10 data-[state=active]:text-[#9370DB] gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" /> Documentation
          </TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        {user && (
          <TabsContent value="tickets" className="mt-4 space-y-4">
            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => openTicketForm("bug", "high")}
                className="glass-card rounded-xl p-3 text-left hover:border-red-400/30 transition-all group">
                <Bug className="w-5 h-5 text-red-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold">Report Bug</p>
                <p className="text-[10px] text-[#8B8D97]">Something broken</p>
              </button>
              <button onClick={() => openTicketForm("feature_request", "low")}
                className="glass-card rounded-xl p-3 text-left hover:border-[#9370DB]/30 transition-all group">
                <Lightbulb className="w-5 h-5 text-[#9370DB] mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold">Suggest Feature</p>
                <p className="text-[10px] text-[#8B8D97]">Have an idea</p>
              </button>
              <button onClick={() => openTicketForm("general", "medium")}
                className="glass-card rounded-xl p-3 text-left hover:border-[#00BFFF]/30 transition-all group">
                <Edit3 className="w-5 h-5 text-[#00BFFF] mb-1.5 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold">General Help</p>
                <p className="text-[10px] text-[#8B8D97]">Any question</p>
              </button>
            </div>

            {/* Search + filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8D97]" />
                <Input placeholder="Search tickets..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] h-9 text-sm placeholder:text-[#8B8D97]/50" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                  <SelectItem value="all" className="text-[#E8E8ED] text-xs">All Status</SelectItem>
                  <SelectItem value="open" className="text-[#E8E8ED] text-xs">Open</SelectItem>
                  <SelectItem value="in_progress" className="text-[#E8E8ED] text-xs">In Progress</SelectItem>
                  <SelectItem value="resolved" className="text-[#E8E8ED] text-xs">Resolved</SelectItem>
                  <SelectItem value="closed" className="text-[#E8E8ED] text-xs">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredTickets.length === 0 ? (
              <Card className="glass-card p-10 text-center">
                <MessageCircle className="w-10 h-10 text-[#9370DB] mx-auto mb-3" />
                <h3 className="font-semibold mb-2">{tickets.length === 0 ? "No tickets yet" : "No matching tickets"}</h3>
                <p className="text-sm text-[#8B8D97] mb-4">{tickets.length === 0 ? "Or try our AI bot for instant answers" : "Try adjusting your filters"}</p>
                {tickets.length === 0 && (
                  <Button size="sm" onClick={() => setActiveTab("bot")} variant="outline" className="border-[#9370DB]/30 text-[#9370DB] gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Try AI Assistant
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredTickets.map((ticket, i) => (
                  <motion.div key={ticket.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card
                      className="glass-card p-4 cursor-pointer hover:border-[#00BFFF]/30 transition-all group"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-medium text-sm truncate group-hover:text-[#00BFFF] transition-colors">{ticket.subject}</h3>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[ticket.status]}`}>{ticket.status}</Badge>
                            <Badge variant="outline" className="text-[10px] border-[#2A2D3A] text-[#8B8D97] capitalize">{ticket.category}</Badge>
                          </div>
                          <p className="text-xs text-[#8B8D97] line-clamp-1">{ticket.message}</p>
                          {ticket.response && (
                            <p className="text-[10px] text-[#00BFFF] mt-1">✓ Response received</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-[#8B8D97] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ticket.created_date).toLocaleDateString()}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97] group-hover:text-[#00BFFF] transition-colors" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* AI Bot Tab */}
        <TabsContent value="bot" className="mt-4">
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#9370DB] shrink-0 mt-0.5" />
              <div className="text-xs text-[#8B8D97] leading-relaxed">
                <strong className="text-[#E8E8ED]">AI Support Bot</strong> — answers questions about Klip4ge instantly. For issues needing human review, click <strong className="text-[#FFB6C1]">Human</strong> in the chat header to escalate and auto-create a ticket with your conversation context. <em>AI responses are for informational purposes only.</em>
              </div>
            </div>
            <SupportBot user={user} floating={false} />
          </div>
        </TabsContent>

        {/* Roadmap Tab */}
        <TabsContent value="roadmap" className="mt-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold">Features in Development</p>
              <p className="text-xs text-[#8B8D97]">Actively worked on or committed by our team — synced live from our Dev Log</p>
            </div>
            <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block mr-1.5" />Live
            </Badge>
          </div>
          {roadmap.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <Map className="w-8 h-8 text-[#9370DB] mx-auto mb-3" />
              <p className="text-sm text-[#8B8D97]">No public roadmap items yet — check back soon!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {roadmap.map((item, i) => {
                const statusDot = {
                  shipped: "bg-emerald-400",
                  committed: "bg-[#F59E0B]",
                  in_progress: "bg-[#00BFFF] animate-pulse",
                  planned: "bg-[#8B8D97]",
                  cancelled: "bg-red-400",
                }[item.status] || "bg-[#8B8D97]";
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="glass-card p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{item.title}</p>
                            <span className={`text-[10px] font-semibold capitalize ${roadmapStatusColors[item.status] || "text-[#8B8D97]"}`}>
                              {item.status?.replace("_", " ")}
                            </span>
                            {item.category && (
                              <Badge variant="outline" className="text-[10px] border-[#2A2D3A] text-[#8B8D97] capitalize">{item.category.replace("_"," ")}</Badge>
                            )}
                            {item.priority === "critical" && (
                              <Badge variant="outline" className="text-[10px] border-red-400/30 text-red-400">🔥 Critical</Badge>
                            )}
                          </div>
                          {item.description && <p className="text-xs text-[#8B8D97] mt-0.5">{item.description}</p>}
                          {item.eta && <p className="text-[10px] text-[#8B8D97] mt-1">ETA: {new Date(item.eta).toLocaleDateString()}</p>}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
          <div className="p-3 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 text-xs text-[#8B8D97]">
            💡 Want to shape what we build next? <button onClick={() => openTicketForm("feature_request", "low")} className="text-[#9370DB] hover:underline">Submit a feature request →</button>
          </div>
        </TabsContent>

        {/* Docs Tab */}
        <TabsContent value="docs" className="mt-4 space-y-4">
          {/* Doc search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8D97]" />
            <Input
              placeholder="Search documentation..."
              value={docSearch}
              onChange={e => setDocSearch(e.target.value)}
              className="pl-9 bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] h-9 text-sm placeholder:text-[#8B8D97]/50"
            />
          </div>

          {/* AI doc search results */}
          {docSearch.trim().length > 2 && (
            <DocSearchResults query={docSearch} onAskBot={() => { setDocSearch(""); setActiveTab("bot"); }} />
          )}

          {/* Links grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { to: "Privacy", icon: Shield, color: "#00BFFF", label: "Privacy Policy", sub: "GDPR, COPPA, data collection" },
              { to: "Terms", icon: FileText, color: "#9370DB", label: "Terms of Service", sub: "Usage, billing & liability" },
              { to: "Cookies", icon: BookOpen, color: "#F59E0B", label: "Cookie Policy", sub: "Minimal tracking, no ad cookies" },
              { anchor: "#ai-whitepaper", icon: Sparkles, color: "#FFB6C1", label: "AI Transparency Whitepaper", sub: "How AI is used & disclaimers" },
              { anchor: "#fb-sync-doc", icon: Chrome, color: "#1877F2", label: "Facebook Sync & Extension Guide", sub: "How real-time FB sync works" },
              { anchor: "#fb-sync-doc", icon: Smartphone, color: "#10B981", label: "Mobile & PWA Guide", sub: "Share Sheet, offline saves, install" },
            ].filter(d => !docSearch.trim() || d.label.toLowerCase().includes(docSearch.toLowerCase()) || d.sub.toLowerCase().includes(docSearch.toLowerCase())).map((doc, i) => (
              doc.to ? (
                <Link key={i} to={createPageUrl(doc.to)} className="glass-card rounded-xl p-4 hover:border-[#00BFFF]/20 transition-all flex items-center gap-3 group">
                  <doc.icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" style={{ color: doc.color }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{doc.label}</p>
                    <p className="text-[10px] text-[#8B8D97]">{doc.sub}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97] group-hover:text-[#00BFFF] transition-colors" />
                </Link>
              ) : (
                <a key={i} href={doc.anchor} className="glass-card rounded-xl p-4 hover:border-[#FFB6C1]/20 transition-all flex items-center gap-3 group">
                  <doc.icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" style={{ color: doc.color }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{doc.label}</p>
                    <p className="text-[10px] text-[#8B8D97]">{doc.sub}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#8B8D97] transition-colors" />
                </a>
              )
            ))}
          </div>

          {/* Compliance badges */}
          <div className="flex flex-wrap gap-2 px-1">
            {["GDPR Compliant", "COPPA Compliant", "No PHI Stored", "PCI DSS via Stripe", "No Ad Tracking"].map(b => (
              <span key={b} className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-medium">
                ✓ {b}
              </span>
            ))}
          </div>

          {/* AI Whitepaper */}
          <div id="ai-whitepaper" className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FFB6C1]" />
              <h2 className="font-semibold">AI Transparency Whitepaper</h2>
              <span className="ml-auto text-[10px] text-[#8B8D97]">v1.0 · Feb 2026</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-[11px] text-[#8B8D97] leading-relaxed">
              ⚠️ <strong className="text-amber-400">Disclaimer:</strong> AI-generated content in Klip4ge is for informational purposes only and does not constitute legal, medical, financial, or professional advice. Always verify important information from authoritative sources.
            </div>
            <div className="prose prose-sm max-w-none text-[#8B8D97] space-y-3">
              {AI_DOC.trim().split("\n\n").map((paragraph, i) => {
                if (paragraph.startsWith("##")) {
                  return <h3 key={i} className="text-base font-bold text-[#E8E8ED] mt-4">{paragraph.replace("## ", "")}</h3>;
                }
                if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                  return <p key={i} className="text-sm font-semibold text-[#E8E8ED]">{paragraph.replace(/\*\*/g, "")}</p>;
                }
                return (
                  <div key={i} className="text-sm leading-relaxed">
                    {paragraph.split("\n").map((line, j) => (
                      <p key={j} className={line.startsWith("•") ? "ml-3" : ""}>{line}</p>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="pt-3 border-t border-[#2A2D3A] flex gap-4 text-[10px] text-[#8B8D97] flex-wrap">
              <Link to={createPageUrl("Privacy")} className="hover:text-[#00BFFF] transition-colors">Privacy Policy</Link>
              <Link to={createPageUrl("Terms")} className="hover:text-[#9370DB] transition-colors">Terms of Service</Link>
              <Link to={createPageUrl("Cookies")} className="hover:text-[#F59E0B] transition-colors">Cookie Policy</Link>
            </div>
          </div>

          {/* Facebook Sync & Extension Guide */}
          <div id="fb-sync-doc" className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Chrome className="w-5 h-5 text-[#1877F2]" />
              <h2 className="font-semibold">Facebook Sync & Browser Extension</h2>
              <span className="ml-auto text-[10px] text-[#8B8D97]">v1.1 · Mar 2026</span>
            </div>

            {/* Callout: Why this approach */}
            <div className="p-3 rounded-xl bg-[#1877F2]/8 border border-[#1877F2]/25 text-[11px] text-[#8B8D97] leading-relaxed">
              ℹ️ <strong className="text-[#1877F2]">Why not a direct Facebook connection?</strong> Facebook deprecated third-party access to personal Saved posts in 2018. Klip4ge's extension-based approach is the only compliant, privacy-safe way to sync your Facebook saves in real time.
            </div>

            <div className="prose prose-sm max-w-none text-[#8B8D97] space-y-3">
              {FB_SYNC_DOC.trim().split("\n\n").map((paragraph, i) => {
                if (paragraph.startsWith("### ")) {
                  return <h4 key={i} className="text-sm font-bold text-[#00BFFF] mt-5 pt-3 border-t border-[#2A2D3A] first:border-0 first:pt-0">{paragraph.replace("### ", "")}</h4>;
                }
                if (paragraph.startsWith("## ")) {
                  return <h3 key={i} className="text-base font-bold text-[#E8E8ED] mt-4">{paragraph.replace("## ", "")}</h3>;
                }
                if (paragraph.startsWith("---")) {
                  return <hr key={i} className="border-[#2A2D3A] my-2" />;
                }
                if (paragraph.startsWith("```")) {
                  const code = paragraph.replace(/```\w*\n?/, "").replace(/```$/, "");
                  return (
                    <pre key={i} className="bg-[#0F1117] rounded-lg px-4 py-3 text-[11px] text-[#10B981] font-mono overflow-x-auto border border-[#2A2D3A]">
                      <code>{code.trim()}</code>
                    </pre>
                  );
                }
                if (paragraph.startsWith("**Layer")) {
                  const [header, ...rest] = paragraph.split("\n");
                  return (
                    <div key={i} className="pl-3 border-l-2 border-[#1877F2]/40 space-y-1">
                      <p className="text-sm font-semibold text-[#E8E8ED]">{header.replace(/\*\*/g, "")}</p>
                      {rest.map((line, j) => <p key={j} className="text-sm text-[#8B8D97]">{line}</p>)}
                    </div>
                  );
                }
                if (paragraph.startsWith("| ")) {
                  // Simple table — render as a styled list
                  const rows = paragraph.split("\n").filter(r => !r.startsWith("|---") && r.includes("|"));
                  const [headerRow, ...dataRows] = rows;
                  const headers = headerRow.split("|").map(h => h.trim()).filter(Boolean);
                  return (
                    <div key={i} className="overflow-x-auto rounded-xl border border-[#2A2D3A]">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-[#1A1D27]">
                            {headers.map((h, hi) => (
                              <th key={hi} className="px-3 py-2 text-left text-[#8B8D97] font-semibold border-b border-[#2A2D3A]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {dataRows.map((row, ri) => {
                            const cells = row.split("|").map(c => c.trim()).filter(Boolean);
                            return (
                              <tr key={ri} className="border-b border-[#2A2D3A] last:border-0 hover:bg-[#1A1D27]/50">
                                {cells.map((cell, ci) => (
                                  <td key={ci} className={`px-3 py-2 ${ci === 0 ? "text-[#E8E8ED] font-medium" : "text-[#8B8D97]"}`}>{cell}</td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                if (paragraph.startsWith("> ")) {
                  return (
                    <div key={i} className="pl-3 border-l-2 border-[#9370DB]/60 bg-[#9370DB]/5 rounded-r-lg py-2 pr-3">
                      <p className="text-[11px] text-[#9370DB] italic leading-relaxed">{paragraph.replace(/^> /, "")}</p>
                    </div>
                  );
                }
                return (
                  <div key={i} className="text-sm leading-relaxed space-y-1">
                    {paragraph.split("\n").map((line, j) => {
                      if (line.startsWith("- ") || line.startsWith("• ")) {
                        return <p key={j} className="ml-4 flex gap-2"><span className="text-[#00BFFF] shrink-0">•</span><span>{line.replace(/^[-•] /, "")}</span></p>;
                      }
                      if (/^\d+\./.test(line)) {
                        return <p key={j} className="ml-4">{line}</p>;
                      }
                      return <p key={j}>{line}</p>;
                    })}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#2A2D3A] flex gap-4 text-[10px] text-[#8B8D97] flex-wrap">
              <a href="https://github.com/CStep-EA/clipforge" target="_blank" rel="noopener noreferrer" className="hover:text-[#00BFFF] transition-colors flex items-center gap-1">
                GitHub Repo <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <Link to={createPageUrl("FAQ")} className="hover:text-[#9370DB] transition-colors">Full FAQ</Link>
              <Link to={createPageUrl("Privacy")} className="hover:text-[#00BFFF] transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Ticket Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED]">
          <DialogHeader>
            <DialogTitle className="gradient-text">New Support Ticket</DialogTitle>
            <DialogDescription className="sr-only">
              Fill in subject and message to submit your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-[#8B8D97]">Subject</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]" placeholder="Brief description of your issue" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-[#8B8D97]">Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    <SelectItem value="general" className="text-[#E8E8ED]">General</SelectItem>
                    <SelectItem value="bug" className="text-[#E8E8ED]">Bug Report</SelectItem>
                    <SelectItem value="feature_request" className="text-[#E8E8ED]">Feature Request</SelectItem>
                    <SelectItem value="billing" className="text-[#E8E8ED]">Billing</SelectItem>
                    <SelectItem value="account" className="text-[#E8E8ED]">Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[#8B8D97]">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                    <SelectItem value="low" className="text-[#E8E8ED]">Low</SelectItem>
                    <SelectItem value="medium" className="text-[#E8E8ED]">Medium</SelectItem>
                    <SelectItem value="high" className="text-[#E8E8ED]">High</SelectItem>
                    <SelectItem value="urgent" className="text-[#E8E8ED]">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Message</Label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-28"
                placeholder="Describe your issue in detail..." />
            </div>
            <Button onClick={handleCreate} disabled={!form.subject || !form.message || saving}
              className="w-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail */}
      <TicketDetail
        ticket={selectedTicket}
        open={!!selectedTicket}
        onOpenChange={open => { if (!open) setSelectedTicket(null); }}
      />

      {/* Onboarding walkthrough video */}
      {showSupportOnboarding && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Support walkthrough video"
        >
          <div className="w-full max-w-2xl">
            <OnboardingVideoPlayer
              video={ONBOARDING_VIDEOS.support}
              onClose={() => {
                if (dontShowSupport) onboarding.markVideoSeen("support");
                setShowSupportOnboarding(false);
              }}
              onDontShowAgain={setDontShowSupport}
              dontShowAgain={dontShowSupport}
              autoPlay={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}