import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { googleOAuthConfig } from '@/lib/google/oauth';

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string; id_token?: string; error?: string };

export async function GET(request: NextRequest) {
  const redirect = (value: string) => NextResponse.redirect(new URL(`/settings?google=${value}`, request.url));
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  if (!state || state !== request.cookies.get('forge_google_oauth_state')?.value || !code) return redirect('invalid_state');

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const admin = createSupabaseAdminClient();
  const config = googleOAuthConfig(request.nextUrl.origin);
  if (!user || !admin || !config.configured) return redirect('needs_config');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: config.clientId!, client_secret: config.clientSecret!, redirect_uri: config.redirectUri, grant_type: 'authorization_code' }),
  });
  const tokens = await tokenResponse.json().catch(() => ({})) as TokenResponse;
  if (!tokenResponse.ok || !tokens.access_token) return redirect('token_error');

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` } });
  const profile = await profileResponse.json().catch(() => ({})) as { email?: string };
  const { data: existing } = await admin.from('google_connections').select('refresh_token').eq('user_id', user.id).maybeSingle();
  const refreshToken = tokens.refresh_token || existing?.refresh_token;
  if (!refreshToken) return redirect('missing_refresh_token');

  const expiresAt = new Date(Date.now() + Math.max(60, tokens.expires_in ?? 3600) * 1000).toISOString();
  const { error } = await admin.from('google_connections').upsert({ user_id: user.id, google_email: profile.email ?? '', access_token: tokens.access_token, refresh_token: refreshToken, expires_at: expiresAt, scopes: (tokens.scope ?? '').split(' ').filter(Boolean), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return redirect('storage_error');

  const response = redirect('connected');
  response.cookies.delete('forge_google_oauth_state');
  return response;
}
