import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ configured: false, user: null });
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return NextResponse.json({ configured: true, user: null });
  }

  return NextResponse.json({ configured: true, user: data.user });
}
