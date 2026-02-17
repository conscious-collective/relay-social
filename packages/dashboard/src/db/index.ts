import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Fallback for local dev
  console.warn("DATABASE_URL not set, using mock db");
}

const sql = connectionString ? neon(connectionString) : null;
export const db = sql ? drizzle(sql, { schema }) : null;
export type DB = typeof db;

// For compatibility
export const sqlite = sql;
