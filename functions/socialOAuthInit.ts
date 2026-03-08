/**
 * socialOAuthInit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a PKCE-compliant OAuth 2.0 authorization URL for each social
 * platform. Returns the URL for the client to redirect to, plus the
 * code_verifier which must be stored client-side and sent back with the
 * callback to complete the PKCE exchange.
 *
 * Per-platform OAuth documentation references:
 *
 *   Instagram (Meta Login):
 *     https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 *     Scopes: instagram_business_basic,instagram_business_manage_messages
 *     Note: Requires a Meta App with Instagram Login product added.
 *           Personal accounts can use the basic display API (deprecated Jun 2025)
 *           → we use the Instagram API with Instagram Login (new as of 2024).
 *
 *   Pinterest:
 *     https://developers.pinterest.com/docs/getting-started/set-up-authentication-and-authorization/
 *     Scopes: boards:read,pins:read,user_accounts:read
 *     PKCE: optional but supported — we use it for security.
 *
 *   Twitter / X:
 *     https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
 *     Scopes: tweet.read users.read bookmark.read offline.access
 *     PKCE: REQUIRED (X API v2 OAuth 2.0 mandates PKCE)
 *     Note: bookmark.read requires Basic API tier ($100/mo) or higher.
 *           Free tier only allows tweet.read and users.read.
 *
 *   TikTok:
 *     https://developers.tiktok.com/doc/oauth-user-access-token-management
 *     Scopes: user.info.basic,video.list
 *     PKCE: REQUIRED since 2023
 *
 *   Etsy:
 *     https://developer.etsy.com/documentation/essentials/authentication
 *     Scopes: listings_r,favorites_r,profile_r
 *     PKCE: REQUIRED by Etsy Open API v3
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// ── PKCE helpers ─────────────────────────────────────────────────────────────
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ── Platform OAuth configurations ────────────────────────────────────────────
const PLATFORM_CONFIGS: Record<string, {
  authorizeUrl: string;
  clientIdEnv: string;
  scopes: string;
  scopeSeparator?: string;
  extraParams?: Record<string, string>;
  pkce: boolean;
  notes: string;
}> = {
  instagram: {
    // Instagram API with Instagram Login (replaces deprecated Basic Display API)
    authorizeUrl: "https://www.instagram.com/oauth/authorize",
    clientIdEnv: "INSTAGRAM_CLIENT_ID",
    scopes: "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages,instagram_business_manage_comments",
    scopeSeparator: ",",
    pkce: true,
    notes: "Requires Meta App with 'Instagram Login' product. Business or Creator account required for media read access.",
  },
  pinterest: {
    authorizeUrl: "https://www.pinterest.com/oauth/",
    clientIdEnv: "PINTEREST_CLIENT_ID",
    scopes: "boards:read pins:read user_accounts:read",
    scopeSeparator: " ",
    pkce: true,
    extraParams: { response_type: "code" },
    notes: "Pinterest API v5. PKCE supported. Requires Standard API access for production.",
  },
  twitter: {
    // X API v2: PKCE is MANDATORY
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    clientIdEnv: "TWITTER_CLIENT_ID",
    scopes: "tweet.read users.read bookmark.read offline.access",
    scopeSeparator: " ",
    pkce: true,
    notes: "bookmark.read requires X Basic API tier ($100/mo). Free tier cannot read bookmarks.",
  },
  tiktok: {
    // TikTok Login Kit — PKCE required since 2023
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    scopes: "user.info.basic,video.list",
    scopeSeparator: ",",
    pkce: true,
    extraParams: { response_type: "code" },
    notes: "TikTok Login Kit v2. Uses client_key (not client_id) as the app identifier.",
  },
  etsy: {
    // Etsy Open API v3 — PKCE is REQUIRED
    authorizeUrl: "https://www.etsy.com/oauth/connect",
    clientIdEnv: "ETSY_CLIENT_ID",
    scopes: "listings_r favorites_r profile_r",
    scopeSeparator: " ",
    pkce: true,
    notes: "Etsy Open API v3 requires PKCE for all OAuth flows.",
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { platform, userEmail } = await req.json();

    if (!platform || !userEmail) {
      return Response.json({ error: "Missing platform or userEmail" }, { status: 400 });
    }

    const config = PLATFORM_CONFIGS[platform];
    if (!config) {
      return Response.json({ error: `Unknown social platform: ${platform}` }, { status: 400 });
    }

    const clientId = Deno.env.get(config.clientIdEnv) || "";
    if (!clientId) {
      return Response.json({
        error: `${platform} client ID not configured. Set ${config.clientIdEnv} as an environment secret.`,
        needs_config: true,
        notes: config.notes,
      }, { status: 500 });
    }

    const appBaseUrl  = Deno.env.get("APP_BASE_URL") || "";
    const redirectUri = `${appBaseUrl}/OAuthCallback`;

    // PKCE flow
    const codeVerifier  = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Encode platform + userEmail in state so the callback knows who to attach
    const state = btoa(JSON.stringify({ platform, userEmail, type: "social", ts: Date.now() }));

    const params: Record<string, string> = {
      client_id:             clientId,
      redirect_uri:          redirectUri,
      scope:                 config.scopes,
      state,
      code_challenge:        codeChallenge,
      code_challenge_method: "S256",
      ...(config.extraParams || {}),
    };

    // TikTok uses response_type and client_key differently
    if (platform === "tiktok") {
      params["client_key"] = clientId;
      delete params["client_id"];
      params["response_type"] = "code";
    } else if (platform !== "etsy") {
      params["response_type"] = "code";
    }

    const authorizeUrl = `${config.authorizeUrl}?${new URLSearchParams(params).toString()}`;

    console.log(`[socialOAuthInit] ${platform} authorize URL generated for ${userEmail}`);

    return Response.json({
      authorize_url:  authorizeUrl,
      code_verifier:  codeVerifier,  // Client must store this for the callback exchange
      platform,
      redirect_uri:   redirectUri,
    });

  } catch (err) {
    console.error("[socialOAuthInit]", err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
