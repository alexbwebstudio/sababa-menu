import { checkPassword, issueToken, isConfigured, json } from "../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isConfigured()) {
    return json({ error: "ADMIN_PASSWORD не задан в настройках Netlify" }, 500);
  }
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (!checkPassword(body.password)) {
    await new Promise((r) => setTimeout(r, 800)); // замедляем подбор пароля
    return json({ error: "סיסמה שגויה" }, 401);
  }
  return json({ token: issueToken() });
};

export const config = { path: "/api/login" };
