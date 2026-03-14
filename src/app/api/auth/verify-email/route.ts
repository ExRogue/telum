import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid-token', request.url));
  }

  try {
    await getDb();

    // Ensure email_verifications table exists
    await sql`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const result = await sql`
      SELECT user_id, id as verification_id FROM email_verifications
      WHERE token = ${token} AND used = false AND expires_at > NOW()
      LIMIT 1
    `;

    if (!result.rows[0]) {
      return NextResponse.redirect(new URL('/login?error=expired-token', request.url));
    }

    const { user_id, verification_id } = result.rows[0];

    // Mark user as verified
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`;
    await sql`UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = ${user_id}`;
    await sql`UPDATE email_verifications SET used = true WHERE id = ${verification_id}`;

    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(new URL('/login?error=verification-failed', request.url));
  }
}
