import { getStore } from "@netlify/blobs";

const STORE_NAME = "settings";
const SETTINGS_KEY = "site-settings";

export default async (req) => {
  const store = getStore(STORE_NAME);

  // GET – Return current settings
  if (req.method === "GET") {
    try {
      const settings = await store.get(SETTINGS_KEY, { type: "json" });
      return new Response(JSON.stringify(settings || {}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // POST – Save settings
  if (req.method === "POST") {
    try {
      const body = await req.json();

      // Merge with existing settings
      let existing = {};
      try {
        existing = (await store.get(SETTINGS_KEY, { type: "json" })) || {};
      } catch {}

      const updated = { ...existing, ...body, updatedAt: new Date().toISOString() };
      await store.setJSON(SETTINGS_KEY, updated);

      return new Response(JSON.stringify({ success: true, settings: updated }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Fehler beim Speichern." }), {
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
  path: "/api/settings",
};
