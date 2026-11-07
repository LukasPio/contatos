import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64, options);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const actual = await scrypt(password, salt, 64, options);
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function personInput(body) {
  if (!body || typeof body.nome !== "string" || typeof body.email !== "string")
    return null;
  const nome = body.nome.trim();
  const email = body.email.trim().toLowerCase();
  if (
    !nome ||
    nome.length > 100 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    return null;
  return { nome, email };
}

export const validPassword = (value) =>
  typeof value === "string" && value.length >= 8 && value.length <= 128;
export const validId = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
