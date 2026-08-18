import { API } from "../api.js";

export async function renderMarkdownPage() {
  try {
    const data = await API.getMarkdown();

    const cards = data.collections.map(p => `
      <div class="card anim-in" style="padding:20px">
        <div style="font-weight:700">${p.name}</div>
        <div class="mono" style="font-size:30px;margin-top:16px;color:${p.status === 'Critical' ? '#FFAB2E' : p.status === 'Healthy' ? '#34E2B0' : '#5CC8FF'}">${p.sell_through_pct}%</div>
        <div style="font-size:11px;color:var(--text-muted)">Sell-through</div>
        <div style="margin-top:15px;font-size:11.5px;color:var(--text-sec)">
          Inventory: <b>${p.inventory_units.toLocaleString()} units</b><br>
          Season remaining: <b>${p.weeks_remaining} weeks</b>
        </div>
        <div style="margin-top:14px;padding:10px;border-left:3px solid ${p.status === 'Critical' ? '#FFAB2E' : p.status === 'Healthy' ? '#34E2B0' : '#5CC8FF'};background:var(--bg2);font-size:12px">
          <b>Recommendation:</b> ${p.action}
        </div>
      </div>`).join('');

    return `
    <div style="display:flex;flex-direction:column;gap:18px;padding:22px 26px 50px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;">
        ${cards}
      </div>
      <div class="card" style="padding:20px">
        <div style="font-size:13px;font-weight:700">Closed-Loop Markdown Decision Pipeline</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:8px">
          Rule-driven markdown evaluation based on sell-through rate, inventory runway and season timing. Decision feeds directly into consensus demand and rolling S&OP plans.
        </div>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load markdown intelligence data.</div>`;
  }
}
