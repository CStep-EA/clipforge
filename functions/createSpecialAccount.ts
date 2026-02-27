import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, full_name, account_type, tier, special_status, free_months, discount_amount, discount_months, expiration_date, notes } = body;

    if (!email || !account_type || !tier) {
      return Response.json({ error: 'Missing required fields: email, account_type, tier' }, { status: 400 });
    }

    // Check for existing special account with this email
    const existing = await base44.asServiceRole.entities.SpecialAccount.filter({ email });
    if (existing.length > 0) {
      return Response.json({ error: `A special account for ${email} already exists` }, { status: 409 });
    }

    // Create the SpecialAccount record
    const specialAccount = await base44.asServiceRole.entities.SpecialAccount.create({
      email,
      full_name: full_name || '',
      account_type,
      tier,
      special_status,
      free_months: free_months || null,
      discount_amount: discount_amount || null,
      discount_months: discount_months || null,
      expiration_date: expiration_date || null,
      notes: notes || '',
      created_by_admin: user.email,
      is_active: true,
      welcome_email_sent: false,
    });

    // Upsert a UserSubscription record so the subscription hook picks it up immediately
    const existingSubs = await base44.asServiceRole.entities.UserSubscription.filter({ user_email: email });
    const subPayload = {
      user_email: email,
      plan: tier,
      status: 'active',
      stripe_customer_id: 'exempt_special',
      stripe_subscription_id: `special_${specialAccount.id}`,
      cancel_at_period_end: false,
      current_period_end: expiration_date || null,
    };

    if (existingSubs.length > 0) {
      await base44.asServiceRole.entities.UserSubscription.update(existingSubs[0].id, subPayload);
    } else {
      await base44.asServiceRole.entities.UserSubscription.create(subPayload);
    }

    // Send welcome email
    try {
      const tierLabel = { free: 'Free', pro: 'Pro', premium: 'Premium', family: 'Family Premium' }[tier] || tier;
      const typeLabel = account_type === 'development' ? 'internal development' : 'complimentary gift';
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `🎉 Your ClipForge ${tierLabel} access is ready`,
        body: `Hi ${full_name || 'there'},\n\nYou've been granted ${typeLabel} access to ClipForge ${tierLabel}!\n\nYou can log in at any time at https://app.clipforge.com — your account is already set up and ready to use.\n\n${account_type === 'development' ? 'This is an internal development account with full feature access.' : 'Enjoy your complimentary access — no payment required!'}\n\n${notes ? `Note: ${notes}\n\n` : ''}— The ClipForge Team`,
      });

      await base44.asServiceRole.entities.SpecialAccount.update(specialAccount.id, { welcome_email_sent: true });
    } catch (emailErr) {
      console.error('Welcome email failed (non-fatal):', emailErr.message);
    }

    console.log(`[AUDIT] Special account created: ${email} | type=${account_type} | tier=${tier} | by=${user.email}`);

    return Response.json({
      success: true,
      special_account_id: specialAccount.id,
      message: `Special ${account_type} account created for ${email} with ${tier} tier.`,
    });
  } catch (error) {
    console.error('[createSpecialAccount] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});