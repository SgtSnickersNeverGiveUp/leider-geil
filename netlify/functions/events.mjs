import { getStore } from "@netlify/blobs";

const STORE_NAME = "events";

const DEFAULT_EVENTS = [
  {
    id: "e001",
    title: "Clan-Gründung",
    date: "2024-08-25",
    game: "PUBG",
    description: "Leider Geil wurde offiziell gegründet – die ersten Squads stehen!",
    type: "milestone",
  },
  {
    id: "e002",
    title: "Erster PUBG Custom Match",
    date: "2024-09-15",
    game: "PUBG",
    description: "Unser erstes internes Custom-Match mit 24 Teilnehmern.",
    type: "match",
  },
  {
    id: "e003",
    title: "ARC Raiders Early Access",
    date: "2025-01-20",
    game: "ARC Raiders",
    description: "Start der ARC Raiders Division – Recruiting-Phase beginnt.",
    type: "milestone",
  },
  {
    id: "e004",
    title: "Community Night #1",
    date: "2025-03-08",
    game: "Mixed",
    description: "Erste große Community Night mit Giveaways und Turnieren.",
    type: "event",
  },
  {
    id: "e005",
    title: "Saison 2 – Ranked Push",
    date: "2025-06-01",
    game: "PUBG",
    description: "Gemeinsamer Ranked-Push: Ziel ist Top 500 EU.",
    type: "match",
  },
];

async function seedIfEmpty(store) {
  const { blobs } = await store.list();
  if (blobs.length === 0) {
    for (const event of DEFAULT_EVENTS) {
      await store.setJSON(event.id, event);
    }
  }
}

export default async (req) => {
  const store = getStore(STORE_NAME);

  // POST – Add new event
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { title, date, game } = body;

      if (!title || !date || !game) {
        return new Response(JSON.stringify({ error: "Titel, Datum und Spiel sind Pflichtfelder." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const id = `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const event = {
        id,
        title,
        date,
        game,
        description: body.description || "",
        type: body.type || "event",
        image: body.image || "",
      };

      await store.setJSON(id, event);

      return new Response(JSON.stringify({ success: true, id, event }), {
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

  // GET – List all events
  if (req.method === "GET") {
    try {
      await seedIfEmpty(store);
      const { blobs } = await store.list();
      const events = [];

      for (const blob of blobs) {
        const data = await store.get(blob.key, { type: "json" });
        if (data) events.push(data);
      }

      // Sort newest first
      events.sort((a, b) => new Date(b.date) - new Date(a.date));

      return new Response(JSON.stringify(events), {
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

  // PUT – Update existing event
  if (req.method === "PUT") {
    try {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: "ID fehlt." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const existing = await store.get(id, { type: "json" });
      if (!existing) {
        return new Response(JSON.stringify({ error: "Event nicht gefunden." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const updated = {
        ...existing,
        title: body.title || existing.title,
        date: body.date || existing.date,
        game: body.game || existing.game,
        description: body.description !== undefined ? body.description : existing.description,
        type: body.type || existing.type,
        image: body.image !== undefined ? body.image : existing.image,
      };

      await store.setJSON(id, updated);

      return new Response(JSON.stringify({ success: true, event: updated }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fehler beim Aktualisieren." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // DELETE – Remove event by id
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
  path: "/api/events",
};
