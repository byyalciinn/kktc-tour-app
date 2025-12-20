// Supabase Edge Function: revenuecat-webhook
// Handles RevenueCat webhooks and syncs membership state to profiles.
//
// Deploy with:
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// Required secrets:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   REVENUECAT_WEBHOOK_SECRET (optional but recommended)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RevenueCatEvent = {
  id?: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_id?: string;
  entitlement_ids?: string[];
  expiration_at_ms?: number | null;
  environment?: string;
};

type RevenueCatPayload = {
  api_version?: string;
  event: RevenueCatEvent;
};

const removalEvents = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'REFUND',
]);

const productToMemberClass: Record<string, 'Gold' | 'Business'> = {
  gold_monthly: 'Gold',
  gold_yearly: 'Gold',
  business_monthly: 'Business',
};

const deriveMembershipUpdate = (event: RevenueCatEvent) => {
  const entitlementIds = event.entitlement_ids
    ?? (event.entitlement_id ? [event.entitlement_id] : []);
  const hasBusiness = entitlementIds.includes('business');
  const hasGold = entitlementIds.includes('gold');

  let memberClass: 'Normal' | 'Gold' | 'Business' | null = null;
  let expiresAt: string | null = null;

  if (hasBusiness) {
    memberClass = 'Business';
  } else if (hasGold) {
    memberClass = 'Gold';
  } else if (event.product_id && productToMemberClass[event.product_id]) {
    // Fallback for StoreKit test events that do not include entitlement_ids.
    memberClass = productToMemberClass[event.product_id];
  } else if (removalEvents.has(event.type)) {
    memberClass = 'Normal';
  }

  if (event.expiration_at_ms) {
    expiresAt = new Date(event.expiration_at_ms).toISOString();
  }

  if (memberClass === 'Normal') {
    expiresAt = null;
  }

  return { entitlementIds, memberClass, expiresAt };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (webhookSecret) {
    const authHeader = req.headers.get('authorization') ?? '';
    const provided = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;
    if (provided !== webhookSecret) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }
  }

  let payload: RevenueCatPayload;
  try {
    payload = await req.json();
  } catch (_error) {
    return new Response('Invalid JSON payload', { status: 400, headers: corsHeaders });
  }

  if (!payload?.event) {
    return new Response('Missing event', { status: 400, headers: corsHeaders });
  }

  const event = payload.event;
  if (!event.app_user_id) {
    return new Response('Missing app_user_id', { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response('Server configuration error', { status: 500, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { entitlementIds, memberClass, expiresAt } = deriveMembershipUpdate(event);

  await supabaseAdmin
    .from('revenuecat_events')
    .upsert({
      event_id: event.id ?? null,
      app_user_id: event.app_user_id,
      event_type: event.type,
      entitlement_ids: entitlementIds,
      product_id: event.product_id ?? null,
      environment: event.environment ?? null,
      raw_event: payload,
    }, { onConflict: 'event_id' });

  if (memberClass) {
    const updatePayload: Record<string, string | null> = {
      member_class: memberClass,
      membership_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', event.app_user_id);

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
