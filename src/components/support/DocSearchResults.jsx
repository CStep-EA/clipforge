import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ExternalLink, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DOC_CATALOG = [
  {
    title: "Privacy Policy",
    page: "Privacy",
    keywords: ["privacy", "gdpr", "data", "coppa", "children", "erasure", "portability", "personal data", "hipaa", "phi", "consent", "rights"],
    snippet: "GDPR, COPPA compliance. No PHI stored. Data erasure, portability, and consent rights explained."
  },
  {
    title: "Terms of Service",
    page: "Terms",
    keywords: ["terms", "billing", "subscription", "cancel", "refund", "acceptable use", "liability", "governing law"],
    snippet: "Subscription plans, billing, acceptable use policy, liability limits, and governing law."
  },
  {
    title: "Cookie Policy",
    page: "Cookies",
    keywords: ["cookie", "tracking", "analytics", "local storage", "session", "ad", "pixel", "fingerprint"],
    snippet: "Minimal cookies — no ad tracking, no cross-site pixels. Essential session + preference storage only."
  },
  {
    title: "AI Transparency Whitepaper",
    page: "Support",
    anchor: "#ai-whitepaper",
    keywords: ["ai", "artificial intelligence", "llm", "summary", "summaries", "bot", "support bot", "event review", "training data", "model"],
    snippet: "How AI is used for saves, summaries, event reviews, and the support bot. Disclaimer included."
  },
  {
    title: "AI Support Bot — Disclaimer",
    page: "Support",
    keywords: ["bot disclaimer", "ai disclaimer", "not human", "ai support", "inaccurate"],
    snippet: "The AI support bot is NOT a human agent. Responses may be inaccurate. Escalate to human support for complex issues."
  },
  {
    title: "GDPR Rights",
    page: "Privacy",
    keywords: ["gdpr", "eu", "right to access", "right to erasure", "right to portability", "data subject"],
    snippet: "EU residents can access, correct, erase, or export their data. Email privacy@clipforge.app."
  },
  {
    title: "COPPA & Children's Privacy",
    page: "Privacy",
    keywords: ["coppa", "child", "children", "under 13", "parental consent", "family", "safe mode"],
    snippet: "Family plan child accounts require verified parental consent. Child-safe mode enabled by default."
  },
  {
    title: "No PHI Stored",
    page: "Privacy",
    keywords: ["phi", "health", "hipaa", "medical", "protected health information"],
    snippet: "ClipForge does not collect or store Protected Health Information (PHI). HIPAA does not apply."
  },
];

export default function DocSearchResults({ query, onAskBot }) {
  const [aiAnswer, setAiAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const q = query.toLowerCase();
  const matches = DOC_CATALOG.filter(doc =>
    doc.title.toLowerCase().includes(q) ||
    doc.snippet.toLowerCase().includes(q) ||
    doc.keywords.some(k => q.includes(k) || k.includes(q))
  );

  const handleAiSearch = async () => {
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are ClipForge's documentation assistant. Answer this question concisely based on our policies (Privacy Policy, Terms of Service, Cookie Policy, AI Transparency Whitepaper).

IMPORTANT DISCLAIMER: Your answer is for informational purposes only and does not constitute legal, medical, or financial advice.

User question: "${query}"

Answer in 2-4 sentences. If you cannot answer from the docs, say so and suggest they contact support. Always end with: "For full details, see our [Privacy Policy], [Terms of Service], or [Cookie Policy]."`,
    });
    setAiAnswer(result);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      {matches.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-[#8B8D97] uppercase tracking-wider font-semibold">Documentation matches</p>
          {matches.map((doc, i) => (
            <Link
              key={i}
              to={doc.anchor ? createPageUrl(doc.page) + doc.anchor : createPageUrl(doc.page)}
              className="flex items-start gap-3 p-3 rounded-xl glass-card hover:border-[#9370DB]/30 transition-all group"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#9370DB] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold group-hover:text-[#9370DB] transition-colors">{doc.title}</p>
                <p className="text-[10px] text-[#8B8D97] leading-relaxed mt-0.5">{doc.snippet}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* AI answer */}
      {!aiAnswer && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAiSearch}
            disabled={loading}
            className="h-8 text-xs border-[#9370DB]/30 text-[#9370DB] hover:bg-[#9370DB]/10 gap-1.5"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Ask AI about docs
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onAskBot}
            className="h-8 text-xs text-[#8B8D97] hover:text-[#00BFFF] gap-1.5"
          >
            <MessageCircle className="w-3 h-3" /> Ask Support Bot
          </Button>
        </div>
      )}

      {aiAnswer && (
        <div className="p-4 rounded-xl bg-[#9370DB]/5 border border-[#9370DB]/20 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9370DB]">
            <Sparkles className="w-3.5 h-3.5" /> AI Doc Answer
          </div>
          <p className="text-sm text-[#E8E8ED] leading-relaxed">{aiAnswer}</p>
          <p className="text-[10px] text-[#8B8D97] italic">⚠️ For informational purposes only. Not legal advice. Verify with official documents.</p>
          <Button size="sm" variant="ghost" onClick={onAskBot} className="h-7 text-xs text-[#8B8D97] hover:text-[#00BFFF] gap-1 px-2">
            <MessageCircle className="w-3 h-3" /> Still need help? Ask Support Bot
          </Button>
        </div>
      )}

      {matches.length === 0 && !aiAnswer && !loading && (
        <p className="text-xs text-[#8B8D97] px-1">No direct doc matches — try the AI search above.</p>
      )}
    </div>
  );
}