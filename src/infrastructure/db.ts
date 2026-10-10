import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema/index";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    await sql`select 1`;
    return true;
  } catch {
    return false;
  }
};
