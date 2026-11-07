import { createPool, migrate } from "./db.js";
import { createApp } from "./app.js";

const pool = createPool();
await migrate(pool);
const app = await createApp(pool, {
  production: process.env.NODE_ENV === "production",
});
const server = app.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log("Contatos iniciado."),
);
function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 20000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
