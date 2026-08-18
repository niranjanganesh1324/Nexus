import { API } from "../api.js";
import { store } from "../store.js";
import { impactStat } from "../components/helpers.js";

export async function renderInventoryPage() {
  try {
    const isDelayScenario = store.inventoryScenario === 'delay';
    const data = await API.getInventory(isDelayScenario);

    const rows = data.collections.map(c => {
      const firstRow = c.rows.length ? c.rows[0] : {};
      const riskColor = c.current_risk === 'Stockout' ? '#FF5C5C' : c.current_risk === 'Below Safety' ? '#FFAB2E' : c.current_risk === 'Excess' ? '#7C5CFF' : '#34E2B0';
      return `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:13px 11px;font-weight:800">${c.name}</td>
        <td class="mono">${(firstRow.opening_units || 0).toLocaleString()}</td>
        <td class="mono">${(firstRow.inbound_units || 0).toLocaleString()}</td>
        <td class="mono">${(firstRow.production_units || 0).toLocaleString()}</td>
        <td class="mono">${(firstRow.sales_units || 0).toLocaleString()}</td>
        <td class="mono" style="font-weight:800;color:${riskColor}">${(firstRow.closing_units || 0).toLocaleString()}</td>
        <td class="mono">${(firstRow.safety_stock_units || 0).toLocaleString()}</td>
        <td>${firstRow.days_of_cover || 0} days</td>
        <td><span class="badge" style="background:${riskColor}20;color:${riskColor}">${c.current_risk}</span></td>
      </tr>`;
    }).join('');

    return `
    <div style="display:flex;flex-direction:column;gap:18px;padding:22px 26px 50px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-size:14px;font-weight:700">Inventory Intelligence & Rolling Projection</div>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px">Six-month S&OP view linking demand, production, inbound execution and safety-stock risk.</div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="window.setInventoryScenario('base')" class="nexus-secondary-btn focus-ring" style="padding:8px 14px; border-radius:8px; cursor:pointer; ${!isDelayScenario ? 'border-color:#34E2B0;color:#34E2B0' : ''}">Base Plan</button>
          <button onclick="window.setInventoryScenario('delay')" class="nexus-secondary-btn focus-ring" style="padding:8px 14px; border-radius:8px; cursor:pointer; ${isDelayScenario ? 'border-color:#FFAB2E;color:#FFAB2E' : ''}">Simulate TRK-104 Delay</button>
        </div>
      </div>

      ${isDelayScenario && data.delay_impact_narrative ? `
        <div class="nexus-whatif-result" style="padding:14px; border-left:3px solid #FFAB2E; background:rgba(255,171,46,0.08); border-radius:10px; font-size:12px;">
          <b>Execution impact active:</b> ${data.delay_impact_narrative}
        </div>` : ''}

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px">
        ${impactStat('Projected closing', data.total_closing.toLocaleString() + ' units', '#34E2B0')}
        ${impactStat('Safety-stock risks', data.stockout_risks, data.stockout_risks > 0 ? '#FFAB2E' : '#34E2B0')}
        ${impactStat('Excess inventory', data.excess_count + ' collection', '#7C5CFF')}
        ${impactStat('Projection horizon', '6 months', '#5CC8FF')}
      </div>

      <div class="card anim-in" style="padding:20px">
        <div style="font-size:13px;font-weight:700; margin-bottom:14px;">Portfolio Inventory Runway</div>
        <div style="overflow:auto">
          <table class="data-table" style="width:100%;border-collapse:collapse;font-size:11.5px">
            <thead>
              <tr>
                <th>Collection</th><th>Opening</th><th>Inbound</th><th>Production</th><th>Aug Sales</th><th>Projected Closing</th><th>Safety Stock</th><th>Days Cover</th><th>Risk</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load inventory data.</div>`;
  }
}
