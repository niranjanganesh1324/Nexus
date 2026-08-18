import { API } from "../api.js?v=6";
import { store } from "../store.js?v=6";
import { impactStat } from "../components/helpers.js?v=6";

let sopDataCache = null;
let inventoryDataCache = null;

export function switchSopTab(tabKey) {
  store.sopTab = tabKey;

  // 1. Update Tab Button Styles Instantly
  const tabs = ["monthly", "sales", "capacity"];
  tabs.forEach(k => {
    const btn = document.getElementById(`sop-tab-btn-${k}`);
    const panel = document.getElementById(`sop-panel-${k}`);

    if (btn) {
      const isActive = k === tabKey;
      btn.style.background = isActive ? 'var(--cyan)' : 'rgba(13,27,42,0.6)';
      btn.style.color = isActive ? '#07111F' : 'var(--text-sec)';
      btn.style.borderColor = isActive ? 'var(--cyan)' : 'var(--border)';
      btn.style.boxShadow = isActive ? '0 0 16px rgba(0,212,199,0.35)' : 'none';
      btn.style.fontWeight = isActive ? '800' : '600';
    }

    if (panel) {
      panel.style.display = k === tabKey ? 'block' : 'none';
    }
  });
}
window.setSopTab = switchSopTab;

export async function renderSOPPage() {
  try {
    const [data, inventoryData] = await Promise.all([
      API.getSOP(),
      API.getInventory().catch(() => ({ collections: [] }))
    ]);

    sopDataCache = data;
    inventoryDataCache = inventoryData;

    const currentTab = store.sopTab || "monthly";

    const tabs = [
      ["monthly", "Rolling Monthly Plan", "6-Month Integrated Master Schedule"],
      ["sales", "Supply Plan", "Finished Goods & Material Replenishment"],
      ["capacity", "Production Capacity", "Plant Utilization & Line Constraints"]
    ];

    const tabBtns = tabs.map(([k, l, sub]) => {
      const isActive = currentTab === k;
      return `
      <button id="sop-tab-btn-${k}" onclick="window.setSopTab('${k}')" class="mono focus-ring"
        style="font-size:12px; font-weight:${isActive ? '800' : '600'}; padding:10px 20px; border-radius:10px;
        border:1.5px solid ${isActive ? 'var(--cyan)' : 'var(--border)'};
        background:${isActive ? 'var(--cyan)' : 'rgba(13,27,42,0.6)'};
        color:${isActive ? '#07111F' : 'var(--text-sec)'};
        box-shadow:${isActive ? '0 0 16px rgba(0,212,199,0.35)' : 'none'};
        cursor:pointer; transition:all 0.15s ease;">
        ${l}
      </button>`;
    }).join('');

    // ==========================================
    // SUBSECTION 1: ROLLING MONTHLY PLAN
    // ==========================================
    const monthlyRows = (data.monthly_plan || []).map(m => `
      <tr class="data-row" style="border-bottom:1px solid var(--border);">
        <td style="padding:13px 11px; font-weight:700; color:var(--cyan);">${m.period_label}</td>
        <td class="mono" style="font-weight:600;">${m.demand.toLocaleString()} u</td>
        <td class="mono">${m.production.toLocaleString()} u</td>
        <td class="mono" style="color:var(--text-sec);">${(m.inbound || 0).toLocaleString()} u</td>
        <td class="mono" style="font-weight:700; color:#55A6FF;">${m.closing_inventory.toLocaleString()} u</td>
        <td class="mono" style="font-weight:700; color:${m.supply_gap < 0 ? '#FF7A7A' : '#34E2B0'};">
          ${m.supply_gap > 0 ? '+' : ''}${m.supply_gap.toLocaleString()} u
        </td>
        <td class="mono">
          <span style="padding:4px 9px; border-radius:6px; font-size:11px; font-weight:700; background:${m.capacity_pct > 86 ? 'rgba(255,107,122,0.18)' : 'rgba(67,211,138,0.18)'}; color:${m.capacity_pct > 86 ? '#FF7A7A' : '#34E2B0'};">
            ${m.capacity_pct}%
          </span>
        </td>
      </tr>`).join('');

    const totalDemand = (data.monthly_plan || []).reduce((acc, m) => acc + m.demand, 0);
    const totalProd = (data.monthly_plan || []).reduce((acc, m) => acc + m.production, 0);
    const avgGap = (data.monthly_plan && data.monthly_plan.length)
      ? (data.monthly_plan.reduce((acc, m) => acc + m.supply_gap, 0) / data.monthly_plan.length)
      : 0;

    const panelMonthly = `
    <div id="sop-panel-monthly" style="display:${currentTab === 'monthly' ? 'block' : 'none'};">
      <div style="display:flex; flex-direction:column; gap:18px;">
        <!-- Top Workflow & Stage Bar -->
        <div class="card anim-in" style="padding:22px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="font-size:16px; font-weight:800; color:var(--text);">Executive Rolling Monthly S&OP Master Cycle</div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Cross-functional consensus linking sales forecasts, manufacturing commitments, and 6-month financial inventory runway.</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge" style="background:rgba(52,211,153,0.15); color:#34E2B0; border-color:rgba(52,211,153,0.3);">Cycle: Aug 2025 – Jan 2026</span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; margin-top:18px;">
            ${[
              { name: "1. Demand Review", status: "Consensus Finalized", color: "#34E2B0", done: true },
              { name: "2. Supply Review", status: "Capacity Checked", color: "#34E2B0", done: true },
              { name: "3. Inventory Review", status: "Runway Simulated", color: "#34E2B0", done: true },
              { name: "4. Financial Review", status: "Pending Sign-off", color: "#FFC94D", done: false },
              { name: "5. Executive Approval", status: "Scheduled", color: "var(--text-muted)", done: false }
            ].map(step => `
              <div style="padding:12px 14px; border:1.5px solid ${step.color}44; border-radius:10px; background:var(--bg2);">
                <div style="font-size:11.5px; font-weight:700; color:var(--text);">${step.name}</div>
                <div style="font-size:10.5px; color:${step.color}; margin-top:4px; font-weight:600;">
                  ${step.done ? '✓ ' : '⏳ '}${step.status}
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- 4 Key Performance Stats -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px;">
          ${impactStat("6-Mo Demand Forecast", totalDemand.toLocaleString() + " u", "#55A6FF")}
          ${impactStat("Committed Production", totalProd.toLocaleString() + " u", "#00D4C7")}
          ${impactStat("Avg Monthly Supply Gap", (avgGap > 0 ? "+" : "") + Math.round(avgGap).toLocaleString() + " u", avgGap < 0 ? "#FF7A7A" : "#34E2B0")}
          ${impactStat("Overall S&OP Health", (data.overall_health || 88.5) + "%", "#9B7BFF")}
        </div>

        <!-- Master Rolling Table -->
        <div class="card anim-in" style="padding:22px; overflow-x:auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div style="font-size:14px; font-weight:800;">Integrated 6-Month Rolling S&OP Matrix</div>
            <div style="font-size:11px; color:var(--text-muted);">Updated with real-time inventory snapshots & production plans</div>
          </div>
          <table class="data-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
            <thead>
              <tr style="border-bottom:1.5px solid var(--border); color:var(--text-muted); text-align:left;">
                <th style="padding:10px;">Period</th>
                <th>Gross Demand</th>
                <th>Committed Prod.</th>
                <th>Inbound Logistics</th>
                <th>Closing Inventory</th>
                <th>Net Supply Gap</th>
                <th>Plant Util</th>
              </tr>
            </thead>
            <tbody>${monthlyRows}</tbody>
          </table>
        </div>

        <!-- Executive Narrative Decision Box -->
        <div class="card anim-in" style="padding:20px; border-left:4px solid var(--cyan);">
          <div style="font-size:13.5px; font-weight:800; color:var(--text);">Current S&OP Executive Decision & Risk Advisory</div>
          <div style="margin-top:10px; padding:14px; background:var(--bg2); border-radius:10px; border:1px solid var(--border); font-size:12px; line-height:1.6; color:var(--text-sec);">
            ${data.current_decision}
          </div>
        </div>
      </div>
    </div>`;

    // ==========================================
    // SUBSECTION 2: SUPPLY PLAN
    // ==========================================
    const collections = inventoryData.collections || [];
    const supplyRows = collections.map(c => {
      const first = (c.rows && c.rows[0]) || {};
      const riskColor = c.current_risk === 'Stockout' ? '#FF5C5C' : c.current_risk === 'Below Safety' ? '#FFAB2E' : '#34E2B0';
      return `
      <tr class="data-row" style="border-bottom:1px solid var(--border);">
        <td style="padding:13px 11px;">
          <div style="font-weight:700; color:var(--text);">${c.name}</div>
          <div class="mono" style="font-size:10px; color:var(--text-muted);">${c.collection_id}</div>
        </td>
        <td class="mono" style="font-weight:600;">${(first.sales_units || 0).toLocaleString()} u</td>
        <td class="mono" style="color:#55A6FF; font-weight:700;">${(first.production_units || 0).toLocaleString()} u</td>
        <td class="mono" style="color:var(--text-sec);">${(first.inbound_units || 0).toLocaleString()} u</td>
        <td class="mono" style="font-weight:700; color:#34E2B0;">${(first.closing_units || 0).toLocaleString()} u</td>
        <td class="mono">${first.days_of_cover ? first.days_of_cover.toFixed(1) + ' days' : '24.0 days'}</td>
        <td>
          <span class="badge" style="background:${riskColor}22; color:${riskColor}; border-color:${riskColor}44; font-size:9.5px;">
            ${c.current_risk || 'Healthy'}
          </span>
        </td>
        <td class="mono" style="color:var(--cyan); font-weight:700;">
          ${c.linked_truck_id ? `<span onclick="window.selectTruck('${c.linked_truck_id}')" style="cursor:pointer;" title="View Live Truck Tracking">🔗 ${c.linked_truck_id}</span>` : '—'}
        </td>
      </tr>`;
    }).join('');

    const panelSupply = `
    <div id="sop-panel-sales" style="display:${currentTab === 'sales' ? 'block' : 'none'};">
      <div style="display:flex; flex-direction:column; gap:18px;">
        <!-- Supply Plan Header -->
        <div class="card anim-in" style="padding:22px;">
          <div style="font-size:16px; font-weight:800; color:var(--text);">Finished Goods Supply Plan & Replenishment Schedule</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Detailed supply breakdown balancing production batch releases, inbound raw fabric arrivals, and seasonal inventory runway by collection.</div>
        </div>

        <!-- 4 Supply Metrics -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px;">
          ${impactStat("Committed Supply", "33,000 u / mo", "#00D4C7")}
          ${impactStat("Inbound Material Pipeline", "12,400 u", "#55A6FF")}
          ${impactStat("Avg Coverage Buffer", "22.4 Days", "#34E2B0")}
          ${impactStat("Collections at Risk", (inventoryData.stockout_risks || 1) + " Collection", "#FFC94D")}
        </div>

        <!-- Collection Supply Breakdown Table -->
        <div class="card anim-in" style="padding:22px; overflow-x:auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="font-size:14px; font-weight:800;">Apparel Collection Supply vs Demand Breakdown</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Tracks physical factory supply line commitments vs distribution center inventory</div>
            </div>
            <button onclick="window.setPage('procurement')" class="mono focus-ring"
              style="background:var(--cyan); color:#07111F; border:none; padding:7px 14px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer;">
              View Fabric Orders →
            </button>
          </div>

          <table class="data-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
            <thead>
              <tr style="border-bottom:1.5px solid var(--border); color:var(--text-muted); text-align:left;">
                <th style="padding:10px;">Collection</th>
                <th>Demand (Aug)</th>
                <th>Factory Output</th>
                <th>Inbound Feed</th>
                <th>Closing Runway</th>
                <th>Days of Cover</th>
                <th>Supply Health</th>
                <th>Logistics Link</th>
              </tr>
            </thead>
            <tbody>${supplyRows || '<tr><td colspan="8" style="text-align:center; padding:20px;">No supply collection data available</td></tr>'}</tbody>
          </table>
        </div>

        <!-- Supply Interlock Notice -->
        <div class="card anim-in" style="padding:18px; background:rgba(85,166,255,0.06); border:1.5px solid rgba(85,166,255,0.2);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:16px;">💡</span>
            <div style="font-size:12.5px; font-weight:700; color:var(--blue);">Closed-Loop Inbound Material Tracking</div>
          </div>
          <div style="font-size:11.5px; color:var(--text-sec); margin-top:6px; line-height:1.5;">
            <b>TRK-104</b> is transporting <b>850 units (Premium Linen Fabric)</b> destined for Bangalore DC. Inbound delays directly compress the Summer Linen manufacturing window, triggering automated procurement safety stock recommendations.
          </div>
        </div>
      </div>
    </div>`;

    // ==========================================
    // SUBSECTION 3: PRODUCTION CAPACITY
    // ==========================================
    const plantCards = (data.capacity || []).map(p => {
      const utilColor = p.utilization_pct >= 85 ? '#FF6B7A' : p.utilization_pct >= 75 ? '#FFB84D' : '#43D38A';
      return `
      <div class="card anim-in" style="padding:20px; background:var(--bg2); border:1.5px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--text);">${p.facility_name}</div>
            <div class="mono" style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">ID: ${p.facility_id}</div>
          </div>
          <span class="mono" style="font-size:18px; font-weight:800; color:${utilColor};">${p.utilization_pct}%</span>
        </div>

        <!-- Progress Bar -->
        <div style="height:8px; background:var(--card); border-radius:6px; overflow:hidden; margin-top:12px;">
          <div style="height:100%; width:${p.utilization_pct}%; background:${utilColor}; border-radius:6px; transition:width 1s ease;"></div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; font-size:11.5px; color:var(--text-sec);">
          <div style="background:var(--card); padding:8px 10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Planned Volume</div>
            <div class="mono" style="font-size:12.5px; font-weight:700; color:var(--text); margin-top:2px;">${p.planned_units.toLocaleString()} u</div>
          </div>
          <div style="background:var(--card); padding:8px 10px; border-radius:8px; border:1px solid var(--border);">
            <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Rated Capacity</div>
            <div class="mono" style="font-size:12.5px; font-weight:700; color:var(--text); margin-top:2px;">${p.available_units.toLocaleString()} u</div>
          </div>
        </div>

        <div style="margin-top:12px; padding:10px; background:var(--card); border-radius:8px; border:1px solid var(--border); font-size:11px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <span style="color:var(--text-muted);">Constraint:</span>
            <span style="font-weight:600; color:${p.constraint_desc ? '#FFB84D' : '#34E2B0'};">${p.constraint_desc || 'Optimal line balance'}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--text-muted);">Manufacturing Lead Time:</span>
            <span class="mono" style="font-weight:700; color:var(--text);">${p.lead_time_days} days</span>
          </div>
        </div>
      </div>`;
    }).join('');

    const panelCapacity = `
    <div id="sop-panel-capacity" style="display:${currentTab === 'capacity' ? 'block' : 'none'};">
      <div style="display:flex; flex-direction:column; gap:18px;">
        <!-- Capacity Header -->
        <div class="card anim-in" style="padding:22px;">
          <div style="font-size:16px; font-weight:800; color:var(--text);">Manufacturing Plant Capacity & Line Constraints</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Real-time manufacturing line utilization, shift planning, maintenance windows, and fabrication lead times across regional plants.</div>
        </div>

        <!-- 4 Top Network Capacity Stats -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px;">
          ${impactStat("Network Plant Utilization", "82.5%", "#34E2B0")}
          ${impactStat("Active Bottlenecks", "1 Facility", "#FFC94D")}
          ${impactStat("Total Available Capacity", "62,500 u / mo", "#55A6FF")}
          ${impactStat("Avg Factory Lead Time", "3.8 Days", "#9B7BFF")}
        </div>

        <!-- Plant Cards Grid -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px;">
          ${plantCards}
        </div>

        <!-- Capacity Balancing Action -->
        <div class="card anim-in" style="padding:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
          <div>
            <div style="font-size:13.5px; font-weight:800; color:var(--text);">Need to simulate overtime or production capacity shifts?</div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Test the financial gross margin impact of shifting $+10\%$ capacity in the Scenario Engine.</div>
          </div>
          <button onclick="window.setPage('scenarios')" class="mono focus-ring"
            style="background:var(--cyan); color:#07111F; border:none; padding:10px 18px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">
            Open Scenario Simulator →
          </button>
        </div>
      </div>
    </div>`;

    return `
    <div style="display:flex; flex-direction:column; gap:18px; padding:22px 26px 50px;">
      <!-- Tab Controls Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">${tabBtns}</div>
        <div style="font-size:11px; color:var(--text-muted); background:var(--bg2); padding:6px 12px; border-radius:8px; border:1px solid var(--border);">
          Active S&OP Planning Cycle: <b class="mono" style="color:var(--cyan);">2025-Q3 / Q4</b>
        </div>
      </div>

      <!-- Panels Container -->
      <div>
        ${panelMonthly}
        ${panelSupply}
        ${panelCapacity}
      </div>
    </div>`;
  } catch (err) {
    console.error("renderSOPPage error:", err);
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load S&OP planning data.</div>`;
  }
}
