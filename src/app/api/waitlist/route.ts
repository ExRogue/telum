import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, company_name, company_type } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM waitlist WHERE email = ?').get(email);
    if (existing) {
      return NextResponse.json({ message: 'Already on the waitlist!' });
    }

    db.prepare('INSERT INTO waitlist (id, email, company_name, company_type) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), email, company_name || '', company_type || '');

    return NextResponse.json({ message: 'Welcome to the waitlist!' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
