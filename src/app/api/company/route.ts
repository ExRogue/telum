import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import getDb from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const company = db.prepare('SELECT * FROM companies WHERE user_id = ?').get(user.id);
  return NextResponse.json({ company: company || null });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, type, niche, description, brand_voice, brand_tone, compliance_frameworks } = body;

  if (!name || !type) {
    return NextResponse.json({ error: 'Name and type required' }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM companies WHERE user_id = ?').get(user.id) as any;

  if (existing) {
    db.prepare(`UPDATE companies SET name=?, type=?, niche=?, description=?, brand_voice=?, brand_tone=?, compliance_frameworks=?, updated_at=datetime('now') WHERE id=?`)
      .run(name, type, niche || '', description || '', brand_voice || 'professional', brand_tone || '', JSON.stringify(compliance_frameworks || ['FCA']), existing.id);
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(existing.id);
    return NextResponse.json({ company });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO companies (id, user_id, name, type, niche, description, brand_voice, brand_tone, compliance_frameworks) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, user.id, name, type, niche || '', description || '', brand_voice || 'professional', brand_tone || '', JSON.stringify(compliance_frameworks || ['FCA']));

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  return NextResponse.json({ company });
}
