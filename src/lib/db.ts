import { neon } from '@neondatabase/serverless';
import { env } from 'cloudflare:workers';

export function getDb() {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  return neon(databaseUrl);
}
