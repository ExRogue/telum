import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await getDb();

  // Gather all user data for GDPR export
  const userData = await sql`SELECT id, email, name, role, created_at FROM users WHERE id = ${user.id}`;
  const companyData = await sql`SELECT * FROM companies WHERE user_id = ${user.id}`;
  const subscriptionData = await sql`SELECT * FROM subscriptions WHERE user_id = ${user.id}`;
  const contentData = await sql`
    SELECT gc.* FROM generated_content gc
    JOIN companies c ON gc.company_id = c.id
    WHERE c.user_id = ${user.id}
  `;
  const usageData = await sql`SELECT * FROM usage_events WHERE user_id = ${user.id}`;
  const notificationData = await sql`SELECT * FROM notifications WHERE user_id = ${user.id}`;
  const invoiceData = await sql`SELECT * FROM invoices WHERE user_id = ${user.id}`;

  const exportData = {
    exported_at: new Date().toISOString(),
    user: userData.rows[0],
    companies: companyData.rows,
    subscriptions: subscriptionData.rows,
    generated_content: contentData.rows,
    usage_events: usageData.rows,
    notifications: notificationData.rows,
    invoices: invoiceData.rows,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="monitus-data-export-${user.id.slice(0, 8)}.json"`,
    },
  });
}
