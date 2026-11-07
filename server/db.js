import pg from "pg";

export function createPool() {
  if (!process.env.DATABASE_URL)
    throw new Error("Configure DATABASE_URL antes de iniciar.");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    query_timeout: 5000,
  });
  pool.on("error", () => console.error("Conexão com o banco interrompida."));
  return pool;
}

export async function migrate(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id UUID PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sessoes (
      token_hash TEXT PRIMARY KEY,
      usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      expira_em TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessoes_expiracao_idx ON sessoes(expira_em);
    CREATE TABLE IF NOT EXISTS contatos (
      id UUID PRIMARY KEY,
      usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nome VARCHAR(100) NOT NULL,
      email VARCHAR(254) NOT NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS contatos_usuario_idx ON contatos(usuario_id);
  `);
}
