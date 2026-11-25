import { resolveTestDatabaseUrl } from './integration-env';

process.env.DATABASE_URL = resolveTestDatabaseUrl();
