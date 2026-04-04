/**
 * Rate-limited wrapper for friend invites.
 * Free tier: 5 invites per day
 * Pro/Premium/Family: 20 invites per day
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine limit based on plan
    const sub = await base44.asServiceRole.entities.UserSubscription.filter({ user_email: user.email }).catch(() => []);
    const plan = sub?.[0]?.plan || 'free';
    const dailyLimit = plan === 'free' ? 5 : 20;

    // Rate limit: check daily invites
    const rateLimitRes = await base44.functions.invoke('rateLimiter', {
      userEmail: user.email,
      endpoint: 'friend_invite',
      limit: dailyLimit,
      windowMinutes: 1440, // 24 hours
    });

    if (!rateLimitRes.data.allowed) {
      const retryInHours = Math.ceil(rateLimitRes.data.retryAfterSeconds / 3600);
      console.warn(`[friendInviteRateLimited] Rate limit blocked for ${user.email}`);
      return Response.json(
        { error: `You've reached your daily friend invite limit (${dailyLimit}/day). Try again later.`, retryAfterSeconds: rateLimitRes.data.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': rateLimitRes.data.retryAfterSeconds } }
      );
    }

    // Create the friend connection
    const body = await req.json();
    const { recipient_email, recipient_name } = body;

    if (!recipient_email) {
      return Response.json({ error: 'recipient_email is required' }, { status: 400 });
    }

    const connection = await base44.entities.FriendConnection.create({
      requester_email: user.email,
      recipient_email,
      recipient_name: recipient_name || recipient_email.split('@')[0],
      status: 'pending',
      source: 'manual',
    });

    console.log(`[friendInviteRateLimited] Invite sent from ${user.email} to ${recipient_email}`);
    return Response.json({ success: true, connection });
  } catch (error) {
    console.error('[friendInviteRateLimited] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});