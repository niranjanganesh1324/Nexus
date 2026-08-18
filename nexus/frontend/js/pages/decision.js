export async function renderDecisionPage() {
  const decisions = [
    ['Fabric Delay · TRK-104', '32-minute delay affects Summer Linen material inbound and projected inventory coverage.', 'Compare expedite, resequence and service-risk scenarios in Inventory Intelligence.', 'inventory'],
    ['Plant Capacity Gap', 'Bangalore plant utilization is at 91% while Hyderabad has available capacity.', 'Shift 1,800 units of planned production to Hyderabad plant.', 'sop'],
    ['Markdown Risk', 'Winter Denim Jacket sell-through is 42% with 3 weeks remaining in season.', 'Initiate a 15% markdown starting next week.', 'markdown']
  ];

  const cards = decisions.map(([title, desc, rec, page], i) => `
    <div style="margin-top:16px;padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--bg2)">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <b>${i + 1}. ${title}</b>
        <span class="badge" style="background:rgba(255,171,46,.14);color:#FFAB2E">Decision required</span>
      </div>
      <div style="font-size:11.5px;color:var(--text-sec);margin-top:8px">${desc}</div>
      <div style="margin-top:9px;font-size:12px"><b>Recommended action:</b> ${rec}</div>
      <button onclick="window.setPage('${page}')" class="nexus-secondary-btn focus-ring" style="margin-top:12px; padding:6px 12px; border-radius:7px; border:1px solid var(--border); background:transparent; color:var(--text-sec); cursor:pointer;">Review supporting data →</button>
    </div>`).join('');

  return `
  <div style="display:flex;flex-direction:column;gap:18px;padding:22px 26px 50px;">
    <div class="card anim-in" style="padding:22px">
      <div style="font-size:14px;font-weight:700">Active Cross-Functional Exception Decision Queue</div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px">Planning and real-time execution exceptions brought into one unified executive queue.</div>
      ${cards}
    </div>
    <div class="card" style="padding:20px">
      <div style="font-size:13px;font-weight:700">Closed-Loop Architecture</div>
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;font-size:11px;align-items:center;">
        <span class="badge" style="background:var(--bg2);color:var(--text-sec)">Demand Plan</span><span>→</span>
        <span class="badge" style="background:var(--bg2);color:var(--text-sec)">Fabric & Capacity</span><span>→</span>
        <span class="badge" style="background:var(--bg2);color:var(--text-sec)">Production</span><span>→</span>
        <span class="badge" style="background:var(--bg2);color:var(--text-sec)">Shipment</span><span>→</span>
        <span class="badge" style="background:var(--bg2);color:var(--text-sec)">Live Truck + Yard + Dock</span><span>→</span>
        <span class="badge" style="background:rgba(31,217,160,.12);color:#34E2B0">Feedback to S&OP</span>
      </div>
    </div>
  </div>`;
}
