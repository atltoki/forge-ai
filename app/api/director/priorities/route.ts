import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isVerifiedOrbitOwner } from '@/lib/director/orbit';

export const dynamic = 'force-dynamic';

// All credentials remain server-only. The source Worker exposes GET only.
export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error:'Supabase non configuré' }, { status:503 });
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error:'Authentification requise' }, { status:401 });
  if (!isVerifiedOrbitOwner(user, process.env.ORBIT_OWNER_EMAIL)) {
    return NextResponse.json({ error:'Accès réservé au propriétaire ORBIT vérifié' }, { status:403 });
  }

  const endpoint = process.env.ORBIT_PRIORITIES_URL;
  const secret = process.env.ORBIT_PRIORITIES_TOKEN;
  if (!endpoint || !secret || secret.length < 32) {
    return NextResponse.json({ error:'Passerelle D1 des priorités non activée' }, { status:503 });
  }

  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' ||
        !url.hostname.endsWith('.workers.dev') ||
        url.pathname !== '/v1/priorities' ||
        url.search || url.hash || url.username || url.password || url.port) {
      return NextResponse.json({ error:'Adresse de la passerelle non autorisée' }, { status:503 });
    }

    const response = await fetch(url.toString(), {
      method:'GET', redirect:'error', cache:'no-store',
      headers: { Authorization: `Bearer ${secret}`, Accept:'application/json' },
      signal:AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('Source D1 indisponible');
    if (!(response.headers.get('content-type') || '').includes('application/json'))
      throw new Error('Réponse D1 invalide');
    const raw = await response.text();
    if (raw.length > 80000) throw new Error('Réponse D1 trop volumineuse');
    const payload: unknown = JSON.parse(raw);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw new Error('Schéma D1 invalide');
    const data = payload as Record<string, unknown>;
    if (data.source !== 'orbit-d1' || data.has_more !== false ||
        !Number.isSafeInteger(data.revision) || Number(data.revision) < 0 ||
        !Array.isArray(data.priorities) || data.priorities.length > 100)
      throw new Error('Registre D1 incomplet');

    const priorities = data.priorities.map((item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item))
        throw new Error('Priorité invalide');
      const x = item as Record<string, unknown>;
      if (typeof x.id !== 'string' || x.id.length > 100 ||
          typeof x.title !== 'string' || x.title.length > 500 ||
          typeof x.done !== 'boolean' || !Number.isSafeInteger(x.position))
        throw new Error('Priorité malformée');
      return { id:x.id, title:x.title, done:x.done, position:x.position,
        updated_at: typeof x.updated_at === 'string' ? x.updated_at : null };
    });

    const bootstrap = data.revision === 0 && priorities.length === 0;
    return NextResponse.json({
      source:'orbit-d1', mode:'read_only',
      status:bootstrap ? 'observed_empty' : 'observed',
      revision:data.revision, updated_at:bootstrap ? null : data.updated_at,
      priorities, imported:false, synchronized_to_browser:false,
      warning:bootstrap ? 'La base D1 est initialisée mais aucune priorité personnelle n’a encore été importée.' : null,
    }, { headers:{ 'Cache-Control':'private, no-store' } });
  } catch {
    return NextResponse.json({ error:'Lecture des priorités ORBIT indisponible' }, { status:503 });
  }
}
