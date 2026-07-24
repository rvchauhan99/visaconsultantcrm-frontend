/**
 * Lightweight client telemetry for UX KPIs.
 * Events land in console in development and window.__passageTelemetry for inspection.
 */
const buffer = [];

export function track(event, payload = {}) {
  const entry = {
    event,
    payload,
    ts: new Date().toISOString(),
    path: typeof window !== "undefined" ? window.location.pathname : null,
  };
  buffer.push(entry);
  if (typeof window !== "undefined") {
    window.__passageTelemetry = buffer.slice(-200);
  }
  if (process.env.NODE_ENV !== "production") {
    console.debug("[telemetry]", entry);
  }
}

export function getTelemetryBuffer() {
  return [...buffer];
}
