import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { itemId, platform, userEmail, discordChannelId } = await req.json();

    if (!itemId || !platform || !userEmail) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Fetch the saved item
    const item = await base44.asServiceRole.entities.SavedItem.filter({ id: itemId });
    if (!item.length) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const savedItem = item[0];

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

    let result = {};

    if (platform === "discord" && connection.access_token) {
      // Post embed to Discord channel
      result = await shareToDiscord(
        connection.access_token,
        discordChannelId,
        savedItem
      );
    } else if (platform === "youtube" && connection.access_token) {
      // Post community post to YouTube
      result = await shareToYouTube(connection.access_token, savedItem);
    } else {
      return Response.json(
        { error: `Sharing to ${platform} not yet implemented` },
        { status: 400 }
      );
    }

    console.log(`Shared item to ${platform}:`, result);
    return Response.json({ success: true, platform, result });
  } catch (error) {
    console.error("Streaming share error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function shareToDiscord(accessToken, channelId, item) {
  // Mock: In production, would POST to Discord webhook or API
  // POST https://discord.com/api/v10/channels/{channel_id}/messages
  const embed = {
    title: item.title,
    description: item.description || item.ai_summary,
    url: item.url,
    image: item.image_url ? { url: item.image_url } : undefined,
    color: 0x00bfff, // Neon blue
    fields: [
      {
        name: "Category",
        value: item.category,
        inline: true,
      },
      {
        name: "Rating",
        value: `${item.rating || 0}/10`,
        inline: true,
      },
    ],
  };

  console.log("Would post Discord embed:", embed);
  return { channel_id: channelId, embed };
}

async function shareToYouTube(accessToken, item) {
  // Mock: In production, would POST to YouTube Community API
  // POST https://www.googleapis.com/youtube/v3/community/search
  const post = {
    snippet: {
      displayString: `📌 ${item.title}`,
      description: item.ai_summary || item.description,
    },
  };

  console.log("Would post YouTube community:", post);
  return { community_post: post };
}