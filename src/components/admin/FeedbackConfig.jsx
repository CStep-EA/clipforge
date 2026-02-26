import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ALL_SOURCES = [
  { id: "reddit", label: "Reddit", emoji: "🟠" },
  { id: "twitter", label: "X / Twitter", emoji: "🐦" },
  { id: "producthunt", label: "Product Hunt", emoji: "🚀" },
  { id: "g2", label: "G2", emoji: "⭐" },
  { id: "capterra", label: "Capterra", emoji: "📋" },
  { id: "appstore", label: "App Store", emoji: "🍎" },
  { id: "playstore", label: "Play Store", emoji: "🤖" },
  { id: "technews", label: "Tech News", emoji: "📰" },
  { id: "cnet", label: "CNET", emoji: "💻" },
  { id: "pcmag", label: "PCMag", emoji: "🖥️" },
  { id: "wired", label: "Wired", emoji: "⚡" },
  { id: "facebook", label: "Facebook", emoji: "📘" },
];

export default function FeedbackConfig({ onBack }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [newKw, setNewKw] = useState("");

  const { data: configs = [] } = useQuery({
    queryKey: ["feedbackConfig"],
    queryFn: () => base44.entities.FeedbackConfig.list(),
  });

  const existing = configs[0];
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (existing && !form) {
      setForm({
        sources: existing.sources || ALL_SOURCES.map(s => s.id),
        keywords: existing.keywords || ["ClipForge", "clip forge"],
        escalation_threshold: existing.escalation_threshold || "urgent",
        escalation_negative_count: existing.escalation_negative_count ?? 5,
        auto_ticket: existing.auto_ticket !== false,
        fetch_frequency: existing.fetch_frequency || "daily",
        is_active: existing.is_active !== false,
      });
    } else if (!existing && !form) {
      setForm({
        sources: ALL_SOURCES.map(s => s.id),
        keywords: ["ClipForge", "clip forge", "social saving app"],
        escalation_threshold: "urgent",
        escalation_negative_count: 5,
        auto_ticket: true,
        fetch_frequency: "daily",
        is_active: true,
      });
    }
  }, [existing]);

  if (!form) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#00BFFF]" /></div>;

  const toggleSource = (id) => {
    setForm(f => ({
      ...f,
      sources: f.sources.includes(id) ? f.sources.filter(s => s !== id) : [...f.sources, id]
    }));
  };

  const addKeyword = () => {
    if (!newKw.trim() || form.keywords.includes(newKw.trim())) return;
    setForm(f => ({ ...f, keywords: [...f.keywords, newKw.trim()] }));
    setNewKw("");
  };

  const removeKeyword = (kw) => setForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }));

  const handleSave = async () => {
    setSaving(true);
    if (existing) {
      await base44.entities.FeedbackConfig.update(existing.id, form);
    } else {
      await base44.entities.FeedbackConfig.create(form);
    }
    queryClient.invalidateQueries({ queryKey: ["feedbackConfig"] });
    toast.success("Config saved");
    setSaving(false);
    onBack();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack} className="gap-1 text-[#8B8D97] hover:text-[#E8E8ED]">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <h3 className="font-semibold">Feedback Monitor Configuration</h3>
      </div>

      <Card className="glass-card p-5 space-y-5">
        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Enable Monitoring</Label>
            <p className="text-[10px] text-[#8B8D97]">Automatically scan for feedback</p>
          </div>
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
        </div>

        {/* Sources */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Data Sources</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_SOURCES.map(s => (
              <button key={s.id} onClick={() => toggleSource(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${form.sources.includes(s.id)
                  ? "bg-[#00BFFF]/10 border-[#00BFFF]/50 text-[#00BFFF]"
                  : "bg-[#1A1D27] border-[#2A2D3A] text-[#8B8D97]"}`}>
                <span>{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">Tracking Keywords</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.keywords.map(kw => (
              <Badge key={kw} variant="outline" className="border-[#2A2D3A] text-[#E8E8ED] gap-1 pr-1">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-red-400"><X className="w-2.5 h-2.5" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newKw} onChange={(e) => setNewKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              placeholder="Add keyword..." className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-8 text-xs" />
            <Button size="sm" variant="outline" onClick={addKeyword} className="border-[#2A2D3A] h-8 gap-1">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Frequency & Escalation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-[#8B8D97] mb-1.5 block">Fetch Frequency</Label>
            <Select value={form.fetch_frequency} onValueChange={(v) => setForm(f => ({ ...f, fetch_frequency: v }))}>
              <SelectTrigger className="bg-[#0F1117] border-[#2A2D3A] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-[#8B8D97] mb-1.5 block">Auto-ticket Threshold</Label>
            <Select value={form.escalation_threshold} onValueChange={(v) => setForm(f => ({ ...f, escalation_threshold: v }))}>
              <SelectTrigger className="bg-[#0F1117] border-[#2A2D3A] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                <SelectItem value="high">High + Urgent</SelectItem>
                <SelectItem value="urgent">Urgent Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Auto-ticket */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">Auto-create Support Tickets</Label>
            <p className="text-[10px] text-[#8B8D97]">Automatically escalate bugs & complaints meeting threshold</p>
          </div>
          <Switch checked={form.auto_ticket} onCheckedChange={(v) => setForm(f => ({ ...f, auto_ticket: v }))} />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-[#00BFFF] text-white gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Configuration
        </Button>
      </Card>
    </div>
  );
}