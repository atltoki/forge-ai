import { NextRequest, NextResponse } from 'next/server';
import { buildOutreachSequence, outreachStatuses } from '@/lib/domain/outreach';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function authenticatedClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 }) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  return { supabase, user };
}

export async function GET() {
  const context = await authenticatedClient();
  if ('error' in context) return context.error;
  const { data, error } = await context.supabase.from('outreach_messages').select('*, prospects!inner(id,company_name,contact_name,email,score,status,mission_id)').eq('user_id', context.user.id).in('status', ['draft', 'approved']).order('scheduled_at');
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const context = await authenticatedClient();
  if ('error' in context) return context.error;
  const body = await request.json().catch(() => null) as { prospectId?: unknown } | null;
  if (typeof body?.prospectId !== 'string') return NextResponse.json({ error: 'Prospect identifier is required' }, { status: 400 });

  const { data: prospect, error: prospectError } = await context.supabase.from('prospects').select('*').eq('id', body.prospectId).eq('user_id', context.user.id).single();
  if (prospectError || !prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  if (!prospect.email) return NextResponse.json({ error: 'Ajoutez une adresse e-mail avant de préparer la séquence.' }, { status: 422 });

  const drafts = buildOutreachSequence({
    companyName: prospect.company_name,
    contactName: prospect.contact_name,
    activity: prospect.activity,
    city: prospect.city,
    qualification: prospect.qualification,
  }).map((draft) => ({
    user_id: context.user.id,
    prospect_id: prospect.id,
    step: draft.step,
    channel: 'email',
    subject: draft.subject,
    body: draft.body,
    status: 'draft',
    scheduled_at: draft.scheduledAt,
  }));

  const { error: insertError } = await context.supabase.from('outreach_messages').upsert(drafts, { onConflict: 'user_id,prospect_id,step', ignoreDuplicates: true });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  const { data, error } = await context.supabase.from('outreach_messages').select('*').eq('prospect_id', prospect.id).eq('user_id', context.user.id).order('step');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await context.supabase.from('logs').insert({ user_id: context.user.id, mission_id: prospect.mission_id, level: 'info', source: 'ATLYN Outreach', message: `Séquence commerciale préparée pour « ${prospect.company_name} ».` });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const context = await authenticatedClient();
  if ('error' in context) return context.error;
  const body = await request.json().catch(() => null) as { id?: unknown; action?: unknown; subject?: unknown; message?: unknown } | null;
  if (typeof body?.id !== 'string') return NextResponse.json({ error: 'Message identifier is required' }, { status: 400 });

  const { data: message, error: findError } = await context.supabase.from('outreach_messages').select('*, prospects!inner(id,mission_id,company_name)').eq('id', body.id).eq('user_id', context.user.id).single();
  if (findError || !message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.action === 'approved') {
    updates.status = 'approved';
    if (typeof body.subject === 'string' && typeof body.message === 'string') { updates.subject = body.subject.trim().slice(0, 300); updates.body = body.message.trim().slice(0, 10000); }
  } else if (body.action === 'sent') {
    updates.status = 'sent';
    updates.sent_at = new Date().toISOString();
  } else if (body.action === 'replied') {
    updates.status = 'replied';
    updates.replied_at = new Date().toISOString();
  } else if (body.action === 'skipped') {
    updates.status = 'skipped';
  } else if (body.action === 'save') {
    if (typeof body.subject !== 'string' || typeof body.message !== 'string') return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    updates.subject = body.subject.trim().slice(0, 300);
    updates.body = body.message.trim().slice(0, 10000);
  } else {
    return NextResponse.json({ error: 'Invalid outreach action' }, { status: 400 });
  }

  const { data, error } = await context.supabase.from('outreach_messages').update(updates).eq('id', message.id).eq('user_id', context.user.id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const prospect = Array.isArray(message.prospects) ? message.prospects[0] : message.prospects;
  if (body.action === 'sent') {
    const { data: next } = await context.supabase.from('outreach_messages').select('scheduled_at').eq('prospect_id', prospect.id).eq('user_id', context.user.id).eq('status', 'draft').gt('step', message.step).order('step').limit(1).maybeSingle();
    await context.supabase.from('prospects').update({ status: 'contacted', follow_up_at: next?.scheduled_at ?? null, updated_at: new Date().toISOString() }).eq('id', prospect.id).eq('user_id', context.user.id);
  }
  if (body.action === 'replied') {
    await Promise.all([
      context.supabase.from('prospects').update({ status: 'interested', follow_up_at: null, updated_at: new Date().toISOString() }).eq('id', prospect.id).eq('user_id', context.user.id),
      context.supabase.from('outreach_messages').update({ status: 'skipped', updated_at: new Date().toISOString() }).eq('prospect_id', prospect.id).eq('user_id', context.user.id).eq('status', 'draft'),
    ]);
  }
  await context.supabase.from('logs').insert({ user_id: context.user.id, mission_id: prospect.mission_id, level: 'info', source: 'ATLYN Outreach', message: `Prospection « ${prospect.company_name} » : ${String(body.action)}.` });
  return NextResponse.json({ data });
}
