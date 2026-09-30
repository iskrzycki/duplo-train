/**
 * DUPLO Train Base — WebSocket bridge server
 *
 * Connects to the train over BLE (node-poweredup) and exposes it to the web
 * panel (web/) over a WebSocket on port 8081:
 *
 *   server → client   {type:"state", state:{…}}    full snapshot on every change
 *   server → client   {type:"log", line:{t,tag,message,data}}   mirrored log lines
 *   client → server   {type:"cmd", action:"power"|"stop"|"led"|"sound"|"tone", …}
 *                      power may include source:"gamepad" for its safety watchdog
 *
 * Usage:
 *   node server.js          # real train (scans until it finds one, reconnects on drop)
 *   node server.js --mock   # simulated train — develop the UI without hardware
 *
 * Mock mode never imports the Bluetooth stack, so it runs anywhere.
 */

import { WebSocketServer } from "ws";
import { log, onLog, sleep, enumName } from "./log.js";
import { LED_EFFECTS, makeLedAnimator } from "./effects.js";

const MOCK = process.argv.includes("--mock");
// Deliberately NOT `PORT` — dev tooling (vite preview harnesses) owns that one.
const PORT = Number(process.env.WS_PORT ?? 8081);
const GAMEPAD_WATCHDOG_MS = 400;

// Wire-stable copies of the Powered UP enums (usable without node-poweredup):
const COLOR_NAMES = {
  0: "BLACK", 1: "PINK", 2: "PURPLE", 3: "BLUE", 4: "LIGHT_BLUE", 5: "CYAN",
  6: "GREEN", 7: "YELLOW", 8: "ORANGE", 9: "RED", 10: "WHITE", 255: "NONE",
};
const SOUNDS = { BRAKE: 3, STATION_DEPARTURE: 5, WATER_REFILL: 7, HORN: 9, STEAM: 10 };
const SOUNDS_BY_VALUE = Object.fromEntries(Object.entries(SOUNDS).map(([name, value]) => [value, name]));

// The 10 lit palette colors plus off, for mapping picker colors to the nearest
// palette entry (the DUPLO LED ignores RGB-mode writes — palette mode only).
const PALETTE_RGB = {
  0: [0, 0, 0], 1: [240, 110, 170], 2: [141, 91, 184], 3: [13, 105, 171],
  4: [84, 169, 219], 5: [0, 186, 197], 6: [0, 168, 69], 7: [255, 197, 0],
  8: [245, 125, 32], 9: [208, 16, 18], 10: [255, 255, 255],
};
function nearestPaletteColor(r, g, b) {
  let best = 0;
  let bestDistance = Infinity;
  for (const [id, [pr, pg, pb]] of Object.entries(PALETTE_RGB)) {
    const distance = 3 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 2 * (b - pb) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = Number(id); }
  }
  return best;
}


/* ─────────────────────────────── state ─────────────────────────────── */

const state = {
  mock: MOCK,
  status: "scanning",        // scanning | connected | disconnected
  name: null,
  firmware: null,
  battery: null,
  power: 0,                  // commanded motor power (-100…100)
  speed: 0,                  // measured, raw speedometer units
  ledColor: null,            // palette id, when set manually
  ledRgb: null,              // "#rrggbb", when set via the RGB picker
  effect: null,              // running LED effect name (see effects.js)
  lastSound: null,
};

let train = null; // active driver: {setPower, stop, playSound, playSoundRaw, playTone, setLed}
let gamepadWatchdog = null;

// LED effect engine — steps go straight to the train's LED.
const animator = makeLedAnimator((color) => train?.setLed(color), {
  onError: (err) => log("ERR", `LED effect write failed: ${err.message}`),
});

function stopEffect(quiet = false) {
  animator.stop();
  if (state.effect) {
    if (!quiet) log("TX", `panel → LED effect '${state.effect}' stopped`);
    state.effect = null;
  }
}

function clearGamepadWatchdog() {
  clearTimeout(gamepadWatchdog);
  gamepadWatchdog = null;
}

function armGamepadWatchdog() {
  clearGamepadWatchdog();
  gamepadWatchdog = setTimeout(() => {
    gamepadWatchdog = null;
    if (!train || state.power === 0) return;
    log("SAFE", `gamepad input timed out after ${GAMEPAD_WATCHDOG_MS} ms — stopping train`);
    handleCommand({ type: "cmd", action: "stop", source: "safety" })
      .catch((err) => log("ERR", `gamepad safety stop failed: ${err.message}`));
  }, GAMEPAD_WATCHDOG_MS);
  gamepadWatchdog.unref?.();
}

/* ─────────────────────────── websocket hub ─────────────────────────── */

const wss = new WebSocketServer({ port: PORT });
wss.on("error", (err) => {
  log("ERR", `WebSocket server error: ${err.message}${err.code === "EADDRINUSE" ? ` — is another server already running on :${PORT}?` : ""}`);
  process.exit(1);
});
wss.on("listening", () => log("DEMO", `WebSocket server listening on ws://localhost:${PORT} ${MOCK ? "(MOCK train)" : "(real train)"}`));

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(payload);
  }
}

// Throttled state broadcast — speed events can be chatty.
let statePending = false;
function pushState(immediate = false) {
  if (immediate) { statePending = false; broadcast({ type: "state", state }); return; }
  if (statePending) return;
  statePending = true;
  setTimeout(() => { statePending = false; broadcast({ type: "state", state }); }, 80);
}

// Mirror every log line into the panel.
onLog((line) => broadcast({ type: "log", line }));

wss.on("connection", (socket, req) => {
  log("HUB", `Panel connected (${req.socket.remoteAddress}) — ${wss.clients.size} client(s)`);
  socket.send(JSON.stringify({ type: "state", state }));
  socket.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg?.type === "cmd") {
      handleCommand(msg).catch((err) => log("ERR", `command failed: ${err.message}`));
    }
  });
  socket.on("close", () => log("HUB", `Panel disconnected — ${wss.clients.size} client(s) left`));
  socket.on("error", () => { /* close will follow */ });
});

/* ───────────────────────────── commands ────────────────────────────── */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));

async function handleCommand(cmd) {
  if (!train) { log("WARN", `panel command '${cmd.action}' ignored — train not connected`); return; }
  switch (cmd.action) {
    case "power": {
      state.power = clamp(cmd.value, -100, 100);
      log("TX", `panel → drive at ${state.power} (keep-alive re-sends until stop)`);
      if (state.power === 0) {
        clearGamepadWatchdog();
        await train.stop();
      } else {
        await train.setPower(state.power);
        if (cmd.source === "gamepad") armGamepadWatchdog();
        else clearGamepadWatchdog();
      }
      break;
    }
    case "stop": {
      clearGamepadWatchdog();
      state.power = 0;
      log("TX", "panel → stop");
      await train.stop();
      break;
    }
    case "led": {
      stopEffect(true);
      const color = clamp(cmd.color, 0, 10);
      state.ledColor = color;
      state.ledRgb = null;
      log("TX", `panel → led.setColor(${COLOR_NAMES[color]})`);
      await train.setLed(color);
      break;
    }
    case "ledRgb": {
      stopEffect(true);
      const match = String(cmd.hex ?? "").match(/^#?([0-9a-fA-F]{6})$/);
      if (!match) { log("WARN", `bad ledRgb value '${cmd.hex}'`); return; }
      const r = parseInt(match[1].slice(0, 2), 16);
      const g = parseInt(match[1].slice(2, 4), 16);
      const b = parseInt(match[1].slice(4, 6), 16);
      // The DUPLO LED ignores RGB-mode writes, so map to the closest of the
      // 10 lit palette colors plus off.
      const nearest = nearestPaletteColor(r, g, b);
      state.ledRgb = `#${match[1].toLowerCase()}`;
      state.ledColor = null;
      log("TX", `panel → ${state.ledRgb} ≈ closest palette color ${COLOR_NAMES[nearest]}(${nearest}) → led.setColor`);
      await train.setLed(nearest);
      break;
    }
    case "effect": {
      if (cmd.name === "none") { stopEffect(); break; }
      const effect = LED_EFFECTS[cmd.name];
      if (!effect) { log("WARN", `unknown effect '${cmd.name}'`); return; }
      stopEffect(true);
      animator.start(cmd.name);
      state.effect = cmd.name;
      state.ledColor = null;
      state.ledRgb = null;
      log("TX", `panel → LED effect '${cmd.name}' ${effect.emoji} (${effect.random ? "random colors" : `${effect.steps.length}-step loop`} @ ${effect.ms} ms)`);
      break;
    }
    case "sound": {
      if (SOUNDS[cmd.name] === undefined) { log("WARN", `unknown sound '${cmd.name}'`); return; }
      state.lastSound = cmd.name;
      log("TX", `panel → speaker.playSound(${cmd.name})`);
      await train.playSound(cmd.name);
      break;
    }
    case "tone": {
      const tone = clamp(cmd.value, 0, 255);
      log("TX", `panel → speaker.playTone(${tone})`);
      await train.playTone(tone);
      break;
    }
    case "soundRaw": {
      const value = clamp(cmd.value, 0, 255);
      log("TX", `panel → speaker.playSound(raw ${value})${SOUNDS_BY_VALUE[value] ? ` = ${SOUNDS_BY_VALUE[value]}` : ""}`);
      await train.playSoundRaw(value);
      break;
    }
    default:
      log("WARN", `unknown command '${cmd.action}'`);
  }
  pushState(true);
}

/* ──────────────────────────── real train ───────────────────────────── */

async function startRealTrain() {
  // Imported lazily so --mock never touches the native BLE binding.
  const { Consts } = await import("node-poweredup");
  const { findDuploTrain, installTxTap, subscribeVerified, withTimeout, makeMotorDriver } = await import("./util.js");

  for (;;) {
    state.status = "scanning";
    pushState(true);

    const hub = await findDuploTrain();
    const disconnected = new Promise((resolve) => hub.on("disconnect", resolve));

    hub.on("attach", (device) => {
      log("ATTACH", `port ${device.portName || device.portId} → ${enumName(Consts.DeviceType, device.type)}`);
    });
    hub.on("batteryLevel", ({ batteryLevel }) => {
      state.battery = batteryLevel;
      log("HUB", `Battery ${batteryLevel}%`);
      pushState();
    });
    // The green button is the POWER button — pressing it while connected
    // powers the hub off, so this is log-only (it explains the disconnect
    // that follows a moment later).
    hub.on("button", ({ event }) => {
      log("HUB", `Green button: ${Consts.ButtonState[event] ?? event} (that's the power button — expect a shutdown)`);
    });
    installTxTap(hub);

    log("PAIR", "Connecting…");
    try {
      await hub.connect();
    } catch (err) {
      log("ERR", `Connect failed: ${err.message} — rescanning in 3 s`);
      await sleep(3000);
      continue;
    }
    log("PAIR", "Connected ✔");
    await sleep(1500); // let properties & attach messages settle

    state.name = hub.name;
    state.firmware = hub.firmwareVersion;
    state.battery = hub.batteryLevel;

    const getDevice = (type, label) =>
      withTimeout(hub.waitForDeviceByType(type), 10000, label)
        .catch((err) => { log("WARN", `${label}: ${err.message}`); return null; });

    const [motor, speaker, speedometer, led] = await Promise.all([
      getDevice(Consts.DeviceType.DUPLO_TRAIN_BASE_MOTOR, "motor"),
      getDevice(Consts.DeviceType.DUPLO_TRAIN_BASE_SPEAKER, "speaker"),
      getDevice(Consts.DeviceType.DUPLO_TRAIN_BASE_SPEEDOMETER, "speedometer"),
      getDevice(Consts.DeviceType.HUB_LED, "hub LED"),
    ]);

    if (speedometer) {
      await subscribeVerified(speedometer, 0, "speedometer (SPEED mode)");
      speedometer.on("speed", ({ speed }) => {
        state.speed = speed;
        pushState();
      });
    }

    // Continuous driving: the base's motion watchdog kills a one-off power
    // command from standstill within ~200 ms, so the driver re-sends the
    // current power every 100 ms until stop is pressed.
    const driver = makeMotorDriver(motor);
    log("HUB", "Motor keep-alive armed — power is re-sent every 100 ms while driving (DUPLO motion-watchdog workaround)");

    // Like the motor driver, LED writes bypass the library's feedback queue.
    // WriteDirectModeData includes the mode; 0x10 means execute immediately
    // without requesting 0x82 feedback. All writes share the transport queue
    // installed during discovery, so their BLE callbacks cannot overwrite
    // each other in noble.
    const rawLedWrite = (payload) =>
      led && hub.send(Buffer.from([0x81, led.portId, 0x10, 0x51, ...payload]), Consts.BLECharacteristic.LPF2_ALL);

    train = {
      setPower: (p) => driver.set(p),
      stop: () => driver.stop(),
      playSound: (name) => speaker?.playSound(Consts.DuploTrainBaseSound[name]),
      playSoundRaw: (value) => speaker?.playSound(value),
      playTone: (t) => speaker?.playTone(t),
      setLed: (c) => rawLedWrite([0x00, c]),          // mode 0 = palette color
    };
    state.status = "connected";
    pushState(true);
    log("DEMO", "Train ready — drive it from the web panel! 🚂");

    await disconnected;
    driver.dispose();
    stopEffect(true);
    train = null;
    Object.assign(state, { status: "disconnected", speed: 0, power: 0, effect: null });
    pushState(true);
    log("HUB", "Train disconnected — rescanning in 3 s…");
    await sleep(3000);
  }
}

/* ──────────────────────────── mock train ───────────────────────────── */

function startMockTrain() {
  log("DEMO", "MOCK MODE — simulated train, no Bluetooth needed");
  Object.assign(state, {
    status: "connected", name: "Mock Train Base", firmware: "1.1.00.0000", battery: 87,
  });

  let targetSpeed = 0;
  train = {
    setPower(p) { state.power = p; targetSpeed = Math.round(p * 3.2); log("RAW", `mock: motor power ${p}`); },
    stop() { state.power = 0; targetSpeed = 0; log("RAW", "mock: motor stop"); },
    playSound(name) { log("RAW", `mock: toot! (${name})`); },
    playSoundRaw(value) { log("RAW", `mock: raw sound ${value}`); },
    playTone(t) { log("RAW", `mock: beep ${t}`); },
    // effects blink ~7×/s — don't narrate every mock step
    setLed(c) { if (!state.effect) log("RAW", `mock: led ${COLOR_NAMES[c]}`); },
  };

  // Pretend physics: ease measured speed toward the commanded target.
  setInterval(() => {
    const diff = targetSpeed - state.speed;
    if (Math.abs(diff) > 3) {
      state.speed = Math.round(state.speed + diff * 0.18 + (Math.random() * 4 - 2));
      pushState();
    } else if (state.speed !== targetSpeed) {
      state.speed = targetSpeed;
      pushState();
    }
  }, 150);

  // Batteries don't last forever…
  setInterval(() => {
    if (state.battery > 5) { state.battery--; log("HUB", `Battery ${state.battery}%`); pushState(); }
  }, 60000);

  pushState(true);
}

/* ─────────────────────────────── boot ──────────────────────────────── */

process.on("SIGINT", async () => {
  console.log();
  log("HUB", "Ctrl+C — shutting down…");
  setTimeout(() => process.exit(0), 3000);
  try { if (train && !MOCK) { await train.stop(); } } catch { /* ignore */ }
  process.exit(0);
});
process.on("unhandledRejection", (err) => log("ERR", `Unhandled rejection: ${err?.message ?? err}`));

if (MOCK) {
  startMockTrain();
} else {
  startRealTrain().catch((err) => {
    log("ERR", err.stack ?? String(err));
    process.exit(1);
  });
}
