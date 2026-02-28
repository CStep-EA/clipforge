import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, CalendarPlus, Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AddToCalendarButton from "@/components/events/AddToCalendarButton";

const categories = [
  { value: "deal", label: "Deal" },
  { value: "recipe", label: "Recipe" },
  { value: "event", label: "Event" },
  { value: "product", label: "Product" },
  { value: "article", label: "Article" },
  { value: "travel", label: "Travel" },
  { value: "gift_idea", label: "Gift Idea" },
  { value: "other", label: "Other" },
];

const sources = [
  { value: "instagram", label: "Instagram" },
  { value: "pinterest", label: "Pinterest" },
  { value: "twitter", label: "X / Twitter" },
  { value: "tiktok", label: "TikTok" },
  { value: "web", label: "Web" },
  { value: "manual", label: "Manual" },
];

export default function AddItemDialog({ open, onOpenChange, onSave, editItem }) {
  const defaultForm = {
    title: "",
    description: "",
    url: "",
    category: "other",
    source: "manual",
    tags: [],
    notes: "",
  };
  const [form, setForm] = useState(editItem || defaultForm);
  const [tagInput, setTagInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [savedItem, setSavedItem] = useState(null); // for calendar stub preview

  // Reset when dialog opens/closes or editItem changes
  useEffect(() => {
    if (open) {
      setForm(editItem || defaultForm);
      setSavedItem(null);
    }
  }, [open, editItem]);

  const handleAIAnalyze = async () => {
    if (!form.url && !form.title) return;
    setAiLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this content and provide categorization:\nTitle: ${form.title}\nURL: ${form.url}\nDescription: ${form.description}\n\nProvide a category, summary, tags, and relevance rating.`,
      response_json_schema: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["deal", "recipe", "event", "product", "article", "travel", "gift_idea", "other"] },
          ai_summary: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          rating: { type: "number" },
          suggested_title: { type: "string" },
        },
      },
      add_context_from_internet: !!form.url,
    });
    setForm(prev => ({
      ...prev,
      category: result.category || prev.category,
      ai_summary: result.ai_summary,
      tags: result.tags || prev.tags,
      rating: result.rating,
      title: prev.title || result.suggested_title || prev.title,
    }));
    setAiLoading(false);
  };

  const handleAddTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      setForm(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    const result = await onSave(form);
    // If it's an event, show the calendar stub instead of closing immediately
    if (form.category === "event" && !editItem) {
      // Build a preview object for the calendar button
      setSavedItem({ ...form, id: result?.id || "_preview", event_date: form.event_date });
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text text-lg">
            {editItem ? "Edit Save" : "Add New Save"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs text-[#8B8D97]">URL (paste a link for AI analysis)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50"
              />
              <Button
                onClick={handleAIAnalyze}
                disabled={aiLoading}
                className="bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white shrink-0"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#8B8D97]">Title</Label>
            <Input
              placeholder="What did you save?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-[#8B8D97]">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-[#E8E8ED] hover:bg-[#2A2D3A]">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-[#8B8D97]">Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1D27] border-[#2A2D3A]">
                  {sources.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-[#E8E8ED] hover:bg-[#2A2D3A]">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#8B8D97]">Description</Label>
            <Textarea
              placeholder="Add details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-20"
            />
          </div>

          {form.ai_summary && (
            <div className="p-3 rounded-xl bg-[#00BFFF]/5 border border-[#00BFFF]/20">
              <p className="text-xs text-[#00BFFF] font-medium mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Summary
              </p>
              <p className="text-xs text-[#8B8D97]">{form.ai_summary}</p>
            </div>
          )}

          <div>
            <Label className="text-xs text-[#8B8D97]">Tags</Label>
            <Input
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED]"
            />
            {form.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#2A2D3A] text-[#8B8D97] cursor-pointer hover:bg-red-500/20 hover:text-red-400"
                    onClick={() => setForm(prev => ({ ...prev, tags: prev.tags.filter((_, j) => j !== i) }))}
                  >
                    #{tag} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs text-[#8B8D97]">Notes</Label>
            <Textarea
              placeholder="Personal notes..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] h-16"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!form.title}
            className="w-full bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white font-medium"
          >
            {editItem ? "Save Changes" : "Add to Vault"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}