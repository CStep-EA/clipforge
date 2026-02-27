import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { platform, itemId } = await req.json();

    if (!platform || !itemId) {
      return Response.json({ error: "Missing platform or itemId" }, { status: 400 });
    }

    // Fetch the saved item
    const allItems = await base44.asServiceRole.entities.SavedItem.list();
    const item = allItems.find(i => i.id === itemId && i.created_by === user.email);
    if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

    // Fetch the connection
    const connections = await base44.asServiceRole.entities.StreamingConnection.filter({
      platform,
      user_email: user.email,
      connected: true,
    });

    if (!connections.length) {
      return Response.json({ error: `${platform} not connected` }, { status: 400 });
    }

    const connection = connections[0];
    const message = `📎 ClipForge Save: **${item.title}**${item.url ? `\n${item.url}` : ""}${item.description ? `\n> ${item.description.slice(0, 200)}` : ""}`;

    if (platform === "discord" && connection.access_token && connection.selected_channel) {
      const res = await fetch(`https://discord.com/api/v10/channels/${connection.selected_channel}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: message }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[streamingShareItem] Discord post failed:", err);
        return Response.json({ error: "Failed to post to Discord channel" }, { status: 500 });
      }
    } else if (platform === "discord") {
      return Response.json({ error: "No Discord channel selected. Configure a channel in your Discord connection settings." }, { status: 400 });
    }

    console.log(`[streamingShareItem] Shared item ${itemId} to ${platform} for ${user.email}`);
    return Response.json({ success: true, platform, itemId });
  } catch (error) {
    console.error("[streamingShareItem] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});