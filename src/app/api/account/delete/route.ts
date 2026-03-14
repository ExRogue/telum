import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (body.confirmation !== 'DELETE MY ACCOUNT') {
      return NextResponse.json({ error: 'Please type "DELETE MY ACCOUNT" to confirm' }, { status: 400 });
    }

    await getDb();

    // Cancel active subscriptions
    await sql`UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE user_id = ${user.id} AND status = 'active'`;

    // Get company IDs for this user
    const companies = await sql`SELECT id FROM companies WHERE user_id = ${user.id}`;
    const companyIds = companies.rows.map(c => c.id);

    // Delete generated content
    for (const companyId of companyIds) {
      await sql`DELETE FROM generated_content WHERE company_id = ${companyId}`;
    }

    // Delete related data
    await sql`DELETE FROM notifications WHERE user_id = ${user.id}`;
    await sql`DELETE FROM usage_events WHERE user_id = ${user.id}`;
    await sql`DELETE FROM usage_alerts WHERE user_id = ${user.id}`;
    await sql`DELETE FROM invoices WHERE user_id = ${user.id}`;
    await sql`DELETE FROM subscriptions WHERE user_id = ${user.id}`;
    await sql`DELETE FROM companies WHERE user_id = ${user.id}`;

    // Anonymise user record (retain for audit trail)
    const anonymisedEmail = `deleted-${user.id.slice(0, 8)}@deleted.telum.io`;
    await sql`
      UPDATE users SET
        email = ${anonymisedEmail},
        name = 'Deleted User',
        password_hash = 'DELETED',
        disabled = true,
        updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Clear auth cookie
    const response = NextResponse.json({ message: 'Account deleted successfully' });
    response.cookies.set('telum_token', '', { maxAge: 0, path: '/' });

    return response;
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Account deletion failed. Please contact support.' }, { status: 500 });
  }
}
