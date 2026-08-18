import { NextRequest, NextResponse } from 'next/server';
import { addDaysIso } from '@/lib/domain/outreach';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type LeadInput = {
  name?: unknown; email?: unknown; company?: unknown; website?: unknown;
  phone?: unknown; product?: unknown; budget?: unknown; message?: unknown;
  source?: unknown; consent?: unknown;
};

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const expected = process.env.ATL_INGEST_SECRET;
  const supplied = request.headers.get('x-atl-ingest-secret');
  if (!expected || !supplied || supplied !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null) as LeadInput | null;
  const name = text(body?.name, 160);
  const email = text(body?.email, 320).toLowerCase();
  const company = text(body?.company, 180);
  const website = text(body?.website, 500);
  const phone = text(body?.phone, 80);
  const product = text(body?.product, 120) || 'Projet sur mesure';
  const budget = text(body?.budget, 80);
  const message = text(body?.message, 2000);
  const source = text(body?.source, 500) || 'https://atl-portfolio.pages.dev';
  if (!name || !emailPattern.test(email) || body?.consent !== true) return NextResponse.json({ error: 'Invalid lead' }, { status: 422 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  const ownerEmail = (process.env.ATL_LEAD_OWNER_EMAIL || 'allan.tchicaya@gmail.com').toLowerCase();
  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  const owner = users?.users.find((user) => user.email?.toLowerCase() === ownerEmail);
  if (usersError || !owner) return NextResponse.json({ error: 'Lead owner unavailable' }, { status: 503 });

  const now = new Date().toISOString();
  const companyName = company || name;
  const qualification = `Demande entrante ATL · ${product}${budget ? ` · budget ${budget}` : ''}`;
  const notes = [message, `Source : ${source}`, `Consentement au suivi commercial : oui`].filter(Boolean).join('\n\n');
  const { data: previous } = await admin.from('prospects').select('id,status').eq('user_id', owner.id).eq('email', email).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const record = { user_id: owner.id, company_name: companyName, website, city: '', activity: product, qualification, contact_name: name, email, phone, linkedin_url: '', source_url: source, score: budget ? 92 : 84, status: previous?.status === 'won' ? 'won' : 'qualified', notes, follow_up_at: now, updated_at: now };
  const result = previous
    ? await admin.from('prospects').update(record).eq('id', previous.id).select('*').single()
    : await admin.from('prospects').insert(record).select('*').single();
  if (result.error || !result.data) return NextResponse.json({ error: result.error?.message || 'Lead creation failed' }, { status: 500 });

  const prospect = result.data;
  const firstName = name.split(/\s+/)[0];
  const drafts = [
    { step: 1, subject: `Ta demande concernant ${product}`, body: `Bonjour ${firstName},\n\nMerci pour ta demande concernant ${product}. J’ai bien noté ton besoin${budget ? ` et ton budget estimé (${budget})` : ''}.\n\nJe te propose un échange rapide pour confirmer le résultat attendu et te donner la prochaine étape la plus simple. Quels créneaux te conviendraient ?\n\nÀ bientôt,\nAllan`, scheduled_at: addDaysIso(new Date(), 0) },
    { step: 2, subject: `Re: Ta demande concernant ${product}`, body: `Bonjour ${firstName},\n\nJe reviens vers toi au sujet de ta demande. Souhaites-tu toujours avancer sur ${product} ?\n\nSi oui, réponds simplement avec le meilleur moment pour en parler pendant 15 minutes.\n\nAllan`, scheduled_at: addDaysIso(new Date(), 2) },
    { step: 3, subject: `Dernier suivi — ${product}`, body: `Bonjour ${firstName},\n\nJe clôture le suivi pour ne pas encombrer ta boîte de réception. Si ton projet est toujours d’actualité, réponds à ce message et je le reprendrai immédiatement.\n\nAllan`, scheduled_at: addDaysIso(new Date(), 6) },
  ].map((draft) => ({ ...draft, user_id: owner.id, prospect_id: prospect.id, channel: 'email', status: 'draft', updated_at: now }));
  const [outreachResult] = await Promise.all([
    admin.from('outreach_messages').upsert(drafts, { onConflict: 'user_id,prospect_id,step', ignoreDuplicates: false }),
    admin.from('logs').insert({ user_id: owner.id, level: 'info', source: 'ATL Portfolio', message: `Nouveau prospect entrant : ${name} · ${product}.`, metadata: { prospect_id: prospect.id, source, budget } }),
  ]);
  if (outreachResult.error) return NextResponse.json({ error: 'Lead accepted but follow-up preparation failed' }, { status: 500 });
  return NextResponse.json({ accepted: true, prospectId: prospect.id }, { status: previous ? 200 : 201 });
}
