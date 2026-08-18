/**
 * NEXUS Application Store & Reactive State Management
 */
export const store = {
  page: "overview",
  collapsed: false,
  facility: "All Facilities",
  selectedTruck: null,
  paletteOpen: false,
  paletteQuery: "",
  toasts: [],
  secondsAgo: 3,
  sortKey: null,
  sortDir: 1,
  tableQuery: "",
  chartRange: 30,
  trackingSelectedId: "TRK-104",
  scenario: {
    demand_increase_pct: 0,
    prod_capacity_change_pct: 0,
    transport_delay_days: 0,
    lead_time_days: 7,
  },
  sopTab: "monthly",
  inventoryScenario: "base",
  inventorySelected: "Summer Linen",
  alertSevFilter: "All",
  alertCatFilter: "All",
  reportsRange: "30d",
  yardSelectedId: "TRK-104",
  
  // Dynamic data cache populated via API / WebSockets
  trucks: [],
  docks: [],
  alerts: [],
  yardEvents: [],
  wsConnected: false,
  
  listeners: [],
  
  subscribe(fn) {
    this.listeners.push(fn);
  },
  
  notify() {
    this.listeners.forEach((fn) => fn(this));
  }
};
