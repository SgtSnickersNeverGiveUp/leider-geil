import { getStore } from "@netlify/blobs";

const STORE_NAME = "roster-avatars";

export default async (req) => {
  const store = getStore(STORE_NAME);
  const url = new URL(req.url);
  const memberId = url.searchParams.get("id");

  if (!memberId) {
    return new Response(JSON.stringify({ error: "Member-ID fehlt." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET – Serve the stored avatar image
  if (req.method === "GET") {
    try {
      const meta = await store.get(`${memberId}-meta`, { type: "json" });
      if (!meta) {
        return new Response("No avatar", { status: 404 });
      }

      const imageData = await store.get(memberId, { type: "arrayBuffer" });
      if (!imageData) {
        return new Response("No avatar", { status: 404 });
      }

      return new Response(imageData, {
        status: 200,
        headers: {
          "Content-Type": meta.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch {
      return new Response("Avatar not found", { status: 404 });
    }
  }

  // POST – Upload a new avatar image
  if (req.method === "POST") {
    try {
      const contentType = req.headers.get("content-type") || "image/jpeg";

      // Validate content type
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(contentType)) {
        return new Response(
          JSON.stringify({ error: "Nur JPEG, PNG oder WebP erlaubt." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const buffer = await req.arrayBuffer();

      if (buffer.byteLength === 0) {
        return new Response(
          JSON.stringify({ error: "Keine Datei empfangen." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Max 5 MB
      if (buffer.byteLength > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Datei zu groß (max. 5 MB)." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Store image binary
      await store.set(memberId, new Uint8Array(buffer));

      // Store metadata
      await store.setJSON(`${memberId}-meta`, {
        contentType,
        size: buffer.byteLength,
        uploadedAt: new Date().toISOString(),
      });

      const avatarUrl = `/api/roster-avatar?id=${encodeURIComponent(memberId)}`;

      return new Response(
        JSON.stringify({ success: true, url: avatarUrl, size: buffer.byteLength }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: "Fehler beim Upload." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // DELETE – Remove avatar
  if (req.method === "DELETE") {
    try {
      await store.delete(memberId);
      await store.delete(`${memberId}-meta`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(
        JSON.stringify({ error: "Fehler beim Löschen." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  path: "/api/roster-avatar",
};
