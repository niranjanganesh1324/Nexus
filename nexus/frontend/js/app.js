import { API } from "./api.js?v=11";
import { store } from "./store.js?v=11";
import { initRealtime } from "./realtime.js?v=11";

import { renderSidebar } from "./components/sidebar.js?v=11";
import { renderHeader } from "./components/header.js?v=11";
import { renderToasts, addToast, removeToast, renderPalette, renderPaletteResults } from "./components/toasts.js?v=11";
import { NAV } from "./components/helpers.js?v=11";

import { renderOverviewPage } from "./pages/overview.js?v=11";
import { renderTrucksPage, initTrucksMap, updateTrucksLiveTelemetry, highlightTruckOnMap } from "./pages/trucks.js?v=11";
import { renderYardPage } from "./pages/yard.js?v=11";
import { renderAllocationPage } from "./pages/allocation.js?v=11";
import { renderShipmentsPage } from "./pages/shipments.js?v=11";
import { renderAlertsPage } from "./pages/alerts.js?v=11";
import { renderSOPPage } from "./pages/sop.js?v=11";
import { renderDemandPage } from "./pages/demand.js?v=9";
import { renderInventoryPage } from "./pages/inventory.js?v=9";
import { renderProcurementPage } from "./pages/procurement.js?v=9";
import { renderMarkdownPage } from "./pages/markdown.js?v=9";
import { renderFinancialPage } from "./pages/financial.js?v=9";
import { renderScenariosPage } from "./pages/scenarios.js?v=9";
import { renderDecisionPage } from "./pages/decision.js?v=9";
import { renderReportsPage } from "./pages/reports.js?v=9";

// Global window bindings for inline HTML handlers
window.setPage = async function (p) {
  if (!p) return;
  store.page = p;

  try {
    localStorage.setItem("nexus_page", p);
    if (window.location.hash !== `#${p}`) {
      window.location.hash = `#${p}`;
    }
  } catch (e) {}

  renderAppShell();
  await renderMainContent();
};

window.toggleCollapsed = function () {
  store.collapsed = !store.collapsed;
  renderAppShell();
};

window.setFacility = function (fac) {
  store.facility = fac;
  renderMainContent();
};

window.openPalette = function () {
  store.paletteOpen = true;
  store.paletteQuery = "";
  const el = document.getElementById("paletteRegion");
  if (el) el.innerHTML = renderPalette();
  setTimeout(() => {
    const inp = document.getElementById("paletteInput");
    if (inp) {
      inp.focus();
      inp.select();
    }
  }, 40);
};

window.closePalette = function () {
  store.paletteOpen = false;
  const el = document.getElementById("paletteRegion");
  if (el) el.innerHTML = "";
};

window.onPaletteInput = function (val) {
  store.paletteQuery = val;
  const el = document.getElementById("paletteResults");
  if (el) el.innerHTML = renderPaletteResults();
};

window.paletteNavigate = function (page, truckId) {
  window.closePalette();
  if (truckId) store.trackingSelectedId = truckId;
  window.setPage(page);
};

window.addToast = addToast;
window.removeToast = removeToast;

window.selectTrackingTruck = function (id) {
  store.trackingSelectedId = id;
  renderMainContent();
};

window.selectTruck = function (id) {
  store.trackingSelectedId = id;
  window.setPage("trucks");
};

window.assignDock = async function (truckId, dockId) {
  try {
    await API.assignDock(dockId, truckId, 0, 2);
    addToast({ type: "success", title: `Dock ${dockId} Assigned`, msg: `Assigned to ${truckId}` });
    renderMainContent();
  } catch (err) {
    addToast({ type: "error", title: "Assignment Failed", msg: err.message });
  }
};

window.triggerDockDisruption = async function (dockId) {
  try {
    await API.triggerMaintenance(dockId, 4, 6, "Equipment failure");
    addToast({ type: "warning", title: `Dock ${dockId} Maintenance Triggered`, msg: "Reassignment recommendation active" });
    renderMainContent();
  } catch (err) {
    addToast({ type: "error", title: "Action Failed", msg: err.message });
  }
};

window.selectYardDock = function (code) {
  addToast({ type: "info", title: `Dock ${code} Selected`, msg: "Viewing dock operational status" });
};

window.runWhatIf = async function (truckId, delayMins) {
  try {
    const res = await API.runWhatIf(truckId, delayMins);
    const box = document.getElementById("whatIfResults");
    if (box) {
      box.innerHTML = `
        <div style="font-size:12px; color:var(--text-sec); margin-top:8px;">
          <div>Predicted Confidence: <b class="mono" style="color:var(--cyan);">${res.confidence}%</b></div>
          <div style="margin-top:4px;">Action: <b>${res.action}</b></div>
          <div style="margin-top:4px; color:var(--text-muted); font-size:11px;">${res.rationale}</div>
        </div>`;
    }
  } catch (err) {
    addToast({ type: "error", title: "What-If Failed", msg: err.message });
  }
};

window.resolveAlert = async function (id) {
  try {
    await API.resolveAlert(id);
    addToast({ type: "success", title: "Alert Resolved", msg: `Alert #${id} marked as resolved` });
    renderMainContent();
  } catch (err) {
    addToast({ type: "error", title: "Action Failed", msg: err.message });
  }
};

window.setAlertSeverity = function (sev) {
  store.alertSevFilter = sev;
  renderMainContent();
};

window.setAlertCategory = function (cat) {
  store.alertCatFilter = cat;
  renderMainContent();
};

window.setReportsRange = function (r) {
  store.reportsRange = r;
  renderMainContent();
};

window.setInventoryScenario = function (sc) {
  store.inventoryScenario = sc;
  renderMainContent();
};

window.onScenarioSlider = function (key, val, suffix) {
  store.scenario[key] = Number(val);
  const el = document.getElementById(`${key}Val`);
  if (el) el.textContent = (val > 0 && key === 'prod_capacity_change_pct' ? '+' : '') + val + suffix;
};

window.runCurrentScenario = async function () {
  try {
    const res = await API.runScenario(store.scenario);
    const panel = document.getElementById("scenarioImpactPanel");
    if (panel) {
      panel.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px;">
          <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:10px; color:var(--text-muted);">New Prod Util</div>
            <div class="mono" style="font-size:16px; font-weight:700; color:var(--cyan); margin-top:2px;">${res.impact.new_prod_util}%</div>
          </div>
          <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:10px; color:var(--text-muted);">Stockout Risk</div>
            <div class="mono" style="font-size:16px; font-weight:700; color:${res.impact.stockout_risk_pct > 15 ? '#FF7A7A' : '#34E2B0'}; margin-top:2px;">${res.impact.stockout_risk_pct}%</div>
          </div>
          <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:10px; color:var(--text-muted);">Dock Util</div>
            <div class="mono" style="font-size:16px; font-weight:700; color:var(--text); margin-top:2px;">${res.impact.dock_util}%</div>
          </div>
          <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:10px; color:var(--text-muted);">Extra Trucks</div>
            <div class="mono" style="font-size:16px; font-weight:700; color:#9B7BFF; margin-top:2px;">+${res.impact.shipments_required}</div>
          </div>
        </div>
        <div style="margin-top:16px;">
          <div style="font-size:12px; font-weight:700; margin-bottom:8px;">Recommended Actions</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${(res.recommended_actions || []).map((a, i) => `
              <div style="padding:8px 12px; background:var(--bg2); border:1px solid var(--border); border-radius:8px; font-size:11.5px;">
                <b class="mono" style="color:var(--cyan);">${i + 1}.</b> ${a}
              </div>`).join('')}
          </div>
        </div>`;
    }
    addToast({ type: "success", title: "Simulation Complete", msg: "Scenario impact updated" });
  } catch (err) {
    addToast({ type: "error", title: "Scenario Run Failed", msg: err.message });
  }
};

window.resetScenario = function () {
  store.scenario = { demand_increase_pct: 0, prod_capacity_change_pct: 0, transport_delay_days: 0, lead_time_days: 7 };
  renderMainContent();
};

window.renderMain = renderMainContent;

function renderAppShell() {
  const sidebar = document.getElementById("sidebarRegion");
  const header = document.getElementById("headerRegion");
  if (sidebar) sidebar.innerHTML = renderSidebar();
  if (header) header.innerHTML = renderHeader();
}

async function renderMainContent() {
  const main = document.getElementById("mainRegion");
  if (!main) return;

  let html = '';
  switch (store.page) {
    case "overview": html = await renderOverviewPage(); break;
    case "trucks": html = await renderTrucksPage(); break;
    case "yard": html = await renderYardPage(); break;
    case "allocation": html = await renderAllocationPage(); break;
    case "shipments": html = await renderShipmentsPage(); break;
    case "alerts": html = await renderAlertsPage(); break;
    case "sop": html = await renderSOPPage(); break;
    case "demand": html = await renderDemandPage(); break;
    case "inventory": html = await renderInventoryPage(); break;
    case "procurement": html = await renderProcurementPage(); break;
    case "markdown": html = await renderMarkdownPage(); break;
    case "financial": html = await renderFinancialPage(); break;
    case "scenarios": html = await renderScenariosPage(); break;
    case "decision": html = await renderDecisionPage(); break;
    case "reports": html = await renderReportsPage(); break;
    default: html = await renderOverviewPage();
  }
  main.innerHTML = html;

  if (store.page === "trucks") {
    setTimeout(() => {
      initTrucksMap();
    }, 20);
  }
}

// Global Keyboard shortcuts
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    store.paletteOpen ? window.closePalette() : window.openPalette();
  }
  if (e.key === "Escape" && store.paletteOpen) window.closePalette();
});

// App Initialization
export function initApp() {
  // Read page from URL hash or localStorage
  const hashPage = (window.location.hash || "").replace("#", "").trim();
  const savedPage = localStorage.getItem("nexus_page");

  if (hashPage && NAV.some(n => n.key === hashPage)) {
    store.page = hashPage;
  } else if (savedPage && NAV.some(n => n.key === savedPage)) {
    store.page = savedPage;
    window.location.hash = `#${savedPage}`;
  } else {
    store.page = "overview";
  }

  document.getElementById("root").innerHTML = `
    <div class="aurora">
      <div class="blob blob1"></div>
      <div class="blob blob2"></div>
      <div class="blob blob3"></div>
    </div>
    <div class="app-shell">
      <div id="sidebarRegion"></div>
      <div style="flex:1; min-width:0;">
        <div id="headerRegion"></div>
        <div id="mainRegion"></div>
      </div>
      <div id="drawerRegion"></div>
    </div>
    <div id="paletteRegion"></div>
    <div id="toastRegion" style="position:fixed; bottom:20px; right:20px; z-index:70; display:flex; flex-direction:column; gap:10px; align-items:flex-end;"></div>`;

  renderAppShell();
  renderMainContent();

  // Handle browser back / forward navigation
  window.addEventListener("hashchange", () => {
    const page = (window.location.hash || "").replace("#", "").trim();
    if (page && page !== store.page && NAV.some(n => n.key === page)) {
      window.setPage(page);
    }
  });

  // Initialize Realtime WebSocket Connection
  initRealtime((msg) => {
    if (msg.type === "truck_update") {
      if (msg.payload && Array.isArray(msg.payload)) {
        msg.payload.forEach(u => {
          const found = (store.trucks || []).find(t => t.id === u.truck_id);
          if (found) {
            found.status = u.status;
            if (!found.tracking_state) found.tracking_state = {};
            found.tracking_state.progress_pct = u.progress_pct;
            found.tracking_state.speed_kmh = u.speed_kmh;
            found.tracking_state.distance_remaining_km = u.distance_remaining_km;
            found.tracking_state.delay_minutes = u.delay_minutes;
            found.tracking_state.current_lat = u.current_lat;
            found.tracking_state.current_lng = u.current_lng;
          }
        });
      }

      if (store.page === "trucks") {
        updateTrucksLiveTelemetry(msg.payload || []);
      }
    } else if (msg.type === "dock_update") {
      if (store.page === "yard" || store.page === "allocation") {
        renderMainContent();
      }
    }
  });

  store.subscribe(() => {
    renderAppShell();
  });
}

document.addEventListener("DOMContentLoaded", initApp);
