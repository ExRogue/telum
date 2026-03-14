import { NextResponse } from 'next/server';
import { getSiteContent } from '@/lib/site-content';

export async function GET() {
  try {
    const content = await getSiteContent();
    return NextResponse.json(content);
  } catch (error) {
    console.error('Content GET error:', error);
    return NextResponse.json({}, { status: 500 });
  }
}
