import { getStore } from "@netlify/blobs";
import { isAuthorized, json } from "../lib/auth.mjs";

const MAX_BYTES = 512 * 1024;
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

const isStr = (v, max = 2000) => typeof v === "string" && v.length <= max;
const isImg = (v) => v === "" || (isStr(v, 500) && (/^\/api\/image\/[\w.-]+$/.test(v) || /^https:\/\//.test(v)));

function validate(c) {
  if (!c || typeof c !== "object") return "content must be an object";
  for (const k of ["brand", "restaurantName", "tag", "day", "date", "tagline", "note"]) {
    if (!isStr(c[k])) return `field ${k} must be a string`;
  }
  if (!isImg(c.heroImage)) return "bad heroImage";
  if (!Array.isArray(c.sections) || c.sections.length > 30) return "sections must be an array";
  for (const s of c.sections) {
    if (!s || !isStr(s.title, 200) || !Array.isArray(s.items) || s.items.length > 60) return "bad section";
    for (const it of s.items) {
      if (!it || !isStr(it.name, 200) || !isStr(it.desc) || !isStr(it.price, 50) || !isImg(it.image)) return "bad item";
    }
  }
  return null;
}

/** Удаляет загруженные картинки, на которые контент больше не ссылается (старше суток). */
async function collectGarbage(content) {
  const images = getStore({ name: "images", consistency: "strong" });
  const used = new Set(JSON.stringify(content).match(/\/api\/image\/[\w.-]+/g) || []);
  const { blobs } = await images.list();
  for (const { key } of blobs) {
    if (used.has(`/api/image/${key}`)) continue;
    const meta = await images.getMetadata(key);
    const uploadedAt = Number(meta?.metadata?.uploadedAt || 0);
    if (Date.now() - uploadedAt > ORPHAN_AGE_MS) await images.delete(key);
  }
}

export default async (req) => {
  const store = getStore({ name: "site", consistency: "strong" });

  if (req.method === "GET") {
    const data = await store.get("content", { type: "json" });
    return json(data ?? null);
  }

  if (req.method === "PUT") {
    if (!isAuthorized(req)) return json({ error: "Unauthorized" }, 401);
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: "Content too large" }, 413);
    let content;
    try {
      content = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const err = validate(content);
    if (err) return json({ error: err }, 400);
    content.updatedAt = new Date().toISOString();
    await store.setJSON("content", content);
    try {
      await collectGarbage(content);
    } catch (e) {
      console.error("image GC failed", e);
    }
    return json({ ok: true, updatedAt: content.updatedAt });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/content" };
