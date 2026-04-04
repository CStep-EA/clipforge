import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

const OAUTH_CONFIGS = {
  discord: {
    client_id: Deno.env.get("DISCORD_CLIENT_ID"),
    authorize_url: "https://discord.com/api/oauth2/authorize",
    scopes: "identify guilds guilds.members.read",
  },
  twitch: {
    client_id: Deno.env.get("TWITCH_CLIENT_ID"),
    authorize_url: "https://id.twitch.tv/oauth2/authorize",
    scopes: "user:read:email user:read:follows clips:read",
  },
  youtube: {
    client_id: Deno.env.get("YOUTUBE_CLIENT_ID"),
    authorize_url: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: "https://www.googleapis.com/auth/youtube.readonly",
  },
  spotify: {
    client_id: Deno.env.get("SPOTIFY_CLIENT_ID"),
    authorize_url: "https://accounts.spotify.com/authorize",
    scopes: "user-library-read user-read-private",
  },
  apple_podcasts: {
    // Apple Podcasts uses RSS feed auth, not OAuth in traditional sense
    authorize_url: "https://podcasts.apple.com/",
    scopes: "podcast.read",
  },
};

Deno.serve(async (req) => {
  try {
    const { platform, userEmail } = await req.json();

    if (!platform || !userEmail) {
      return Response.json(
        { error: "Missing platform or userEmail" },
        { status: 400 }
      );
    }

    const config = OAUTH_CONFIGS[platform];
    if (!config) {
      return Response.json({ error: "Unknown platform" }, { status: 400 });
    }

    const appId = Deno.env.get("BASE44_APP_ID");
    const redirectUri = `${Deno.env.get("APP_BASE_URL")}/api/streaming-oauth-callback`;
    const state = btoa(JSON.stringify({ platform, userEmail, timestamp: Date.now() }));

    let authorizeUrl = `${config.authorize_url}?`;

    if (platform === "discord") {
      authorizeUrl += new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: config.scopes,
        state,
      }).toString();
    } else if (platform === "twitch") {
      authorizeUrl += new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: config.scopes,
        state,
      }).toString();
    } else if (platform === "youtube") {
      authorizeUrl += new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: config.scopes,
        state,
        access_type: "offline",
      }).toString();
    } else if (platform === "spotify") {
      authorizeUrl += new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: config.scopes,
        state,
        show_dialog: true,
      }).toString();
    }

    console.log(`OAuth init for ${platform}: ${authorizeUrl.substring(0, 50)}...`);

    return Response.json({ redirect_url: authorizeUrl });
  } catch (error) {
    console.error("OAuth init error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});