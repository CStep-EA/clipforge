/**
 * streamingOAuthCallback.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the OAuth 2.0 authorization code → access token exchange for all
 * streaming platforms (Discord, Twitch, YouTube, Spotify).
 *
 * Flow:
 *   1. User is redirected back to ${APP_BASE_URL}/OAuthCallback?code=...&state=...
 *   2. The OAuthCallback.jsx page strips query params and POSTs them here.
 *   3. This function exchanges the code for an access token.
 *   4. Access token is stored in StreamingConnection entity (server-side only).
 *   5. Returns { success: true, platform } to the callback page.
 *
 * Redirect URI registered with each provider must be:
 *   ${APP_BASE_URL}/OAuthCallback
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const TOKEN_ENDPOINTS: Record<string, string> = {
  discord: "https://discord.com/api/oauth2/token",
  twitch:  "https://id.twitch.tv/oauth2/token",
  youtube: "https://oauth2.googleapis.com/token",
  spotify: "https://accounts.spotify.com/api/token",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { code, platform, userEmail } = await req.json();

    if (!code || !platform || !userEmail) {
      return Response.json({ error: "Missing code, platform, or userEmail" }, { status: 400 });
    }

    const tokenUrl = TOKEN_ENDPOINTS[platform];
    if (!tokenUrl) {
      return Response.json({ error: `No token endpoint for platform: ${platform}` }, { status: 400 });
    }

    const clientId     = Deno.env.get(`${platform.toUpperCase()}_CLIENT_ID`)     || "";
    const clientSecret = Deno.env.get(`${platform.toUpperCase()}_CLIENT_SECRET`)  || "";
    const redirectUri  = `${Deno.env.get("APP_BASE_URL")}/OAuthCallback`;

    if (!clientId || !clientSecret) {
      return Response.json({
        error: `${platform} client credentials not configured. Set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET as environment secrets.`,
        needs_config: true,
      }, { status: 500 });
    }

    // Exchange auth code for access token
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Spotify requires Basic auth header
        ...(platform === "spotify"
          ? { Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`) }
          : {}),
      },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error(`[streamingOAuthCallback:${platform}] Token exchange failed:`, err);
      return Response.json({ error: `Token exchange failed: ${err}` }, { status: 502 });
    }

    const tokens = await tokenRes.json();
    const accessToken  = tokens.access_token;
    const refreshToken = tokens.refresh_token || null;
    const expiresIn    = tokens.expires_in    || 3600;

    if (!accessToken) {
      return Response.json({ error: "No access_token in provider response" }, { status: 502 });
    }

    // Store (or update) the StreamingConnection with the real token
    const existing = await base44.asServiceRole.entities.StreamingConnection.filter({
      platform,
      user_email: userEmail,
    });

    const tokenData = {
      platform,
      user_email:     userEmail,
      connected:      true,
      access_token:   accessToken,
      refresh_token:  refreshToken,
      token_expires:  new Date(Date.now() + expiresIn * 1000).toISOString(),
      last_synced:    new Date().toISOString(),
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.StreamingConnection.update(existing[0].id, tokenData);
    } else {
      await base44.asServiceRole.entities.StreamingConnection.create(tokenData);
    }

    console.log(`[streamingOAuthCallback] ${platform} connected for ${userEmail}`);
    return Response.json({ success: true, platform });

  } catch (err) {
    console.error("[streamingOAuthCallback]", err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
