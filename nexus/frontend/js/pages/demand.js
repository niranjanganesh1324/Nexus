import { API } from "../api.js";
import { impactStat } from "../components/helpers.js";

export async function renderDemandPage() {
  try {
    const data = await API.getDemand();

    const rows = data.collections.map(c => `
      <tr style="border-bottom:1px solid var(--border)">
        <td style="padding:13px 11px;font-weight:800">${c.name}</td>
        <td>${c.records.length ? c.records[0].forecast_units.toLocaleString() : '—'}</td>
        <td>${c.records.length && c.records[0].actual_units ? c.records[0].actual_units.toLocaleString() : '—'}</td>
        <td style="color:${c.variance_pct >= 0 ? '#34E2B0' : '#FF5C5C'}">${c.variance_pct >= 0 ? '+' : ''}${c.variance_pct}%</td>
        <td style="color:var(--cyan);font-weight:700">${c.demand_signal}</td>
        <td><b>${c.consensus_next ? c.consensus_next.toLocaleString() : '—'}</b></td>
      </tr>`).join('');

    return `
    <div style="display:flex;flex-direction:column;gap:16px;padding:22px 26px 50px">
      <div class="card" style="padding:20px">
        <div style="font-size:16px;font-weight:800">Demand Reconciliation & Forecasting Model</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:5px">Merchandising forecast + actual sales performance → Holt-Winters statistical demand model.</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:18px">
          ${impactStat("Total Forecast", data.total_forecast.toLocaleString() + " units", "#38BDF8")}
          ${impactStat("Actual Sales", data.total_actual.toLocaleString() + " units", "#34E2B0")}
          ${impactStat("Forecast Variance", data.forecast_variance_pct + "%", "#FFAB2E")}
          ${impactStat("Consensus Next Demand", data.total_consensus.toLocaleString() + " units", "#FF4FA3")}
        </div>
      </div>

      <div class="card" style="padding:18px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-size:13px;font-weight:800">Model Evaluation Metrics</div>
          <div class="badge" style="background:var(--bg2); color:var(--cyan); border:1px solid var(--border);">Model: ${data.model_type.toUpperCase()}</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
          <div style="padding:14px; background:var(--bg2); border-radius:10px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text-muted)">MAPE (Mean Absolute Percentage Error)</div>
            <div class="mono" style="font-size:24px; font-weight:800; color:#34E2B0; margin-top:4px;">${data.mape !== null ? data.mape + '%' : 'N/A'}</div>
            <div style="font-size:10.5px; color:var(--text-sec); margin-top:4px;">Calculated on validation dataset split</div>
          </div>
          <div style="padding:14px; background:var(--bg2); border-radius:10px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text-muted)">RMSE (Root Mean Squared Error)</div>
            <div class="mono" style="font-size:24px; font-weight:800; color:#38BDF8; margin-top:4px;">${data.rmse !== null ? data.rmse.toLocaleString() + ' units' : 'N/A'}</div>
            <div style="font-size:10.5px; color:var(--text-sec); margin-top:4px;">Penalizes extreme forecast misses</div>
          </div>
        </div>
      </div>

      <div class="card" style="padding:18px;overflow:auto">
        <div style="font-size:13px;font-weight:800;margin-bottom:12px">Merchandising Forecast vs Statistical Signals</div>
        <table style="width:100%;min-width:800px;border-collapse:collapse;font-size:12px">
          <thead>
            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);text-align:left">
              <th style="padding:11px">Collection</th><th>Forecast</th><th>Actual Sales</th><th>Variance</th><th>Demand Signal</th><th>Next Consensus Demand</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load demand forecasting data.</div>`;
  }
}
