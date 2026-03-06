import React, { useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Star, Camera, Loader2, MessageSquarePlus, X as CloseIcon } from "lucide-react";
import html2canvas from "html2canvas";

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Overall experience rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF] transition-transform hover:scale-110"
        >
          <Star
            className="w-7 h-7 transition-colors"
            fill={(hover || value) >= star ? "#F59E0B" : "none"}
            stroke={(hover || value) >= star ? "#F59E0B" : "#8B8D97"}
          />
        </button>
      ))}
    </div>
  );
}

// Dismiss persistence key — also read by Settings page
export const BETA_WIDGET_DISMISSED_KEY = "klip4ge_betawidget_dismissed";

export default function BetaFeedbackWidget({ user }) {
  // Only show for admin or beta role
  const isBetaUser = user?.role === "admin" || user?.role === "beta";
  // Persistent dismiss state
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(BETA_WIDGET_DISMISSED_KEY) === "true"
  );
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [wentWell, setWentWell] = useState("");
  const [needsImprovement, setNeedsImprovement] = useState("");
  const [bugOrFeature, setBugOrFeature] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [allowContact, setAllowContact] = useState(false);
  const [includeScreenshot, setIncludeScreenshot] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = () => {
    setEmail(user?.email || "");
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    // reset
    setRating(0);
    setWentWell("");
    setNeedsImprovement("");
    setBugOrFeature("");
    setEmail(user?.email || "");
    setAllowContact(false);
    setIncludeScreenshot(false);
    setScreenshot(null);
  };

  const captureScreenshot = async () => {
    setCapturingScreenshot(true);
    // Briefly close dialog to capture page underneath
    setOpen(false);
    await new Promise((r) => setTimeout(r, 300));
    try {
      const canvas = await html2canvas(document.body, { scale: 0.5, useCORS: true, logging: false });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      setScreenshot(dataUrl);
      toast.success("Screenshot captured!");
    } catch (e) {
      toast.error("Could not capture screenshot.");
    } finally {
      setCapturingScreenshot(false);
      setOpen(true);
    }
  };

  const handleToggleScreenshot = async (checked) => {
    setIncludeScreenshot(checked);
    if (checked && !screenshot) {
      await captureScreenshot();
    } else if (!checked) {
      setScreenshot(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a star rating before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke("submitBetaFeedback", {
        rating,
        wentWell,
        needsImprovement,
        bugOrFeature,
        email,
        allowContact,
        screenshotDataUrl: includeScreenshot ? screenshot : null,
        userAgent: navigator.userAgent,
        page: window.location.pathname,
      });
      base44.analytics.track({
        eventName: "beta_feedback_submitted",
        properties: { rating, allow_contact: allowContact, has_screenshot: !!screenshot },
      });
      toast.success("Thank you! Your feedback helps us improve. 🙌");
      handleClose();
    } catch (err) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isBetaUser) return null;
  // Hidden until user restores from Settings → Preferences
  if (dismissed) return null;

  return (
    <>
      {/* Floating trigger button — positioned LEFT side, above support bot */}
      <div
        className="fixed bottom-24 left-4 md:bottom-8 md:left-6 z-[60] flex flex-col items-start gap-1"
        aria-label="Open beta feedback form"
      >
        {/* Dismiss (X) button — top-right of the FAB */}
        <button
          onClick={() => {
            localStorage.setItem(BETA_WIDGET_DISMISSED_KEY, "true");
            setDismissed(true);
            toast("Feedback bubble hidden. Restore it in Settings → Preferences.", {
              duration: 5000,
              action: {
                label: "Undo",
                onClick: () => {
                  localStorage.removeItem(BETA_WIDGET_DISMISSED_KEY);
                  setDismissed(false);
                },
              },
            });
          }}
          aria-label="Dismiss beta feedback button"
          title="Hide feedback bubble (restore in Settings)"
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center text-[#8B8D97] hover:text-[#E8E8ED] hover:border-red-400 transition-all z-10"
        >
          <CloseIcon className="w-2.5 h-2.5" />
        </button>

        <button
          onClick={handleOpen}
          aria-label="Give beta feedback"
          className="relative flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white text-sm font-bold shadow-lg hover:shadow-[0_0_24px_rgba(147,112,219,0.5)] transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Feedback</span>
          <span className="absolute -top-2 -right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-[#0F1117] leading-none tracking-wide shadow">
            BETA
          </span>
        </button>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent
          className="bg-[#1A1D27] border-[#2A2D3A] text-[#E8E8ED] max-w-lg max-h-[90vh] overflow-y-auto"
          aria-describedby="beta-feedback-desc"
        >
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle className="gradient-text text-lg font-bold">Beta Feedback</DialogTitle>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#F59E0B] text-[#0F1117] leading-none tracking-wide">BETA</span>
            </div>
            <DialogDescription id="beta-feedback-desc" className="text-[#8B8D97] text-sm">
              Help us improve Klip4ge — your input goes directly to the team. Takes about 2 minutes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-1">
            {/* Star rating */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#E8E8ED] uppercase tracking-wide">
                Overall experience <span className="text-red-400">*</span>
              </Label>
              <StarRating value={rating} onChange={setRating} />
              {rating === 0 && (
                <p className="text-[11px] text-[#8B8D97]">Select a rating to continue</p>
              )}
            </div>

            {/* What worked well */}
            <div className="space-y-1.5">
              <Label htmlFor="went-well" className="text-xs font-semibold text-[#E8E8ED] uppercase tracking-wide">
                What worked well?
                <span className="ml-1 text-[10px] text-[#8B8D97] font-normal normal-case">(optional)</span>
              </Label>
              <Textarea
                id="went-well"
                value={wentWell}
                onChange={(e) => setWentWell(e.target.value)}
                placeholder="e.g. The save feature was super fast..."
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 resize-none h-20 focus-visible:ring-[#00BFFF]"
              />
            </div>

            {/* Needs improvement */}
            <div className="space-y-1.5">
              <Label htmlFor="needs-improvement" className="text-xs font-semibold text-[#E8E8ED] uppercase tracking-wide">
                What needs improvement?
                <span className="ml-1 text-[10px] text-[#8B8D97] font-normal normal-case">(optional)</span>
              </Label>
              <Textarea
                id="needs-improvement"
                value={needsImprovement}
                onChange={(e) => setNeedsImprovement(e.target.value)}
                placeholder="e.g. The modal closes too easily on mobile..."
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 resize-none h-20 focus-visible:ring-[#00BFFF]"
              />
            </div>

            {/* Bug or feature request */}
            <div className="space-y-1.5">
              <Label htmlFor="bug-feature" className="text-xs font-semibold text-[#E8E8ED] uppercase tracking-wide">
                Bug report or feature request?
                <span className="ml-1 text-[10px] text-[#8B8D97] font-normal normal-case">(optional)</span>
              </Label>
              <Textarea
                id="bug-feature"
                value={bugOrFeature}
                onChange={(e) => setBugOrFeature(e.target.value)}
                placeholder="Describe a bug or a feature you'd love to see..."
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 resize-none h-20 focus-visible:ring-[#00BFFF]"
              />
              {/* Screenshot toggle */}
              <div className="flex items-center gap-2.5 pt-1">
                <Checkbox
                  id="include-screenshot"
                  checked={includeScreenshot}
                  onCheckedChange={handleToggleScreenshot}
                  disabled={capturingScreenshot}
                  className="border-[#2A2D3A] data-[state=checked]:bg-[#9370DB] data-[state=checked]:border-[#9370DB]"
                />
                <Label htmlFor="include-screenshot" className="text-xs text-[#8B8D97] cursor-pointer flex items-center gap-1.5">
                  {capturingScreenshot ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Capturing…</>
                  ) : (
                    <><Camera className="w-3 h-3" /> Include screenshot of current page</>
                  )}
                </Label>
              </div>
              {screenshot && (
                <div className="mt-2 rounded-lg overflow-hidden border border-[#2A2D3A]">
                  <img src={screenshot} alt="Page screenshot preview" className="w-full h-24 object-cover object-top" />
                  <p className="text-[10px] text-[#8B8D97] px-2 py-1">Screenshot will be included with your feedback</p>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="feedback-email" className="text-xs font-semibold text-[#E8E8ED] uppercase tracking-wide">
                Email
                <span className="ml-1 text-[10px] text-[#8B8D97] font-normal normal-case">(optional)</span>
              </Label>
              <Input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-[#0F1117] border-[#2A2D3A] text-[#E8E8ED] placeholder:text-[#8B8D97]/50 focus-visible:ring-[#00BFFF]"
              />
            </div>

            {/* Allow contact checkbox */}
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="allow-contact"
                checked={allowContact}
                onCheckedChange={(v) => setAllowContact(!!v)}
                className="mt-0.5 border-[#2A2D3A] data-[state=checked]:bg-[#00BFFF] data-[state=checked]:border-[#00BFFF]"
              />
              <Label htmlFor="allow-contact" className="text-xs text-[#8B8D97] cursor-pointer leading-relaxed">
                I'm okay with the Klip4ge team following up with me about this feedback.
              </Label>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-[#2A2D3A] text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#0F1117]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || rating === 0}
                className="flex-1 bg-gradient-to-r from-[#9370DB] to-[#00BFFF] text-white font-bold disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>

            {/* Aria live region for success/error announcements */}
            <div aria-live="polite" className="sr-only" id="feedback-status" />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}