import { API } from "../api.js";
import { impactStat } from "../components/helpers.js";

export async function renderProcurementPage() {
  try {
    const data = await API.getProcurement();

    const rows = data.rows.map(r => `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:12px 11px;font-weight:800">${r.name}</td>
        <td>${r.collection_name}</td>
        <td class="mono">${r.required_qty.toLocaleString()} m</td>
        <td class="mono">${r.on_hand_qty.toLocaleString()} m</td>
        <td class="mono" style="color:var(--cyan); font-weight:700">${r.net_requirement.toLocaleString()} m</td>
        <td class="mono">${r.moq.toLocaleString()} m</td>
        <td class="mono"><b>${r.recommended_order.toLocaleString()} m</b></td>
        <td>${r.lead_time_days} days</td>
        <td>${r.linked_truck_id ? `<span class="badge" style="background:rgba(56,189,248,0.15); color:#5CC8FF">${r.linked_truck_id}</span>` : '—'}</td>
        <td style="font-weight:700; color:${r.status === 'At Risk' ? '#FFAB2E' : r.status === 'Watch' ? '#5CC8FF' : '#34E2B0'}">${r.status}</td>
      </tr>`).join('');

    return `
    <div style="display:flex;flex-direction:column;gap:18px;padding:22px 26px 50px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;">
        ${impactStat('Materials at risk', data.at_risk_count, '#FFAB2E')}
        ${impactStat('MOQ compliant', data.moq_compliant_pct + '%', '#34E2B0')}
        ${impactStat('Avg lead time', data.avg_lead_time_days + ' days', '#5CC8FF')}
        ${impactStat('Linked inbound trucks', data.linked_trucks, '#7C5CFF')}
      </div>
      <div class="card anim-in" style="padding:22px;">
        <div style="font-size:14px;font-weight:700;">Fabric Procurement Optimizer</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin:4px 0 16px;">Calculated against required fabric, on-hand stock, supplier MOQ, lead time and linked logistics.</div>
        <div style="overflow:auto">
          <table class="data-table" style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr>
                <th>Material</th><th>Collection</th><th>Required</th><th>On Hand</th><th>Net Requirement</th><th>MOQ</th><th>Recommended Order</th><th>Lead Time</th><th>Execution Link</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load fabric procurement data.</div>`;
  }
}
