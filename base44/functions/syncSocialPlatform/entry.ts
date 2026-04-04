/**
 * syncSocialPlatform.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side function that uses a stored OAuth access token (retrieved from
 * the SocialConnection entity) to fetch the user's *real* saved/bookmarked
 * content from the target platform.
 *
 * Supported platforms and what they fetch:
 *   instagram  — Saved media via Graph API (/me/saved — requires business account)
 *   pinterest  — Boards + pins via Pinterest API v5
 *   twitter    — Bookmarks via Twitter API v2 (/users/:id/bookmarks)
 *   tiktok     — Liked videos via TikTok for Developers API
 *   web (etsy) — Favorite listings via Etsy Open API v3
 *
 * Facebook is NOT supported here because /me/saved was deprecated in 2018
 * and is no longer available to third-party apps.
 *
 * Returns: { imported: number, items: SavedItem[] }
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// ── Category mapping helpers ─────────────────────────────────────────────────
function guessCategoryFromTags(tags: string[] = []): string {
  const t = tags.join(" ").toLowerCase();
  if (t.match(/recipe|food|cook|eat|meal|dish/)) return "recipe";
  if (t.match(/deal|sale|discount|offer|price|buy/)) return "deal";
  if (t.match(/travel|trip|vacation|hotel|flight|destination/)) return "travel";
  if (t.match(/event|concert|show|festival|ticket/)) return "event";
  if (t.match(/gift|present|wishlist/)) return "gift_idea";
  if (t.match(/product|shop|buy|item/)) return "product";
  if (t.match(/article|news|read|blog|post/)) return "article";
  return "other";
}

// ── Platform sync handlers ───────────────────────────────────────────────────

async function syncInstagram(accessToken: string, _categoryFocus: string[]) {
  // Graph API: GET /me/saved — only works with business/creator accounts
  const resp = await fetch(
    `https://graph.instagram.com/me/saved?fields=id,media_type,caption,media_url,thumbnail_url,permalink,timestamp&access_token=${accessToken}&limit=25`,
  );
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Instagram API error: ${err?.error?.message || resp.status}`);
  }
  const data = await resp.json();
  return (data.data || []).map((m: Record<string, string>) => ({
    title: m.caption?.split("\n")[0]?.slice(0, 120) || `Instagram save ${m.id}`,
    description: m.caption?.slice(0, 300) || "",
    url: m.permalink || "",
    image_url: m.media_url || m.thumbnail_url || "",
    category: "other",
    source: "instagram",
    tags: ["instagram"],
    ai_summary: m.caption ? `Instagram post: ${m.caption.slice(0, 100)}` : "",
    rating: null,
  }));
}

async function syncPinterest(accessToken: string, _categoryFocus: string[]) {
  // Pinterest API v5: GET /v5/boards and /v5/boards/:id/pins
  const boardsResp = await fetch(
    "https://api.pinterest.com/v5/boards?page_size=10",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!boardsResp.ok) throw new Error(`Pinterest boards API error: ${boardsResp.status}`);
  const boardsData = await boardsResp.json();
  const boards = boardsData.items || [];

  const allPins: Record<string, unknown>[] = [];
  for (const board of boards.slice(0, 5)) {
    const pinsResp = await fetch(
      `https://api.pinterest.com/v5/boards/${board.id}/pins?page_size=10`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!pinsResp.ok) continue;
    const pinsData = await pinsResp.json();
    allPins.push(...(pinsData.items || []));
  }

  return allPins.map((pin: Record<string, unknown>) => {
    const media = (pin.media as Record<string, unknown>) || {};
    const images = (media.images as Record<string, Record<string, string>>) || {};
    const imageUrl = images["600x"]?.url || images["400x300"]?.url || "";
    const title = String(pin.title || pin.description || "Pinterest pin").slice(0, 120);
    const desc = String(pin.description || "").slice(0, 300);
    const tags = ((pin.hashtags as string[]) || []).slice(0, 5);
    return {
      title,
      description: desc,
      url: String(pin.link || `https://www.pinterest.com/pin/${pin.id}`),
      image_url: imageUrl,
      category: guessCategoryFromTags(tags),
      source: "pinterest",
      tags: ["pinterest", ...tags],
      ai_summary: desc ? `Pinterest pin: ${desc.slice(0, 100)}` : "",
      rating: null,
    };
  });
}

async function syncTwitter(accessToken: string, _categoryFocus: string[]) {
  // Twitter API v2: GET /2/users/me first, then /2/users/:id/bookmarks
  const meResp = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meResp.ok) throw new Error(`Twitter /me error: ${meResp.status}`);
  const me = await meResp.json();
  const userId = me.data?.id;
  if (!userId) throw new Error("Could not get Twitter user ID");

  const bmResp = await fetch(
    `https://api.twitter.com/2/users/${userId}/bookmarks?tweet.fields=text,entities,created_at,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url&max_results=25`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!bmResp.ok) throw new Error(`Twitter bookmarks error: ${bmResp.status}`);
  const bm = await bmResp.json();
  const mediaMap: Record<string, string> = {};
  for (const m of bm.includes?.media || []) {
    mediaMap[m.media_key] = m.url || m.preview_image_url || "";
  }

  return (bm.data || []).map((tweet: Record<string, unknown>) => {
    const text = String(tweet.text || "");
    const urls = ((tweet.entities as Record<string, unknown>)?.urls as Record<string, string>[] | undefined) || [];
    const firstUrl = urls.find((u) => !u.display_url?.startsWith("pic.twitter"))?.expanded_url || "";
    const mediaKey = ((tweet.attachments as Record<string, string[]>)?.media_keys || [])[0];
    return {
      title: text.slice(0, 120),
      description: text.slice(0, 300),
      url: firstUrl || `https://twitter.com/i/web/status/${tweet.id}`,
      image_url: mediaKey ? (mediaMap[mediaKey] || "") : "",
      category: guessCategoryFromTags(text.split(" ")),
      source: "twitter",
      tags: ["twitter"],
      ai_summary: `Bookmarked tweet: ${text.slice(0, 100)}`,
      rating: null,
    };
  });
}

async function syncTikTok(accessToken: string, _categoryFocus: string[]) {
  // TikTok for Developers API: GET /v2/video/list/?fields=...
  const resp = await fetch(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,cover_image_url,share_url",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20 }),
    },
  );
  if (!resp.ok) throw new Error(`TikTok API error: ${resp.status}`);
  const data = await resp.json();
  return (data.data?.videos || []).map((v: Record<string, string>) => ({
    title: v.title || v.video_description?.slice(0, 120) || `TikTok video ${v.id}`,
    description: v.video_description?.slice(0, 300) || "",
    url: v.share_url || `https://www.tiktok.com/@user/video/${v.id}`,
    image_url: v.cover_image_url || "",
    category: guessCategoryFromTags((v.video_description || "").split(" ")),
    source: "tiktok",
    tags: ["tiktok"],
    ai_summary: `TikTok video: ${(v.title || v.video_description || "").slice(0, 100)}`,
    rating: null,
  }));
}

async function syncEtsy(accessToken: string, _categoryFocus: string[]) {
  // Etsy Open API v3: GET /v3/application/users/:user_id/favorites/listings
  const meResp = await fetch("https://api.etsy.com/v3/application/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!meResp.ok) throw new Error(`Etsy /me error: ${meResp.status}`);
  const me = await meResp.json();
  const userId = me.user_id;

  const favResp = await fetch(
    `https://api.etsy.com/v3/application/users/${userId}/favorites/listings?limit=25`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!favResp.ok) throw new Error(`Etsy favorites error: ${favResp.status}`);
  const favData = await favResp.json();

  return (favData.results || []).map((item: Record<string, unknown>) => {
    const images = (item.images as Record<string, string>[] | undefined) || [];
    const imageUrl = images[0]?.url_fullxfull || images[0]?.url_570xN || "";
    return {
      title: String(item.title || "Etsy listing").slice(0, 120),
      description: String(item.description || "").slice(0, 300),
      url: String(item.url || `https://www.etsy.com/listing/${item.listing_id}`),
      image_url: imageUrl,
      category: "gift_idea",
      source: "web",
      tags: ["etsy", "gift"],
      ai_summary: `Etsy favorite: ${String(item.title || "").slice(0, 100)}. ${item.price ? `Price: ${(item.price as Record<string, string>).amount}` : ""}`,
      rating: null,
      price: item.price ? Number((item.price as Record<string, string>).amount) / 100 : null,
    };
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { platform, connectionId, categoryFocus = [] } = await req.json();

    if (!platform || !connectionId) {
      return Response.json({ error: "Missing platform or connectionId" }, { status: 400 });
    }

    // Facebook: no longer supported — guide user to browser extension
    if (platform === "facebook") {
      return Response.json({
        imported: 0,
        message: "Facebook's API no longer allows reading personal saved posts. Use the Klip4ge browser extension to save posts directly from Facebook.",
        facebook_api_deprecated: true,
      });
    }

    // Fetch the connection record (contains the stored access token)
    const connections = await base44.asServiceRole.entities.SocialConnection.filter({
      id: connectionId,
      connected: true,
    });
    if (!connections.length) {
      return Response.json({ error: "Connection not found or not connected" }, { status: 404 });
    }
    const conn = connections[0];
    const accessToken = conn.access_token;
    if (!accessToken) {
      return Response.json({
        error: "No access token stored. Please reconnect your account.",
        needs_reconnect: true,
      }, { status: 401 });
    }

    // Dispatch to platform handler
    let rawItems: Record<string, unknown>[] = [];
    try {
      switch (platform) {
        case "instagram": rawItems = await syncInstagram(accessToken, categoryFocus); break;
        case "pinterest": rawItems = await syncPinterest(accessToken, categoryFocus); break;
        case "twitter":   rawItems = await syncTwitter(accessToken, categoryFocus); break;
        case "tiktok":    rawItems = await syncTikTok(accessToken, categoryFocus); break;
        case "web":       rawItems = await syncEtsy(accessToken, categoryFocus); break;
        default:
          return Response.json({ error: `Unknown platform: ${platform}` }, { status: 400 });
      }
    } catch (platformErr) {
      const msg = (platformErr as Error).message || "Platform API error";
      console.error(`[syncSocialPlatform:${platform}] ${msg}`);
      // Check for token-expired indicators
      if (msg.includes("401") || msg.includes("Invalid token") || msg.includes("expired")) {
        return Response.json({
          error: "Access token expired. Please reconnect your account.",
          needs_reconnect: true,
          platform,
        }, { status: 401 });
      }
      return Response.json({ error: msg, platform }, { status: 502 });
    }

    if (rawItems.length === 0) {
      return Response.json({ imported: 0, message: "No new saves found on this platform." });
    }

    // Fetch existing URLs to avoid duplicates
    const existing = await base44.asServiceRole.entities.SavedItem.filter({
      source: platform,
    });
    const existingUrls = new Set(existing.map((e: Record<string, string>) => e.url).filter(Boolean));

    const newItems = rawItems
      .filter((item) => !item.url || !existingUrls.has(String(item.url)))
      .map((item) => ({
        ...item,
        title: item.title || "Imported save",
        category: item.category || "other",
        source: platform,
        created_by: user.email,
      }));

    if (newItems.length === 0) {
      return Response.json({ imported: 0, message: "All items already in your vault." });
    }

    // Bulk create (uses rate-limited import path)
    const created = await base44.asServiceRole.entities.SavedItem.bulkCreate(newItems);
    console.log(`[syncSocialPlatform:${platform}] Imported ${created.length} items for ${user.email}`);

    return Response.json({ imported: created.length, items: created });
  } catch (err) {
    console.error("[syncSocialPlatform]", err);
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
});
