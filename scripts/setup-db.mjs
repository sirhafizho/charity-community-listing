/**
 * Pre-build script that swaps the Prisma datasource provider
 * from SQLite to PostgreSQL when deploying to Vercel.
 *
 * Triggered automatically by the `vercel-build` npm script.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');

if (process.env.USE_POSTGRES === 'true' || process.env.VERCEL) {
  let schema = readFileSync(schemaPath, 'utf8');
  schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
  writeFileSync(schemaPath, schema);
  console.log('✅ Switched Prisma provider to PostgreSQL for production');
} else {
  console.log('ℹ️  Keeping SQLite provider for local development');
}
