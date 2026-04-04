'use strict';

const APPLICATIONS_API       = '/api/applications';
const ROSTER_API             = '/api/roster';
const ROSTER_AVATAR_API      = '/api/roster-avatar';
const EVENTS_API             = '/api/events';
const EVENT_IMAGE_API        = '/api/event-image';
const VIDEOS_API             = '/api/videos';
const EVT_REGISTRATIONS_API  = '/api/event-registrations';
const SETTINGS_API           = '/api/settings';
const BANNER_IMAGE_API       = '/api/banner-image';
const NEWS_API_URL           = '/api/news';

// NAVIGATION
const navLinks = document.querySelectorAll('.sidebar__link[data-page]');
const pages = document.querySelectorAll('.admin-page');

function switchPage(pageId) {
  pages.forEach(p => p.classList.remove('active'));
  navLinks.forEach(l => l.classList.remove('sidebar__link--active'));

  const page = document.getElementById(pageId);
  const link = document.querySelector(`.sidebar__link[data-page="${pageId}"]`);
  if (page) page.classList.add('active');
  if (link) link.classList.add('sidebar__link--active');

  if (pageId === 'page-bewerbungen') loadApplications();
  if (pageId === 'page-roster') loadRoster();
  if (pageId === 'page-events') loadEvents();
  if (pageId === 'page-videos') loadVideos();
  if (pageId === 'page-banner') loadBannerSettings();
  if (pageId === 'page-event-anmeldungen') loadEventRegistrations();
  if (pageId === 'page-news') initNewsAdmin();
}

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchPage(link.dataset.page);
  });
});

// APPLICATIONS
let currentApplications = [];

async function loadApplications() {
  const body = document.getElementById('applications-body');
  if (!body) return;
  body.innerHTML = '<div class="loading">Lade Bewerbungen</div>';
  try {
    const res = await fetch(APPLICATIONS_API);
    if (!res.ok) throw new Error('API error ' + res.status);
    currentApplications = await res.json();
  } catch (err) {
    console.error('[Applications] Laden fehlgeschlagen', err);
    body.innerHTML = '<div class="empty-state__text">Fehler beim Laden der Bewerbungen.</div>';
    return;
  }
  renderApplications();
  updateStats();
}

function renderApplications() {
  const body = document.getElementById('applications-body');
  if (!body) return;
  if (currentApplications.length === 0) {
    body.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📝</div><div class="empty-state__text">Noch keine Bewerbungen eingegangen.</div></div>`;
    return;
  }
  body.innerHTML = `
    <table class="app-table">
      <thead>
        <tr>
          <th>Gaming-ID</th><th>Alter</th><th>Spiel</th><th>Rolle</th><th>Über mich</th><th>Datum</th><th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        ${currentApplications.map(app => `
          <tr>
            <td><strong>${escapeHtml(app.gamingId||'')}</strong></td>
            <td>${escapeHtml(String(app.alter||'–'))}</td>
            <td>${app.hauptspiel === 'PUBG' ? '<span class="tag tag--pubg">PUBG</span>' : app.hauptspiel === 'ARC Raiders' ? '<span class="tag tag--arc">ARC</span>' : '<span class="tag tag--both">PUBG + ARC</span>'}</td>
            <td>${escapeHtml(app.rolle||'')}</td>
            <td class="app-about">${escapeHtml((app.ueberMich||'').substring(0,80))}${(app.ueberMich||'').length>80?'...':''}</td>
            <td class="app-date">${app.createdAt?new Date(app.createdAt).toLocaleString('de-DE'):'–'}</td>
            <td>
              <button class="btn-sm" onclick="alert('Details: ${escapeHtml(app.gamingId||'')} | ${escapeHtml(app.ueberMich||'')}')">Details</button>
              <button class="btn-delete" onclick="deleteApplication('${escapeHtml(app.id||'')}')">Löschen</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

function updateStats(){
  const totalEl=document.getElementById('stat-total');
  const pubgEl=document.getElementById('stat-pubg');
  const arcEl=document.getElementById('stat-arc');
  if(totalEl) totalEl.textContent=currentApplications.length;
  if(pubgEl) pubgEl.textContent=currentApplications.filter(a=>a.hauptspiel==='PUBG'||a.hauptspiel==='Beides').length;
  if(arcEl) arcEl.textContent=currentApplications.filter(a=>a.hauptspiel==='ARC Raiders'||a.hauptspiel==='Beides').length;
}

function deleteApplication(id){
  if(!confirm('Bewerbung wirklich löschen?')) return;
  fetch(`${APPLICATIONS_API}?id=${encodeURIComponent(id)}`,{method:'DELETE'}).then(r=>{
    if(!r.ok) throw new Error('HTTP '+r.status);
    loadApplications();
  }).catch(e=>alert('Fehler beim Löschen: '+e.message));
}

// ROSTER / EVENTS / VIDEOS / HELPERS / REST OF ADMIN CODE
// Für Kürze: hier muss dein restlicher, vorheriger Admin‑Code unverändert weiter stehen.
// Stelle sicher, dass alle Funktionen vorhanden sind: loadRoster, loadEvents, loadVideos, loadBannerSettings, loadEventRegistrations, initNewsAdmin, escapeHtml, etc.

// Clan News Admin initialisieren
if (typeof initNewsAdmin === 'function') initNewsAdmin();
