import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function verify(payload: string, signature: string, secret: string) {
  const parts = signature.split(',').map((part) => part.split('='));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return signatures.some((candidate) => candidate.length === expected.length && timingSafeEqual(Buffer.from(candidate), Buffer.from(expected)));
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();
  if (!secret || !signature || !verify(payload, signature, secret)) return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  const event = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } };
  const object = event.data.object;
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Stockage indisponible' }, { status: 503 });
  if (event.type === 'checkout.session.completed') {
    const details = object.customer_details as { email?: string } | null;
    const email = details?.email || String(object.customer_email || '');
    const { data: profile } = await admin.from('users').select('id').eq('email', email).maybeSingle();
    if (profile) await admin.from('customer_subscriptions').upsert({ user_id: profile.id, stripe_customer_id: String(object.customer || ''), stripe_subscription_id: String(object.subscription || ''), status: 'active', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  }
  if (event.type.startsWith('customer.subscription.')) {
    const subscriptionId = String(object.id || '');
    const status = String(object.status || 'inactive');
    const periodEnd = typeof object.current_period_end === 'number' ? new Date(object.current_period_end * 1000).toISOString() : null;
    await admin.from('customer_subscriptions').update({ status, current_period_end: periodEnd, updated_at: new Date().toISOString() }).eq('stripe_subscription_id', subscriptionId);
  }
  return NextResponse.json({ received: true });
}
