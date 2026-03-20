import type { APIRoute } from 'astro';
import { getDb } from '../../lib/db';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,40}$/;
const ZCASH_RE = /^(u1|zs1)/;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { username, zcash_address } = body as { username?: string; zcash_address?: string };

  if (!username || !USERNAME_RE.test(username)) {
    return new Response(JSON.stringify({ error: 'Username must be 3-40 alphanumeric/underscore characters' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!zcash_address || !ZCASH_RE.test(zcash_address)) {
    return new Response(JSON.stringify({ error: 'Must be a shielded Zcash address (starts with u1 or zs1)' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const sql = getDb();
  try {
    await sql`INSERT INTO users (username, zcash_address) VALUES (${username}, ${zcash_address})`;
  } catch (e: any) {
    if (e.code === '23505') {
      return new Response(JSON.stringify({ error: 'Username already taken' }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      });
    }
    throw e;
  }

  return new Response(JSON.stringify({ success: true, username }), {
    status: 201, headers: { 'Content-Type': 'application/json' },
  });
};
