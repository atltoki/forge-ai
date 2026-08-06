import { NextRequest, NextResponse } from 'next/server';
import { listMissions, planMission } from '@/lib/engines/mission-engine';

export function GET() {
  return NextResponse.json({ source: 'engine', data: listMissions() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.title || !body?.objective) {
    return NextResponse.json({ error: 'title and objective are required' }, { status: 400 });
  }

  const plan = planMission({
    title: String(body.title),
    objective: String(body.objective),
    preferredAgentId: body.preferredAgentId ? String(body.preferredAgentId) : undefined,
  });

  return NextResponse.json({ source: 'engine', data: plan }, { status: 201 });
}
