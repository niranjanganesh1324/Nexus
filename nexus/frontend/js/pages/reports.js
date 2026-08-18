import { API } from "../api.js";
import { store } from "../store.js";
import { impactStat } from "../components/helpers.js";

export async function renderReportsPage() {
  try {
    const data = await API.getReport(store.reportsRange);

    const rangeBtns = [["7d", "7 Days"], ["30d", "30 Days"], ["quarter", "Quarter"]].map(([k, l]) => `
      <button onclick="window.setReportsRange('${k}')" class="mono focus-ring"
        style="font-size:11px; font-weight:700; padding:6px 13px; border-radius:7px; border:1px solid var(--border);
        background:${store.reportsRange === k ? 'var(--cyan)' : 'transparent'};
        color:${store.reportsRange === k ? '#150B2E' : 'var(--text-sec)'};">${l}</button>`).join('');

    return `
    <div style="display:flex; flex-direction:column; gap:18px; padding:22px 26px 50px;">
      <div class="card anim-in" style="padding:18px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:6px;">${rangeBtns}</div>
        <button onclick="window.exportReport('${store.reportsRange}')" class="mono focus-ring" style="background:var(--cyan); color:#150B2E; border:none; padding:9px 16px; border-radius:8px; font-size:11.5px; font-weight:700;">⭳ Export CSV Report</button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px;">
        ${impactStat("OTIF %", data.otif_pct + "%", "#34E2B0")}
        ${impactStat("Forecast Accuracy", data.forecast_accuracy_pct + "%", "#FF4FA3")}
        ${impactStat("Inventory Turns", data.inv_turns + "x", "#38BDF8")}
        ${impactStat("Capacity Utilization", data.capacity_util_pct + "%", "#7C5CFF")}
        ${impactStat("Avg Delivery Delay", data.avg_delay_days + " days", "#FFAB2E")}
        ${impactStat("Dock Utilization", data.dock_util_pct + "%", "#7C5CFF")}
        ${impactStat("Supply-Demand Gap", data.supply_gap_units.toLocaleString() + " units", "#FF7A7A")}
        ${impactStat("Shipment Performance", data.shipment_performance_pct + "%", "#34E2B0")}
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load reporting data.</div>`;
  }
}
