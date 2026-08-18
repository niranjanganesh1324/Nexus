import { API } from "../api.js";

export async function renderFinancialPage() {
  try {
    const data = await API.getFinancial();

    const formatINR = (val) => {
      const cr = val / 10000000;
      if (cr >= 1) return `₹${cr.toFixed(2)} Cr`;
      const lakh = val / 100000;
      return `₹${lakh.toFixed(1)} L`;
    };

    const cards = data.scenarios.map(c => `
      <div class="card anim-in" style="padding:20px">
        <div style="font-weight:700">${c.name}</div>
        <div style="margin-top:16px;font-size:11px;color:var(--text-muted)">Revenue</div>
        <div class="mono" style="font-size:24px">${formatINR(c.revenue_inr)}</div>
        <div style="margin-top:10px;font-size:11px;color:var(--text-muted)">Cost</div>
        <div class="mono">${formatINR(c.cost_inr)}</div>
        <div style="margin-top:10px;font-size:11px;color:var(--text-muted)">Projected margin</div>
        <div class="mono" style="font-size:22px;color:${c.margin_pct > 30 ? '#34E2B0' : '#FFAB2E'}">${formatINR(c.margin_inr)} (${c.margin_pct}%)</div>
      </div>`).join('');

    return `
    <div style="display:flex;flex-direction:column;gap:18px;padding:22px 26px 50px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;">
        ${cards}
      </div>
      <div class="card" style="padding:22px">
        <div style="font-size:13px;font-weight:700">Integrated Financial Evaluation</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:8px">
          Calculated from real production costs, unit selling prices, logistics delays and sales volumes across canonical product collections.
        </div>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load financial impact data.</div>`;
  }
}
