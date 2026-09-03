/**
 * DUPLO Train Base — color sensor deep-debug
 *
 * Isolates the color sensor (port 18) and inspects every protocol layer, so
 * you can see exactly WHERE the chain breaks:
 *
 *   layer 1  TX   0x41 Port Input Format Setup   — did we ask for data?
 *   layer 2  ACK  0x47 Port Input Format Single  — did the hub confirm it?
 *   layer 3  RAW  0x45 Port Value Single         — does the sensor send anything?
 *   layer 4  EVENT parsed "color"/… event        — does the library surface it?
 *
 * Layer 3→4 is where silent drops happen: in COLOR mode the library ignores
 * every raw value > 10 (255 = "nothing recognizable in view"), so a working
 * sensor with nothing under it produces ZERO events.
 *
 * The script walks all four sensor modes and prints a per-layer summary with
 * a verdict at the end. No motor, no sounds — hold the train in your hand or
 * on the desk.
 *
 * Usage:  npm run debug:color        (or: node debug-color.js)
 */

import { Consts } from "node-poweredup";
import {
  log, sleep, hex, enumName, withTimeout,
  findDuploTrain, installTxTap, onModeAck, subscribeVerified,
} from "./util.js";

// The library's mode map for the DUPLO color sensor (port 18):
const PHASES = [
  {
    modeId: 1, name: "COLOR", event: "color", seconds: 15,
    hint: "hold a RED / YELLOW / BLUE / GREEN brick ~1 cm under the sensor, move it away and back",
  },
  {
    modeId: 2, name: "REFLECTIVITY", event: "reflect", seconds: 10,
    hint: "move something light-colored closer/farther under the sensor — any change should stream",
  },
  {
    modeId: 3, name: "RGB", event: "rgb", seconds: 10,
    hint: "same again — raw RGB readings should stream on every change",
  },
  {
    modeId: 0, name: "INTENSITY", event: "intensity", seconds: 8,
    hint: "vary the distance/brightness under the sensor",
  },
];

// per-phase counters: which layers produced anything
const stats = PHASES.map(() => ({ acked: false, rawFrames: 0, events: 0 }));
let phaseIndex = -1;

let activeHub = null;
process.on("SIGINT", async () => {
  console.log();
  log("HUB", "Ctrl+C — disconnecting…");
  setTimeout(() => process.exit(0), 3000);
  try { if (activeHub) await activeHub.disconnect(); else process.exit(0); }
  catch { process.exit(0); }
});
process.on("unhandledRejection", (err) => log("ERR", `Unhandled rejection: ${err?.message ?? err}`));

async function main() {
  log("DEMO", "DUPLO color sensor deep-debug");
  log("DEMO", "The sensor is on the UNDERSIDE of the train nose, recessed between the front wheels, looking down.");
  log("DEMO", "Have a few brightly colored DUPLO bricks (or paper) ready.");

  const hub = await findDuploTrain();
  activeHub = hub;

  hub.on("attach", (device) => {
    log("ATTACH", `port ${device.portName || device.portId} → ${enumName(Consts.DeviceType, device.type)}`);
  });
  hub.on("disconnect", () => {
    log("HUB", "Hub disconnected.");
    printSummary();
    process.exit(0);
  });
  installTxTap(hub);

  log("PAIR", "Connecting…");
  await hub.connect();
  log("PAIR", "Connected ✔");
  await sleep(1500); // let attach messages settle before touching the sensor

  const colorSensor = await withTimeout(
    hub.waitForDeviceByType(Consts.DeviceType.DUPLO_TRAIN_BASE_COLOR_SENSOR),
    10000,
    "color sensor (device type 43)",
  );
  log("PAIR", `Color sensor found on port ${colorSensor.portId} ✔`);

  colorSensor.on("detach", () => log("ERR", "Color sensor sent a DETACH — that should never happen on a train base."));

  // We drive subscriptions manually per phase — stop .on() from auto-subscribing.
  colorSensor.autoSubscribe = false;

  // ── layer 2 tap: hub ACKs (0x47) ──
  onModeAck(colorSensor, (mode) => {
    if (phaseIndex >= 0 && PHASES[phaseIndex].modeId === mode) stats[phaseIndex].acked = true;
    log("RX", `ACK 0x47: hub confirms port ${colorSensor.portId} is in mode ${mode}`);
  });

  // ── layer 3 tap: every raw 0x45 frame for port 18, BEFORE library filtering ──
  const originalReceive = colorSensor.receive.bind(colorSensor);
  colorSensor.receive = (message) => {
    if (phaseIndex >= 0) stats[phaseIndex].rawFrames++;
    const value = message[4];
    let note = "";
    if (colorSensor.mode === 1) {
      note = value > 10
        ? `  → raw=${value}: not a recognizable color, library drops it silently`
        : `  → ${enumName(Consts.Color, value)}`;
    }
    log("RAW", `RX ${hex(message)}${note}`);
    originalReceive(message);
  };

  // ── layer 4: parsed events from the library ──
  colorSensor.on("color", ({ color }) => { count(); log("RX", `EVENT color: ${enumName(Consts.Color, color)}`); });
  colorSensor.on("reflect", ({ reflect }) => { count(); log("RX", `EVENT reflect: ${reflect}%`); });
  colorSensor.on("rgb", ({ red, green, blue }) => { count(); log("RX", `EVENT rgb: r=${red} g=${green} b=${blue}`); });
  colorSensor.on("intensity", ({ intensity }) => { count(); log("RX", `EVENT intensity: ${intensity}`); });
  function count() { if (phaseIndex >= 0) stats[phaseIndex].events++; }

  // ── walk the modes ──
  for (phaseIndex = 0; phaseIndex < PHASES.length; phaseIndex++) {
    const phase = PHASES[phaseIndex];
    log("DEMO", "─".repeat(66));
    log("DEMO", `Phase ${phaseIndex + 1}/${PHASES.length}: mode ${phase.modeId} (${phase.name}) for ${phase.seconds} s`);
    log("DEMO", `👉 ${phase.hint}`);

    await subscribeVerified(colorSensor, phase.modeId, `color sensor ${phase.name}`);

    // Ask for one immediate report even if nothing changes (0x21 value request):
    // separates "sensor idle, no changes" from "no data at all".
    log("TX", "requestUpdate() — 0x21 forces the hub to report the current value once");
    colorSensor.requestUpdate();

    const phaseEnd = Date.now() + phase.seconds * 1000;
    let nextNudge = Date.now() + 5000;
    while (Date.now() < phaseEnd) {
      await sleep(250);
      if (Date.now() >= nextNudge) {
        nextNudge = Date.now() + 5000;
        log("DEMO", `…${Math.ceil((phaseEnd - Date.now()) / 1000)} s left — ${phase.hint}`);
        colorSensor.requestUpdate();
      }
    }
  }
  phaseIndex = -1;

  printSummary();
  log("HUB", "Done — disconnecting.");
  await hub.disconnect(); // "disconnect" handler exits
}

function printSummary() {
  log("DEMO", "═".repeat(66));
  log("DEMO", "SUMMARY (layers: subscribe-ACK / raw frames / parsed events)");
  PHASES.forEach((phase, i) => {
    const s = stats[i];
    log("DEMO", `  mode ${phase.modeId} ${phase.name.padEnd(13)} ACK:${s.acked ? "✔" : "✘"}  raw:${String(s.rawFrames).padStart(3)}  events:${String(s.events).padStart(3)}`);
  });

  const anyAck = stats.some((s) => s.acked);
  const anyRaw = stats.some((s) => s.rawFrames > 0);
  const anyEvent = stats.some((s) => s.events > 0);

  log("DEMO", "─".repeat(66));
  if (!anyAck) {
    log("WARN", "VERDICT: the hub never ACKed any subscription (no 0x47).");
    log("WARN", "→ Power-cycle the train (batteries out/in), re-run. If it persists, the sensor/firmware is not responding — try the official LEGO app to cross-check the hardware.");
  } else if (!anyRaw) {
    log("WARN", "VERDICT: subscriptions OK, but the sensor never sent a single value (no 0x45).");
    log("WARN", "→ Physical problem: sensor blocked/dirty? It's the small window on the underside of the nose, between the front wheels — wipe it and hold a brick ALMOST TOUCHING it.");
  } else if (!anyEvent) {
    log("WARN", "VERDICT: the sensor streams data, but nothing was recognized as a LEGO color.");
    log("WARN", "→ It works! Get closer (≤1–2 cm), use saturated LEGO colors (red/yellow/blue/green/white), avoid glossy/dark surfaces. Raw values 255 mean 'nothing in view'.");
  } else {
    log("DEMO", "VERDICT: the color sensor WORKS end-to-end. 🎉");
    log("DEMO", "If the main showcase still misses events, it was a subscription race — index.js now verifies ACKs, so re-run `npm start`.");
  }
}

main().catch((err) => {
  log("ERR", err.stack ?? String(err));
  printSummary();
  process.exit(1);
});
