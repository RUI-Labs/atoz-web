import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

export const GET: APIRoute = async ({ url }) => {
  const username = url.searchParams.get('username')?.trim();
  if (!username || !/^[a-zA-Z0-9_]{3,40}$/.test(username)) {
    return new Response(JSON.stringify({ available: false, error: 'Invalid username' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sql = getDb();
  const rows = await sql`SELECT 1 FROM users WHERE LOWER(username) = LOWER(${username}) LIMIT 1`;
  return new Response(JSON.stringify({ available: rows.length === 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
