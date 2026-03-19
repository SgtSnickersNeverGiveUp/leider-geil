// Netlify Function: Twitch Live-Status for SgtSnickersNeverGiveUp
// 1. Auth-Step:   POST → https://id.twitch.tv/oauth2/token  (client_credentials)
// 2. Status-Step: GET  → https://api.twitch.tv/helix/streams?user_login=...
// 3. Validation:  data[] empty → OFFLINE | data[] present → LIVE + viewer_count
// 4. No-Cache:    Cache-Control: no-store on every response
// 5. Error-Check: 401 / 403 logged to console for Netlify backend visibility

const CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const TWITCH_USER = "sgtsnickersnevergiveup";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...NO_CACHE_HEADERS,
    },
  });
}

// ── Auth-Step: obtain an access_token via client_credentials ──
async function getAccessToken() {
  const tokenUrl = "https://id.twitch.tv/oauth2/token";

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[twitch-status] Token-Request fehlgeschlagen – HTTP ${res.status}: ${text.slice(0, 300)}`
    );
    throw new Error(`Token-Request fehlgeschlagen (HTTP ${res.status})`);
  }

  const data = await res.json();

  if (!data.access_token) {
    console.error("[twitch-status] Token-Antwort enthält kein access_token", data);
    throw new Error("Token-Antwort enthält kein access_token");
  }

  return data.access_token;
}

// ── Status-Step: query Helix streams endpoint ──
async function getStreamStatus(token) {
  const helixUrl = `https://api.twitch.tv/helix/streams?user_login=${TWITCH_USER}`;

  const res = await fetch(helixUrl, {
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });

  // Error-Check: log 401 / 403 so they are visible in the Netlify function logs
  if (res.status === 401 || res.status === 403) {
    const text = await res.text().catch(() => "");
    console.error(
      `[twitch-status] Helix API Fehler – HTTP ${res.status}: ${text.slice(0, 300)}`
    );
    throw new Error(`Helix API Fehler (HTTP ${res.status})`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[twitch-status] Helix API unerwartet – HTTP ${res.status}: ${text.slice(0, 300)}`
    );
    throw new Error(`Helix API Fehler (HTTP ${res.status})`);
  }

  return res.json();
}

// ── Handler ──
export default async () => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      console.error("[twitch-status] TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET not set");
      return jsonResponse({ live: false, error: "Twitch credentials not configured" }, 500);
    }

    // 1. Auth-Step
    const token = await getAccessToken();

    // 2. Status-Step
    const result = await getStreamStatus(token);

    // 3. Validation
    if (!result.data || result.data.length === 0) {
      // OFFLINE
      return jsonResponse({ live: false });
    }

    // LIVE
    const stream = result.data[0];
    return jsonResponse({
      live: true,
      viewer_count: stream.viewer_count,
      title: stream.title,
      game_name: stream.game_name,
    });
  } catch (err) {
    console.error("[twitch-status] ERROR:", err.message);
    return jsonResponse({ live: false, error: err.message }, 502);
  }
};

export const config = {
  path: "/api/twitch-status",
};
