import client from "prom-client";

// Create a Registry to hold all metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register });

// ---------------------------------------------------------------------------
// Custom Metrics
// ---------------------------------------------------------------------------

// HTTP request duration histogram
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// HTTP request counter
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

// Active WebSocket connections gauge
export const websocketConnectionsGauge = new client.Gauge({
  name: "websocket_connections_active",
  help: "Number of active WebSocket connections",
  registers: [register],
});

export { register };
