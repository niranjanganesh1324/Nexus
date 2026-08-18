import { API } from "../api.js";
import { store } from "../store.js";
import { impactStat } from "../components/helpers.js";

export async function renderScenariosPage() {
  try {
    const sc = store.scenario;
    const history = await API.getScenarioHistory();

    const sliderRow = (label, key, min, max, step, suffix) => `
      <div style="margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
          <span style="color:var(--text-sec);">${label}</span>
          <span id="${key}Val" class="mono" style="font-weight:700; color:var(--cyan);">${sc[key] > 0 && key === 'prod_capacity_change_pct' ? '+' : ''}${sc[key]}${suffix}</span>
        </div>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${sc[key]}"
          oninput="window.onScenarioSlider('${key}', this.value, '${suffix}')" style="width:100%; accent-color:#7C5CFF;">
      </div>`;

    const historyRows = history.runs.slice(0, 5).map(r => `
      <div style="padding:10px 12px; background:var(--bg2); border-radius:8px; margin-bottom:6px; font-size:11px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <b>${r.name}</b>
          <div style="color:var(--text-muted); margin-top:2px;">Demand: +${r.inputs.demand_increase_pct}% | Delay: ${r.inputs.transport_delay_days} days</div>
        </div>
        <span class="mono" style="color:#34E2B0; font-weight:700;">Util: ${r.production_util_pct}%</span>
      </div>`).join('');

    return `
    <div style="display:flex; flex-direction:column; gap:18px; padding:22px 26px 50px;">
      <div class="card anim-in" style="padding:22px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:14px; font-weight:700;">Simulate a Supply Chain Scenario</div>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">Calculated backend scenario engine reusing exact domain models.</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button onclick="window.runPresetScenario('Demand Surge +20%', 20, 0, 2, 7)" class="mono focus-ring" style="background:var(--cyan); color:#150B2E; border:none; padding:9px 16px; border-radius:8px; font-size:11.5px; font-weight:700;">▶ Run "Demand Surge +20%"</button>
            <button onclick="window.resetScenario()" class="mono focus-ring" style="background:var(--bg2); color:var(--text-sec); border:1px solid var(--border); padding:9px 14px; border-radius:8px; font-size:11.5px; font-weight:700;">Reset</button>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1.3fr; gap:18px; align-items:start;">
        <div class="card anim-in" style="padding:22px;">
          <div style="font-size:12.5px; font-weight:700; margin-bottom:16px;">Scenario Controls</div>
          ${sliderRow("Demand increase", "demand_increase_pct", 0, 50, 1, "%")}
          ${sliderRow("Production capacity change", "prod_capacity_change_pct", -20, 20, 1, "%")}
          ${sliderRow("Transport delay", "transport_delay_days", 0, 7, 1, " days")}
          ${sliderRow("Lead time", "lead_time_days", 1, 14, 1, " days")}
          
          <button onclick="window.runCurrentScenario()" class="mono focus-ring" style="margin-top:10px; width:100%; background:var(--cyan); color:#150B2E; border:none; padding:10px; border-radius:8px; font-size:12px; font-weight:800;">
            Calculate Scenario Impact →
          </button>
        </div>

        <div class="card anim-in" style="padding:22px;">
          <div style="font-size:12.5px; font-weight:700; margin-bottom:16px;">Scenario Impact & History</div>
          <div id="scenarioImpactPanel">
            <div style="color:var(--text-muted); font-size:12px;">Adjust sliders or click run to trigger backend scenario calculation.</div>
          </div>
          <div style="margin-top:20px; border-top:1px solid var(--border); padding-top:14px;">
            <div style="font-size:12px; font-weight:700; margin-bottom:10px;">Persisted Scenario Run History</div>
            ${historyRows || '<div style="font-size:11px; color:var(--text-muted);">No saved runs yet.</div>'}
          </div>
        </div>
      </div>
    </div>`;
  } catch (err) {
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load scenario engine.</div>`;
  }
}
