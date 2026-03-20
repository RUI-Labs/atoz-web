import { neon } from '@neondatabase/serverless';

export function getDb() {
  const databaseUrl = import.meta.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  return neon(databaseUrl);
}
