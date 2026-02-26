import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { platform, userEmail } = await req.json();

    if (!platform || !userEmail) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Fetch streaming connection
    const connections = await base44.asServiceRole.entities.StreamingConnection.filter({
      platform,
      user_email: userEmail,
      connected: true,
    });

    if (!connections.length) {
      return Response.json(
        { error: `${platform} not connected` },
        { status: 400 }
      );
    }

    const connection = connections[0];

    // Check subscription for rate limits
    const subs = await base44.asServiceRole.entities.UserSubscription.filter({
      user_email: userEmail,
    });

    const subscription = subs[0];
    const isPremium = subscription?.plan === "premium" || subscription?.plan === "family";

    // Free tier: max 50 items total across all platforms this month
    if (!isPremium) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const itemsThisMonth = await base44.asServiceRole.entities.SavedItem.filter({
        created_by: userEmail,
        created_date: { $gte: monthStart.toISOString() },
      });

      if (itemsThisMonth.length >= 50) {
        return Response.json(
          { error: "Free tier: 50 items/month limit reached. Upgrade for unlimited." },
          { status: 429 }
        );
      }
    }

    // Fetch items based on platform
    let items = [];
    let itemCount = 0;

    if (platform === "discord" && connection.access_token) {
      // Fetch Discord saved messages / bookmarks
      items = await fetchDiscordItems(connection.access_token);
      itemCount = items.length;
    } else if (platform === "twitch" && connection.access_token) {
      // Fetch Twitch bookmarked streams and clips
      items = await fetchTwitchItems(connection.access_token);
      itemCount = items.length;
    } else if (platform === "youtube" && connection.access_token) {
      // Fetch YouTube watch later, likes, subscriptions
      items = await fetchYouTubeItems(connection.access_token);
      itemCount = items.length;
    } else if (platform === "spotify" && connection.access_token) {
      // Fetch Spotify saved tracks and playlists
      items = await fetchSpotifyItems(connection.access_token);
      itemCount = items.length;
    } else if (platform === "apple_podcasts") {
      // Apple Podcasts - RSS-based, less strict auth
      items = await fetchApplePodsItems(connection.platform_user_id);
      itemCount = items.length;
    }

    // Create SavedItems in bulk
    if (items.length > 0) {
      await base44.asServiceRole.entities.SavedItem.bulkCreate(items);
      console.log(`Synced ${itemCount} items from ${platform}`);
    }

    // Update connection metadata
    await base44.asServiceRole.entities.StreamingConnection.update(connection.id, {
      last_synced: new Date().toISOString(),
      sync_count: (connection.sync_count || 0) + 1,
      items_this_month: (connection.items_this_month || 0) + itemCount,
    });

    return Response.json({
      success: true,
      platform,
      itemsCreated: itemCount,
    });
  } catch (error) {
    console.error("Streaming fetch error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchDiscordItems(accessToken) {
  // Mock: In production, would call Discord API
  // GET https://discord.com/api/v10/users/@me/guilds
  return [];
}

async function fetchTwitchItems(accessToken) {
  // Mock: In production, would call Twitch API
  // GET https://api.twitch.tv/helix/users/follows?user_id=USER_ID
  return [];
}

async function fetchYouTubeItems(accessToken) {
  // Mock: In production, would call YouTube API
  // GET https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true
  return [];
}

async function fetchSpotifyItems(accessToken) {
  // Mock: In production, would call Spotify API
  // GET https://api.spotify.com/v1/me/tracks
  return [];
}

async function fetchApplePodsItems(userId) {
  // Mock: In production, would fetch Apple Podcasts RSS
  return [];
}