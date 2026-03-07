import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cf-beta-waiver";

export default function BetaWaiverModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (!accepted) setVisible(true);
    } catch {
      // localStorage unavailable — don't block the user
    }
  }, []);

  // ── Lock body scroll while modal is open ────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  // ── Escape key closes (and accepts) the modal ────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === "Escape") accept(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible]);

  const accept = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted-" + new Date().toISOString());
    } catch { /* ignore */ }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-waiver-title"
      // Clicking the backdrop also dismisses
      onClick={(e) => { if (e.target === e.currentTarget) accept(); }}
    >
      <div
        className="w-full max-w-md bg-[#1A1D27] border border-[#F59E0B]/40 rounded-2xl shadow-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="flex-1">
            <h2 id="beta-waiver-title" className="font-bold text-[#E8E8ED]">Alpha / Beta Software</h2>
            <p className="text-xs text-[#8B8D97]">Tester Agreement — please read before continuing</p>
          </div>
          {/* X close button — keyboard accessible */}
          <button
            onClick={accept}
            className="p-1.5 rounded-lg text-[#8B8D97] hover:text-[#E8E8ED] hover:bg-[#2A2D3A] transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 text-sm text-[#8B8D97] leading-relaxed">
          <p>Klip4ge is <strong className="text-[#F59E0B]">pre-release software</strong>. By continuing you agree:</p>
          <ul className="space-y-1.5 pl-4">
            {[
              "This software is provided \"as-is\" with no warranty of any kind.",
              "Features may change or be removed without notice.",
              "Data loss is possible — do not rely solely on Klip4ge for important content.",
              "You will not hold Klip4ge or its team liable for any loss or damage.",
              "Uptime and reliability are not guaranteed during beta.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#F59E0B] mt-0.5 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs">
            Full details in our{" "}
            <Link
              to={createPageUrl("Terms")}
              className="text-[#00BFFF] hover:underline"
              onClick={accept}
            >
              Terms of Service
            </Link>.
          </p>
        </div>

        {/* CTA */}
        <Button
          onClick={accept}
          className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-black font-bold gap-2 min-h-[44px]"
          aria-label="Accept beta terms and continue to Klip4ge"
        >
          <CheckCircle2 className="w-4 h-4" />
          I Understand — Continue to Klip4ge
        </Button>
      </div>
    </div>
  );
}
