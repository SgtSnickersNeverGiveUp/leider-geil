import { getStore } from "@netlify/blobs";

const STORE_NAME = "event-images";

export default async (req) => {
  const store = getStore(STORE_NAME);
  const url = new URL(req.url);
  const eventId = url.searchParams.get("id");

  if (!eventId) {
    return new Response(JSON.stringify({ error: "Event-ID fehlt." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET – Serve the stored event image
  if (req.method === "GET") {
    try {
      const meta = await store.get(`${eventId}-meta`, { type: "json" });
      if (!meta) {
        return new Response("No image", { status: 404 });
      }

      const imageData = await store.get(eventId, { type: "arrayBuffer" });
      if (!imageData) {
        return new Response("No image", { status: 404 });
      }

      return new Response(imageData, {
        status: 200,
        headers: {
          "Content-Type": meta.contentType || "image/jpeg",
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch {
      return new Response("Image not found", { status: 404 });
    }
  }

  // POST – Upload a new event image
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
      await store.set(eventId, new Uint8Array(buffer));

      // Store metadata
      await store.setJSON(`${eventId}-meta`, {
        contentType,
        size: buffer.byteLength,
        uploadedAt: new Date().toISOString(),
      });

      const imageUrl = `/api/event-image?id=${encodeURIComponent(eventId)}`;

      return new Response(
        JSON.stringify({ success: true, url: imageUrl, size: buffer.byteLength }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: "Fehler beim Upload." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // DELETE – Remove event image
  if (req.method === "DELETE") {
    try {
      await store.delete(eventId);
      await store.delete(`${eventId}-meta`);

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
  path: "/api/event-image",
};
