/**
 * Logging + tiny async helpers. Deliberately free of any Bluetooth imports so
 * mock-mode tools can use them without touching the native BLE binding.
 */

const T0 = Date.now();
const TAG_COLORS = {
  SCAN: "36",   // cyan            — BLE scanning / advertisement
  PAIR: "35",   // magenta         — connection & handshake
  HUB: "34",    // blue            — hub-level events (battery, button, disconnect)
  ATTACH: "33", // yellow          — device attach/detach messages
  TX: "32",     // green           — commands we send (intent level)
  RAW: "90",    // gray            — raw frames (hex)
  RX: "96",     // bright cyan     — parsed sensor values coming back
  TILE: "95",   // bright magenta  — color-tile reactions
  DEMO: "97",   // bright white    — narration
  WARN: "91",   // bright red
  ERR: "91",
};

// Subscribers get every log line as structured data (used by the WS server
// to mirror the log into the web panel).
const logListeners = new Set();
export function onLog(listener) {
  logListeners.add(listener);
  return () => logListeners.delete(listener);
}

export function log(tag, message, data) {
  const t = (Date.now() - T0) / 1000;
  const elapsed = t.toFixed(3).padStart(8);
  const color = TAG_COLORS[tag] ?? "0";
  const suffix = data === undefined ? "" : ` \x1b[2m${JSON.stringify(data)}\x1b[0m`;
  console.log(`\x1b[2m${elapsed}s\x1b[0m \x1b[${color}m${tag.padEnd(6)}\x1b[0m ${message}${suffix}`);
  for (const listener of logListeners) {
    try { listener({ t: Number(t.toFixed(3)), tag, message, data }); } catch { /* listener's problem */ }
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const hex = (buf) => [...buf].map((b) => b.toString(16).padStart(2, "0")).join(" ");
export const enumName = (enumObj, value) => `${enumObj[value] ?? "UNKNOWN"}(${value})`;

export function withTimeout(promise, ms, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`gave up waiting for ${what} after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
