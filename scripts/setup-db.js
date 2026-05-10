/**
 * Pre-build script that swaps the Prisma datasource provider
 * from SQLite to PostgreSQL when deploying to Vercel.
 *
 * Triggered automatically by the `vercel-build` npm script.
 */
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (process.env.USE_POSTGRES === 'true' || process.env.VERCEL) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
  console.log('✅ Switched Prisma provider to PostgreSQL for production');
} else {
  console.log('ℹ️  Keeping SQLite provider for local development');
}
