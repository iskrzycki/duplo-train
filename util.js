/**
 * BLE helpers for the DUPLO train showcase & debug scripts.
 * Logging helpers live in log.js (re-exported here for convenience) —
 * importing THIS module pulls in the native Bluetooth binding.
 */

import { PoweredUP, Consts } from "node-poweredup";
import { log, sleep, enumName, hex } from "./log.js";
import { installBleWriteQueue } from "./transport.js";

export * from "./log.js";

/* ─────────────────────────── BLE plumbing ──────────────────────────── */

/**
 * Scan until a DUPLO Train Base advertises, then resolve with its hub object
 * (not yet connected). Logs the whole discovery phase.
 */
export function findDuploTrain() {
  return new Promise((resolve) => {
    const poweredUP = new PoweredUP();

    log("SCAN", "Starting Bluetooth LE scan…");
    log("SCAN", "→ Press the green button on the train base once — its LED blinks while it advertises.");

    const reminder = setInterval(() => {
      log("SCAN", "Still scanning… train on and blinking? It auto-sleeps quickly — press the green button again.");
    }, 8000);

    poweredUP.on("discover", (hub) => {
      log("SCAN", `Advertisement: "${hub.name}"`, {
        hubType: enumName(Consts.HubType, hub.type),
        uuid: hub.uuid,
      });
      if (hub.type !== Consts.HubType.DUPLO_TRAIN_BASE) {
        log("SCAN", "…not a DUPLO Train Base, ignoring.");
        return;
      }
      clearInterval(reminder);
      poweredUP.stop();
      log("SCAN", "That's our train! Stopping the scan.");
      // Install before connect(): handshake/subscriptions use the same BLE
      // characteristic as subsequent LED, motor and speaker commands.
      installBleWriteQueue(hub, {
        onStall: (err) => {
          log("ERR", err.message);
          hub.disconnect().catch((disconnectError) => log("ERR", `Disconnect failed: ${disconnectError.message}`));
        },
      });
      log("PAIR", "BLE writes serialized across all ports (motor / LED / speaker / setup)");
      resolve(hub);
    });

    poweredUP.scan();
  });
}

/**
 * Hex-dump every outgoing write on a RAW log line. The library prepends
 * [length, hubId=0x00] itself; we reconstruct that here so the hex shown is
 * exactly what goes over the air.
 *
 * Repetitive traffic (the motor keep-alive at 10 Hz, blinking LED effects)
 * would flood the log, so any frame already seen in the last 5 s is
 * suppressed and rolled up into an occasional summary line. New/changed
 * frames always log immediately.
 */
export function installTxTap(hub) {
  const originalSend = hub.send.bind(hub);
  const seen = new Map(); // frameHex → last time it was sent
  let suppressed = 0;
  let lastSummaryAt = Date.now();
  const WINDOW_MS = 5000;

  hub.send = (message, uuid) => {
    const wireFrame = Buffer.concat([Buffer.from([message.length + 2, 0x00]), message]);
    const frameHex = hex(wireFrame);
    const now = Date.now();
    const isRepeat = seen.has(frameHex) && now - seen.get(frameHex) < WINDOW_MS;
    seen.set(frameHex, now);
    if (seen.size > 64) {
      for (const [key, at] of seen) if (now - at > WINDOW_MS) seen.delete(key);
    }

    if (isRepeat) {
      suppressed++;
      if (now - lastSummaryAt >= WINDOW_MS) {
        log("RAW", `TX …${suppressed} repeated frame(s) suppressed (keep-alive / LED effects)`);
        suppressed = 0;
        lastSummaryAt = now;
      }
    } else {
      if (suppressed > 0) {
        log("RAW", `TX …${suppressed} repeated frame(s) suppressed`);
        suppressed = 0;
      }
      lastSummaryAt = now;
      log("RAW", `TX ${frameHex}  ← ${enumName(Consts.MessageType, message[0])}`);
    }
    return originalSend(message, uuid);
  };
}

// Continuous motor driving (keep-alive against the DUPLO motion watchdog)
// lives in driver.js — it has no BLE imports so it stays mock-testable.
export * from "./driver.js";

/* ─────────────── verified sensor subscriptions (0x41/0x47) ─────────────── */

/**
 * Run `listener(mode)` every time the hub ACKs a Port Input Format Setup for
 * this device (the 0x47 message — the only proof a subscription took effect).
 * Returns an unsubscribe function.
 */
export function onModeAck(device, listener) {
  if (!device.__modeAckListeners) {
    device.__modeAckListeners = [];
    const originalSetMode = device.setMode.bind(device);
    device.setMode = (mode) => {
      originalSetMode(mode);
      device.__modeAckListeners.forEach((l) => l(mode));
    };
  }
  device.__modeAckListeners.push(listener);
  return () => {
    device.__modeAckListeners = device.__modeAckListeners.filter((l) => l !== listener);
  };
}

/**
 * Subscribe a device to a mode and wait for the hub's 0x47 acknowledgment,
 * retrying if it doesn't arrive. Some hub firmware (the DUPLO base among
 * them) can miss a subscribe sent too early or back-to-back with others —
 * without the ACK the sensor never streams and the failure is silent.
 */
export async function subscribeVerified(device, modeId, label, { attempts = 3, ackTimeout = 2000 } = {}) {
  if (device.mode === modeId) {
    log("RX", `${label}: already in mode ${modeId}`);
    return true;
  }
  let ackedMode = device.mode;
  const stopListening = onModeAck(device, (mode) => { ackedMode = mode; });
  try {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      log("TX", `${label}: subscribing (0x41, port ${device.portId}, mode ${modeId}, notifications ON)${attempt > 1 ? ` — retry ${attempt - 1}` : ""}`);
      // hub.subscribe directly: Device.subscribe() skips the send when it
      // thinks it's already in that mode, which defeats retries.
      device.hub.subscribe(device.portId, device.type, modeId)
        .catch((err) => log("WARN", `${label}: BLE write failed: ${err.message}`));
      const deadline = Date.now() + ackTimeout;
      while (Date.now() < deadline) {
        if (ackedMode === modeId) {
          log("RX", `${label}: hub ACKed (0x47) — port ${device.portId} is now in mode ${modeId} ✔`);
          return true;
        }
        await sleep(50);
      }
      log("WARN", `${label}: no 0x47 ACK within ${ackTimeout} ms`);
    }
    log("WARN", `${label}: subscription NOT confirmed after ${attempts} attempts — data will probably not flow!`);
    return false;
  } finally {
    stopListening();
  }
}
