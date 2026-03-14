import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  const checks: Record<string, string> = { status: 'ok', timestamp: new Date().toISOString() };

  try {
    const result = await sql`SELECT 1 as ok`;
    checks.database = result.rows[0]?.ok === 1 ? 'connected' : 'error';
  } catch {
    checks.database = 'disconnected';
    checks.status = 'degraded';
  }

  checks.stripe = process.env.STRIPE_SECRET_KEY ? 'configured' : 'not_configured';
  checks.resend = process.env.RESEND_API_KEY ? 'configured' : 'not_configured';
  checks.anthropic = process.env.ANTHROPIC_API_KEY ? 'configured' : 'not_configured';

  const statusCode = checks.status === 'ok' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}
