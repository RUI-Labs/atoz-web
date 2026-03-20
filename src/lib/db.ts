import { neon } from '@neondatabase/serverless';

export function getDb(runtime?: { env: Record<string, string> }) {
  const databaseUrl = runtime?.env?.DATABASE_URL ?? import.meta.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  return neon(databaseUrl);
}
