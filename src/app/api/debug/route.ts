import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, string> = {};
  
  try {
    const bcrypt = await import('bcryptjs');
    results.bcrypt_import = 'ok';
    results.bcrypt_keys = Object.keys(bcrypt).slice(0, 10).join(', ');
    results.bcrypt_hash_type = typeof bcrypt.hash;
    results.bcrypt_default = typeof (bcrypt as any).default;
    
    const hashFn = (bcrypt as any).default?.hash || bcrypt.hash;
    results.resolved_hash_type = typeof hashFn;
    
    if (typeof hashFn === 'function') {
      const hash = await hashFn('test', 12);
      results.bcrypt_hash_test = 'ok';
    }
  } catch (e: any) {
    results.bcrypt_error = e.message + ' | stack: ' + (e.stack || '').substring(0, 300);
  }

  try {
    const jwt = await import('jsonwebtoken');
    results.jwt_import = 'ok';
    results.jwt_sign_type = typeof jwt.sign;
    results.jwt_default_sign = typeof (jwt as any).default?.sign;
  } catch (e: any) {
    results.jwt_error = e.message;
  }

  try {
    const { sql } = await import('@vercel/postgres');
    const { getDb } = await import('@/lib/db');
    await getDb();
    const res = await sql`SELECT COUNT(*) as cnt FROM users`;
    results.db_users = res.rows[0].cnt;
  } catch (e: any) {
    results.db_error = e.message;
  }

  return NextResponse.json(results);
}
