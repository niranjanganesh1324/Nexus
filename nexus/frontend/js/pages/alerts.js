import { API } from "../api.js";
import { store } from "../store.js";

export async function renderAlertsPage() {
  try {
    const data = await API.getAlerts(store.alertSevFilter, store.alertCatFilter);
    store.alerts = data.alerts;

    const sevTabs = ['All', 'Critical', 'High', 'Medium', 'Resolved'].map(v => `
      <button onclick="window.setAlertSevFilter('${v}')" class="mono focus-ring"
        style="font-size:11px; font-weight:700; padding:6px 13px; border-radius:100px; border:1px solid var(--border);
        background:${store.alertSevFilter === v ? 'var(--cyan)' : 'transparent'};
        color:${store.alertSevFilter === v ? '#150B2E' : 'var(--text-sec)'};">${v}</button>`).join('');

    const cats = ['All', 'Demand', 'Inventory', 'Production', 'Shipment', 'Truck', 'Dock', 'Procurement'];
    const catOptions = cats.map(c => `<option ${store.alertCatFilter === c ? 'selected' : ''}>${c}</option>`).join('');

    const rows = data.alerts.map(a => {
      const sevColor = { Critical: '#FF5C5C', High: '#FFAB2E', Medium: '#F5C242', Low: '#5CC8FF' }[a.severity] || '#94A3B8';
      return `
      <div class="card" style="padding:16px 18px; opacity:${a.status === 'Resolved' ? 0.65 : 1};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span class="badge" style="background:${sevColor}22; color:${sevColor};">${a.severity}</span>
            <span class="badge" style="background:var(--bg2); color:var(--text-sec); border:1px solid var(--border);">${a.category}</span>
            <span style="font-size:13px; font-weight:700;">${a.title}</span>
          </div>
          <span class="mono" style="font-size:10.5px; color:var(--text-muted);">${new Date(a.created_at).toLocaleTimeString()}</span>
        </div>
        <div style="font-size:12px; color:var(--text-sec); margin-top:8px;">${a.description}</div>
        <div style="font-size:11.5px; color:var(--text-muted); margin-top:5px;"><b style="color:var(--text-sec);">Impact:</b> ${a.impact || 'None'}</div>
        <div style="display:flex; gap:8px; margin-top:12px;">
          ${a.status === 'Open' ? `
            <button onclick="window.resolveAlert(${a.id})" class="mono focus-ring" style="font-size:10.5px; font-weight:700; color:#34E2B0; border:1px solid #34E2B055; padding:6px 12px; border-radius:7px; background:transparent;">Resolve</button>` :
            `<span class="mono" style="font-size:10.5px; color:#34E2B0; font-weight:700;">✓ Resolved</span>`}
        </div>
      </div>`;
    }).join('');

    return `
    <div style="display:flex; flex-direction:column; gap:16px; padding:22px 26px 50px;">
      <div class="card anim-in" style="padding:18px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">${sevTabs}</div>
          <select onchange="window.setAlertCatFilter(this.value)" class="mono focus-ring" style="background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:7px 10px; font-size:11.5px; color:var(--text);">
            ${catOptions}
          </select>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${rows || '<div class="card" style="padding:30px; text-align:center; color:var(--text-muted); font-size:12.5px;">No alerts match this filter.</div>'}
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load alerts.</div>`;
  }
}
