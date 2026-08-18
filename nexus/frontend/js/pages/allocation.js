import { API } from "../api.js";
import { statusBadgeHTML, impactStat } from "../components/helpers.js";

export async function renderAllocationPage() {
  try {
    const data = await API.getDockSchedule();
    const activeAssignments = data.schedule.filter(s => s.truck_id);

    const rows = activeAssignments.map(a => `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:12px 11px;font-weight:800">${a.trailer_id || '—'}</td>
        <td>${a.truck_id}</td>
        <td><b style="color:#5CC8FF">${a.dock_id}</b></td>
        <td>${a.time_label}</td>
        <td>${a.is_maintenance ? '<span class="badge" style="background:rgba(255,171,46,0.2); color:#FFAB2E">Maintenance</span>' : statusBadgeHTML('Assigned')}</td>
        <td>
          <button onclick="window.setPage('yard')" style="padding:6px 9px;border-radius:7px;border:1px solid var(--border);background:var(--bg2);color:var(--text);cursor:pointer;font-size:11px">
            Open Yard
          </button>
        </td>
      </tr>`).join('');

    return `
    <div style="display:flex;flex-direction:column;gap:16px;padding:22px 26px 50px">
      <div class="card" style="padding:20px">
        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:start">
          <div>
            <div style="font-size:16px;font-weight:800">Trailer-to-Door Allocation Summary</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:5px">Unified operational view backed by database state — trailer ID, assigned door, reserved arrival window and operational status.</div>
          </div>
          <button class="mono focus-ring" onclick="window.renderMain()" style="padding:8px 13px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text);font-weight:700;cursor:pointer">↻ Refresh</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:18px">
          ${impactStat("Active Allocations", activeAssignments.length, "#38BDF8")}
          ${impactStat("Assigned Doors", new Set(activeAssignments.map(a => a.dock_id)).size, "#34E2B0")}
          ${impactStat("Time Slots", data.slots.length, "#7C5CFF")}
        </div>
      </div>

      <div class="card" style="padding:18px;overflow:auto">
        <table style="width:100%;min-width:800px;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="color:var(--text-muted);text-align:left;border-bottom:1px solid var(--border)">
              <th style="padding:11px">Trailer ID</th><th>Truck ID</th><th>Assigned Door</th><th>Arrival Window</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="6" style="padding:30px; text-align:center; color:var(--text-muted);">No active allocations scheduled.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load allocation summary.</div>`;
  }
}
