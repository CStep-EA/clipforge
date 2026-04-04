/**
 * Rate-limited wrapper for referral code redemption.
 * Limit: 20 redeem attempts per day per user (prevent spam).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 20 redeem attempts per day
    const rateLimitRes = await base44.functions.invoke('rateLimiter', {
      userEmail: user.email,
      endpoint: 'referral_redeem',
      limit: 20,
      windowMinutes: 1440, // 24 hours
    });

    if (!rateLimitRes.data.allowed) {
      const retryInHours = Math.ceil(rateLimitRes.data.retryAfterSeconds / 3600);
      console.warn(`[referralRedeemRateLimited] Rate limit blocked for ${user.email}`);
      return Response.json(
        { error: 'Too many redemption attempts. Please try again later.', retryAfterSeconds: rateLimitRes.data.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': rateLimitRes.data.retryAfterSeconds } }
      );
    }

    // Call the actual referral tracking function
    const body = await req.json();
    const result = await base44.functions.invoke('referralTracking', {
      action: 'trackReferralSignup',
      referralCode: body.referralCode,
      referredEmail: user.email,
    });

    console.log(`[referralRedeemRateLimited] Referral redemption for ${user.email}: ${body.referralCode}`);
    return Response.json(result.data);
  } catch (error) {
    console.error('[referralRedeemRateLimited] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});