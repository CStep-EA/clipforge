import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { platform, userEmail } = await req.json();

    if (!platform || !userEmail) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    const connections = await base44.asServiceRole.entities.StreamingConnection.filter({
      platform,
      user_email: userEmail,
      connected: true,
    });

    if (!connections.length) {
      return Response.json({ error: `${platform} not connected` }, { status: 400 });
    }

    const connection = connections[0];

    // Check subscription for rate limits
    const subs = await base44.asServiceRole.entities.UserSubscription.filter({ user_email: userEmail });
    const specialAccounts = await base44.asServiceRole.entities.SpecialAccount.filter({ email: userEmail, is_active: true });
    const isPremium = subs[0]?.plan === "premium" || subs[0]?.plan === "family" || specialAccounts.length > 0;

    if (!isPremium) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const allItems = await base44.asServiceRole.entities.SavedItem.list();
      const myItems = allItems.filter(i => i.created_by === userEmail && new Date(i.created_date) >= monthStart);
      if (myItems.length >= 50) {
        return Response.json({ error: "Free tier: 50 items/month limit reached. Upgrade for unlimited." }, { status: 429 });
      }
    }

    let items = [];

    if (platform === "discord" && connection.access_token) {
      items = await fetchDiscordItems(connection.access_token, userEmail);
    } else if (platform === "twitch" && connection.access_token) {
      items = await fetchTwitchItems(connection.access_token, userEmail);
    } else if (platform === "youtube" && connection.access_token) {
      items = await fetchYouTubeItems(connection.access_token, userEmail);
    } else if (platform === "spotify" && connection.access_token) {
      items = await fetchSpotifyItems(connection.access_token, userEmail);
    } else if (platform === "apple_podcasts") {
      items = await fetchApplePodcastItems(connection.platform_user_id, userEmail);
    }

    if (items.length > 0) {
      await base44.asServiceRole.entities.SavedItem.bulkCreate(items);
      console.log(`[streamingFetchItems] Synced ${items.length} items from ${platform} for ${userEmail}`);
    }

    await base44.asServiceRole.entities.StreamingConnection.update(connection.id, {
      last_synced: new Date().toISOString(),
      sync_count: (connection.sync_count || 0) + 1,
      items_this_month: (connection.items_this_month || 0) + items.length,
    });

    return Response.json({ success: true, platform, itemsCreated: items.length });
  } catch (error) {
    console.error("[streamingFetchItems] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchDiscordItems(accessToken, userEmail) {
  const items = [];
  try {
    // Fetch user's guilds
    const guildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!guildsRes.ok) throw new Error(`Discord guilds fetch failed: ${guildsRes.status}`);
    const guilds = await guildsRes.json();

    for (const guild of (guilds || []).slice(0, 5)) {
      items.push({
        title: `Discord: ${guild.name}`,
        description: `Discord server — ${guild.id}`,
        url: `https://discord.com/channels/${guild.id}`,
        category: "stream",
        source: "discord",
        tags: ["discord", "server"],
        created_by: userEmail,
        platform_item_id: guild.id,
        platform_author: guild.owner ? "Owner" : "Member",
      });
    }
  } catch (e) {
    console.error("[fetchDiscordItems]", e.message);
  }
  return items;
}

async function fetchTwitchItems(accessToken, userEmail) {
  const items = [];
  try {
    const clientId = Deno.env.get("TWITCH_CLIENT_ID");
    // Get user info
    const userRes = await fetch("https://api.twitch.tv/helix/users", {
      headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": clientId },
    });
    if (!userRes.ok) throw new Error(`Twitch user fetch failed: ${userRes.status}`);
    const userData = await userRes.json();
    const userId = userData.data?.[0]?.id;
    if (!userId) return items;

    // Fetch followed channels
    const followsRes = await fetch(`https://api.twitch.tv/helix/channels/followed?user_id=${userId}&first=20`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": clientId },
    });
    if (followsRes.ok) {
      const follows = await followsRes.json();
      for (const ch of (follows.data || [])) {
        items.push({
          title: `Twitch: ${ch.broadcaster_name}`,
          description: `Followed Twitch channel`,
          url: `https://twitch.tv/${ch.broadcaster_login}`,
          category: "stream",
          source: "twitch",
          tags: ["twitch", "stream"],
          created_by: userEmail,
          platform_item_id: ch.broadcaster_id,
          platform_author: ch.broadcaster_name,
        });
      }
    }

    // Fetch clips
    const clipsRes = await fetch(`https://api.twitch.tv/helix/clips?broadcaster_id=${userId}&first=10`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Client-Id": clientId },
    });
    if (clipsRes.ok) {
      const clips = await clipsRes.json();
      for (const clip of (clips.data || [])) {
        items.push({
          title: clip.title || `Clip by ${clip.creator_name}`,
          description: `Twitch clip from ${clip.broadcaster_name}`,
          url: clip.url,
          image_url: clip.thumbnail_url,
          category: "stream",
          source: "twitch",
          tags: ["twitch", "clip"],
          created_by: userEmail,
          platform_item_id: clip.id,
          platform_author: clip.creator_name,
        });
      }
    }
  } catch (e) {
    console.error("[fetchTwitchItems]", e.message);
  }
  return items;
}

async function fetchYouTubeItems(accessToken, userEmail) {
  const items = [];
  try {
    // Fetch liked videos playlist
    const likedRes = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=20", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (likedRes.ok) {
      const liked = await likedRes.json();
      for (const v of (liked.items || [])) {
        items.push({
          title: v.snippet?.title || "YouTube Video",
          description: v.snippet?.description?.slice(0, 200) || "",
          url: `https://www.youtube.com/watch?v=${v.id}`,
          image_url: v.snippet?.thumbnails?.medium?.url,
          category: "video",
          source: "youtube",
          tags: ["youtube", "liked"],
          created_by: userEmail,
          platform_item_id: v.id,
          platform_author: v.snippet?.channelTitle,
        });
      }
    }

    // Fetch Watch Later (playlist)
    const playlistRes = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=WL&maxResults=20", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (playlistRes.ok) {
      const playlist = await playlistRes.json();
      for (const v of (playlist.items || [])) {
        const vidId = v.snippet?.resourceId?.videoId;
        items.push({
          title: v.snippet?.title || "YouTube Watch Later",
          description: v.snippet?.description?.slice(0, 200) || "",
          url: `https://www.youtube.com/watch?v=${vidId}`,
          image_url: v.snippet?.thumbnails?.medium?.url,
          category: "video",
          source: "youtube",
          tags: ["youtube", "watch_later"],
          created_by: userEmail,
          platform_item_id: vidId,
          platform_author: v.snippet?.videoOwnerChannelTitle,
        });
      }
    }
  } catch (e) {
    console.error("[fetchYouTubeItems]", e.message);
  }
  return items;
}

async function fetchSpotifyItems(accessToken, userEmail) {
  const items = [];
  try {
    // Fetch saved tracks
    const tracksRes = await fetch("https://api.spotify.com/v1/me/tracks?limit=20", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (tracksRes.ok) {
      const tracks = await tracksRes.json();
      for (const item of (tracks.items || [])) {
        const t = item.track;
        items.push({
          title: `${t.name} — ${t.artists?.[0]?.name || ""}`,
          description: `Album: ${t.album?.name || ""}`,
          url: t.external_urls?.spotify,
          image_url: t.album?.images?.[0]?.url,
          category: "podcast",
          source: "spotify",
          tags: ["spotify", "track"],
          created_by: userEmail,
          platform_item_id: t.id,
          platform_author: t.artists?.[0]?.name,
        });
      }
    }

    // Fetch saved podcast shows
    const showsRes = await fetch("https://api.spotify.com/v1/me/shows?limit=20", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (showsRes.ok) {
      const shows = await showsRes.json();
      for (const item of (shows.items || [])) {
        const s = item.show;
        items.push({
          title: s.name,
          description: s.description?.slice(0, 200) || "",
          url: s.external_urls?.spotify,
          image_url: s.images?.[0]?.url,
          category: "podcast",
          source: "spotify",
          tags: ["spotify", "podcast"],
          created_by: userEmail,
          platform_item_id: s.id,
          platform_author: s.publisher,
        });
      }
    }
  } catch (e) {
    console.error("[fetchSpotifyItems]", e.message);
  }
  return items;
}

async function fetchApplePodcastItems(userId, userEmail) {
  // Apple Podcasts doesn't have a public API; return empty with informative log
  console.log("[fetchApplePodcastItems] Apple Podcasts requires RSS integration — no public API available");
  return [];
}