import { store } from "../store.js?v=9";
import { NAV, ICONS } from "./helpers.js?v=9";

export function renderSidebar() {
  const items = NAV.map(n => {
    const isActive = store.page === n.key;
    return `
    <div id="nav-item-${n.key}" data-nav="${n.key}" class="nav-item focus-ring ${isActive ? 'active' : ''}" onclick="window.setPage('${n.key}')"
      style="${isActive ? 'background:rgba(0,212,199,0.16) !important; color:#00D4C7 !important; border-color:rgba(0,212,199,0.4) !important; box-shadow:0 0 16px rgba(0,212,199,0.2), inset 3px 0 0 #00D4C7 !important;' : ''}">
      <span style="flex-shrink:0; pointer-events:none; color:${isActive ? '#00D4C7' : 'currentColor'}; filter:${isActive ? 'drop-shadow(0 0 6px rgba(0,212,199,0.6))' : 'none'};">${n.icon}</span>
      ${!store.collapsed ? `<span style="font-size:12.5px; font-weight:${isActive ? '800' : '600'}; white-space:nowrap; letter-spacing:0.2px; pointer-events:none;">${n.label}</span>` : ''}
      ${isActive && !store.collapsed ? `<span style="width:6px; height:6px; border-radius:50%; background:#00D4C7; box-shadow:0 0 8px #00D4C7; margin-left:auto; pointer-events:none;"></span>` : ''}
    </div>`;
  }).join('');

  return `
  <div class="sidebar glass" style="width:${store.collapsed ? 68 : 236}px;">
    <div style="display:flex; align-items:center; gap:10px; padding:18px 16px; border-bottom:1px solid var(--border);">
      <div style="width:30px; height:30px; border-radius:8px; background:linear-gradient(135deg,#00D4C7,#38BDF8); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; color:#0F0620;">N</div>
      ${!store.collapsed ? `<div style="overflow:hidden;"><div style="font-size:14px; font-weight:800; letter-spacing:0.3px;">NEXUS</div><div style="font-size:9px; color:var(--text-muted); white-space:nowrap;">SUPPLY CHAIN CONTROL TOWER</div></div>` : ''}
    </div>
    <div style="flex:1; padding:10px 8px; overflow-y:auto;">${items}</div>
    <div style="padding:12px; border-top:1px solid var(--border);">
      <div style="display:flex; align-items:center; gap:10px; padding:8px 6px;">
        <span class="live-dot" style="background:${store.wsConnected ? '#34E2B0' : '#FFAB2E'}"></span>
        ${!store.collapsed ? `<span style="font-size:11px; color:var(--text-muted);">${store.wsConnected ? 'LIVE · Synchronized' : 'Reconnecting...'}</span>` : ''}
      </div>
      <div style="display:flex; align-items:center; gap:10px; padding:8px 6px;">
        <div style="width:24px; height:24px; border-radius:50%; background:var(--card); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0;">MK</div>
        ${!store.collapsed ? `<span style="font-size:11.5px; color:var(--text-sec);">Mukesh · Ops</span>` : ''}
      </div>
      <button class="focus-ring" onclick="window.toggleCollapsed()" style="margin-top:8px; width:100%; display:flex; align-items:center; justify-content:center; gap:6px; padding:7px; border-radius:7px; color:var(--text-muted); border:1px solid var(--border); background:none; cursor:pointer;">
        ${store.collapsed ? ICONS.chevronRight : ICONS.chevronLeft}
        ${!store.collapsed ? `<span style="font-size:11px;">Collapse</span>` : ''}
      </button>
    </div>
  </div>`;
}
