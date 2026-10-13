import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import { isAuthorized, json } from "../lib/auth.mjs";

const MAX_BYTES = 4 * 1024 * 1024; // лимит тела запроса функции Netlify ~6 МБ
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);

  const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!TYPES[type]) return json({ error: "Unsupported image type" }, 415);

  const data = await req.arrayBuffer();
  if (!data.byteLength) return json({ error: "Empty file" }, 400);
  if (data.byteLength > MAX_BYTES) return json({ error: "Image too large (max 4 MB)" }, 413);

  const key = `${crypto.randomUUID()}.${TYPES[type]}`;
  const images = getStore({ name: "images", consistency: "strong" });
  await images.set(key, data, { metadata: { contentType: type, uploadedAt: Date.now() } });

  return json({ url: `/api/image/${key}` });
};

export const config = { path: "/api/upload" };
