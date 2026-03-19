import { getStore } from "@netlify/blobs";

const STORE_NAME = "event-registrations";

export default async (req, context) => {
  const store = getStore(STORE_NAME);

  // POST – Submit new event registration
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { name, email, spiel, clan, spielerAnzahl, bemerkungen } = body;

      if (!name || !email || !spiel) {
        return new Response(JSON.stringify({ error: "Pflichtfelder fehlen (Name, E-Mail, Spiel)." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const registration = {
        id,
        name,
        email,
        spiel,
        clan: clan || "",
        spielerAnzahl: spielerAnzahl || "",
        bemerkungen: bemerkungen || "",
        createdAt: new Date().toISOString(),
      };

      await store.setJSON(id, registration);

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

  // GET – List all event registrations
  if (req.method === "GET") {
    try {
      const { blobs } = await store.list();
      const registrations = [];

      for (const blob of blobs) {
        const data = await store.get(blob.key, { type: "json" });
        if (data) registrations.push(data);
      }

      // Sort newest first
      registrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return new Response(JSON.stringify(registrations), {
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

  // DELETE – Remove event registration by id
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
  path: "/api/event-registrations",
};
