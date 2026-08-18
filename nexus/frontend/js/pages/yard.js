import { API } from "../api.js";
import { store } from "../store.js";
import { impactStat } from "../components/helpers.js";

export async function renderYardPage() {
  try {
    const [docks, metrics, events, conflicts] = await Promise.all([
      API.getDocks(),
      API.getYardMetrics(),
      API.getYardEvents(),
      API.getYardConflicts(),
    ]);

    store.docks = docks;
    const selectedTruckId = store.yardSelectedId || "TRK-104";
    const recData = await API.getDockRecommendation(selectedTruckId);

    const dockCards = docks.map(d => {
      const colors = { Available: "#34E2B0", Occupied: "#FFAB2E", Maintenance: "#64748B" };
      const bg = { Available: "rgba(52,226,176,.08)", Occupied: "rgba(255,171,46,.08)", Maintenance: "rgba(100,116,139,.08)" };
      const truckId = d.assignments && d.assignments.length ? d.assignments[0].truck_id : (d.status === "Occupied" ? "TRK-Assigned" : "No trailer");
      return `
      <div onclick="window.selectYardDock('${d.id}')" class="focus-ring" style="cursor:pointer;padding:16px;border-radius:14px;background:${bg[d.status]};border:1px solid ${colors[d.status]}55;text-align:left;min-height:122px;">
        <div style="display:flex;justify-content:space-between;align-items:center"><div class="mono" style="font-size:17px;font-weight:800">${d.id}</div><span style="width:8px;height:8px;border-radius:50%;background:${colors[d.status]}"></span></div>
        <div style="font-size:10px;font-weight:800;color:${colors[d.status]};margin-top:7px;text-transform:uppercase">${d.status}</div>
        <div class="mono" style="font-size:10px;color:var(--text-muted);margin-top:7px">${truckId}</div>
        <div style="font-size:10px;color:var(--text-sec);margin-top:4px">Zone ${d.zone}</div>
      </div>`;
    }).join('');

    const eventRows = events.map(e => `
      <div style="display:grid;grid-template-columns:26px 66px 1fr;gap:8px;padding:10px 0;border-bottom:1px solid var(--border);font-size:11px">
        <div>${e.icon}</div>
        <div class="mono" style="font-size:9.5px;color:var(--text-muted)">${new Date(e.occurred_at).toLocaleTimeString()}</div>
        <div><span class="badge" style="font-size:8px;padding:2px 6px;box-shadow:none">${e.event_type}</span><div style="color:var(--text-sec);margin-top:5px">${e.text}</div></div>
      </div>`).join('');

    const best = recData.best;
    const x = best ? best.breakdown : null;
    const recPanel = best ? `
    <div class="card anim-in nexus-decision" style="padding:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div>
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:800">Explainable Dock Recommendation</div>
          <div class="mono" style="font-size:22px;font-weight:800;margin-top:5px">${best.dock_id} <span style="font-size:11px;color:var(--text-muted)">Score ${best.score}/100</span></div>
        </div>
        <div style="font-size:12px;font-weight:800;color:#34E2B0">${recData.confidence}% match</div>
      </div>
      <div style="font-size:11.5px;color:var(--text-sec);margin-top:10px">Target Truck: <b>${selectedTruckId}</b></div>
      <div class="nexus-scorecard" style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
        <div style="font-size:11px; color:var(--text-sec);">Availability Score: <b>${x.availability}/35</b></div>
        <div style="font-size:11px; color:var(--text-sec);">Compatibility Score: <b>${x.compatibility}/25</b></div>
        <div style="font-size:11px; color:var(--text-sec);">Priority Score: <b>${x.priority}/20</b></div>
        <div style="font-size:11px; color:var(--text-sec);">ETA Alignment Score: <b>${x.eta_alignment}/10</b></div>
        <div style="font-size:11px; color:var(--text-sec);">Proximity Score: <b>${x.proximity}/10</b></div>
      </div>
      <div class="nexus-reason" style="margin-top:14px; padding:12px; background:var(--bg2); border-radius:10px; font-size:11px; color:var(--text-sec); border:1px solid var(--border);">
        <b>Explanation:</b> ${recData.explanation}
      </div>
      <button onclick="window.assignDock('${selectedTruckId}','${best.dock_id}')" class="focus-ring nexus-primary-btn" style="margin-top:14px; width:100%; padding:10px; background:var(--cyan); color:#06131d; font-weight:800; border-radius:8px; border:none; cursor:pointer;">
        Assign ${best.dock_id} to ${selectedTruckId}
      </button>
    </div>` : `<div class="card" style="padding:22px"><b>No compatible dock currently available.</b></div>`;

    const conflictInfo = conflicts.length ? conflicts.map(c => `
      <div style="margin-top:10px;font-size:11.5px">
        <b>${c.trucks.join(' + ')}</b> competing for <b>${c.load_type}</b>.
        <div style="font-size:10.5px;color:var(--text-muted);margin-top:4px">${c.recommended_sequencing}</div>
      </div>`).join('') : `<div style="margin-top:10px;color:#34E2B0;font-size:11px">No predicted capacity conflicts in current window.</div>`;

    return `
    <div class="nexus-yard-page" style="padding:22px 26px 50px; display:flex; flex-direction:column; gap:18px;">
      <div class="nexus-yard-head" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:22px;font-weight:800">Yard Command Center</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:5px">Real-time backend dock recommendation, assignment & conflict prediction</div>
        </div>
        <button onclick="window.triggerDockDisruption('D04')" class="focus-ring nexus-danger-btn" style="padding:9px 14px; border-radius:8px; border:1px solid #FF7A7A; background:rgba(255,92,92,0.1); color:#FF7A7A; font-weight:700; cursor:pointer;">
          Simulate Dock D04 Failure
        </button>
      </div>

      <div class="nexus-kpi-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px;">
        ${impactStat("Active Arrivals", metrics.active_arrivals, "#62D6FF")}
        ${impactStat("Available Docks", metrics.available, "#34E2B0")}
        ${impactStat("Occupied Docks", metrics.occupied, "#FFAB2E")}
        ${impactStat("Dock Utilization", metrics.utilization_pct + "%", metrics.utilization_pct > 85 ? "#FF7A7A" : "#34E2B0")}
        ${impactStat("Decision Engine", "Explainable", "#A78BFA")}
      </div>

      <div class="nexus-yard-grid" style="display:grid; grid-template-columns:1.2fr 1fr; gap:18px;">
        <div class="card" style="padding:20px">
          <div style="font-size:12px;font-weight:800;margin-bottom:14px">Interactive Dock Layout</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:12px">${dockCards}</div>
        </div>
        <div>${recPanel}</div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:18px;">
        <div class="card" style="padding:18px">
          <div style="font-size:12px;font-weight:800">Predictive Conflict Monitor</div>
          ${conflictInfo}
          <button onclick="window.runWhatIf('${selectedTruckId}', 30)" class="focus-ring nexus-secondary-btn" style="margin-top:12px; padding:7px 12px; border:1px solid var(--border); background:var(--bg2); color:var(--text-sec); border-radius:7px; cursor:pointer;">
            Run What-If Analysis (30 min delay)
          </button>
          <div id="whatIfResult" style="margin-top:10px;"></div>
        </div>
        <div class="card" style="padding:18px; max-height:360px; overflow-y:auto;">
          <div style="font-size:12px;font-weight:800;margin-bottom:12px">Live WMS / Operations Feed</div>
          ${eventRows}
        </div>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load yard operational data.</div>`;
  }
}
