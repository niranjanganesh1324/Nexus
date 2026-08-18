/**
 * Icons helper & Navigation metadata
 */
export const ICONS = {
  overview: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  sop: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>`,
  demand: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>`,
  inventory: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  shipments: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="13" height="8" rx="1"/><path d="M15 11h3l3 3v2h-6z"/><circle cx="6" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/></svg>`,
  truck: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6v10h11V6H4z"/><path d="M15 10h3l2.5 3v3H15z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>`,
  dock: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V10l9-6 9 6v11"/><path d="M9 21v-8h6v8"/></svg>`,
  alerts: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>`,
  scenarios: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h13"/><circle cx="16" cy="6" r="1.8" fill="currentColor" stroke="none"/><circle cx="8" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19" cy="18" r="1.8" fill="currentColor" stroke="none"/></svg>`,
  reports: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`,
  chevronLeft: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
  chevronRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
  x: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 004 0"/></svg>`,
  gear: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>`,
};

export const NAV = [
  {key:"overview", label:"Overview", icon:ICONS.overview},
  {key:"sop", label:"S&OP Planning", icon:ICONS.sop},
  {key:"demand", label:"Demand", icon:ICONS.demand},
  {key:"inventory", label:"Inventory", icon:ICONS.inventory},
  {key:"procurement", label:"Fabric & Procurement", icon:ICONS.inventory},
  {key:"markdown", label:"Markdown Intelligence", icon:ICONS.demand},
  {key:"financial", label:"Financial Impact", icon:ICONS.reports},
  {key:"shipments", label:"Shipments", icon:ICONS.shipments},
  {key:"trucks", label:"Truck Tracking", icon:ICONS.truck},
  {key:"yard", label:"Yard & Docks", icon:ICONS.dock},
  {key:"allocation", label:"Trailer → Door Allocation", icon:ICONS.dock},
  {key:"alerts", label:"Alerts", icon:ICONS.alerts},
  {key:"scenarios", label:"Scenarios", icon:ICONS.scenarios},
  {key:"decision", label:"Decision Center", icon:ICONS.sop},
  {key:"reports", label:"Reports", icon:ICONS.reports},
];

export const PAGE_META = {
  overview:["Supply Chain Control Tower","End-to-end visibility across demand, production, inventory and logistics."],
  sop:["Integrated S&OP","Align demand, supply, production and inventory."],
  demand:["Demand Planning","Forecast accuracy, seasonality and leading indicators."],
  inventory:["Inventory Planning","SKU-level coverage, risk and recommendations."],
  procurement:["Fabric & Procurement","Optimize MOQ, lead time and supplier risk before production is released."],
  markdown:["Markdown Intelligence","Use sell-through, inventory and season timing to recommend action."],
  financial:["Financial Impact","Compare revenue, cost, margin and inventory implications across scenarios."],
  shipments:["Shipments","Track every active shipment across the network."],
  trucks:["Where's My Truck?","Live visibility across inbound and outbound logistics."],
  yard:["Yard & Dock Operations","Real-time dock availability and assignment."],
  allocation:["Trailer-to-Door Allocation","Every arrival window, trailer, assigned dock and operational status in one working summary."],
  alerts:["Alerts & Exceptions","Everything that needs operational attention."],
  scenarios:["Scenario Planning","Simulate supply chain decisions before committing."],
  decision:["Cross-Functional Decision Center","Convert planning and execution exceptions into coordinated actions."],
  reports:["Reports","Executive performance reporting."],
};

export function statusColors(status) {
  const map = {
    "On Time": { bg: "rgba(31,217,160,0.15)", fg: "#34E2B0" },
    "Delayed": { bg: "rgba(255,92,92,0.15)", fg: "#FF7A7A" },
    "At Risk": { bg: "rgba(255,171,46,0.15)", fg: "#FFC94D" },
    "Arrived": { bg: "rgba(56,189,248,0.15)", fg: "#5CC8FF" },
  };
  return map[status] || map["On Time"];
}

export function statusBadgeHTML(status) {
  const c = statusColors(status);
  return `<span class="badge" style="background:${c.bg}; color:${c.fg}">${status}</span>`;
}

export function sparklineSVG(data, color, w = 64, h = 24) {
  if (!data || !data.length) return "";
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / ((max - min) || 1)) * h;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></svg>`;
}

export function impactStat(label, value, color) {
  return `
  <div class="card" style="padding:14px 16px;">
    <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; font-weight:700; letter-spacing:0.4px;">${label}</div>
    <div class="mono" style="font-size:19px; font-weight:700; margin-top:6px; color:${color};">${value}</div>
  </div>`;
}
