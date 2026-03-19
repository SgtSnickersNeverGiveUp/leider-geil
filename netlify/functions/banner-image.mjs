import { getStore } from "@netlify/blobs";

const STORE_NAME = "banner";
const BANNER_KEY = "header-banner";
const META_KEY = "header-banner-meta";

export default async (req) => {
  const store = getStore(STORE_NAME);

  // GET – Serve the stored banner image
  if (req.method === "GET") {
    try {
      const meta = await store.get(META_KEY, { type: "json" });
      if (!meta) {
        return new Response("No banner uploaded", { status: 404 });
      }

      const imageData = await store.get(BANNER_KEY, { type: "arrayBuffer" });
      if (!imageData) {
        return new Response("No banner uploaded", { status: 404 });
      }

      return new Response(imageData, {
        status: 200,
        headers: {
          "Content-Type": meta.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch (err) {
      return new Response("Banner not found", { status: 404 });
    }
  }

  // POST – Upload a new banner image
  if (req.method === "POST") {
    try {
      const contentType = req.headers.get("content-type") || "image/jpeg";
      const buffer = await req.arrayBuffer();

      if (buffer.byteLength === 0) {
        return new Response(JSON.stringify({ error: "Keine Datei empfangen." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Max 10MB
      if (buffer.byteLength > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "Datei zu groß (max. 10 MB)." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Store image binary
      await store.set(BANNER_KEY, new Uint8Array(buffer));

      // Store metadata
      await store.setJSON(META_KEY, {
        contentType,
        size: buffer.byteLength,
        uploadedAt: new Date().toISOString(),
      });

      return new Response(JSON.stringify({
        success: true,
        url: "/api/banner-image",
        size: buffer.byteLength,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fehler beim Upload." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/banner-image",
};
