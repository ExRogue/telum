import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid-invite', request.url));
  }

  try {
    await getDb();

    const result = await sql`
      SELECT id, company_id, email, role FROM team_invites
      WHERE token = ${token} AND accepted = false AND expires_at > NOW()
      LIMIT 1
    `;

    if (!result.rows[0]) {
      return NextResponse.redirect(new URL('/login?error=expired-invite', request.url));
    }

    const invite = result.rows[0];

    // Check if user exists with this email
    const userResult = await sql`SELECT id FROM users WHERE email = ${invite.email}`;
    if (!userResult.rows[0]) {
      // Redirect to register with invite context
      return NextResponse.redirect(new URL(`/register?invite=${token}&email=${invite.email}`, request.url));
    }

    const userId = userResult.rows[0].id;

    // Ensure team_members table exists
    await sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, user_id TEXT NOT NULL,
        role TEXT DEFAULT 'editor', invited_by TEXT, created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add to team
    const memberId = uuidv4();
    await sql`
      INSERT INTO team_members (id, company_id, user_id, role, invited_by)
      VALUES (${memberId}, ${invite.company_id}, ${userId}, ${invite.role}, ${invite.invited_by || ''})
      ON CONFLICT DO NOTHING
    `;

    // Mark invite as accepted
    await sql`UPDATE team_invites SET accepted = true WHERE id = ${invite.id}`;

    return NextResponse.redirect(new URL('/dashboard?team=joined', request.url));
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.redirect(new URL('/login?error=invite-failed', request.url));
  }
}
