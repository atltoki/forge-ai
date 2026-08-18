import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { googleOAuthConfig } from '@/lib/google/oauth';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const configured = googleOAuthConfig(request.nextUrl.origin).configured;
  if (!user) return NextResponse.json({ configured, connected: false, authenticated: false });
  const admin = createSupabaseAdminClient();
  const { data } = admin ? await admin.from('google_connections').select('google_email,scopes,updated_at').eq('user_id', user.id).maybeSingle() : { data: null };
  return NextResponse.json({ configured, connected: Boolean(data), authenticated: true, email: data?.google_email ?? null, scopes: data?.scopes ?? [], updatedAt: data?.updated_at ?? null });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Google storage is not configured' }, { status: 503 });
  const { data } = await admin.from('google_connections').select('access_token').eq('user_id', user.id).maybeSingle();
  if (data?.access_token) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(data.access_token)}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' } }).catch(() => null);
  const { error } = await admin.from('google_connections').delete().eq('user_id', user.id);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ connected: false });
}
