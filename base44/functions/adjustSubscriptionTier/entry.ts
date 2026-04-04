import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { target_email, new_tier, reason } = body;

    if (!target_email || !new_tier) {
      return Response.json({ error: 'Missing required fields: target_email, new_tier' }, { status: 400 });
    }

    const validTiers = ['free', 'pro', 'premium', 'family'];
    if (!validTiers.includes(new_tier)) {
      return Response.json({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` }, { status: 400 });
    }

    // Upsert UserSubscription
    const existingSubs = await base44.asServiceRole.entities.UserSubscription.filter({ user_email: target_email });
    const subPayload = {
      user_email: target_email,
      plan: new_tier,
      status: 'active',
      stripe_customer_id: 'admin_adjusted',
      stripe_subscription_id: `admin_adjust_${Date.now()}`,
      cancel_at_period_end: false,
    };

    let subId;
    if (existingSubs.length > 0) {
      await base44.asServiceRole.entities.UserSubscription.update(existingSubs[0].id, subPayload);
      subId = existingSubs[0].id;
    } else {
      const created = await base44.asServiceRole.entities.UserSubscription.create(subPayload);
      subId = created.id;
    }

    // Also update SpecialAccount record if one exists
    const specialAccounts = await base44.asServiceRole.entities.SpecialAccount.filter({ email: target_email });
    if (specialAccounts.length > 0) {
      await base44.asServiceRole.entities.SpecialAccount.update(specialAccounts[0].id, { tier: new_tier });
    }

    console.log(`[AUDIT] Tier adjusted: ${target_email} → ${new_tier} | by=${user.email} | reason=${reason || 'none'}`);

    return Response.json({
      success: true,
      subscription_id: subId,
      message: `Tier for ${target_email} set to ${new_tier}.`,
    });
  } catch (error) {
    console.error('[adjustSubscriptionTier] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});