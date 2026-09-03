/**
 * LEGO® DUPLO Train Base showcase — node-poweredup v10
 *
 * What this demonstrates:
 *   1. BLE discovery + pairing with the DUPLO Train Base (sets 10874 / 10875)
 *   2. Reading hub properties (firmware, battery, MAC) and attach messages
 *   3. Sending commands: motor power/ramps, the 5 built-in sounds, hub LED colors
 *   4. Receiving sensor data: color sensor + speedometer notifications
 *   5. An interactive mode where colored tiles under the train trigger actions
 *
 * Every message we WRITE to the hub is hex-dumped on a RAW log line, so you can
 * follow the LEGO Wireless Protocol 3.0 traffic. Run with --raw to also see the
 * library's own logs, including every INCOMING raw message.
 *
 * Sensor subscriptions are verified against the hub's 0x47 acknowledgment and
 * retried if the hub misses one (the DUPLO base occasionally does).
 * Color sensor acting up? Run the dedicated diagnostic: npm run debug:color
 *
 * Usage:
 *   node index.js                 # full showcase (the train drives!)
 *   node index.js --stationary    # skip the driving part (desk-safe)
 *   node index.js --raw           # + node-poweredup internal logs (RX frames)
 */

import { Consts } from "node-poweredup";
import createDebug from "debug";
import {
  log, sleep, enumName, withTimeout,
  findDuploTrain, installTxTap, onModeAck, subscribeVerified, makeMotorDriver,
} from "./util.js";

// --raw is a shortcut for DEBUG=poweredup,lpf2hub,duplotrainbase,bledevice
if (process.argv.includes("--raw")) {
  createDebug.enable("poweredup,lpf2hub,duplotrainbase,bledevice");
}
const STATIONARY = process.argv.includes("--stationary");

/* ─────────────────────────── graceful exit ─────────────────────────── */
// Note: we always leave via process.exit() — the native BLE binding can
// abort the process during implicit teardown otherwise.

let activeHub = null;
let activeDriver = null;

process.on("SIGINT", async () => {
  console.log();
  log("HUB", "Ctrl+C — stopping the motor and disconnecting…");
  setTimeout(() => process.exit(0), 3000); // failsafe if BLE hangs
  try { if (activeDriver) await activeDriver.stop(); } catch { /* already gone */ }
  try {
    if (activeHub) await activeHub.disconnect(); // fires "disconnect" → exit
    else process.exit(0);
  } catch { process.exit(0); }
});

process.on("unhandledRejection", (err) => {
  log("ERR", `Unhandled rejection: ${err?.message ?? err}`);
});

/* ──────────────────────── discovery / pairing ──────────────────────── */

async function main() {
  log("DEMO", "LEGO DUPLO Train Base showcase (node-poweredup v10)");
  if (STATIONARY) {
    log("DEMO", "--stationary: motor steps will be skipped.");
  } else {
    log("WARN", "The train WILL drive during the demo — put it on a track or clear floor (or rerun with --stationary).");
  }

  const hub = await findDuploTrain();

  try {
    await runShowcase(hub);
  } catch (err) {
    log("ERR", `Showcase failed: ${err.message}`);
    try { await hub.disconnect(); } catch { /* ignore */ }
    process.exit(1);
  }
}

/* ───────────────────────────── showcase ────────────────────────────── */

async function runShowcase(hub) {
  activeHub = hub;

  // Register hub listeners BEFORE connecting so we log the whole handshake.
  hub.on("attach", (device) => {
    log("ATTACH", `Attach message: port ${device.portName || device.portId} → ${enumName(Consts.DeviceType, device.type)}`, {
      portId: device.portId,
    });
  });
  hub.on("detach", (device) => {
    log("ATTACH", `Detach message: port ${device.portName || device.portId}`);
  });
  hub.on("button", ({ event }) => {
    log("HUB", `Green button: ${enumName(Consts.ButtonState, event)}`);
  });
  hub.on("batteryLevel", ({ batteryLevel }) => {
    log("HUB", `Battery level report: ${batteryLevel}%`);
  });
  hub.on("disconnect", () => {
    log("HUB", "Hub disconnected (Ctrl+C, power off, sleep timeout or out of range). Bye!");
    process.exit(0);
  });

  // Tap every outgoing write so the wire format is visible.
  installTxTap(hub);

  log("PAIR", "Connecting: GATT connect → service/characteristic discovery → LPF2 handshake…");
  await hub.connect();
  log("PAIR", "Connected ✔ (the hub now reports its properties and attached devices)");

  await sleep(1500); // let hub property reports and attach messages arrive
  log("HUB", "Hub properties", {
    name: hub.name,
    firmware: hub.firmwareVersion,
    hardware: hub.hardwareVersion,
    battery: `${hub.batteryLevel}%`,
    mac: hub.primaryMACAddress,
  });

  // The train base has everything built in — no cables to plug. Port map:
  // 0=MOTOR, 1=speaker, 17=RGB LED, 18=COLOR sensor, 19=SPEEDOMETER, 20=voltage.
  log("PAIR", "Looking up the built-in devices…");
  const getDevice = (type, label) =>
    withTimeout(hub.waitForDeviceByType(type), 10000, label)
      .catch((err) => { log("WARN", `${label}: ${err.message}`); return null; });

  const [motor, speaker, colorSensor, speedometer, led] = await Promise.all([
    getDevice(Consts.DeviceType.DUPLO_TRAIN_BASE_MOTOR, "motor"),
    getDevice(Consts.DeviceType.DUPLO_TRAIN_BASE_SPEAKER, "speaker"),
    getDevice(Consts.DeviceType.DUPLO_TRAIN_BASE_COLOR_SENSOR, "color sensor"),
    getDevice(Consts.DeviceType.DUPLO_TRAIN_BASE_SPEEDOMETER, "speedometer"),
    getDevice(Consts.DeviceType.HUB_LED, "hub LED"),
  ]);
  log("PAIR", "Devices ready", {
    motor: motor?.portId, speaker: speaker?.portId, colorSensor: colorSensor?.portId,
    speedometer: speedometer?.portId, led: led?.portId,
  });

  // Continuous driving: the base's motion watchdog cuts a one-off power
  // command from standstill within ~200 ms. The driver re-sends the current
  // power every 100 ms until stop, like the official app does.
  const driver = makeMotorDriver(motor);
  activeDriver = driver;
  if (motor) log("HUB", "Motor keep-alive armed — power is re-sent every 100 ms while driving (DUPLO motion-watchdog workaround)");

  /* ── interactive color-tile actions ── */

  const cruise = { power: 0, direction: 1 };
  let tileBusy = false;
  let lastTile = { color: -1, at: 0 };

  async function onColorTile(color) {
    if (color === Consts.Color.NONE || color === Consts.Color.BLACK) return;
    const now = Date.now();
    if (tileBusy) return;
    if (lastTile.color === color && now - lastTile.at < 2000) return; // debounce
    lastTile = { color, at: now };
    tileBusy = true;
    try {
      if (led) led.setColor(color).catch(() => {}); // mirror the tile on the hub LED
      switch (color) {
        case Consts.Color.RED:
          log("TILE", "RED → emergency brake!");
          await driver.stop(); // interrupts queued motor commands, halts keep-alive
          cruise.power = 0;
          if (speaker) await speaker.playSound(Consts.DuploTrainBaseSound.BRAKE);
          break;
        case Consts.Color.GREEN:
          if (cruise.power === 0) {
            log("TILE", `GREEN → depart (${cruise.direction > 0 ? "forward" : "backward"})`);
            if (speaker) await speaker.playSound(Consts.DuploTrainBaseSound.STATION_DEPARTURE);
            cruise.power = 40 * cruise.direction;
            if (!STATIONARY) await driver.set(cruise.power);
          } else {
            cruise.direction = -cruise.direction;
            cruise.power = Math.abs(cruise.power) * cruise.direction;
            log("TILE", `GREEN → reverse direction (now ${cruise.direction > 0 ? "forward" : "backward"})`);
            if (!STATIONARY) await driver.set(cruise.power);
          }
          break;
        case Consts.Color.BLUE:
          log("TILE", "BLUE → water refill");
          if (speaker) await speaker.playSound(Consts.DuploTrainBaseSound.WATER_REFILL);
          break;
        case Consts.Color.YELLOW:
          log("TILE", "YELLOW → HOOOONK!");
          if (speaker) await speaker.playSound(Consts.DuploTrainBaseSound.HORN);
          break;
        case Consts.Color.WHITE:
          log("TILE", "WHITE → pssshhh (steam)");
          if (speaker) await speaker.playSound(Consts.DuploTrainBaseSound.STEAM);
          break;
        default:
          log("TILE", `${enumName(Consts.Color, color)} → no action mapped (LED mirrors it)`);
      }
    } finally {
      tileBusy = false;
    }
  }

  /* ── sensors: verified subscriptions (0x41 → 0x47 ACK, with retries) ── */
  // The color sensor goes first and on its own — a subscribe sent back-to-back
  // with others is exactly what the DUPLO base sometimes drops.

  if (colorSensor) {
    const ok = await subscribeVerified(colorSensor, 1, "color sensor (COLOR mode)");
    if (!ok) log("WARN", "Color sensor unconfirmed — run `npm run debug:color` for a layer-by-layer diagnosis.");

    onModeAck(colorSensor, (mode) => {
      if (mode !== 1) log("WARN", `color sensor switched to mode ${mode} — 'color' events pause until it's back in mode 1`);
    });

    // The library silently drops COLOR-mode values > 10 (255 = nothing in
    // view). Surface them (throttled) so "sensor alive, sees nothing" is
    // distinguishable from "sensor dead".
    const originalReceive = colorSensor.receive.bind(colorSensor);
    let lastNothingAt = 0;
    colorSensor.receive = (message) => {
      const value = message[4];
      if (colorSensor.mode === 1 && value > 10 && Date.now() - lastNothingAt > 2000) {
        lastNothingAt = Date.now();
        log("RX", `Color sensor: nothing recognizable in view (raw=${value}) — it IS alive, just needs a color ≤1–2 cm away`);
      }
      originalReceive(message);
    };

    colorSensor.on("color", ({ color }) => {
      log("RX", `Color sensor: ${enumName(Consts.Color, color)}`);
      onColorTile(color).catch((err) => log("ERR", `tile action failed: ${err.message}`));
    });
  }

  await sleep(300); // breathe between subscriptions — don't stack 0x41s

  if (speedometer) {
    await subscribeVerified(speedometer, 0, "speedometer (SPEED mode)");
    let last = { value: 0, at: 0 };
    speedometer.on("speed", ({ speed }) => {
      // The sensor notifies on every change; throttle so logs stay readable.
      const now = Date.now();
      const changedALot = Math.abs(speed - last.value) >= 25;
      const startedOrStopped = (speed === 0) !== (last.value === 0);
      if (speed !== last.value && (changedALot || startedOrStopped || now - last.at > 1500)) {
        log("RX", `Speedometer: ${speed}${speed === 0 ? " (stopped)" : ""}`);
        last = { value: speed, at: now };
      }
    });
  }

  /* ── scripted demo ── */

  log("DEMO", "─".repeat(66));
  log("DEMO", "Demo sequence starts in 3 s… (Ctrl+C anytime)");
  await sleep(3000);

  if (led) {
    log("DEMO", "① Hub LED — cycling the Powered UP color palette");
    const palette = ["RED", "ORANGE", "YELLOW", "GREEN", "CYAN", "BLUE", "PURPLE", "WHITE"];
    for (const name of palette) {
      log("TX", `led.setColor(${name}=${Consts.Color[name]})`);
      await led.setColor(Consts.Color[name]);
      await sleep(350);
    }
  }

  if (speaker) {
    log("DEMO", "② Speaker — all 5 built-in sounds");
    for (const name of ["HORN", "STATION_DEPARTURE", "WATER_REFILL", "STEAM", "BRAKE"]) {
      log("TX", `speaker.playSound(${name}=${Consts.DuploTrainBaseSound[name]})`);
      await speaker.playSound(Consts.DuploTrainBaseSound[name]);
      await sleep(1700);
    }
    try {
      log("DEMO", "…plus a few raw beeps via playTone()");
      for (const tone of [1, 2, 3]) {
        log("TX", `speaker.playTone(${tone})`);
        await speaker.playTone(tone);
        await sleep(600);
      }
    } catch { log("WARN", "playTone not supported by this firmware — skipping"); }
  }

  if (motor && !STATIONARY) {
    log("DEMO", "③ Motor + speedometer — departure, cruise, brake, reverse");
    if (speaker) {
      log("TX", "speaker.playSound(STATION_DEPARTURE)");
      await speaker.playSound(Consts.DuploTrainBaseSound.STATION_DEPARTURE);
      await sleep(1200);
    }
    log("TX", "driver.ramp(0 → 45 over 2000 ms) — stepped setPower writes, then keep-alive holds it");
    await driver.ramp(0, 45, 2000);
    cruise.power = 45;
    cruise.direction = 1;

    log("DEMO", "Cruising 5 s — speedometer RX lines stream below");
    await sleep(5000);

    if (speaker) {
      log("TX", "speaker.playSound(BRAKE)");
      await speaker.playSound(Consts.DuploTrainBaseSound.BRAKE);
    }
    log("TX", "driver.ramp(45 → 0 over 1200 ms)");
    await driver.ramp(45, 0, 1200);
    cruise.power = 0;
    await sleep(1500);

    log("TX", "driver.set(-35) — negative power = reverse, keep-alive sustains it");
    await driver.set(-35);
    await sleep(2500);
    log("TX", "driver.stop()");
    await driver.stop();
  } else if (motor) {
    log("DEMO", "③ Motor — skipped (--stationary)");
  }

  /* ── hand over to the user ── */

  log("DEMO", "─".repeat(66));
  log("DEMO", "Interactive mode! Drive the train over colored bricks/tiles:");
  log("DEMO", "   GREEN = depart / reverse   RED = brake & stop");
  log("DEMO", "   YELLOW = horn   BLUE = water refill   WHITE = steam");
  log("DEMO", "You can also push the train by hand and watch the speedometer.");
  log("DEMO", "Ctrl+C stops the motor and disconnects.");

  // Keep the event loop alive while we wait for sensor events.
  setInterval(() => {}, 60_000);
}

main().catch((err) => {
  log("ERR", err.stack ?? String(err));
  process.exit(1);
});
