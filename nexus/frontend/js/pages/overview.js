import { API } from "../api.js";
import { store } from "../store.js";
import { statusBadgeHTML, sparklineSVG } from "../components/helpers.js";

export async function renderOverviewPage() {
  try {
    const data = await API.getOverview();
    store.alerts = data.active_alerts;

    const kpiCards = data.kpis.map(o => `
      <div class="card kpi-card anim-in" onclick="window.setPage('${o.nav}')" role="button" tabindex="0" style="padding:18px 20px; cursor:pointer;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="font-size:11px; color:var(--text-sec); font-weight:600; letter-spacing:0.4px; text-transform:uppercase;">${o.label}</div>
          <span class="status-dot" style="background:${{ healthy: "#1FD9A0", warning: "#FFAB2E", critical: "#FF5C5C", info: "#7C5CFF" }[o.status]}"></span>
        </div>
        <div style="display:flex; align-items:baseline; gap:8px; margin-top:10px;">
          <span class="mono" style="font-size:28px; font-weight:700;">${o.value}</span>
          ${o.unit ? `<span style="font-size:14px; color:var(--text-sec);">${o.unit}</span>` : ''}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:10px;">
          <div>
            ${o.trend_val ? `<div class="mono" style="font-size:11.5px; font-weight:700; color:${o.trend === 'up' ? '#34E2B0' : '#FF7A7A'}; display:flex; align-items:center; gap:3px;">${o.trend === 'up' ? '▲' : '—'} ${o.trend_val}</div>` : ''}
            <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">${o.sub}</div>
          </div>
          ${o.spark ? sparklineSVG(o.spark, o.nav === 'demand' ? '#FF4FA3' : o.nav === 'inventory' ? '#1FD9A0' : o.nav === 'sop' ? '#38BDF8' : '#7C5CFF') : ''}
        </div>
      </div>`).join('');

    const flowNodes = [
      { title: "Demand", value: data.flow.demand || "12.4K units", sub: "↑ 12% vs plan", color: "#FF4FA3", nav: "demand" },
      { title: "Production", value: data.flow.production || "11.8K units", sub: "82% capacity", color: "#38BDF8", nav: "sop" },
      { title: "Inventory", value: data.flow.inventory || "18.2K units", sub: "87% healthy", color: "#1FD9A0", nav: "inventory" },
      { title: "Shipments", value: data.flow.shipments || "24 active", sub: `${data.at_risk_shipments} at risk`, color: "#FFAB2E", nav: "shipments" },
      { title: "Delivery", value: data.flow.delivery || "91% on-time", sub: "OTIF this cycle", color: "#7C5CFF", nav: "reports" },
    ];

    let flowInner = '';
    flowNodes.forEach((n, i) => {
      flowInner += `
      <div class="card anim-in" onclick="window.setPage('${n.nav}')" role="button" tabindex="0" style="padding:16px 18px; min-width:150px; border-top:2px solid ${n.color}; cursor:pointer;">
        <div style="font-size:10.5px; color:var(--text-sec); font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">${n.title}</div>
        <div class="mono" style="font-size:20px; font-weight:700; margin-top:6px;">${n.value}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:3px;">${n.sub}</div>
      </div>`;
      if (i < flowNodes.length - 1) {
        const nc = flowNodes[i + 1].color;
        flowInner += `<div style="flex:1; position:relative; height:2px; background:var(--border); min-width:24px; margin:0 2px;">
          <div class="flow-dot" style="background:${nc}; box-shadow:0 0 8px ${nc};"></div>
        </div>`;
      }
    });

    const alertCards = data.active_alerts.map(a => `
      <div style="background:rgba(255,92,92,0.08); border:1px solid rgba(255,92,92,0.2); border-left:3px solid #FF5C5C; border-radius:10px; padding:13px 15px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div style="font-size:13px; font-weight:700;">🔴 ${a.title}</div>
          <span class="badge" style="background:rgba(255,92,92,0.2); color:#FF5C5C">${a.category}</span>
        </div>
        <div style="font-size:12px; color:var(--text-sec); margin-top:6px; line-height:1.5;">${a.description}</div>
        <div style="font-size:11.5px; color:var(--text-muted); margin-top:5px;"><b style="color:var(--text-sec);">Impact:</b> ${a.impact || 'Attention required'}</div>
        <button class="mono focus-ring" onclick="window.setPage('alerts')"
          style="margin-top:10px; font-size:11px; font-weight:700; color:#FF7A7A; border:1px solid #FF7A7A55; padding:6px 12px; border-radius:7px; background:transparent;">
          ${a.recommended_action || 'Review Alert'} →
        </button>
      </div>`).join('');

    return `
    <div style="display:flex; flex-direction:column; gap:18px; padding:22px 26px 50px;">
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px;">
        ${kpiCards}
      </div>

      <div class="card anim-in" style="padding:24px;">
        <div style="font-size:14px; font-weight:700; margin-bottom:4px;">Supply Chain Flow</div>
        <div style="font-size:11.5px; color:var(--text-muted); margin-bottom:18px;">End-to-end material flow across the network, live this cycle — click a stage to jump in</div>
        <div style="display:flex; align-items:center; overflow-x:auto; padding-bottom:4px;">${flowInner}</div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1.6fr; gap:18px; align-items:start;">
        <div class="card anim-in" style="padding:22px;">
          <div style="font-size:14px; font-weight:700; margin-bottom:2px;">Requires Attention</div>
          <div style="font-size:11.5px; color:var(--text-muted); margin-bottom:16px;">Actionable exceptions across the network</div>
          <div style="display:flex; flex-direction:column; gap:10px;">${alertCards}</div>
        </div>
        <div class="card anim-in" style="padding:22px;">
          <div style="font-size:14px; font-weight:700; margin-bottom:6px;">S&OP Health & Control Tower Metrics</div>
          <div style="font-size:11.5px; color:var(--text-muted); margin-bottom:14px;">Real-time alignment across Merchandising, Production, Inventory and Logistics.</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div style="padding:16px; background:var(--bg2); border-radius:12px; border:1px solid var(--border);">
              <div style="font-size:11px; color:var(--text-muted)">Overall S&OP Health</div>
              <div class="mono" style="font-size:28px; font-weight:800; color:#34E2B0; margin-top:4px;">${data.sop_health.overall}%</div>
              <div style="font-size:11px; color:var(--text-sec); margin-top:4px;">Cross-functional alignment</div>
            </div>
            <div style="padding:16px; background:var(--bg2); border-radius:12px; border:1px solid var(--border);">
              <div style="font-size:11px; color:var(--text-muted)">Active Exception Rate</div>
              <div class="mono" style="font-size:28px; font-weight:800; color:#FFC94D; margin-top:4px;">${data.at_risk_shipments}</div>
              <div style="font-size:11px; color:var(--text-sec); margin-top:4px;">At-risk shipments</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load overview data from API server. Reconnecting...</div>`;
  }
}
