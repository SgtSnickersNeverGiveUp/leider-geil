/* ==========================================================
   script.js – „Leider Geil" Clan Website
   Modulare ES6-Funktionen · async/await · IntersectionObserver
   ========================================================== */

'use strict';

/* ── Helper: DOM-Abfrage ───────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ══════════════════════════════════════════════════════════
   1. Video-Quellen setzen
   ══════════════════════════════════════════════════════════ */
function initVideos() {
  const pubgFrame = $('#video-pubg');
  const arcFrame = $('#video-arc');
  if (pubgFrame) pubgFrame.src = SITE_CONFIG.videoPUBG;
  if (arcFrame) arcFrame.src = SITE_CONFIG.videoARC;
}

/* ══════════════════════════════════════════════════════════
   2. Discord API – Member Count (öffentliches Widget)
   ══════════════════════════════════════════════════════════ */
async function fetchDiscordStatus() {
  const el = $('#discord-count');
  if (!el) return;

  try {
    const res = await fetch(SITE_CONFIG.discordWidgetApi);
    if (!res.ok) throw new Error(`Discord API ${res.status}`);
    const data = await res.json();
    const online = data.presence_count ?? '–';
    el.textContent = `${online} Online`;
    const dot = $('#discord-dot');
    if (dot && online > 0) dot.classList.add('live-status__dot--online');
  } catch (err) {
    console.warn('[Discord]', err.message);
    el.textContent = 'Offline';
  }
}

/* ══════════════════════════════════════════════════════════
   3. Twitch API – Live-Status (via Netlify Function)
   ══════════════════════════════════════════════════════════ */
async function fetchTwitchStatus() {
  const el = $('#twitch-status');
  if (!el) return;

  try {
    const res = await fetch('/api/twitch-status');
    if (!res.ok) throw new Error(`Twitch API ${res.status}`);
    const data = await res.json();
    const dot = $('#twitch-dot');

    if (data.live) {
      el.innerHTML = '<span class="twitch-live-label">● LIVE</span>&nbsp; ' + data.viewer_count + ' Zuschauer';
      if (dot) {
        dot.classList.add('live-status__dot--live');
        dot.classList.remove('live-status__dot--online');
      }
    } else {
      el.textContent = 'OFFLINE';
      if (dot) {
        dot.classList.remove('live-status__dot--live');
        dot.classList.remove('live-status__dot--online');
      }
      // Log error details to console for debugging
      if (data.error) {
        console.warn('[Twitch] API returned error:', data.errorType, data.error);
      }
    }
  } catch (err) {
    console.warn('[Twitch]', err.message);
    el.textContent = 'OFFLINE';
  }
}

/* ══════════════════════════════════════════════════════════
   4. Roster Rendering
   ══════════════════════════════════════════════════════════ */
async function renderRoster() {
  const grid = $('#roster-grid');
  if (!grid) return;

  try {
    // Try API first, fall back to static JSON
    let members;
    try {
      const res = await fetch(SITE_CONFIG.rosterApi || '/api/roster');
      if (!res.ok) throw new Error('API unavailable');
      members = await res.json();
    } catch {
      const res = await fetch(SITE_CONFIG.rosterPath);
      if (!res.ok) throw new Error(`Roster fetch ${res.status}`);
      members = await res.json();
    }

    grid.innerHTML = members.map(m => {
      const avatarSrc = m.avatar
        ? m.avatar + (m.avatar.startsWith('/api/roster-avatar') ? (m.avatar.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 60000) : '')
        : `https://via.placeholder.com/160/1a1a2e/0FF2A9?text=${encodeURIComponent((m.name || '??').slice(0, 2).toUpperCase())}`;

      return `
      <article class="roster-card">
        <img class="roster-card__avatar"
             src="${avatarSrc}"
             alt="${m.name}"
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/160/1a1a2e/0FF2A9?text=${encodeURIComponent((m.name || '??').slice(0, 2).toUpperCase())}'">
        <h3 class="roster-card__name">${m.name}</h3>
        <p class="roster-card__role">${m.role}</p>
        <div class="roster-card__games">
          ${(m.games || []).map(g => {
            const cls = g === 'PUBG' ? 'pubg' : g === 'ARC Raiders' ? 'arc' : 'other';
            return `<span class="roster-card__tag roster-card__tag--${cls}">${g}</span>`;
          }).join('')}
        </div>
        ${m.bio ? `<p class="roster-card__bio">${m.bio}</p>` : ''}
      </article>`;
    }).join('');
  } catch (err) {
    console.error('[Roster]', err);
    grid.innerHTML = '<p style="color:var(--clr-danger);">Roster konnte nicht geladen werden.</p>';
  }
}

/* ══════════════════════════════════════════════════════════
   5. Event Timeline Rendering + IntersectionObserver
   ══════════════════════════════════════════════════════════ */
async function renderTimeline() {
  const wrap = $('#timeline');
  if (!wrap) return;

  try {
    // Try API first, fall back to static JSON
    let events;
    try {
      const res = await fetch(SITE_CONFIG.eventsApi || '/api/events');
      if (!res.ok) throw new Error('API unavailable');
      events = await res.json();
    } catch {
      const res = await fetch(SITE_CONFIG.eventsPath);
      if (!res.ok) throw new Error(`Events fetch ${res.status}`);
      events = await res.json();
    }

    // Sortiere nach Datum absteigend
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    wrap.innerHTML = events.map(e => {
      const dotClass = e.game === 'PUBG' ? 'timeline__dot--pubg' : '';
      const dateStr = new Date(e.date).toLocaleDateString('de-DE', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      const imgSrc = e.image
        ? e.image + (e.image.startsWith('/api/event-image') ? (e.image.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 60000) : '')
        : '';
      const imgHtml = imgSrc
        ? `<img class="timeline__image" src="${imgSrc}" alt="${e.title}" loading="lazy" onerror="this.style.display='none'">`
        : '';
      return `
        <div class="timeline__item" data-id="${e.id}">
          <div class="timeline__dot ${dotClass}"></div>
          <div class="timeline__card">
            ${imgHtml}
            <time class="timeline__date">${dateStr}</time>
            <h3 class="timeline__title">${e.title}</h3>
            <p class="timeline__desc">${e.description}</p>
            <span class="timeline__type">${e.type}</span>
          </div>
        </div>`;
    }).join('');

    observeTimeline();
  } catch (err) {
    console.error('[Timeline]', err);
    wrap.innerHTML = '<p style="color:var(--clr-danger);">Events konnten nicht geladen werden.</p>';
  }
}

function observeTimeline() {
  const items = $$('.timeline__item');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((item) => observer.observe(item));
}

/* ══════════════════════════════════════════════════════════
   6. Header Banner (from Admin Settings)
   ══════════════════════════════════════════════════════════ */
async function renderHeaderBanner() {
  const section = $('#header-banner');
  const img = $('#header-banner-img');
  if (!section || !img) return;

  try {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const settings = await res.json();

    if (settings.bannerUrl) {
      const imgUrl = settings.bannerUrl === '/api/banner-image'
        ? settings.bannerUrl + '?t=' + Math.floor(Date.now() / 60000)
        : settings.bannerUrl;
      img.src = imgUrl;
      img.onload = () => { section.style.display = ''; };
      img.onerror = () => { section.style.display = 'none'; };
    }
  } catch (err) {
    console.warn('[Banner]', err.message);
  }
}

/* ══════════════════════════════════════════════════════════
   7. Video Gallery Rendering
   ══════════════════════════════════════════════════════════ */
async function renderVideoGallery() {
  const grid = $('#video-gallery-grid');
  if (!grid) return;

  try {
    const res = await fetch(SITE_CONFIG.videosApi || '/api/videos');
    if (!res.ok) throw new Error(`Videos fetch ${res.status}`);
    const videos = await res.json();

    if (videos.length === 0) {
      grid.innerHTML = '<p style="color:var(--clr-text-muted);text-align:center;font-family:var(--ff-mono);font-size:.9rem;">Noch keine Videos vorhanden.</p>';
      return;
    }

    grid.innerHTML = videos.map(v => `
      <a class="video-card" href="https://www.youtube.com/watch?v=${v.videoId}" target="_blank" rel="noopener">
        <div class="video-card__thumb-wrap">
          <img class="video-card__thumb" src="${v.thumbnail}" alt="${v.title}" loading="lazy">
          <div class="video-card__play">&#9654;</div>
        </div>
        <h3 class="video-card__title">${v.title}</h3>
      </a>
    `).join('');
  } catch (err) {
    console.error('[Videos]', err);
    grid.innerHTML = '';
  }
}

/* ══════════════════════════════════════════════════════════
   7. Mikro-Interaktionen
   ══════════════════════════════════════════════════════════ */

/* Button Ripple-Effekt */
function initRipple() {
  $$('.btn').forEach((btn) => {
    /* Skip submit buttons – no JS should interfere with form submission */
    if (btn.type === 'submit') return;
    btn.addEventListener('click', function (e) {
      const circle = document.createElement('span');
      circle.classList.add('ripple');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = `${size}px`;
      circle.style.left = `${e.clientX - rect.left - size / 2}px`;
      circle.style.top = `${e.clientY - rect.top - size / 2}px`;
      this.appendChild(circle);
      circle.addEventListener('animationend', () => circle.remove());
    });
  });
}

/* ══════════════════════════════════════════════════════════
   8. Navbar Mobile Toggle
   ══════════════════════════════════════════════════════════ */
function initNavbar() {
  const toggle = $('#nav-toggle');
  const links = $('#nav-links');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
    const isOpen = links.classList.contains('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Schließe Menü bei Klick auf Link
  $$('a', links).forEach((a) => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });
}

/* ══════════════════════════════════════════════════════════
   9. Live-Update Intervalle
   ══════════════════════════════════════════════════════════ */
function startLiveUpdates() {
  setInterval(fetchDiscordStatus, SITE_CONFIG.discordRefreshInterval);
  setInterval(fetchTwitchStatus, SITE_CONFIG.twitchRefreshInterval);
}

/* ══════════════════════════════════════════════════════════
   10. Smooth scroll for anchor links
   ══════════════════════════════════════════════════════════ */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════
   11. Event-Anmeldung Formular
   ══════════════════════════════════════════════════════════ */
function initEventForm() {
  const form = $('#event-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    try {
      // Send to Netlify Forms (keep as backup)
      const netlifyRes = fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString(),
      });

      // Also store via API for admin dashboard display
      const apiRes = fetch(SITE_CONFIG.eventRegistrationsApi || '/api/event-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name-gaming-id'),
          email: formData.get('email'),
          spiel: formData.get('spiel'),
          clan: formData.get('clan-name'),
          spielerAnzahl: formData.get('anzahl-spieler'),
          bemerkungen: formData.get('bemerkungen'),
        }),
      });

      // Wait for both – the API call is the primary storage
      const [, apiResult] = await Promise.allSettled([netlifyRes, apiRes]);
      if (apiResult.status === 'rejected' || (apiResult.value && !apiResult.value.ok)) {
        throw new Error('Speichern fehlgeschlagen');
      }

      form.style.display = 'none';
      const msg = $('#event-form-success');
      if (msg) msg.style.display = 'block';
    } catch (err) {
      console.error('[Event-Formular]', err);
      alert('Fehler beim Senden. Bitte versuche es erneut.');
    }
  });
}

/* ══════════════════════════════════════════════════════════
   INIT – Alles starten wenn DOM bereit
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initVideos();
  initNavbar();
  initSmoothScroll();
  initRipple();
  initEventForm();

  // Daten laden
  renderRoster();
  renderTimeline();
  renderVideoGallery();
  renderHeaderBanner();

  // Live-Status: sofort + Intervall
  fetchDiscordStatus();
  fetchTwitchStatus();
  startLiveUpdates();
});
