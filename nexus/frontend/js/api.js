/**
 * NEXUS Frontend API Client
 * Clean REST communication with FastAPI backend.
 */
const API_BASE = "/api";

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

export const API = {
  // Overview
  getOverview: () => request("/overview"),

  // Trucks
  getTrucks: (facility, status) => {
    const params = new URLSearchParams();
    if (facility) params.append("facility", facility);
    if (status) params.append("status", status);
    return request(`/trucks?${params.toString()}`);
  },
  getTruck: (id) => request(`/trucks/${id}`),

  // Docks
  getDocks: () => request("/docks"),
  getDockRecommendation: (truckId) => request(`/docks/recommendation?truck_id=${truckId}`),
  assignDock: (dockId, truckId, slotStart, slotEnd) =>
    request(`/docks/${dockId}/assign`, {
      method: "POST",
      body: JSON.stringify({ truck_id: truckId, slot_start: slotStart, slot_end: slotEnd }),
    }),
  triggerMaintenance: (dockId, slotStart, slotEnd, reason) =>
    request(`/docks/${dockId}/maintenance`, {
      method: "POST",
      body: JSON.stringify({ slot_start: slotStart, slot_end: slotEnd, reason }),
    }),
  getDockSchedule: () => request("/docks/schedule"),

  // Yard
  getYardEvents: () => request("/yard/events"),
  getYardMetrics: () => request("/yard/metrics"),
  getYardConflicts: () => request("/yard/conflicts"),
  runWhatIf: (truckId, delayMinutes) =>
    request("/yard/what-if", {
      method: "POST",
      body: JSON.stringify({ truck_id: truckId, delay_minutes: delayMinutes }),
    }),

  // Alerts
  getAlerts: (severity, category, status) => {
    const params = new URLSearchParams();
    if (severity) params.append("severity", severity);
    if (category) params.append("category", category);
    if (status) params.append("status", status);
    return request(`/alerts?${params.toString()}`);
  },
  resolveAlert: (id) => request(`/alerts/${id}/resolve`, { method: "POST" }),

  // P2 Modules
  getDemand: () => request("/demand"),
  getInventory: (simulateDelay = false, delayTruckId = "TRK-104") =>
    request(`/inventory?simulate_delay=${simulateDelay}&delay_truck_id=${delayTruckId}`),
  getSOP: () => request("/sop"),
  getProcurement: () => request("/procurement"),
  getMarkdown: () => request("/markdown"),
  getFinancial: () => request("/financial"),

  // Scenarios
  runScenario: (scenarioData) =>
    request("/scenarios/run", {
      method: "POST",
      body: JSON.stringify(scenarioData),
    }),
  getScenarioHistory: () => request("/scenarios/history"),

  // Reports
  getReport: (range = "30d") => request(`/reports?range=${range}`),
  exportReportUrl: (range = "30d") => `${API_BASE}/reports/export?range=${range}`,
};
