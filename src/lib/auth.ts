import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import getDb from './db';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'telum-dev-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export async function register(email: string, password: string, name: string): Promise<AuthResult> {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return { success: false, error: 'Email already registered' };
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)').run(id, email, passwordHash, name);

  const user: User = { id, email, name, created_at: new Date().toISOString() };
  const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  return { success: true, user, token };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const db = getDb();

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!row) {
    return { success: false, error: 'Invalid email or password' };
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    return { success: false, error: 'Invalid email or password' };
  }

  const user: User = { id: row.id, email: row.email, name: row.name, created_at: row.created_at };
  const token = jwt.sign({ userId: row.id, email: row.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  return { success: true, user, token };
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('telum_token')?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    // Try DB lookup first
    const db = getDb();
    const row = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(payload.userId) as any;
    if (row) return row;

    // On serverless cold start the in-memory DB is empty, but the JWT
    // signature already proves the user's identity. Construct a User
    // from the verified token payload so authenticated routes still work.
    return {
      id: payload.userId,
      email: payload.email,
      name: payload.email.split('@')[0],
      created_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
