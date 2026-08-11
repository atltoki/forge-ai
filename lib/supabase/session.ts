import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './server';
import { bootstrapWorkspace } from './bootstrap';

export async function requireUserSession() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect('/auth?error=not_configured');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth');

  await bootstrapWorkspace(supabase, user);

  return { supabase, user };
}
