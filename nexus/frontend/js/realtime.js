/**
 * NEXUS Real-time WebSocket Client
 * Manages /ws/live connection, auto-reconnect, and state dispatching.
 */
import { store } from "./store.js";

let socket = null;
let reconnectTimer = null;
let retryCount = 0;

export function initRealtime(onMessageCallback) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws/live`;

  connect(wsUrl, onMessageCallback);
}

function connect(wsUrl, onMessageCallback) {
  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket live connection established.");
      store.wsConnected = true;
      retryCount = 0;
      if (reconnectTimer) clearTimeout(reconnectTimer);
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
      console.warn("WebSocket disconnected. Attempting reconnect...");
      scheduleReconnect(wsUrl, onMessageCallback);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      socket.close();
    };
  } catch (e) {
    scheduleReconnect(wsUrl, onMessageCallback);
  }
}

function scheduleReconnect(wsUrl, onMessageCallback) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  retryCount++;
  const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // exponential backoff cap 10s
  reconnectTimer = setTimeout(() => connect(wsUrl, onMessageCallback), delay);
}
