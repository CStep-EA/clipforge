/**
 * OAuthCallback.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal OAuth return handler for all social and streaming platform OAuth
 * 2.0 flows. This page is the redirect_uri registered with every provider:
 *
 *   https://your-app.base44.app/OAuthCallback
 *
 * Flow:
 *   1. Provider redirects here with ?code=...&state=...
 *   2. We parse state (contains platform + type)
 *   3. We retrieve the stored code_verifier from sessionStorage
 *   4. We POST to the appropriate server function to exchange code → token
 *   5. On success, redirect to /Integrations with a success toast param
 *   6. On error, show error message with retry link
 *
 * sessionStorage keys:
 *   cf_oauth_verifier   — PKCE code_verifier (set by SocialConnectPanel or StreamingPlatformsPanel)
 *   cf_oauth_platform   — platform id (redundant with state, used as fallback)
 *   cf_oauth_type       — "social" | "streaming"
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus]   = useState("loading");  // loading | success | error | config_error
  const [platform, setPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code    = params.get("code");
      const stateB64 = params.get("state");
      const error   = params.get("error");

      // Provider returned an error (e.g. user denied)
      if (error) {
        const desc = params.get("error_description") || error;
        setErrorMsg(`Authorization denied: ${desc}`);
        setStatus("error");
        return;
      }

      if (!code) {
        setErrorMsg("No authorization code received from provider.");
        setStatus("error");
        return;
      }

      // Parse state
      let stateData: { platform?: string; userEmail?: string; type?: string } = {};
      try {
        stateData = JSON.parse(atob(stateB64 || ""));
      } catch {
        setErrorMsg("Invalid state parameter — possible CSRF attempt. Please try connecting again.");
        setStatus("error");
        return;
      }

      const { platform: plt, userEmail, type } = stateData;
      setPlatform(plt || "");

      if (!plt || !userEmail || !type) {
        setErrorMsg("State is missing platform, userEmail, or type.");
        setStatus("error");
        return;
      }

      // Retrieve the PKCE code_verifier stored before redirect
      const codeVerifier = sessionStorage.getItem("cf_oauth_verifier");
      sessionStorage.removeItem("cf_oauth_verifier");
      sessionStorage.removeItem("cf_oauth_platform");
      sessionStorage.removeItem("cf_oauth_type");

      if (!codeVerifier) {
        setErrorMsg("PKCE code verifier not found. This can happen if the browser session expired or you opened the callback in a different tab. Please try again.");
        setStatus("error");
        return;
      }

      // Exchange code for token via server function
      let result;
      if (type === "social") {
        result = await base44.functions.invoke("socialOAuthCallback", {
          code,
          platform: plt,
          userEmail,
          codeVerifier,
        });
      } else if (type === "streaming") {
        result = await base44.functions.invoke("streamingOAuthCallback", {
          code,
          platform: plt,
          userEmail,
        });
      } else {
        setErrorMsg(`Unknown OAuth type: ${type}`);
        setStatus("error");
        return;
      }

      const data = result?.data;

      if (data?.needs_config) {
        setErrorMsg(data.error || "Platform credentials not configured.");
        setStatus("config_error");
        return;
      }

      if (!data?.success) {
        setErrorMsg(data?.error || "OAuth token exchange failed.");
        setStatus("error");
        return;
      }

      if (data.username) setUsername(data.username);
      setStatus("success");

      // Redirect to Integrations page after a short delay
      setTimeout(() => {
        const tab = type === "streaming" ? "streaming" : "social";
        navigate(createPageUrl("Integrations") + `?connected=${plt}&tab=${tab}`);
      }, 2000);

    } catch (err: unknown) {
      console.error("[OAuthCallback]", err);
      const msg = (err as Error).message || "Unknown error";
      setErrorMsg(msg.includes("not configured")
        ? "This platform's API credentials haven't been configured yet. Contact the app admin."
        : `Connection failed: ${msg}`
      );
      setStatus(msg.includes("not configured") ? "config_error" : "error");
    }
  };

  const platformLabel = platform
    ? platform.charAt(0).toUpperCase() + platform.slice(1).replace("_", " ")
    : "Platform";

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Loading */}
        {status === "loading" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1A1D27] border border-[#2A2D3A] flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-[#00BFFF] animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E8E8ED]">Connecting {platformLabel}…</h1>
              <p className="text-sm text-[#8B8D97] mt-1">Exchanging authorization code for access token</p>
            </div>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E8E8ED]">{platformLabel} Connected!</h1>
              {username && (
                <p className="text-sm text-[#00BFFF] mt-1">@{username}</p>
              )}
              <p className="text-sm text-[#8B8D97] mt-2">Redirecting you back to Integrations…</p>
            </div>
            <div className="w-full h-1 bg-[#2A2D3A] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 animate-[progress_2s_linear]" style={{ width: "100%" }} />
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E8E8ED]">Connection Failed</h1>
              <p className="text-sm text-[#8B8D97] mt-1">{errorMsg}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate(createPageUrl("Integrations") + "?tab=social")}
                className="bg-[#2A2D3A] text-[#E8E8ED] hover:bg-[#2A2D3A]/80"
              >
                Back to Integrations
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
                className="border-[#2A2D3A] text-[#8B8D97]"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Config Error */}
        {status === "config_error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E8E8ED]">{platformLabel} Not Configured</h1>
              <p className="text-sm text-[#8B8D97] mt-1">{errorMsg}</p>
              <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-left">
                <p className="text-xs text-amber-300 font-semibold mb-1">Admin: Set these environment secrets</p>
                <p className="text-xs text-[#8B8D97] font-mono">
                  {platform.toUpperCase()}_CLIENT_ID<br />
                  {platform.toUpperCase()}_CLIENT_SECRET
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(createPageUrl("Integrations") + "?tab=social")}
              className="bg-[#2A2D3A] text-[#E8E8ED] hover:bg-[#2A2D3A]/80"
            >
              Back to Integrations
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
