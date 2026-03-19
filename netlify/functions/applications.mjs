import { getStore } from "@netlify/blobs";

const STORE_NAME = "applications";

export default async (req, context) => {
  const store = getStore(STORE_NAME);

  // POST – Submit new application
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { gamingId, alter, hauptspiel, rolle, ueberMich } = body;

      if (!gamingId || !alter || !hauptspiel || !rolle || !ueberMich) {
        return new Response(JSON.stringify({ error: "Alle Felder müssen ausgefüllt sein." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const id = `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const application = {
        id,
        gamingId,
        alter: Number(alter),
        hauptspiel,
        rolle,
        ueberMich,
        createdAt: new Date().toISOString(),
      };

      await store.setJSON(id, application);

      return new Response(JSON.stringify({ success: true, id }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fehler beim Speichern." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // GET – List all applications
  if (req.method === "GET") {
    try {
      const { blobs } = await store.list();
      const applications = [];

      for (const blob of blobs) {
        const data = await store.get(blob.key, { type: "json" });
        if (data) applications.push(data);
      }

      // Sort newest first
      applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return new Response(JSON.stringify(applications), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fehler beim Laden." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // DELETE – Remove application by id
  if (req.method === "DELETE") {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return new Response(JSON.stringify({ error: "ID fehlt." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await store.delete(id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fehler beim Löschen." }), {
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
  path: "/api/applications",
};
