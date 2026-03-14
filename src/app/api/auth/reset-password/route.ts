import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/validation';

const bcryptHash = (bcrypt as any).default?.hash || bcrypt.hash;

export async function POST(request: NextRequest) {
  const rl = rateLimit('reset-password', 10, 300_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await getDb();

    // Find valid reset token
    const result = await sql`
      SELECT pr.user_id, pr.id as reset_id FROM password_resets pr
      WHERE pr.token = ${token} AND pr.used = false AND pr.expires_at > NOW()
      ORDER BY pr.created_at DESC LIMIT 1
    `;

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Invalid or expired reset link. Please request a new one.' }, { status: 400 });
    }

    const { user_id, reset_id } = result.rows[0];
    const passwordHash = await bcryptHash(password, 12);

    // Update password and mark token as used
    await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${user_id}`;
    await sql`UPDATE password_resets SET used = true WHERE id = ${reset_id}`;

    return NextResponse.json({ message: 'Password has been reset. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
