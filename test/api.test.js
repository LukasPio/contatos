import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { newDb } from "pg-mem";
import { createApp } from "../server/app.js";
import { migrate } from "../server/db.js";
import { tokenHash } from "../server/security.js";

let pool, app;
before(async () => {
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  pool = new Pool();
  await migrate(pool);
  app = await createApp(pool);
});
after(async () => {
  await pool.end();
});

test("health check e proteção das rotas", async () => {
  await request(app).get("/api/health").expect(200, { status: "ok" });
  await request(app).get("/api/contatos").expect(401);
  await request(app)
    .post("/api/contatos")
    .send({ nome: "Sem sessão", email: "a@test.com" })
    .expect(401);
});

test("cadastro valida dados, normaliza e-mail e nunca armazena senha em texto", async () => {
  await request(app)
    .post("/api/usuarios/registrar")
    .send({ nome: "", email: "errado", senha: "123" })
    .expect(400);
  await request(app)
    .post("/api/usuarios/registrar")
    .send({
      nome: "  Ana  ",
      email: " ANA@test.com ",
      senha: "senha-segura123",
    })
    .expect(201);
  const {
    rows: [user],
  } = await pool.query("SELECT * FROM usuarios WHERE email=$1", [
    "ana@test.com",
  ]);
  assert.equal(user.nome, "Ana");
  assert.notEqual(user.senha_hash, "senha-segura123");
  assert.match(user.senha_hash, /^[a-f0-9]+:[a-f0-9]+$/);
  await request(app)
    .post("/api/usuarios/registrar")
    .send({
      nome: "Outra Ana",
      email: "ANA@test.com",
      senha: "senha-segura123",
    })
    .expect(409);
});

test("login, CRUD completo, isolamento entre contas, logout e revogação", async () => {
  const ana = request.agent(app);
  const bob = request.agent(app);
  await ana
    .post("/api/usuarios/login")
    .send({ email: "ana@test.com", senha: "errado123" })
    .expect(401);
  const login = await ana
    .post("/api/usuarios/login")
    .send({ email: "ANA@test.com", senha: "senha-segura123" })
    .expect(200);
  assert.equal(login.body.nome, "Ana");
  assert.equal(login.body.senha_hash, undefined);
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);
  assert.match(login.headers["set-cookie"][0], /SameSite=Strict/);
  const oldCookie = login.headers["set-cookie"][0].split(";")[0];
  await ana.get("/api/usuarios/me").expect(200);
  await request(app)
    .post("/api/usuarios/registrar")
    .send({ nome: "Bob", email: "bob@test.com", senha: "senha-segura123" })
    .expect(201);
  await bob
    .post("/api/usuarios/login")
    .send({ email: "bob@test.com", senha: "senha-segura123" })
    .expect(200);
  const created = await ana
    .post("/api/contatos")
    .send({ nome: "  Contato  ", email: "contato@test.com" })
    .expect(201);
  const id = created.body.id;
  assert.equal(created.body.nome, "Contato");
  assert.equal(created.body.usuario_id, undefined);
  assert.equal((await ana.get("/api/contatos").expect(200)).body.length, 1);
  assert.deepEqual((await bob.get("/api/contatos").expect(200)).body, []);
  await bob
    .put(`/api/contatos/${id}`)
    .send({ nome: "Invasão", email: "x@test.com" })
    .expect(404);
  await bob.delete(`/api/contatos/${id}`).send({}).expect(404);
  await ana
    .put(`/api/contatos/${id}`)
    .send({ nome: "Editado", email: "novo@test.com" })
    .expect(200);
  assert.equal((await ana.get("/api/contatos")).body[0].nome, "Editado");
  await ana.delete(`/api/contatos/${id}`).send({}).expect(204);
  await ana.delete(`/api/contatos/${id}`).send({}).expect(404);
  assert.deepEqual((await ana.get("/api/contatos")).body, []);
  await ana.post("/api/usuarios/sair").send({}).expect(204);
  await ana.get("/api/usuarios/me").expect(401);
  await request(app).get("/api/contatos").set("Cookie", oldCookie).expect(401);
});

test("sessão expirada não permite acesso e nova sessão invalida a anterior do navegador", async () => {
  const agent = request.agent(app);
  const login = await agent
    .post("/api/usuarios/login")
    .send({ email: "bob@test.com", senha: "senha-segura123" })
    .expect(200);
  const oldCookie = login.headers["set-cookie"][0].split(";")[0];
  await agent
    .post("/api/usuarios/login")
    .send({ email: "bob@test.com", senha: "senha-segura123" })
    .expect(200);
  await request(app).get("/api/contatos").set("Cookie", oldCookie).expect(401);
  const me = await agent.get("/api/usuarios/me");
  await pool.query("UPDATE sessoes SET expira_em=$1 WHERE usuario_id=$2", [
    new Date(2000, 0, 1),
    me.body.id,
  ]);
  await agent.get("/api/contatos").expect(401);
});

test("escritas rejeitam origem externa, JSON inválido e IDs/dados malformados", async () => {
  await request(app)
    .post("/api/usuarios/login")
    .set("Origin", "https://outro-site.example")
    .send({ email: "bob@test.com", senha: "senha-segura123" })
    .expect(403);
  await request(app)
    .post("/api/usuarios/login")
    .set("Sec-Fetch-Site", "cross-site")
    .send({})
    .expect(403);
  await request(app)
    .post("/api/usuarios/login")
    .type("form")
    .send({})
    .expect(415);
  await request(app)
    .post("/api/usuarios/login")
    .set("Content-Type", "application/json")
    .send("{")
    .expect(400);
  const agent = request.agent(app);
  await agent
    .post("/api/usuarios/login")
    .send({ email: "bob@test.com", senha: "senha-segura123" })
    .expect(200);
  await agent
    .post("/api/contatos")
    .send({ nome: "X", email: "errado" })
    .expect(400);
  await agent
    .put("/api/contatos/nao-e-uuid")
    .send({ nome: "X", email: "x@test.com" })
    .expect(404);
  await agent.delete("/api/contatos/nao-e-uuid").send({}).expect(404);
  const result = await agent
    .post("/api/contatos")
    .send({ nome: "Robert'); DROP TABLE usuarios;--", email: "sql@test.com" })
    .expect(201);
  assert.equal(result.body.nome, "Robert'); DROP TABLE usuarios;--");
  await agent.get("/api/usuarios/me").expect(200);
});

test("cookie de produção exige HTTPS e não expõe token no corpo", async () => {
  const secureApp = await createApp(pool, { production: true });
  const response = await request(secureApp)
    .post("/api/usuarios/login")
    .set("X-Forwarded-Proto", "https")
    .send({ email: "bob@test.com", senha: "senha-segura123" })
    .expect(200);
  const cookie = response.headers["set-cookie"][0];
  assert.match(cookie, /^__Host-contatos=/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; HttpOnly/);
  assert.equal(response.body.token, undefined);
  const token = cookie.split(";")[0].split("=")[1];
  assert.equal(
    (
      await pool.query("SELECT token_hash FROM sessoes WHERE token_hash=$1", [
        tokenHash(token),
      ])
    ).rows.length,
    1,
  );
});
