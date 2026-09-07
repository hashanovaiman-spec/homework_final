import { createConnection, Connection } from "mysql2/promise";

export async function initDataBase(): Promise<Connection> {
  const {
    DB_HOST,
    DB_PORT,
    DB_PASSWORD,
    DB_USER,
    DB_NAME
  } = process.env;

  try {
    const connection = await createConnection({
      host: DB_HOST,
      port: Number(DB_PORT),
      password: DB_PASSWORD,
      user: DB_USER,
      database: DB_NAME
    });

    console.log(`Connection to DB ${DB_NAME} established`);
    return connection;
  } catch (e: any) {
    console.error("Database connection failed:", e?.message || e);
    throw e;
  }
}
