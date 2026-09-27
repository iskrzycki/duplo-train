# duplo-train

Showcase for controlling a **LEGO® DUPLO Train Base** (sets 10874 / 10875 — the push‑to‑go train with the big green button) from Node.js using [node-poweredup](https://github.com/nathankellenicki/node-poweredup).

The script walks through the whole lifecycle with verbose, timestamped logs:

1. **Discovery / pairing** — BLE scan, advertisement, GATT connect, LPF2 handshake
2. **Hub properties** — name, firmware, battery level, MAC address
3. **Attach messages** — the base announcing its built‑in devices (motor, speaker, LED, color sensor, speedometer)
4. **Sending commands** — motor power & ramps, the 5 built‑in sounds, LED colors; every outgoing frame is hex‑dumped
5. **Receiving sensor data** — color sensor and speedometer notifications
6. **Interactive mode** — colored bricks under the train trigger actions (like the official action bricks)

## Requirements

- Node.js ≥ 18 (tested with 24)
- Bluetooth LE adapter (built‑in on any modern Mac)
- **macOS: your terminal app needs Bluetooth permission.** The first scan should trigger a system prompt; if scanning instantly dies with `SIGABRT` / exit code 134, enable your terminal under *System Settings → Privacy & Security → Bluetooth*. This is a macOS privacy (TCC) kill, not a bug in the script.

## Run

```bash
npm install
npm start
```

Then **press the green button on the train base** — the LED blinks while it advertises, and the script takes it from there.

| Command | What it does |
|---|---|
| `npm start` | Full showcase — ⚠️ the train drives! Put it on a track or clear floor. |
| `npm run start:raw` | Same, plus node-poweredup's internal logs (incl. every **incoming** raw message) |
| `node index.js --stationary` | Skips the driving parts — desk‑safe for testing sounds/LED/sensors |
| `DEBUG='*' npm start` | Everything, including the noble BLE layer (very chatty) |

Stop with `Ctrl+C` — the script stops the motor and disconnects cleanly.

## Reading the logs

Each line has an elapsed timestamp and a tag:

| Tag | Meaning |
|---|---|
| `SCAN` | BLE scanning & advertisements |
| `PAIR` | Connection, handshake, device lookup |
| `HUB` | Hub-level events: battery reports, green button, disconnect |
| `ATTACH` | The hub announcing its internal devices (port → device type) |
| `TX` | A command we send, at "intent" level (`motor.rampPower(0 → 45)`) |
| `RAW` | The actual bytes written to the hub (LEGO Wireless Protocol 3.0 frame) |
| `RX` | Parsed sensor values coming back (color, speed) |
| `TILE` | Reactions to colored tiles in interactive mode |

Example — this is what "honk the horn" looks like on the wire:

```
  41.523s TX     speaker.playSound(HORN=9)
  41.524s RAW    TX 0a 00 41 01 01 01 00 00 00 01  ← PORT_INPUT_FORMAT_SETUP_SINGLE(65)
  41.526s RAW    TX 08 00 81 01 11 51 01 09  ← PORT_OUTPUT_COMMAND(129)
```

Frame anatomy of `08 00 81 01 11 51 01 09`: length `08`, hub id `00`, message type `81` (Port Output Command), port `01` (speaker), startup/completion flags `11`, subcommand `51` (WriteDirectModeData), mode `01` (SOUND), payload `09` (HORN).

## What's inside the Train Base

Everything is built in — no wires. Ports as reported by the attach messages:

| Port | Device | You can… |
|---|---|---|
| 0 (`MOTOR`) | Motor | `setPower(-100…100)`, `rampPower(from, to, ms)`, `stop()` |
| 1 | Speaker | `playSound()`: `BRAKE`, `STATION_DEPARTURE`, `WATER_REFILL`, `HORN`, `STEAM`; `playTone(n)` |
| 17 | RGB LED | `setColor(Consts.Color.X)`, `setRGB(r, g, b)` |
| 18 (`COLOR`) | Color sensor | events: `color`, `reflect`, `rgb`, `intensity` — **one mode at a time** (last listener added wins) |
| 19 (`SPEEDOMETER`) | Speedometer | event: `speed` (signed; negative = rolling backwards) |
| 20 | Voltage sensor | event: `voltage` (battery reports also come as hub events) |

## Interactive mode — color tiles

After the scripted demo the train keeps listening. Slide colored DUPLO bricks/paper under the sensor (between the wheels) or drive over them:

| Color | Action |
|---|---|
| 🟢 GREEN | Depart — or reverse direction if already driving |
| 🔴 RED | Emergency brake (brake sound + stop) |
| 🟡 YELLOW | Horn |
| 🔵 BLUE | Water refill sound |
| ⚪ WHITE | Steam sound |

The hub LED always mirrors the last tile color. The mapping lives in `onColorTile()` in [index.js](index.js) — customize away.

## Web control panel 🚂🖥️

A DUPLO-styled React dashboard with driving controls and a live speedometer:

```bash
npm run app        # WebSocket bridge (server.js) + React app (Vite), real train
npm run app:mock   # same, but with a simulated train — no Bluetooth needed
```

Open http://localhost:5173 (Vite picks the next port if that one is busy). The panel gives you:

- **Drive** — speed preset bricks, a big STOP, a fine-grained power slider (−100…100), and a live speedometer
- **Gamepad** — optional browser-native control: left stick drives, while L1, L2, R1 and R2 open hold-to-select wheels for light effects, colors, numbered beeps and sounds. The mouse and touch controls work exactly as before when no controller is connected.
- **Status** — current battery level stays visible in the header
- **Lights & Sounds** — hub LED palette + off + a full RGB color picker, LED light effects (🚨 police, 🚧 crossing, 🌈 rainbow, 🪩 disco, 🔥 firebox), the 5 built-in sounds, the audible tones, and four playTone melodies (🎵 jingle, ⭐ Star Wars-ish, 🍄 Mario-ish, 🤘 At Doom's Gate-ish)
- **Train log** — the server's log mirrored live into the browser, with an optional raw-protocol-frames toggle

### What the hardware can actually do (sounds & colors)

- **Sounds**: the speaker's SOUND mode has exactly 5 named sounds in the protocol — `BRAKE(3)`, `STATION_DEPARTURE(5)`, `WATER_REFILL(7)`, `HORN(9)`, `STEAM(10)`. There are no other hidden named sounds.
- **Tones**: the speaker's TONE mode (`playTone(n)`) documents values 1–10, but **4, 6 and 8 are silent** (verified on real hardware), so the panel exposes 1, 2, 3, 5, 7, 9, 10. The melody buttons play tone sequences — notes go out as raw fire-and-forget writes (waiting for per-note acknowledgments added jitter that mangled the rhythm) and support rests. The exact pitch of each tone is firmware-defined, so the Star Wars / Mario buttons chase the *rhythm* of the originals more than the notes (tune them in `MELODIES` in [server.js](server.js)).
- **Beyond 10?** No — we checked. A full automated sweep of raw values 0–255 through both SOUND and TONE modes on real hardware turned up **nothing beyond the documented values**: the speaker's complete repertoire is the 5 named sounds (3, 5, 7, 9, 10) and the audible tones (1, 2, 3, 5, 7, 9, 10). The dashboard therefore exposes only the documented sounds and audible tones.
- **The green button is the power button** — the hub reports PRESSED/RELEASED events, but pressing it while connected simply powers the hub off (hence the disconnect). The server logs the press as the explanation; there's no UI widget because the only state you'd ever see is "released".
- **LED colors**: the palette has 10 lit colors plus off (`0`) — and that's it: the DUPLO LED **ignores RGB-mode writes** (verified on real hardware), so arbitrary colors aren't possible. The panel exposes the ten colors and off directly.
- **Light effects** are our own invention: the server blinks the LED on a timer ([effects.js](effects.js)) — police double-flash, railroad-crossing blink, rainbow cycle, disco shuffle, and a warm "firebox" flicker. Add your own by extending `LED_EFFECTS`. Implementation note: effect (and all LED) writes bypass node-poweredup's command queue — the queue waits for a per-write acknowledgment and re-sends mode subscriptions, which jams at blink rates — and go out as raw Port Output frames (`0x81, port, 0x10, 0x51, mode, …`, "execute immediately, no feedback").

### How it talks

`server.js` owns the BLE connection (scan → connect → verified subscriptions, auto-reconnect when the train sleeps) and serves a WebSocket on port **8081** (`WS_PORT` env to change; the panel accepts `?ws=<port>`):

```
server → client   {type:"state", state:{status, name, battery, power, speed, ledColor, ledRgb, effect, lastSound, mock}}
server → client   {type:"log",   line:{t, tag, message, data}}
client → server   {type:"cmd", action:"power", value:-100…100}
client → server   {type:"cmd", action:"power", value:-100…100, source:"gamepad"}  # optional gamepad heartbeat
client → server   {type:"cmd", action:"stop"}
client → server   {type:"cmd", action:"led", color:0…10}
client → server   {type:"cmd", action:"sound", name:"HORN"|"STATION_DEPARTURE"|"WATER_REFILL"|"STEAM"|"BRAKE"}
client → server   {type:"cmd", action:"tone", value:0…255}
client → server   {type:"cmd", action:"soundRaw", value:0…255}
client → server   {type:"cmd", action:"melody", name:"jingle"|"starwars"|"mario"|"atDoomsGate"}
client → server   {type:"cmd", action:"ledRgb", hex:"#rrggbb"}
client → server   {type:"cmd", action:"effect", name:"police"|"crossing"|"rainbow"|"disco"|"firebox"|"none"}
```

Setting a color or starting another effect stops the running effect; `state.effect`, `state.ledColor` and `state.ledRgb` tell the panel what's active.

There's no auth — anyone on your LAN who finds the port can honk your train. Family features, not bugs.

Frontend lives in [web/](web/) (Vite + React: [App.jsx](web/src/App.jsx), [useTrainSocket.js](web/src/useTrainSocket.js), [styles.css](web/src/styles.css)). Mock mode (`--mock`) never loads the Bluetooth stack, so UI development works on any machine.

### Optional Bluetooth gamepad

Pair the controller with the operating system first; the browser's Gamepad API only reads the controller that the OS already exposes. The dashboard remains fully usable without one.

- Left-stick vertical axis controls motor power. A dead zone and a curved response make slow movement near the centre easier.
- Gamepad button `0` plays the horn; button `1` sends STOP, or cancels an open wheel. These are the browser's standard button indices, so non-standard controller mappings may need an adjustment in [`useGamepad.js`](web/src/useGamepad.js).
- Hold `L1` to open **Effects**, `L2` for **Colors**, `R1` for the audible **Beeps** (1, 2, 3, 5, 7, 9, 10), and `R2` for **Sounds**. The right stick chooses an option and releasing the held shoulder button/trigger confirms it. The wheels also open as a safe preview when no train is connected; selecting an item then only closes the wheel and sends no command. Opening any wheel while connected immediately stops the train.
- While driving, the browser sends a gamepad power heartbeat every 100 ms. If `server.js` does not receive one for 400 ms, it stops the train. Losing the controller, hiding the tab, or switching away from it also requests STOP.

## Talk slides

[`slides/`](slides/) holds the conference deck for this project — *How I hacked my
son's LEGO Duplo train* — built with [Slidev](https://sli.dev) and styled to match
the Allegro Tech Meeting #19 template.

```bash
npm install --prefix slides
npm run dev --prefix slides
```

Presenter view with the Polish speaker notes is at `localhost:3030/presenter`.
See [slides/README.md](slides/README.md) for the layouts, the design tokens and
what to replace before presenting.

## Debugging the color sensor

```bash
npm run debug:color
```

Getting color events requires a 4-link chain, and each link can fail **silently**:

| Layer | Message | Meaning |
|---|---|---|
| 1 | `0x41` Port Input Format Setup (TX) | we ask port 18 for notifications |
| 2 | `0x47` Port Input Format ack (RX) | the hub confirms — without this, **nothing** flows |
| 3 | `0x45` Port Value (RX) | the sensor reports a raw value |
| 4 | `color` event | the library parses it — **values > 10 (255 = "nothing in view") are dropped without a trace** |

`debug-color.js` isolates the sensor (no motor/sounds), taps all four layers, walks through all four sensor modes (color / reflect / rgb / intensity), forces value reports with `0x21` requests even when nothing changes, and prints a per-layer summary with a verdict telling you which link is broken and what to do about it.

Common outcomes:

- **Raw frames arrive but all say `255`** → the sensor works; it just doesn't see a color. It's very short-range: the brick must be **≤1–2 cm away, almost touching**, and saturated (LEGO red/yellow/blue/green/white — dark, glossy or pale surfaces read as nothing). The sensor window is on the **underside of the nose, recessed between the front wheels** — check it's clean.
- **No `0x47` ack** → the hub missed the subscription. The showcase now verifies the ack and retries automatically; power-cycling the train (batteries out/in) clears a wedged hub.
- **Ack OK, zero raw frames ever** → sensor blocked/dirty, or hardware — cross-check with the official LEGO DUPLO app.
- Also remember: the sensor **only notifies on change**. A brick that was already under the sensor at start won't produce an event until it leaves and comes back (the debug script works around this with forced value requests).

## Troubleshooting

- **Process dies instantly with exit 134 (`SIGABRT`)** — macOS refused Bluetooth access for your terminal app. See *Requirements* above.
- **Nothing is discovered** — the train auto‑sleeps after a short while; press the green button again. Battery sag also shortens BLE range noticeably.
- **The motor stops ~200 ms after a drive command** — that's the base's motion watchdog: a one-off power command from standstill is cut almost immediately unless the base senses the wheels turning. The fix (used by the official app too) is to re-send the motor command continuously — `makeMotorDriver()` in [util.js](util.js) does exactly that (every 100 ms while power ≠ 0), and both the web server and the CLI showcase drive through it. If you write your own code, drive through the driver, not `motor.setPower()` directly.
- **The motor stops on its own while driving** — same safety, physical flavor: if the wheels can't actually spin (train held in hand, derailed, blocked), the base cuts motor power.
- **No sound right after connecting** — the speaker needs a beat after the handshake; the script waits before the demo, but keep it in mind in your own code.
- **`color` events stop after listening to `reflect`/`rgb`** — the color sensor only streams one mode at a time; whichever event you subscribed to last is the active mode.

LEGO® is a trademark of the LEGO Group, which does not sponsor or endorse this project.
