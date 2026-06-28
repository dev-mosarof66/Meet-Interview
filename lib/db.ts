import { Pool } from "pg";

// Shared Postgres (Neon) pool used by better-auth and app routes.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});
