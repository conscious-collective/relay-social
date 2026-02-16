import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use absolute path: /Users/billorani/_code/relay-social/data/relay.db
const defaultDbPath = "/Users/billorani/_code/relay-social/data/relay.db";

export const sqlite = new Database(process.env.DATABASE_URL || defaultDbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
