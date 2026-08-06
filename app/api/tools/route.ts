import { NextResponse } from 'next/server';
import { listTools, summarizeToolRegistry } from '@/lib/engines/tool-manager';

export function GET() {
  return NextResponse.json({ source: 'engine', summary: summarizeToolRegistry(), data: listTools() });
}
