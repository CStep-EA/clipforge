import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import { Sparkles, BookOpen, FileText, Loader2, Copy, Check } from "lucide-react";

const DOC_TEMPLATES = [
  { id: "onboarding", label: "Onboarding Guide", icon: "🚀", prompt: "Write a comprehensive onboarding guide for ClipForge, a social media content saving & AI organization app. Cover: getting started, connecting social accounts, using AI summaries, creating boards, and pro tips. Use markdown with headers, bullet points, and examples." },
  { id: "faq", label: "FAQ", icon: "❓", prompt: "Write a detailed FAQ for ClipForge covering: what it is, how saving works, social connections, AI features, pricing/plans, privacy & data security, sharing boards, and troubleshooting common issues. Use markdown Q&A format." },
  { id: "api_guide", label: "API Token Guide", icon: "🔑", prompt: "Write a step-by-step guide for ClipForge users on how to get API tokens for: Instagram Graph API, Pinterest API, Twitter/X API v2, TikTok for Developers. Include links, screenshots descriptions, and common gotchas. Use markdown with numbered steps per platform." },
  { id: "privacy", label: "Privacy Policy Summary", icon: "🛡️", prompt: "Write a clear, user-friendly privacy policy summary for ClipForge explaining: what data is collected (saved items, social tokens), how it's stored (encrypted), what we never do (no posting on user behalf), user rights, and data deletion. Use markdown." },
  { id: "release_notes", label: "Release Notes Template", icon: "📋", prompt: "Write a release notes template for ClipForge v2.0 covering: new features (Facebook integration, freemium gating, admin dashboard, AI ticket drafting), improvements (UI polish, performance), and bug fixes. Use markdown with version header and sections." },
];

export default function AdminDocs() {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(true);
  const [copied, setCopied] = useState(false);

  const generateDoc = async (template) => {
    setSelectedDoc(template);
    setGenerating(true);
    setContent("");
    const result = await base44.integrations.Core.InvokeLLM({ prompt: template.prompt });
    setContent(result);
    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {DOC_TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => generateDoc(t)}
            className={`p-3 rounded-xl text-left transition-all border ${selectedDoc?.id === t.id
              ? "border-[#00BFFF]/50 bg-[#00BFFF]/10"
              : "border-[#2A2D3A] bg-[#1A1D27] hover:border-[#00BFFF]/30"}`}
          >
            <div className="text-xl mb-1">{t.icon}</div>
            <p className="text-xs font-medium text-[#E8E8ED]">{t.label}</p>
          </button>
        ))}
      </div>

      {generating && (
        <Card className="glass-card p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#9370DB]" />
          <p className="text-sm text-[#8B8D97]">Generating {selectedDoc?.label}...</p>
        </Card>
      )}

      {content && !generating && (
        <Card className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2A2D3A]">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedDoc?.icon}</span>
              <span className="font-semibold text-sm">{selectedDoc?.label}</span>
              <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-400/30 gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AI Generated
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-[#2A2D3A] text-xs h-7 gap-1"
                onClick={() => setPreview(!preview)}>
                {preview ? <FileText className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                {preview ? "Raw" : "Preview"}
              </Button>
              <Button size="sm" variant="outline" className="border-[#2A2D3A] text-xs h-7 gap-1" onClick={handleCopy}>
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {preview ? (
              <ReactMarkdown className="prose prose-sm prose-invert max-w-none text-[#E8E8ED] [&_h1]:text-[#00BFFF] [&_h2]:text-[#9370DB] [&_strong]:text-[#E8E8ED] [&_a]:text-[#00BFFF]">
                {content}
              </ReactMarkdown>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-none text-[#E8E8ED] font-mono text-xs min-h-[400px] p-0 focus-visible:ring-0"
              />
            )}
          </div>
        </Card>
      )}

      {!content && !generating && (
        <Card className="glass-card p-8 text-center">
          <BookOpen className="w-10 h-10 text-[#2A2D3A] mx-auto mb-3" />
          <p className="text-sm text-[#8B8D97]">Select a document template above to generate AI-powered support materials</p>
        </Card>
      )}
    </div>
  );
}