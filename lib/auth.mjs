import crypto from "node:crypto";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 часов

const secret = () => process.env.ADMIN_PASSWORD || "";

const hmac = (value) =>
  crypto.createHmac("sha256", "sababa-admin:" + secret()).update(value).digest("hex");

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

export const isConfigured = () => secret().length > 0;

export function checkPassword(password) {
  if (!isConfigured() || typeof password !== "string") return false;
  // сравниваем хэши, чтобы длина не влияла на время сравнения
  const h = (s) => crypto.createHash("sha256").update(s).digest("hex");
  return safeEqual(h(password), h(secret()));
}

export function issueToken() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return `${exp}.${hmac(exp)}`;
}

/** Проверяет заголовок Authorization: Bearer <token>. Смена пароля делает старые токены недействительными. */
export function isAuthorized(req) {
  if (!isConfigured()) return false;
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now()) return false;
  return safeEqual(sig, hmac(exp));
}

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
