import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const id = context.params?.id || "";
  if (!/^[\w.-]+$/.test(id)) return new Response("Not found", { status: 404 });

  const images = getStore({ name: "images" });
  const blob = await images.getWithMetadata(id, { type: "arrayBuffer" });
  if (!blob) return new Response("Not found", { status: 404 });

  return new Response(blob.data, {
    headers: {
      "content-type": blob.metadata?.contentType || "application/octet-stream",
      // имя файла уникально и не меняется — можно кэшировать навсегда
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/api/image/:id" };
