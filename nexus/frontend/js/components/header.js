import { store } from "../store.js?v=8";
import { PAGE_META, ICONS } from "./helpers.js?v=8";

const FACILITIES = ["All Facilities", "Chennai DC", "Bangalore DC", "Mumbai DC", "Hyderabad DC"];

export function renderHeader() {
  const [t, s] = PAGE_META[store.page] || PAGE_META.overview;
  const facOptions = FACILITIES.map(f => `<option ${f === store.facility ? 'selected' : ''}>${f}</option>`).join('');
  const alertCount = store.alerts ? store.alerts.filter(a => a.status === 'Open').length : 0;

  return `
  <div class="header glass">
    <div>
      <div style="font-size:18px; font-weight:700; color:var(--text);">${t}</div>
      <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">${s}</div>
    </div>
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <div style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted);">
        <span class="live-dot" style="background:${store.wsConnected ? '#34E2B0' : '#FFAB2E'}"></span> 
        ${store.wsConnected ? 'LIVE · Server Synchronized' : 'Reconnecting...'}
      </div>
      <select onchange="window.setFacility(this.value)" class="mono focus-ring"
        style="background:var(--card); border:1px solid var(--border); border-radius:8px; padding:7px 10px; font-size:11.5px; color:var(--text); cursor:pointer;">
        ${facOptions}
      </select>
      <button id="headerSearchBtn" onclick="window.openPalette()" class="mono focus-ring"
        style="display:flex; align-items:center; gap:8px; background:var(--card); border:1px solid var(--border); border-radius:8px; padding:7px 12px; font-size:11.5px; color:var(--text-sec); cursor:pointer;">
        <span style="color:var(--cyan); font-size:12px;">🔍</span> Search <kbd style="font-size:9.5px; border:1px solid var(--border); padding:1px 5px; border-radius:4px; color:var(--text-muted); background:var(--bg2);">⌘K</kbd>
      </button>
      <div style="position:relative; color:var(--text-sec); cursor:pointer; padding:4px;" onclick="window.setPage('alerts')" title="View Active Alerts">
        ${ICONS.bell}
        <span id="notifBadge" style="position:absolute; top:-2px; right:-2px; background:#FF5C5C; color:#fff; font-size:9px; font-weight:700; border-radius:50%; width:15px; height:15px; display:${alertCount > 0 ? 'flex' : 'none'}; align-items:center; justify-content:center; box-shadow:0 0 8px #FF5C5C;">${alertCount}</span>
      </div>
    </div>
  </div>`;
}
