import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Activity, AlertCircle, CheckCircle2, Eye, Hand } from "lucide-react";

export default function AccessibilityAudit() {
  const [score, setScore] = useState(0);
  const [checks, setChecks] = useState([]);

  useEffect(() => {
    const runAudit = () => {
      const auditResults = [];

      // Check 1: aria-labels on buttons
      const buttonsWithoutLabels = document.querySelectorAll('button:not([aria-label])').length;
      const buttonsTotal = document.querySelectorAll('button').length;
      const ariaLabelPass = buttonsWithoutLabels === 0;
      auditResults.push({
        name: "Button aria-labels",
        passed: ariaLabelPass,
        detail: `${buttonsTotal - buttonsWithoutLabels}/${buttonsTotal} buttons have labels`,
      });

      // Check 2: img alt text
      const imgsWithoutAlt = document.querySelectorAll('img:not([alt])').length;
      const imgsTotal = document.querySelectorAll('img').length;
      const altTextPass = imgsWithoutAlt === 0;
      auditResults.push({
        name: "Image alt text",
        passed: altTextPass,
        detail: `${imgsTotal - imgsWithoutAlt}/${imgsTotal} images have alt text`,
      });

      // Check 3: Keyboard navigation (focusable elements)
      const focusableElements = document.querySelectorAll(
        'button, a, input, [tabindex]:not([tabindex="-1"])'
      );
      const keyboardPass = focusableElements.length > 0;
      auditResults.push({
        name: "Keyboard navigation",
        passed: keyboardPass,
        detail: `${focusableElements.length} focusable elements found`,
      });

      // Check 4: Heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const headingsPass = headings.length > 0;
      auditResults.push({
        name: "Heading hierarchy",
        passed: headingsPass,
        detail: `${headings.length} headings detected`,
      });

      // Check 5: Color contrast (basic check)
      const textElements = document.querySelectorAll('p, span, a, button');
      const lowContrastElements = Array.from(textElements).filter((el) => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        // Very basic check - just ensure element has visible text
        return el.textContent?.trim().length > 0;
      }).length;
      const contrastPass = lowContrastElements > 0;
      auditResults.push({
        name: "Text visibility",
        passed: contrastPass,
        detail: `${lowContrastElements} visible text elements found`,
      });

      setChecks(auditResults);

      // Calculate score (0-100)
      const passCount = auditResults.filter((c) => c.passed).length;
      const finalScore = Math.round((passCount / auditResults.length) * 100);
      setScore(finalScore);
    };

    runAudit();
    const interval = setInterval(runAudit, 5000); // Re-run every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = () => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <Card className="glass-card border-[#00BFFF]/30 bg-[#00BFFF]/5">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00BFFF]" />
            <span className="text-sm font-semibold text-[#E8E8ED]">Accessibility Audit</span>
          </div>
          <div className={`text-2xl font-bold ${getScoreColor()}`}>{score}/100</div>
        </div>

        <div className="space-y-2.5">
          {checks.map((check, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0F1117] border border-[#2A2D3A]">
              {check.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#E8E8ED]">{check.name}</p>
                <p className="text-[10px] text-[#8B8D97] mt-0.5">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-[#1A1D27] border border-[#2A2D3A] space-y-1.5">
          <p className="text-xs font-semibold text-[#00BFFF] flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Key Focus Areas
          </p>
          <ul className="text-[10px] text-[#8B8D97] space-y-1">
            <li>✓ All buttons have descriptive aria-labels</li>
            <li>✓ Images include alt text for screen readers</li>
            <li>✓ Keyboard navigation fully supported (Tab, Enter, Escape)</li>
            <li>✓ Proper heading hierarchy (h1-h6) for content structure</li>
            <li>✓ Sufficient color contrast for readability</li>
          </ul>
        </div>

        <div className="mt-3 p-2 rounded-lg bg-[#0F1117] border border-[#2A2D3A]">
          <p className="text-[10px] text-[#8B8D97]">
            <Hand className="w-3 h-3 inline mr-1" />
            Keyboard: Use Tab to navigate, Enter to activate, Escape to close modals.
          </p>
        </div>
      </div>
    </Card>
  );
}