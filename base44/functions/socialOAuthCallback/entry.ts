/**
 * socialOAuthCallback.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Completes the OAuth 2.0 PKCE code exchange for social platforms.
 * Called by OAuthCallback.jsx after the user returns from the provider.
 *
 * Token endpoint references:
 *   Instagram:  POST https://api.instagram.com/oauth/access_token  (short-lived)
 *               then GET https://graph.instagram.com/access_token  (long-lived exchange)
 *   Pinterest:  POST https://api.pinterest.com/v5/oauth/token
 *   Twitter/X:  POST https://api.twitter.com/2/oauth2/token
 *   TikTok:     POST https://open.tiktokapis.com/v2/oauth/token/
 *   Etsy:       POST https://api.etsy.com/v3/public/oauth/token
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

interface TokenConfig {
  tokenUrl:      string;
  clientIdEnv:   string;
  clientSecretEnv: string;
  authHeader?:   boolean;  // true = use Basic auth header instead of body params
  extraFields?:  Record<string, string>;
}

const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  instagram: {
    tokenUrl:       "https://api.instagram.com/oauth/access_token",
    clientIdEnv:    "INSTAGRAM_CLIENT_ID",
    clientSecretEnv: "INSTAGRAM_CLIENT_SECRET",
  },
  pinterest: {
    tokenUrl:       "https://api.pinterest.com/v5/oauth/token",
    clientIdEnv:    "PINTEREST_CLIENT_ID",
    clientSecretEnv: "PINTEREST_CLIENT_SECRET",
    authHeader:     true,
  },
  twitter: {
    tokenUrl:       "https://api.twitter.com/2/oauth2/token",
    clientIdEnv:    "TWITTER_CLIENT_ID",
    clientSecretEnv: "TWITTER_CLIENT_SECRET",
    authHeader:     true,
  },
  tiktok: {
    tokenUrl:       "https://open.tiktokapis.com/v2/oauth/token/",
    clientIdEnv:    "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  },
  etsy: {
    tokenUrl:       "https://api.etsy.com/v3/public/oauth/token",
    clientIdEnv:    "ETSY_CLIENT_ID",
    clientSecretEnv: "ETSY_CLIENT_SECRET",
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { code, platform, userEmail, codeVerifier } = await req.json();

    if (!code || !platform || !userEmail || !codeVerifier) {
      return Response.json({ error: "Missing required fields: code, platform, userEmail, codeVerifier" }, { status: 400 });
    }

    const config = TOKEN_CONFIGS[platform];
    if (!config) {
      return Response.json({ error: `Unknown social platform: ${platform}` }, { status: 400 });
    }

    const clientId     = Deno.env.get(config.clientIdEnv)     || "";
    const clientSecret = Deno.env.get(config.clientSecretEnv) || "";
    const redirectUri  = `${Deno.env.get("APP_BASE_URL")}/OAuthCallback`;

    if (!clientId || !clientSecret) {
      return Response.json({
        error: `${platform} credentials not configured. Set ${config.clientIdEnv} and ${config.clientSecretEnv} as environment secrets.`,
        needs_config: true,
      }, { status: 500 });
    }

    // Build token exchange body
    const body = new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  redirectUri,
      code_verifier: codeVerifier,
      ...(config.authHeader ? {} : { client_id: clientId, client_secret: clientSecret }),
    });

    // TikTok uses client_key
    if (platform === "tiktok") {
      body.set("client_key", clientId);
      body.set("client_secret", clientSecret);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (config.authHeader) {
      headers["Authorization"] = "Basic " + btoa(`${clientId}:${clientSecret}`);
    }

    const tokenRes = await fetch(config.tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`[socialOAuthCallback:${platform}] token exchange failed ${tokenRes.status}:`, errText);
      return Response.json({
        error: `${platform} token exchange failed (${tokenRes.status}): ${errText}`,
        platform,
      }, { status: 502 });
    }

    const tokens = await tokenRes.json();
    let accessToken  = tokens.access_token;
    const refreshToken = tokens.refresh_token || null;
    const expiresIn    = tokens.expires_in    || 3600;

    if (!accessToken) {
      return Response.json({ error: "No access_token in provider response", raw: tokens }, { status: 502 });
    }

    // Instagram: short-lived token must be exchanged for a long-lived token
    if (platform === "instagram") {
      const llRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${accessToken}`,
      );
      if (llRes.ok) {
        const llData = await llRes.json();
        if (llData.access_token) accessToken = llData.access_token;
      }
    }

    // Fetch platform username to display in UI
    let platformUsername = "";
    try {
      if (platform === "instagram") {
        const meRes = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${accessToken}`);
        if (meRes.ok) { const me = await meRes.json(); platformUsername = me.username || ""; }
      } else if (platform === "pinterest") {
        const meRes = await fetch("https://api.pinterest.com/v5/user_account", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) { const me = await meRes.json(); platformUsername = me.username || ""; }
      } else if (platform === "twitter") {
        const meRes = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) { const me = await meRes.json(); platformUsername = me.data?.username || ""; }
      } else if (platform === "tiktok") {
        const meRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) { const me = await meRes.json(); platformUsername = me.data?.user?.display_name || ""; }
      } else if (platform === "etsy") {
        const meRes = await fetch("https://api.etsy.com/v3/application/users/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) { const me = await meRes.json(); platformUsername = me.login_name || ""; }
      }
    } catch (e) {
      console.warn(`[socialOAuthCallback] Could not fetch username for ${platform}:`, e);
    }

    // Store the real access token in SocialConnection (server-side only)
    const existing = await base44.asServiceRole.entities.SocialConnection.filter({
      platform,
      user_email: userEmail,
    });

    const connectionData = {
      platform,
      user_email:     userEmail,
      connected:      true,
      confirmed:      true,
      access_token:   accessToken,
      refresh_token:  refreshToken,
      token_expires:  new Date(Date.now() + expiresIn * 1000).toISOString(),
      last_synced:    new Date().toISOString(),
      username:       platformUsername,
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.SocialConnection.update(existing[0].id, connectionData);
    } else {
      await base44.asServiceRole.entities.SocialConnection.create(connectionData);
    }

    console.log(`[socialOAuthCallback] ${platform} connected for ${userEmail} (@${platformUsername})`);

    return Response.json({
      success:  true,
      platform,
      username: platformUsername,
    });

  } catch (err) {
    console.error("[socialOAuthCallback]", err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
