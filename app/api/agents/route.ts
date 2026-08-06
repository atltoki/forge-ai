import { NextResponse } from 'next/server';
import { listAgentsWithLoad } from '@/lib/engines/agent-engine';

export function GET() {
  return NextResponse.json({ source: 'engine', data: listAgentsWithLoad() });
}
