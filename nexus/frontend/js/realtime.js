/**
 * NEXUS Real-time WebSocket Client with Serverless Polling Fallback
 * Manages /ws/live connection, auto-reconnect, and fallback telemetry polling.
 */
import { store } from "./store.js";
import { API } from "./api.js";

let socket = null;
let reconnectTimer = null;
let retryCount = 0;
let fallbackPollingTimer = null;

export function initRealtime(onMessageCallback) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/live`;

  connect(wsUrl, onMessageCallback);
}

function connect(wsUrl, onMessageCallback) {
  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      store.wsConnected = true;
      retryCount = 0;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (fallbackPollingTimer) {
        clearInterval(fallbackPollingTimer);
        fallbackPollingTimer = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessageCallback) onMessageCallback(data);
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };

    socket.onclose = () => {
      store.wsConnected = false;
      scheduleReconnect(wsUrl, onMessageCallback);
      startFallbackPolling(onMessageCallback);
    };

    socket.onerror = () => {
      store.wsConnected = false;
      try { socket.close(); } catch (e) {}
    };
  } catch (e) {
    scheduleReconnect(wsUrl, onMessageCallback);
    startFallbackPolling(onMessageCallback);
  }
}

function scheduleReconnect(wsUrl, onMessageCallback) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  retryCount++;
  // If failed more than 3 times, back off to 20s
  const delay = retryCount > 3 ? 20000 : Math.min(2000 * retryCount, 10000);
  reconnectTimer = setTimeout(() => connect(wsUrl, onMessageCallback), delay);
}

function startFallbackPolling(onMessageCallback) {
  if (fallbackPollingTimer) return;
  fallbackPollingTimer = setInterval(async () => {
    try {
      const data = await API.getTrucks();
      if (data && data.trucks) {
        const payload = data.trucks.map(t => ({
          truck_id: t.id,
          status: t.status,
          current_lat: t.tracking_state?.current_lat,
          current_lng: t.tracking_state?.current_lng,
          progress_pct: t.tracking_state?.progress_pct,
          speed_kmh: t.tracking_state?.speed_kmh,
          distance_remaining_km: t.tracking_state?.distance_remaining_km,
          delay_minutes: t.tracking_state?.delay_minutes
        }));
        if (onMessageCallback) {
          onMessageCallback({ type: "truck_update", payload });
        }
      }
    } catch (e) {
      // Quietly ignore polling failures on offline
    }
  }, 4000);
}
