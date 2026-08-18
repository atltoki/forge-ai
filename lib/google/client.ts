import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { googleOAuthConfig } from './oauth';

type GoogleConnection = { access_token: string; refresh_token: string; expires_at: string; google_email: string };

export async function getGoogleAccess(userId: string, origin: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error('Supabase administrateur indisponible');
  const { data, error } = await admin.from('google_connections').select('access_token,refresh_token,expires_at,google_email').eq('user_id', userId).maybeSingle<GoogleConnection>();
  if (error || !data) throw new Error('Google n’est pas connecté');
  if (new Date(data.expires_at).getTime() > Date.now() + 60_000) return { token: data.access_token, email: data.google_email, admin };

  const config = googleOAuthConfig(origin);
  if (!config.configured) throw new Error('OAuth Google n’est pas configuré');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: config.clientId!, client_secret: config.clientSecret!, refresh_token: data.refresh_token, grant_type: 'refresh_token' }), cache: 'no-store' });
  const refreshed = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !refreshed.access_token) throw new Error(refreshed.error_description ?? 'La connexion Google doit être renouvelée');
  await admin.from('google_connections').update({ access_token: refreshed.access_token, expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userId);
  return { token: refreshed.access_token, email: data.google_email, admin };
}

export async function googleJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
  const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `Google a répondu ${response.status}`);
  return payload;
}
