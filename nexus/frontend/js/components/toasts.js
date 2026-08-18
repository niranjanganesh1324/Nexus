import { store } from "../store.js?v=11";
import { ICONS } from "./helpers.js?v=11";

export function renderToasts() {
  const colors = { success: "#1FD9A0", info: "#38BDF8", warning: "#FFAB2E", error: "#FF5C5C" };
  return store.toasts.map(t => `
    <div class="toast-in card-elevated" style="padding:12px 14px; min-width:280px; border-left:3px solid ${colors[t.type] || colors.info}; display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
      <div>
        <div style="font-size:12.5px; font-weight:600; color:var(--text);">${t.title}</div>
        ${t.msg ? `<div style="font-size:11.5px; color:var(--text-sec); margin-top:2px;">${t.msg}</div>` : ''}
      </div>
      <button onclick="window.removeToast(${t.id})" style="color:var(--text-muted); background:none; border:none; cursor:pointer;">${ICONS.x}</button>
    </div>`).join('');
}

export function addToast(t) {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  store.toasts.push({ ...t, id });
  const el = document.getElementById('toastRegion');
  if (el) el.innerHTML = renderToasts();
  setTimeout(() => removeToast(id), 4200);
}

export function removeToast(id) {
  store.toasts = store.toasts.filter(t => t.id !== id);
  const el = document.getElementById('toastRegion');
  if (el) el.innerHTML = renderToasts();
}

export function renderPalette() {
  if (!store.paletteOpen) return '';
  return `
  <div id="paletteOverlay" style="position:fixed; inset:0; z-index:999999; display:flex; align-items:flex-start; justify-content:center; padding-top:12vh; width:100vw; height:100vh;">
    <!-- Dark Backdrop -->
    <div class="backdrop-in" onclick="window.closePalette()"
      style="position:absolute; inset:0; background:rgba(4,9,18,0.82); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); cursor:pointer;"></div>

    <!-- Modal Dialog -->
    <div class="anim-in" onclick="event.stopPropagation()"
      style="position:relative; z-index:1000000; width:620px; max-width:92vw; border-radius:18px; overflow:hidden; border:1.5px solid var(--border); box-shadow:0 30px 80px rgba(0,0,0,0.85); background:#0D1B2A;">
      
      <!-- Search Input Header -->
      <div style="display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid var(--border); background:rgba(255,255,255,0.03);">
        <span style="color:var(--cyan); font-size:18px;">${ICONS.search}</span>
        <input id="paletteInput" value="${store.paletteQuery || ''}" oninput="window.onPaletteInput(this.value)"
          placeholder="Search modules, trucks, facilities, collections, docks, alerts…"
          style="flex:1; background:transparent; border:none; color:var(--text); font-size:15px; font-weight:600; outline:none;"
          autofocus />
        <kbd class="mono" onclick="window.closePalette()"
          style="font-size:10.5px; color:var(--text-muted); border:1px solid var(--border); padding:3px 8px; border-radius:6px; cursor:pointer; background:var(--bg);">ESC</kbd>
      </div>

      <!-- Results Body -->
      <div id="paletteResults" style="max-height:380px; overflow-y:auto; padding:6px 0;">
        ${renderPaletteResults()}
      </div>

      <!-- Footer Help -->
      <div style="padding:10px 18px; border-top:1px solid var(--border); background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-muted);">
        <span>Tip: Press ESC to close or click any result to jump in</span>
        <span class="mono" style="color:var(--cyan); font-weight:700;">NEXUS Omni-Search</span>
      </div>
    </div>
  </div>`;
}

// Built-in Knowledge Base for Instant Global Search
const STATIC_SEARCH_CATALOG = [
  // Core Pages
  { type: "MODULE", label: "Overview & Control Tower", sub: "End-to-end executive supply chain visibility", page: "overview", color: "#00D4C7" },
  { type: "MODULE", label: "Integrated S&OP Planning", sub: "Rolling monthly plan, supply plan, production capacity", page: "sop", color: "#38BDF8" },
  { type: "MODULE", label: "Demand Planning & Forecasting", sub: "AI forecast accuracy, seasonality, leading indicators", page: "demand", color: "#FF4FA3" },
  { type: "MODULE", label: "Inventory Runway & Safety Stock", sub: "SKU-level coverage, excess, and stockout risk", page: "inventory", color: "#34E2B0" },
  { type: "MODULE", label: "Fabric & Raw Material Procurement", sub: "MOQ, lead times, purchase orders, supplier risk", page: "procurement", color: "#9B7BFF" },
  { type: "MODULE", label: "Markdown Intelligence Engine", sub: "Sell-through velocity, discount timing, margin protection", page: "markdown", color: "#FFAB2E" },
  { type: "MODULE", label: "Financial Impact & Cost Analysis", sub: "Revenue, holding costs, margin exposure by scenario", page: "financial", color: "#55A6FF" },
  { type: "MODULE", label: "Active Network Shipments", sub: "Track all in-transit freight across facilities", page: "shipments", color: "#38BDF8" },
  { type: "MODULE", label: "Where's My Truck? (Live GPS)", sub: "Live map, speed, distance remaining, driver telemetry", page: "trucks", color: "#00D4C7" },
  { type: "MODULE", label: "Yard & Dock Management", sub: "Real-time door status, turnaround times, disruptions", page: "yard", color: "#FFC94D" },
  { type: "MODULE", label: "Trailer → Door Allocation", sub: "Scheduled arrival slots, door assignments, unload status", page: "allocation", color: "#34E2B0" },
  { type: "MODULE", label: "Alerts & Operational Exceptions", sub: "Critical disruptions, shipment delays, stockout warnings", page: "alerts", color: "#FF5C5C" },
  { type: "MODULE", label: "Scenario Simulation Engine", sub: "Simulate demand surges, transport delays, capacity changes", page: "scenarios", color: "#9B7BFF" },
  { type: "MODULE", label: "Cross-Functional Decision Center", sub: "Align Merchandising, Logistics, and Plant Managers", page: "decision", color: "#00D4C7" },
  { type: "MODULE", label: "Executive Performance Reports", sub: "OTIF, inventory turns, forecast accuracy exports", page: "reports", color: "#55A6FF" },

  // Live Fleet Trucks
  { type: "TRUCK", label: "TRK-104 (Chennai Plant → Bangalore DC)", sub: "Carrying 850u Premium Linen · Driver: Ramesh K · GPS Active", page: "trucks", id: "TRK-104", color: "#FF7A7A" },
  { type: "TRUCK", label: "TRK-101 (Mumbai Plant → Mumbai DC)", sub: "Carrying 1,200u Denim Fabric · Driver: Anand S · In Transit", page: "trucks", id: "TRK-101", color: "#34E2B0" },
  { type: "TRUCK", label: "TRK-102 (Hyderabad Plant → Hyderabad DC)", sub: "Carrying 950u Poly Blend · Driver: Vijay M · On Schedule", page: "trucks", id: "TRK-102", color: "#34E2B0" },
  { type: "TRUCK", label: "TRK-103 (Bangalore Plant → Chennai DC)", sub: "Carrying 700u Cotton Jersey · Driver: Suresh P · Arrived", page: "trucks", id: "TRK-103", color: "#55A6FF" },
  { type: "TRUCK", label: "TRK-105 (Mumbai DC → Bangalore DC)", sub: "Carrying 1,400u Finished Goods · Driver: Rajesh G · En Route", page: "trucks", id: "TRK-105", color: "#34E2B0" },
  { type: "TRUCK", label: "TRK-106 (Chennai DC → Hyderabad DC)", sub: "Carrying 1,100u Accessories · Driver: Karthik N · In Transit", page: "trucks", id: "TRK-106", color: "#34E2B0" },

  // Facilities
  { type: "FACILITY", label: "Bangalore DC (Distribution Hub)", sub: "Primary South Central Hub · 8 Docks · 88% Utilization", page: "yard", color: "#38BDF8" },
  { type: "FACILITY", label: "Chennai Plant (Fabrication)", sub: "Weaving & Dyeing Center · Lead Time: 5 Days", page: "sop", color: "#9B7BFF" },
  { type: "FACILITY", label: "Mumbai DC (West Hub)", sub: "High throughput distribution facility · 6 Docks", page: "yard", color: "#38BDF8" },
  { type: "FACILITY", label: "Hyderabad DC (Central Hub)", sub: "Apparel fulfillment center · 6 Docks", page: "yard", color: "#38BDF8" },

  // Product Collections
  { type: "COLLECTION", label: "Summer Linen Collection", sub: "Apparel line · High risk · Linked to TRK-104 material delivery", page: "inventory", color: "#FFAB2E" },
  { type: "COLLECTION", label: "Denim Core Collection", sub: "High volume staple · 42 days coverage · Healthy", page: "inventory", color: "#34E2B0" },
  { type: "COLLECTION", label: "Activewear Performance Line", sub: "Fast growth line · 28 days coverage", page: "demand", color: "#38BDF8" },
  { type: "COLLECTION", label: "Winter Jacket Collection", sub: "Seasonal pre-build · Fabrication in progress", page: "procurement", color: "#9B7BFF" },

  // Docks
  { type: "DOCK", label: "Dock D01 (Zone A - Inbound)", sub: "Available · Auto-scheduling enabled", page: "yard", color: "#34E2B0" },
  { type: "DOCK", label: "Dock D04 (Zone B - Inbound Priority)", sub: "Recommended for TRK-104 · Compatible with cold/apparel freight", page: "yard", color: "#00D4C7" },
  { type: "DOCK", label: "Dock D03 (Zone A - Outbound)", sub: "Active unloading · Fast turn slot", page: "yard", color: "#55A6FF" },

  // Critical Alerts
  { type: "ALERT", label: "Shipment Delay — TRK-104", sub: "32 mins delayed on Chennai-Bangalore highway · Dock reassignment ready", page: "alerts", color: "#FF5C5C" },
  { type: "ALERT", label: "Demand Surge — South Region", sub: "Sportswear orders +21% above forecast · Production adjust recommended", page: "alerts", color: "#FF5C5C" }
];

export function renderPaletteResults() {
  const q = (store.paletteQuery || "").trim().toLowerCase();

  // Quick Action Suggestions on Empty Search
  if (!q) {
    return `
    <div style="padding:14px 18px;">
      <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Quick Suggestions</div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
        ${[
          { label: "🚚 TRK-104", page: "trucks", id: "TRK-104" },
          { label: "📊 S&OP Master Plan", page: "sop" },
          { label: "🏢 Bangalore DC Yard", page: "yard" },
          { label: "⚡ Scenario Simulator", page: "scenarios" },
          { label: "🔴 Review Alerts", page: "alerts" },
          { label: "📦 Summer Linen Inventory", page: "inventory" }
        ].map(s => `
          <button onclick="window.paletteNavigate('${s.page}', '${s.id || ''}')"
            style="background:var(--bg); border:1px solid var(--border); color:var(--text-sec); padding:6px 12px; border-radius:8px; font-size:11.5px; font-weight:600; cursor:pointer; transition:all 0.15s ease;"
            onmouseenter="this.style.borderColor='var(--cyan)'; this.style.color='var(--cyan)';"
            onmouseleave="this.style.borderColor='var(--border)'; this.style.color='var(--text-sec)';">
            ${s.label}
          </button>`).join('')}
      </div>

      <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Recent Modules</div>
      <div>
        ${STATIC_SEARCH_CATALOG.slice(0, 4).map(r => `
          <div onclick="window.paletteNavigate('${r.page}', '${r.id || ''}')"
            style="padding:10px 14px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; margin-bottom:4px; transition:background 0.15s ease;"
            onmouseenter="this.style.background='rgba(0,212,199,0.08)'" onmouseleave="this.style.background='transparent'">
            <div>
              <div style="font-size:13px; font-weight:700; color:var(--text);">${r.label}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${r.sub}</div>
            </div>
            <span class="badge" style="background:${r.color}22; color:${r.color}; border-color:${r.color}44; font-size:9.5px;">${r.type}</span>
          </div>`).join('')}
      </div>
    </div>`;
  }

  // Filter Catalog
  const matches = STATIC_SEARCH_CATALOG.filter(item =>
    item.label.toLowerCase().includes(q) ||
    item.sub.toLowerCase().includes(q) ||
    item.type.toLowerCase().includes(q) ||
    (item.id && item.id.toLowerCase().includes(q))
  );

  if (matches.length === 0) {
    return `
    <div style="padding:32px 20px; text-align:center;">
      <div style="font-size:24px; margin-bottom:8px;">🔍</div>
      <div style="font-size:13.5px; font-weight:700; color:var(--text);">No matches found for "${q}"</div>
      <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">Try searching for <b>TRK-104</b>, <b>S&OP</b>, <b>Bangalore DC</b>, <b>Summer Linen</b>, or <b>Alerts</b>.</div>
    </div>`;
  }

  return matches.slice(0, 8).map(r => `
    <div onclick="window.paletteNavigate('${r.page}', '${r.id || ''}')"
      style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; border-bottom:1px solid var(--border); transition:all 0.15s ease;"
      onmouseenter="this.style.background='rgba(0,212,199,0.1)'" onmouseleave="this.style.background='transparent'">
      <div>
        <div style="font-size:13px; font-weight:700; color:var(--text);">${r.label}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${r.sub}</div>
      </div>
      <span class="badge" style="background:${r.color}22; color:${r.color}; border-color:${r.color}44; font-size:9.5px;">${r.type}</span>
    </div>`).join('');
}
