import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = { database: false, worker: false };
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin.from('missions').select('id', { head: true, count: 'exact' });
    checks.database = !error;
  }

  if (process.env.WORKER_API_URL) {
    try {
      const response = await fetch(`${process.env.WORKER_API_URL.replace(/\/$/, '')}/health`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      checks.worker = response.ok;
    } catch { checks.worker = false; }
  }

  const healthy = checks.database && checks.worker;
  return NextResponse.json({
    status: healthy ? 'ok' : 'degraded',
    service: 'forge-ai',
    checks,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { 'cache-control': 'no-store' } });
}
