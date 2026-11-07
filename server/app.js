import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  hashPassword,
  verifyPassword,
  tokenHash,
  personInput,
  validPassword,
  validId,
} from "./security.js";

export async function createApp(
  pool,
  {
    production = false,
    staticDir = fileURLToPath(new URL("../dist", import.meta.url)),
  } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "style-src": ["'self'"],
          "img-src": ["'self'", "data:"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  const cookie = {
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    path: "/",
  };
  const cookieName = production ? "__Host-contatos" : "contatos_session";
  const dummyHash = await hashPassword(randomBytes(32).toString("hex"));

  app.get("/api/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "indisponivel" });
    }
  });
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (!req.is("application/json"))
        return res.status(415).json({ erro: "Envie dados em JSON." });
      if (req.headers["sec-fetch-site"] === "cross-site")
        return res.status(403).json({ erro: "Origem não permitida." });
      if (req.headers.origin) {
        const expected =
          process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
        if (req.headers.origin !== expected)
          return res.status(403).json({ erro: "Origem não permitida." });
      }
    }
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { erro: "Muitas solicitações. Aguarde um minuto." },
    }),
  );
  const authLimiter = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      erro: "Muitas tentativas. Aguarde 15 minutos para tentar novamente.",
    },
  });

  app.post("/api/usuarios/registrar", authLimiter, async (req, res) => {
    const person = personInput(req.body);
    if (!person || !validPassword(req.body?.senha))
      return res
        .status(400)
        .json({
          erro: "Informe nome, e-mail válido e senha de 8 a 128 caracteres.",
        });
    const senhaHash = await hashPassword(req.body.senha);
    try {
      await pool.query(
        "INSERT INTO usuarios (id,nome,email,senha_hash) VALUES ($1,$2,$3,$4)",
        [randomUUID(), person.nome, person.email, senhaHash],
      );
      res
        .status(201)
        .json({ mensagem: "Conta criada. Entre com seu e-mail e senha." });
    } catch (error) {
      if (error.code === "23505")
        return res
          .status(409)
          .json({ erro: "Este e-mail já possui uma conta." });
      throw error;
    }
  });

  app.post("/api/usuarios/login", authLimiter, async (req, res) => {
    if (typeof req.body?.email !== "string" || !validPassword(req.body?.senha))
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    const {
      rows: [user],
    } = await pool.query(
      "SELECT id,nome,email,senha_hash FROM usuarios WHERE email=$1",
      [req.body.email.trim().toLowerCase()],
    );
    const matches = await verifyPassword(
      req.body.senha,
      user?.senha_hash || dummyHash,
    );
    if (!user || !matches)
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 86400000);
    await pool.query("DELETE FROM sessoes WHERE expira_em < NOW()");
    if (req.cookies[cookieName])
      await pool.query("DELETE FROM sessoes WHERE token_hash=$1", [
        tokenHash(req.cookies[cookieName]),
      ]);
    await pool.query(
      "INSERT INTO sessoes (token_hash,usuario_id,expira_em) VALUES ($1,$2,$3)",
      [tokenHash(token), user.id, expires],
    );
    res.cookie(cookieName, token, { ...cookie, expires });
    res.json({ id: user.id, nome: user.nome, email: user.email });
  });

  app.post("/api/usuarios/sair", async (req, res) => {
    if (req.cookies[cookieName])
      await pool.query("DELETE FROM sessoes WHERE token_hash=$1", [
        tokenHash(req.cookies[cookieName]),
      ]);
    res.clearCookie(cookieName, cookie);
    res.status(204).end();
  });

  async function authenticated(req, res, next) {
    const token = req.cookies[cookieName];
    if (typeof token !== "string" || token.length !== 64)
      return res
        .status(401)
        .json({ erro: "Entre na sua conta para continuar." });
    const {
      rows: [user],
    } = await pool.query(
      `SELECT u.id,u.nome,u.email FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=$1 AND s.expira_em > NOW()`,
      [tokenHash(token)],
    );
    if (!user) {
      res.clearCookie(cookieName, cookie);
      return res
        .status(401)
        .json({ erro: "Sua sessão expirou. Entre novamente." });
    }
    req.user = user;
    next();
  }
  app.get("/api/usuarios/me", authenticated, (req, res) => res.json(req.user));
  app.use("/api/contatos", authenticated);
  app.get("/api/contatos", async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id,nome,email,criado_em,atualizado_em FROM contatos WHERE usuario_id=$1 ORDER BY nome ASC",
      [req.user.id],
    );
    res.json(rows);
  });
  app.post("/api/contatos", async (req, res) => {
    const person = personInput(req.body);
    if (!person)
      return res
        .status(400)
        .json({ erro: "Informe nome (até 100 caracteres) e e-mail válido." });
    const {
      rows: [contact],
    } = await pool.query(
      "INSERT INTO contatos (id,usuario_id,nome,email) VALUES ($1,$2,$3,$4) RETURNING id,nome,email,criado_em,atualizado_em",
      [randomUUID(), req.user.id, person.nome, person.email],
    );
    res.status(201).json(contact);
  });
  app.put("/api/contatos/:id", async (req, res) => {
    const person = personInput(req.body);
    if (!validId(req.params.id))
      return res.status(404).json({ erro: "Contato não encontrado." });
    if (!person)
      return res
        .status(400)
        .json({ erro: "Informe nome (até 100 caracteres) e e-mail válido." });
    const {
      rows: [contact],
    } = await pool.query(
      "UPDATE contatos SET nome=$1,email=$2,atualizado_em=NOW() WHERE id=$3 AND usuario_id=$4 RETURNING id,nome,email,criado_em,atualizado_em",
      [person.nome, person.email, req.params.id, req.user.id],
    );
    if (!contact)
      return res.status(404).json({ erro: "Contato não encontrado." });
    res.json(contact);
  });
  app.delete("/api/contatos/:id", async (req, res) => {
    if (!validId(req.params.id))
      return res.status(404).json({ erro: "Contato não encontrado." });
    const { rowCount } = await pool.query(
      "DELETE FROM contatos WHERE id=$1 AND usuario_id=$2",
      [req.params.id, req.user.id],
    );
    if (!rowCount)
      return res.status(404).json({ erro: "Contato não encontrado." });
    res.status(204).end();
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ erro: "Recurso não encontrado." }),
  );
  app.use(express.static(staticDir, { index: false }));
  app.get(["/", "/login", "/registrar", "/contatos"], (_req, res) =>
    res.sendFile(path.join(staticDir, "index.html")),
  );
  app.use((_req, res) => res.status(404).send("Página não encontrada."));
  app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed")
      return res.status(400).json({ erro: "Dados inválidos." });
    if (error.type === "entity.too.large")
      return res
        .status(413)
        .json({ erro: "Dados excedem o tamanho permitido." });
    console.error("Falha na requisição:", error.code || error.name);
    res
      .status(500)
      .json({ erro: "Não foi possível concluir. Tente novamente." });
  });
  return app;
}
