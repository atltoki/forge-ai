import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const defaults = { enabled: false, monthly_goal: 3000, offer_name: 'ATLYN Autopilote', offer_price: 89, ideal_customer: 'Indépendant B2B francophone vendant une prestation à forte valeur et souhaitant déléguer sa prospection', markets: ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Canada francophone'], daily_prospect_limit: 5, require_approval: true };

async function context() { const supabase = await createSupabaseServerClient(); if (!supabase) return null; const { data: { user } } = await supabase.auth.getUser(); return user ? { supabase, user } : null; }

export async function GET() {
  const ctx = await context(); if (!ctx) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  const { data, error } = await ctx.supabase.from('autopilot_settings').select('*').eq('user_id', ctx.user.id).maybeSingle();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data: data ?? defaults });
}

export async function PUT(request: NextRequest) {
  const ctx = await context(); if (!ctx) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const settings = { user_id: ctx.user.id, enabled: Boolean(body.enabled), monthly_goal: Math.max(100, Number(body.monthly_goal) || defaults.monthly_goal), offer_name: String(body.offer_name || defaults.offer_name).slice(0, 120), offer_price: Math.max(1, Number(body.offer_price) || defaults.offer_price), ideal_customer: String(body.ideal_customer || defaults.ideal_customer).slice(0, 600), markets: Array.isArray(body.markets) ? body.markets.map(String).slice(0, 12) : defaults.markets, daily_prospect_limit: Math.min(100, Math.max(1, Number(body.daily_prospect_limit) || 5)), require_approval: true, updated_at: new Date().toISOString() };
  const { data, error } = await ctx.supabase.from('autopilot_settings').upsert(settings, { onConflict: 'user_id' }).select('*').single();
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}
