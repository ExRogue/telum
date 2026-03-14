import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { getSiteContentWithMeta, setContentValues, resetContentValue } from '@/lib/site-content';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const content = await getSiteContentWithMeta();
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Admin content GET error:', error);
    return NextResponse.json({ error: 'Failed to load content' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { entries } = await request.json();
    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: 'entries must be an array of { key, value }' }, { status: 400 });
    }

    await setContentValues(entries);
    return NextResponse.json({ message: 'Content updated' });
  } catch (error) {
    console.error('Admin content PUT error:', error);
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { key } = await request.json();
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    await resetContentValue(key);
    return NextResponse.json({ message: 'Content reset to default' });
  } catch (error) {
    console.error('Admin content DELETE error:', error);
    return NextResponse.json({ error: 'Failed to reset content' }, { status: 500 });
  }
}
