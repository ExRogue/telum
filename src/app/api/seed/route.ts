import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

// One-time seed endpoint — seeds admin and re-runs init
// Protected by a simple secret check to prevent abuse
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (key !== 'telum-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Force fresh init
    await getDb();

    // Explicitly seed admin
    const { seedAdmin } = await import('@/lib/seed-admin');
    await seedAdmin();

    // Verify
    const users = await sql`SELECT id, email, role FROM users ORDER BY created_at`;
    return NextResponse.json({
      ok: true,
      message: 'Seed complete',
      users: users.rows,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error?.message || String(error),
    }, { status: 500 });
  }
}
