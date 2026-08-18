import { API } from "../api.js";
import { store } from "../store.js";
import { statusBadgeHTML, impactStat } from "../components/helpers.js";

export async function renderShipmentsPage() {
  try {
    const data = await API.getTrucks(store.facility);
    const trucks = data.trucks;

    const rows = trucks.map(t => `
      <tr class="data-row" onclick="window.selectTruck('${t.id}')">
        <td class="mono" style="font-weight:700;">${t.id}</td>
        <td style="color:var(--text-sec);">${t.origin_name || t.origin_id}</td>
        <td style="color:var(--text-sec);">${t.destination_name || t.destination_id}</td>
        <td class="mono" style="color:var(--text-sec);">${t.load_units} u</td>
        <td class="mono">${t.scheduled_eta}</td>
        <td>${statusBadgeHTML(t.status)}</td>
        <td class="mono" style="color:var(--text-sec);">${t.dock_id || '—'}</td>
        <td><span style="font-size:11px; font-weight:700; color:${t.priority === 'High' ? '#FF7A7A' : t.priority === 'Medium' ? '#FFC94D' : '#94A3B8'}">${t.priority}</span></td>
      </tr>`).join('');

    const onTime = trucks.filter(t => t.status === 'On Time' || t.status === 'Arrived').length;
    const delayed = trucks.filter(t => t.status === 'Delayed').length;
    const atRisk = trucks.filter(t => t.status === 'At Risk').length;

    return `
    <div style="display:flex; flex-direction:column; gap:18px; padding:22px 26px 50px;">
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px;">
        ${impactStat("Total Active Shipments", trucks.length, "#7C5CFF")}
        ${impactStat("On Time", onTime, "#34E2B0")}
        ${impactStat("Delayed", delayed, "#FF7A7A")}
        ${impactStat("At Risk", atRisk, "#FFC94D")}
      </div>
      <div class="card anim-in" style="padding:22px;">
        <div style="font-size:14px; font-weight:700; margin-bottom:14px;">Active Shipments Master Table</div>
        <div style="overflow-x:auto;">
          <table class="data-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
            <thead>
              <tr>
                <th>Truck / Shipment ID</th><th>Origin</th><th>Destination</th><th>Load</th><th>ETA</th><th>Status</th><th>Assigned Dock</th><th>Priority</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load shipments data.</div>`;
  }
}
