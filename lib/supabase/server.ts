import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Server-only client. It remains undefined until the Supabase environment variables are set. */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
}
