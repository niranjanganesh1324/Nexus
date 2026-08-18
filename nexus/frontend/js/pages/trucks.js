import { API } from "../api.js?v=4";
import { store } from "../store.js?v=4";
import { statusBadgeHTML } from "../components/helpers.js?v=4";

export const FACILITY_COORDS = {
  "FAC-MUM-PLANT": [19.0760, 72.8777],
  "FAC-MUM-DC": [19.1800, 72.9800],
  "FAC-HYD-PLANT": [17.3850, 78.4867],
  "FAC-HYD-DC": [17.5100, 78.6000],
  "FAC-BLR-PLANT": [12.9716, 77.5946],
  "FAC-BLR-DC": [13.0500, 77.7200],
  "FAC-MAA-PLANT": [13.0827, 80.2707],
  "FAC-MAA-DC": [13.1500, 80.3500],
  "Mumbai Plant": [19.0760, 72.8777],
  "Mumbai DC": [19.1800, 72.9800],
  "Hyderabad Plant": [17.3850, 78.4867],
  "Hyderabad DC": [17.5100, 78.6000],
  "Bangalore Plant": [12.9716, 77.5946],
  "Bangalore DC": [13.0500, 77.7200],
  "Chennai Plant": [13.0827, 80.2707],
  "Chennai DC": [13.1500, 80.3500]
};

const TRUNK_ROUTES = [
  ["Mumbai DC", "Hyderabad DC"],
  ["Hyderabad DC", "Bangalore DC"],
  ["Bangalore DC", "Chennai DC"],
  ["Mumbai Plant", "Mumbai DC"],
  ["Hyderabad Plant", "Hyderabad DC"],
  ["Bangalore Plant", "Bangalore DC"],
  ["Chennai Plant", "Chennai DC"]
];

let mapInstance = null;
let currentTileLayer = null;
let currentMapTheme = 'dark'; // 'dark' | 'light'
let mapLayers = {
  markers: {},
  routes: [],
  trunkRoutes: [],
  facilities: []
};

function getFacilityCoord(idOrName) {
  if (!idOrName) return [15.0, 78.0];
  if (FACILITY_COORDS[idOrName]) return FACILITY_COORDS[idOrName];
  for (const [k, v] of Object.entries(FACILITY_COORDS)) {
    if (idOrName && (k.toLowerCase().includes(idOrName.toLowerCase()) || idOrName.toLowerCase().includes(k.toLowerCase()))) {
      return v;
    }
  }
  return [15.0, 78.0];
}

function getTruckPosition(t) {
  if (t.tracking_state && t.tracking_state.current_lat && t.tracking_state.current_lng) {
    return [t.tracking_state.current_lat, t.tracking_state.current_lng];
  }
  const a = getFacilityCoord(t.origin_name || t.origin_id);
  const b = getFacilityCoord(t.destination_name || t.destination_id);
  const p = Math.max(0, Math.min(1, ((t.tracking_state?.progress_pct ?? 50) / 100)));
  return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
}

function getStatusColor(status) {
  switch (status) {
    case "Delayed": return "#FF7A7A";
    case "At Risk": return "#FFC94D";
    case "Arrived": return "#5CC8FF";
    case "On Time":
    default: return "#34E2B0";
  }
}

function createTruckIcon(t, isSelected) {
  const color = getStatusColor(t.status);
  const size = isSelected ? 34 : 26;
  const pulseClass = isSelected ? 'truck-badge-selected' : '';
  return window.L.divIcon({
    className: 'real-map-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="truck-badge ${pulseClass}" style="width:${size}px; height:${size}px; background:${color}; border:2.5px solid ${isSelected ? '#00D4C7' : '#FFFFFF'}; box-shadow:0 0 16px ${color}88, 0 4px 12px rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; font-size:${isSelected ? '14px' : '11px'}; font-weight:800; border-radius:50%; color:#07111F;">
        ▰
      </div>`
  });
}

function createFacilityIcon(name, id) {
  const isPlant = (name && name.toLowerCase().includes('plant')) || (id && id.toLowerCase().includes('plant'));
  const color = isPlant ? '#F05252' : '#3B82F6';
  const symbol = isPlant ? '⚙' : '▣';
  return window.L.divIcon({
    className: 'real-map-marker',
    iconSize: [32, 38],
    iconAnchor: [16, 34],
    html: `
      <div class="facility-badge" style="background:${color}; border:2px solid #FFFFFF; box-shadow:0 4px 16px rgba(0,0,0,0.5);">
        <span>${symbol}</span>
      </div>`
  });
}

export function toggleMapTheme() {
  if (!mapInstance || !window.L) return;
  currentMapTheme = currentMapTheme === 'dark' ? 'light' : 'dark';

  if (currentTileLayer) {
    mapInstance.removeLayer(currentTileLayer);
  }

  const mapEl = document.getElementById("realMap");
  const labelEl = document.getElementById("mapThemeLabel");
  const iconEl = document.getElementById("mapThemeIcon");

  if (currentMapTheme === 'light') {
    currentTileLayer = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(mapInstance);
    if (mapEl) mapEl.style.background = '#e2e8f0';
    if (labelEl) labelEl.textContent = 'Light Map';
    if (iconEl) iconEl.textContent = '☀️';
  } else {
    currentTileLayer = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(mapInstance);
    if (mapEl) mapEl.style.background = '#07111F';
    if (labelEl) labelEl.textContent = 'Dark Map';
    if (iconEl) iconEl.textContent = '🌙';
  }

  // Re-order layers to ensure routes and pins stay on top
  mapLayers.trunkRoutes.forEach(tr => tr.bringToFront());
  mapLayers.routes.forEach(r => r.bringToFront());
  Object.values(mapLayers.markers).forEach(m => m.bringToFront());
  mapLayers.facilities.forEach(f => f.bringToFront());
}
window.toggleMapTheme = toggleMapTheme;

export function initTrucksMap() {
  const container = document.getElementById("realMap");
  if (!container || !window.L) return;

  // Cleanup old map instance if needed
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch (e) {
      console.warn("Map cleanup warning:", e);
    }
    mapInstance = null;
  }
  mapLayers = { markers: {}, routes: [], trunkRoutes: [], facilities: [] };

  // Initialize Leaflet Map centered on South-Central India network corridor
  mapInstance = window.L.map('realMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([15.8, 77.5], 6);

  // Active theme tile layer
  const tileUrl = currentMapTheme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  currentTileLayer = window.L.tileLayer(tileUrl, {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(mapInstance);

  const mapEl = document.getElementById("realMap");
  if (mapEl) {
    mapEl.style.background = currentMapTheme === 'light' ? '#e2e8f0' : '#07111F';
  }

  // Zoom control
  window.L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  renderMapLayers();

  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 50);
  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 250);
}

function renderMapLayers() {
  if (!mapInstance || !window.L || !store.trucks) return;

  // 1. Plot Facilities
  const addedFacilities = new Set();
  const facilityList = [
    { id: "FAC-MUM-PLANT", name: "Mumbai Plant", type: "Plant" },
    { id: "FAC-MUM-DC", name: "Mumbai DC", type: "Distribution Center" },
    { id: "FAC-HYD-PLANT", name: "Hyderabad Plant", type: "Plant" },
    { id: "FAC-HYD-DC", name: "Hyderabad DC", type: "Distribution Center" },
    { id: "FAC-BLR-PLANT", name: "Bangalore Plant", type: "Plant" },
    { id: "FAC-BLR-DC", name: "Bangalore DC", type: "Distribution Center" },
    { id: "FAC-MAA-PLANT", name: "Chennai Plant", type: "Plant" },
    { id: "FAC-MAA-DC", name: "Chennai DC", type: "Distribution Center" }
  ];

  facilityList.forEach(fac => {
    const coord = FACILITY_COORDS[fac.id];
    if (coord && !addedFacilities.has(fac.id)) {
      addedFacilities.add(fac.id);
      const m = window.L.marker(coord, {
        icon: createFacilityIcon(fac.name, fac.id),
        title: fac.name
      }).addTo(mapInstance).bindTooltip(`
        <div style="font-size:11.5px; font-weight:700;">${fac.name}</div>
        <div style="font-size:10px; color:#A9BED1;">${fac.type}</div>
      `, { direction: 'top', offset: [0, -32] });

      mapLayers.facilities.push(m);
    }
  });

  // 2. Plot Trunk Route Backbone
  TRUNK_ROUTES.forEach(([a, b]) => {
    const coordA = getFacilityCoord(a);
    const coordB = getFacilityCoord(b);
    if (coordA && coordB) {
      const line = window.L.polyline([coordA, coordB], {
        color: currentMapTheme === 'light' ? '#94A3B8' : '#476788',
        weight: 2,
        opacity: 0.45,
        dashArray: '5, 8'
      }).addTo(mapInstance);
      mapLayers.trunkRoutes.push(line);
    }
  });

  // 3. Plot Truck Routes and Active Truck Markers
  const trucks = store.trucks || [];
  let selectedTruckRoute = null;

  trucks.forEach(t => {
    const isSelected = store.trackingSelectedId === t.id;
    const coordA = getFacilityCoord(t.origin_name || t.origin_id);
    const coordB = getFacilityCoord(t.destination_name || t.destination_id);
    const color = getStatusColor(t.status);

    if (coordA && coordB) {
      const routeLine = window.L.polyline([coordA, coordB], {
        color: isSelected ? '#00D4C7' : color,
        weight: isSelected ? 5 : 2.5,
        opacity: isSelected ? 0.95 : 0.4,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isSelected ? null : '6, 6'
      }).addTo(mapInstance);

      routeLine.bindTooltip(`
        <div style="font-size:11px;"><b>${t.id}</b> · ${t.origin_name || t.origin_id} → ${t.destination_name || t.destination_id}</div>
        <div style="font-size:10px; color:${color}; font-weight:700;">${t.status} (${t.scheduled_eta})</div>
      `, { sticky: true });

      routeLine.on('click', () => {
        window.selectTrackingTruck(t.id);
      });

      mapLayers.routes.push(routeLine);

      if (isSelected) {
        selectedTruckRoute = [coordA, coordB];
        routeLine.bringToFront();
      }
    }

    // Live Truck Marker
    const pos = getTruckPosition(t);
    const marker = window.L.marker(pos, {
      icon: createTruckIcon(t, isSelected),
      title: t.id,
      zIndexOffset: isSelected ? 1000 : 100
    }).addTo(mapInstance);

    marker.bindTooltip(`
      <div style="font-size:12px; font-weight:800; color:#00D4C7;">${t.id} (${t.shipment_id})</div>
      <div style="font-size:10.5px; color:#F5F9FF; margin-top:2px;">${t.origin_name || t.origin_id} → ${t.destination_name || t.destination_id}</div>
      <div style="font-size:10px; color:#A9BED1; margin-top:3px;">
        Speed: <b>${t.tracking_state?.speed_kmh?.toFixed(0) || 50} km/h</b> | Progress: <b>${t.tracking_state?.progress_pct?.toFixed(0) || 0}%</b>
      </div>
      <div style="font-size:10px; font-weight:700; color:${color}; margin-top:2px;">Status: ${t.status}</div>
    `, { direction: 'top', offset: [0, -18] });

    marker.on('click', () => {
      window.selectTrackingTruck(t.id);
    });

    mapLayers.markers[t.id] = marker;
  });

  // Fit bounds to selected truck route if available
  if (selectedTruckRoute && mapInstance) {
    try {
      const bounds = window.L.latLngBounds(selectedTruckRoute);
      mapInstance.fitBounds(bounds.pad(0.35), { animate: true, duration: 0.6 });
    } catch (e) {
      console.warn("fitBounds warning:", e);
    }
  }
}

export function updateTrucksLiveTelemetry(payload) {
  if (!mapInstance || !window.L || !store.trucks) return;

  // 1. Update map markers smoothly
  (store.trucks || []).forEach(t => {
    const marker = mapLayers.markers[t.id];
    const isSelected = store.trackingSelectedId === t.id;
    const pos = getTruckPosition(t);

    if (marker) {
      marker.setLatLng(pos);
      marker.setIcon(createTruckIcon(t, isSelected));
    }

    // Update list item progress bar and text in DOM
    const bar = document.getElementById(`truck-bar-${t.id}`);
    const pct = document.getElementById(`truck-pct-${t.id}`);
    if (bar && t.tracking_state) {
      bar.style.width = `${t.tracking_state.progress_pct || 0}%`;
    }
    if (pct && t.tracking_state) {
      pct.textContent = `${t.tracking_state.progress_pct ? t.tracking_state.progress_pct.toFixed(0) : 0}%`;
    }
  });

  // 2. Update right panel if selected truck is updated
  const sel = (store.trucks || []).find(t => t.id === store.trackingSelectedId);
  if (sel && sel.tracking_state) {
    const s = sel.tracking_state;
    const spd = document.getElementById("selTruckSpeed");
    const dist = document.getElementById("selTruckDist");
    const prg = document.getElementById("selTruckProgress");
    const pbar = document.getElementById("selTruckProgressBar");
    const delay = document.getElementById("selTruckDelay");

    if (spd) spd.textContent = `${s.speed_kmh ? s.speed_kmh.toFixed(1) : 0} km/h`;
    if (dist) dist.textContent = `${s.distance_remaining_km ? s.distance_remaining_km.toFixed(1) : 0} km`;
    if (prg) prg.textContent = `${s.progress_pct ? s.progress_pct.toFixed(0) : 0}%`;
    if (pbar) pbar.style.width = `${s.progress_pct || 0}%`;
    if (delay) {
      delay.textContent = s.delay_minutes > 0 ? `+${s.delay_minutes} min` : 'On time';
      delay.style.color = s.delay_minutes > 0 ? '#FF7A7A' : '#34E2B0';
    }
  }
}

export function highlightTruckOnMap(truckId) {
  if (!mapInstance || !window.L) return;

  Object.values(mapLayers.markers).forEach(m => mapInstance.removeLayer(m));
  mapLayers.routes.forEach(r => mapInstance.removeLayer(r));
  mapLayers.trunkRoutes.forEach(tr => mapInstance.removeLayer(tr));
  mapLayers.facilities.forEach(f => mapInstance.removeLayer(f));

  mapLayers = { markers: {}, routes: [], trunkRoutes: [], facilities: [] };
  renderMapLayers();
}

window.recenterMap = function () {
  if (mapInstance) {
    mapInstance.flyTo([15.8, 77.5], 6, { duration: 0.8 });
  }
};

window.zoomMap = function (delta) {
  if (mapInstance) {
    mapInstance.setZoom(mapInstance.getZoom() + (delta > 0 ? 1 : -1));
  }
};

window.onMapSearch = function (query) {
  const q = (query || "").trim().toLowerCase();
  const resultsBox = document.getElementById("mapSearchResults");
  if (!resultsBox) return;

  if (!q) {
    resultsBox.innerHTML = "";
    return;
  }

  const truckHits = (store.trucks || []).filter(t =>
    t.id.toLowerCase().includes(q) ||
    (t.origin_name && t.origin_name.toLowerCase().includes(q)) ||
    (t.destination_name && t.destination_name.toLowerCase().includes(q)) ||
    (t.driver_name && t.driver_name.toLowerCase().includes(q))
  ).map(t => ({ type: 'truck', item: t, label: t.id, sub: `${t.origin_name || t.origin_id} → ${t.destination_name || t.destination_id}` }));

  const facilityHits = Object.keys(FACILITY_COORDS).filter(name =>
    name.toLowerCase().includes(q)
  ).slice(0, 4).map(name => ({ type: 'facility', label: name, sub: 'Logistics Facility', coord: FACILITY_COORDS[name] }));

  const allHits = [...truckHits, ...facilityHits].slice(0, 6);

  if (!allHits.length) {
    resultsBox.innerHTML = `<div style="background:var(--card); border:1px solid var(--border); padding:10px; border-radius:10px; font-size:11px; color:var(--text-muted);">No matches found</div>`;
    return;
  }

  resultsBox.innerHTML = `
    <div style="background:var(--card-elevated); border:1px solid var(--border); border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.5); overflow:hidden; width:280px;">
      ${allHits.map(h => `
        <div onclick="${h.type === 'truck' ? `window.selectTrackingTruck('${h.item.id}'); document.getElementById('mapSearchResults').innerHTML='';` : `mapInstance.flyTo([${h.coord[0]}, ${h.coord[1]}], 9, {duration:0.8}); document.getElementById('mapSearchResults').innerHTML='';`}"
          style="padding:9px 12px; border-bottom:1px solid var(--border); cursor:pointer; font-size:11.5px; transition:background 0.15s;"
          onmouseenter="this.style.background='rgba(0,212,199,0.1)'" onmouseleave="this.style.background='transparent'">
          <div style="font-weight:700; color:var(--text);">${h.label}</div>
          <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${h.sub}</div>
        </div>
      `).join('')}
    </div>`;
};

export async function renderTrucksPage() {
  try {
    const data = await API.getTrucks(store.facility);
    store.trucks = data.trucks;
    if (!store.trackingSelectedId && data.trucks.length) {
      store.trackingSelectedId = data.trucks[0].id;
    }

    const selectedTruck = data.trucks.find(t => t.id === store.trackingSelectedId) || data.trucks[0];
    const recData = selectedTruck ? await API.getDockRecommendation(selectedTruck.id) : null;

    const truckItems = data.trucks.map(t => {
      const active = store.trackingSelectedId === t.id;
      const color = getStatusColor(t.status);
      const state = t.tracking_state || { progress_pct: 50 };
      return `
      <div onclick="window.selectTrackingTruck('${t.id}')" class="focus-ring"
        style="padding:11px 12px; border-radius:10px; cursor:pointer; margin-bottom:6px;
        background:${active ? 'rgba(0,212,199,0.12)' : 'rgba(13,27,42,0.6)'};
        border:1.5px solid ${active ? 'var(--cyan)' : 'var(--border)'};
        box-shadow:${active ? '0 0 12px rgba(0,212,199,0.2)' : 'none'};">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:8px; height:8px; border-radius:50%; background:${color}; flex-shrink:0; box-shadow:0 0 8px ${color};"></span>
            <span class="mono" style="font-size:12.5px; font-weight:700; color:${active ? 'var(--cyan)' : 'var(--text)'};">${t.id}</span>
          </div>
          ${statusBadgeHTML(t.status)}
        </div>
        <div style="font-size:11px; color:var(--text-sec); margin-top:5px;">${t.origin_name || t.origin_id} → ${t.destination_name || t.destination_id}</div>
        <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-top:6px;">
          <span>ETA: <b class="mono" style="color:var(--text);">${t.scheduled_eta}</b></span>
          <span><b class="mono" id="truck-pct-${t.id}" style="color:var(--text);">${state.progress_pct ? state.progress_pct.toFixed(0) : 0}%</b></span>
        </div>
        <div style="height:4px; background:var(--bg2); border-radius:3px; overflow:hidden; margin-top:4px;">
          <div id="truck-bar-${t.id}" style="height:100%; width:${state.progress_pct || 0}%; background:${color}; border-radius:3px; transition:width 1s ease;"></div>
        </div>
      </div>`;
    }).join('');

    const tState = selectedTruck ? (selectedTruck.tracking_state || { progress_pct: 0, speed_kmh: 0, distance_remaining_km: 0, delay_minutes: 0 }) : { progress_pct: 0, speed_kmh: 0, distance_remaining_km: 0, delay_minutes: 0 };
    const color = selectedTruck ? getStatusColor(selectedTruck.status) : "#34E2B0";

    const rightPanel = selectedTruck ? `
    <div class="card anim-in" style="padding:20px; height:100%; overflow-y:auto;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div class="mono" style="font-size:18px; font-weight:700; color:var(--cyan);">${selectedTruck.id}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${selectedTruck.shipment_id} · Driver: ${selectedTruck.driver_name}</div>
        </div>
        ${statusBadgeHTML(selectedTruck.status)}
      </div>

      <div style="margin-top:14px; display:flex; align-items:center; gap:6px; font-size:10.5px; color:var(--text-muted); background:var(--bg2); padding:7px 10px; border-radius:7px; border:1px solid var(--border);">
        <span class="live-dot" style="background:${store.wsConnected ? '#34E2B0' : '#FFAB2E'}"></span> LIVE · SERVER SYNCHRONIZED
      </div>

      <div style="margin-top:16px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
          <span style="color:var(--text-sec);">Trip Progress</span>
          <span class="mono" id="selTruckProgress" style="font-weight:700; color:var(--cyan);">${tState.progress_pct ? tState.progress_pct.toFixed(0) : 0}%</span>
        </div>
        <div style="height:6px; background:var(--bg2); border-radius:4px; overflow:hidden;">
          <div id="selTruckProgressBar" style="height:100%; width:${tState.progress_pct || 0}%; background:${color}; border-radius:4px; transition:width 1.2s ease;"></div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px;">
        <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Current Speed</div>
          <div class="mono" id="selTruckSpeed" style="font-size:13px; font-weight:700; margin-top:3px;">${tState.speed_kmh ? tState.speed_kmh.toFixed(1) : 0} km/h</div>
        </div>
        <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Dist. Remaining</div>
          <div class="mono" id="selTruckDist" style="font-size:13px; font-weight:700; margin-top:3px;">${tState.distance_remaining_km ? tState.distance_remaining_km.toFixed(1) : 0} km</div>
        </div>
        <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Load Units</div>
          <div class="mono" style="font-size:13px; font-weight:700; margin-top:3px;">${selectedTruck.load_units} u</div>
        </div>
        <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Priority</div>
          <div class="mono" style="font-size:13px; font-weight:700; margin-top:3px; color:${selectedTruck.priority === 'High' ? '#FF7A7A' : '#FFC94D'}">${selectedTruck.priority}</div>
        </div>
        <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">ETA</div>
          <div class="mono" style="font-size:13px; font-weight:700; margin-top:3px;">${selectedTruck.scheduled_eta}</div>
        </div>
        <div style="background:var(--bg2); padding:10px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Delay Status</div>
          <div class="mono" id="selTruckDelay" style="font-size:13px; font-weight:700; margin-top:3px; color:${tState.delay_minutes > 0 ? '#FF7A7A' : '#34E2B0'}">${tState.delay_minutes > 0 ? '+' + tState.delay_minutes + ' min' : 'On time'}</div>
        </div>
      </div>

      <div style="margin-top:18px; padding:14px; background:var(--bg2); border-radius:10px; border:1px solid var(--border);">
        <div style="font-size:11.5px; font-weight:700; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <span>Explainable Recommended Dock</span>
          ${recData && recData.confidence ? `<span class="mono" style="font-size:10.5px; color:#34E2B0; font-weight:700;">${recData.confidence}% match</span>` : ''}
        </div>
        ${recData && recData.best ? `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="mono" style="font-size:16px; font-weight:700; color:var(--cyan);">${recData.best.dock_id} (Zone ${recData.best.zone || 'A'})</div>
              <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Score: <b>${recData.best.score}/100</b> · Compatible</div>
            </div>
          </div>
          <button onclick="window.assignDock('${selectedTruck.id}','${recData.best.dock_id}')" class="mono focus-ring"
            style="margin-top:12px; width:100%; background:var(--cyan); color:#07111F; border:none; padding:9px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;">
            Assign Dock ${recData.best.dock_id}
          </button>` : `<div style="font-size:11px; color:var(--text-muted);">No compatible docks currently available.</div>`}
      </div>
    </div>` : `<div class="card" style="padding:30px; text-align:center; color:var(--text-muted);">Select a truck to view live telemetry</div>`;

    return `
    <div style="display:grid; grid-template-columns:260px 1fr 320px; gap:16px; padding:22px 26px 50px; height:calc(100vh - 78px); min-width:0;">
      <!-- Fleet Left Column -->
      <div style="min-height:0;">
        <div class="card" style="padding:16px; height:100%; display:flex; flex-direction:column;">
          <div style="font-size:13px; font-weight:700; margin-bottom:2px;">Active Fleet · ${data.trucks.length} trucks</div>
          <div style="font-size:10.5px; color:var(--text-muted); margin-bottom:12px;">Server-authoritative GPS stream</div>
          <div style="overflow-y:auto; flex:1; padding-right:4px;">${truckItems}</div>
        </div>
      </div>

      <!-- Map Center Column -->
      <div class="card anim-in" style="padding:14px; min-height:0; display:flex; flex-direction:column; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:0 4px; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="font-size:13px; font-weight:700;">Live Network Tracking Map</div>
            <span class="badge" style="font-size:9px; padding:2px 8px; color:var(--cyan); border-color:rgba(0,212,199,0.3);">GPS Telemetry</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <!-- Dark / Light Mode Map Toggle Button -->
            <button id="mapThemeToggleBtn" onclick="window.toggleMapTheme()" class="focus-ring"
              style="background:var(--bg2); border:1px solid var(--border); color:var(--text-sec); padding:4px 10px; border-radius:6px; font-size:10.5px; font-weight:600; display:flex; align-items:center; gap:5px; cursor:pointer;"
              title="Toggle Map Light/Dark Mode">
              <span id="mapThemeIcon">${currentMapTheme === 'light' ? '☀️' : '🌙'}</span>
              <span id="mapThemeLabel">${currentMapTheme === 'light' ? 'Light Map' : 'Dark Map'}</span>
            </button>

            <button onclick="window.recenterMap()" class="focus-ring" style="background:var(--bg2); border:1px solid var(--border); color:var(--text-sec); padding:4px 9px; border-radius:6px; font-size:10.5px; font-weight:600;">
              Reset View
            </button>
            <div style="font-size:10px; color:var(--text-muted);">Sync: <b>2.5s</b></div>
          </div>
        </div>

        <!-- Map Canvas with Overlays -->
        <div style="flex:1; min-height:0; position:relative; border-radius:14px; overflow:hidden; border:1px solid var(--border);">
          <!-- Map Search Bar Overlay -->
          <div style="position:absolute; top:12px; left:12px; z-index:1000; display:flex; flex-direction:column; gap:4px;">
            <div style="background:rgba(13,27,42,0.92); border:1px solid var(--border); border-radius:10px; padding:6px 10px; display:flex; align-items:center; gap:8px; box-shadow:0 6px 20px rgba(0,0,0,0.4); backdrop-filter:blur(10px);">
              <span style="color:var(--cyan); font-size:12px;">🔍</span>
              <input id="mapSearchInput" oninput="window.onMapSearch(this.value)" placeholder="Search truck or facility..."
                style="border:none; background:transparent; color:var(--text); font-size:11.5px; width:190px; outline:none;" />
            </div>
            <div id="mapSearchResults"></div>
          </div>

          <!-- Live Status Badge Overlay -->
          <div style="position:absolute; top:12px; right:12px; z-index:1000; background:rgba(13,27,42,0.92); border:1px solid var(--border); border-radius:999px; padding:5px 12px; font-size:10px; font-weight:700; color:var(--text); box-shadow:0 6px 20px rgba(0,0,0,0.4); backdrop-filter:blur(10px); display:flex; align-items:center; gap:6px;">
            <span class="live-dot" style="background:#34E2B0;"></span> LIVE SATELLITE NETWORK
          </div>

          <!-- The Leaflet DOM Element -->
          <div id="realMap" style="width:100%; height:100%; min-height:480px; position:absolute; inset:0; background:#07111F;"></div>
        </div>
      </div>

      <!-- Right Details Column -->
      <div style="min-height:0;">${rightPanel}</div>
    </div>`;
  } catch (err) {
    console.error("renderTrucksPage error:", err);
    return `<div class="card" style="padding:40px; text-align:center; color:#FF7A7A;">Unable to load truck tracking data.</div>`;
  }
}
