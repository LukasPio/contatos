import { newDb } from "pg-mem";
import { createApp } from "../server/app.js";
import { migrate } from "../server/db.js";

if (process.env.RENDER || process.env.NODE_ENV === "production")
  throw new Error("Servidor de teste indisponível em produção.");
const { Pool } = newDb().adapters.createPg();
const pool = new Pool();
await migrate(pool);
const app = await createApp(pool);
app.listen(3101, "127.0.0.1");
