import { NextResponse } from 'next/server';
import { missions } from '@/lib/data';
import { createSupabaseServerClient } from '@/lib/supabase/server';
export async function GET() { const supabase = await createSupabaseServerClient(); if (!supabase) return NextResponse.json({ source: 'demo', data: missions }); const { data, error } = await supabase.from('missions').select('*').order('created_at', { ascending: false }); return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ source: 'supabase', data }); }
