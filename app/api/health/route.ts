import { NextResponse } from 'next/server';
export function GET() { return NextResponse.json({ status: 'ok', service: 'forge-ai', timestamp: new Date().toISOString() }); }
