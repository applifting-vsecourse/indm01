import { config as loadDotenv } from 'dotenv';
import * as path from 'path';

const DEFAULT_TEST_DB_URL =
  'postgresql://quacker:quacker@localhost:5433/quacker_test';

export function resolveTestDatabaseUrl(): string {
  loadDotenv({ path: path.resolve(__dirname, '../.env'), quiet: true });

  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) {
    assertTestDatabaseName(explicit);
    return explicit;
  }

  const current = process.env.DATABASE_URL;
  if (!current) {
    return DEFAULT_TEST_DB_URL;
  }

  const parsed = new URL(current);
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    parsed.pathname = `/${dbName || 'quacker'}_test`;
  }

  const resolved = parsed.toString();
  assertTestDatabaseName(resolved);
  return resolved;
}

function assertTestDatabaseName(databaseUrl: string): void {
  const parsed = new URL(databaseUrl);
  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against non-test database "${dbName}". Database name must end with "_test".`,
    );
  }
}
