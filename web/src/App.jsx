import { useEffect, useRef, useState } from "react";
import { useTrainSocket } from "./useTrainSocket.js";

// ?ws=1234 overrides the WebSocket port (default 8081, see server.js)
const WS_PORT = new URLSearchParams(location.search).get("ws") ?? 8081;
const WS_URL = `ws://${location.hostname}:${WS_PORT}`;

// Powered UP color ids → UI colors (LEGO-ish palette)
const COLORS = {
  0: { name: "Black", hex: "#3B3B3B" },
  1: { name: "Pink", hex: "#F06EAA" },
  2: { name: "Purple", hex: "#8D5BB8" },
  3: { name: "Blue", hex: "#0D69AB" },
  4: { name: "Light blue", hex: "#54A9DB" },
  5: { name: "Cyan", hex: "#00BAC5" },
  6: { name: "Green", hex: "#00A845" },
  7: { name: "Yellow", hex: "#FFC500" },
  8: { name: "Orange", hex: "#F57D20" },
  9: { name: "Red", hex: "#D01012" },
  10: { name: "White", hex: "#FFFFFF" },
};
const LED_ORDER = [9, 8, 7, 6, 5, 4, 3, 2, 1, 10];

const SOUND_BUTTONS = [
  { name: "HORN", label: "Horn", emoji: "📯" },
  { name: "STATION_DEPARTURE", label: "Depart", emoji: "🚉" },
  { name: "WATER_REFILL", label: "Water", emoji: "💧" },
  { name: "STEAM", label: "Steam", emoji: "💨" },
  { name: "BRAKE", label: "Brake", emoji: "🛑" },
];

const SPEED_PRESETS = [
  { label: "◀◀", value: -70, title: "Fast reverse" },
  { label: "◀", value: -40, title: "Reverse" },
  { label: "▶", value: 40, title: "Go" },
  { label: "▶▶", value: 70, title: "Full steam" },
];

// must match LED_EFFECTS in effects.js (server-side)
const EFFECT_BUTTONS = [
  { name: "police", label: "Police", emoji: "🚨" },
  { name: "crossing", label: "Crossing", emoji: "🚧" },
  { name: "rainbow", label: "Rainbow", emoji: "🌈" },
  { name: "disco", label: "Disco", emoji: "🪩" },
  { name: "firebox", label: "Firebox", emoji: "🔥" },
];

// tones 4, 6 and 8 exist in the protocol but are silent on the real train
const TONES = [1, 2, 3, 5, 7, 9, 10];

const MELODY_BUTTONS = [
  { name: "jingle", label: "Jingle", emoji: "🎵" },
  { name: "starwars", label: "Star Wars", emoji: "⭐" },
  { name: "mario", label: "Mario", emoji: "🍄" },
];

/* ─────────────────────────── building blocks ─────────────────────────── */

function Card({ color, title, icon, className = "", children }) {
  return (
    <section className={`card card-${color} ${className}`}>
      <div className="studs" aria-hidden="true"><i /><i /><i /><i /></div>
      <h2><span className="card-icon">{icon}</span>{title}</h2>
      {children}
    </section>
  );
}

function Pill({ tone, children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/* ─────────────────────────────── drive card ───────────────────────────── */

function DriveCard({ train, ready, send }) {
  const [slider, setSlider] = useState(0);
  const dragging = useRef(false);
  const lastSent = useRef(0);

  // follow the server unless the user is mid-drag
  useEffect(() => {
    if (!dragging.current) setSlider(train?.power ?? 0);
  }, [train?.power]);

  const sendPower = (value) => send({ type: "cmd", action: "power", value });

  const onSlide = (event) => {
    const value = Number(event.target.value);
    setSlider(value);
    if (Date.now() - lastSent.current > 150) { // throttle while dragging
      lastSent.current = Date.now();
      sendPower(value);
    }
  };

  return (
    <Card color="red" title="Drive" icon="🎛️">
      <div className="preset-row">
        {SPEED_PRESETS.map((preset) => (
          <button
            key={preset.value}
            className={`brick-btn brick-blue ${train?.power === preset.value ? "brick-selected" : ""}`}
            title={`${preset.title} (${preset.value})`}
            disabled={!ready}
            onClick={() => sendPower(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <button
        className="brick-btn brick-red stop-btn"
        disabled={!ready}
        onClick={() => send({ type: "cmd", action: "stop" })}
      >
        ⛔ STOP
      </button>
      <div className="slider-row">
        <input
          type="range" min="-100" max="100" step="5"
          value={slider}
          disabled={!ready}
          onChange={onSlide}
          onPointerDown={() => { dragging.current = true; }}
          onPointerUp={(event) => { dragging.current = false; sendPower(Number(event.target.value)); }}
          aria-label="Motor power"
        />
        <div className="slider-scale"><span>-100</span><span>0</span><span>+100</span></div>
      </div>
      <div className="readout">
        commanded power <b>{train?.power ?? 0}</b>
      </div>
    </Card>
  );
}

/* ────────────────────────────── sensors card ──────────────────────────── */

function SensorsCard({ train }) {
  const speed = train?.speed ?? 0;
  const gaugePct = Math.min(Math.abs(speed), 400) / 400 * 50;
  const seen = train?.color != null ? COLORS[train.color] : null;
  const nothingRaw = train?.colorRaw != null && train.colorRaw > 10;

  return (
    <Card color="blue" title="Sensors" icon="📡">
      <div className="sensor-block">
        <h3>Speedometer <span className="hint">(raw units, signed)</span></h3>
        <div className={`speed-value ${speed < 0 ? "neg" : ""}`}>{speed}</div>
        <div className="gauge">
          <div className="gauge-center" />
          <div
            className={`gauge-fill ${speed < 0 ? "gauge-neg" : ""}`}
            style={speed >= 0
              ? { left: "50%", width: `${gaugePct}%` }
              : { left: `${50 - gaugePct}%`, width: `${gaugePct}%` }}
          />
        </div>
      </div>

      <div className="sensor-block">
        <h3>Color under the train</h3>
        <div className="color-now">
          <div
            className={`swatch ${seen ? "" : "swatch-empty"}`}
            style={seen ? { background: seen.hex } : undefined}
          />
          <div className="color-label">
            {seen ? seen.name : nothingRaw ? "Nothing in view" : "No reading yet"}
            {!seen && <div className="hint">hold a brick ≤2 cm under the nose sensor</div>}
          </div>
        </div>
        <div className="color-history">
          {(train?.colorHistory ?? []).map((entry, i) => (
            <span
              key={`${entry.at}-${i}`}
              className="history-dot"
              title={COLORS[entry.color]?.name}
              style={{ background: COLORS[entry.color]?.hex ?? "#ccc" }}
            />
          ))}
        </div>
      </div>

      <div className="sensor-block">
        <h3>Battery</h3>
        <div className="battery">
          <div className="battery-bar">
            <div
              className={`battery-fill ${train?.battery <= 20 ? "battery-low" : ""}`}
              style={{ width: `${train?.battery ?? 0}%` }}
            />
          </div>
          <span>{train?.battery != null ? `${train.battery}%` : "—"}</span>
        </div>
      </div>
    </Card>
  );
}

/* ─────────────────────────── lights & sounds card ─────────────────────── */

function FunCard({ train, ready, send }) {
  const rgbLastSent = useRef(0);
  const activeEffect = train?.effect ?? null;
  const [labValue, setLabValue] = useState(11);
  const labNumber = () => Math.max(0, Math.min(255, Number(labValue) || 0));

  return (
    <Card color="yellow" title="Lights & Sounds" icon="🎪">
      <h3>Hub LED <span className="hint">(palette, off, or any RGB color)</span></h3>
      <div className="led-grid">
        {LED_ORDER.map((id) => (
          <button
            key={id}
            className={`led-swatch ${train?.ledColor === id && !activeEffect ? "led-selected" : ""}`}
            style={{ background: COLORS[id].hex }}
            title={COLORS[id].name}
            disabled={!ready}
            onClick={() => send({ type: "cmd", action: "led", color: id })}
          />
        ))}
        <button
          className={`led-swatch led-off ${train?.ledColor === 0 && !activeEffect ? "led-selected" : ""}`}
          title="Off"
          disabled={!ready}
          onClick={() => send({ type: "cmd", action: "led", color: 0 })}
        >
          ⏻
        </button>
        <label
          className={`led-swatch rgb-picker ${train?.ledRgb ? "led-selected" : ""}`}
          title={`Pick any color — the train's LED only speaks palette, so the closest of the 11 colors is used${train?.ledRgb ? ` (${train.ledRgb})` : ""}`}
        >
          <input
            type="color"
            disabled={!ready}
            defaultValue="#ff40c0"
            onChange={(event) => {
              if (Date.now() - rgbLastSent.current > 150) {
                rgbLastSent.current = Date.now();
                send({ type: "cmd", action: "ledRgb", hex: event.target.value });
              }
            }}
          />
          🎨
        </label>
      </div>

      <h3>Light effects <span className="hint">(click again to stop)</span></h3>
      <div className="effect-grid">
        {EFFECT_BUTTONS.map((fx) => (
          <button
            key={fx.name}
            className={`brick-btn brick-blue sound-btn ${activeEffect === fx.name ? "brick-selected" : ""}`}
            disabled={!ready}
            onClick={() => send({ type: "cmd", action: "effect", name: activeEffect === fx.name ? "none" : fx.name })}
          >
            <span className="sound-emoji">{fx.emoji}</span>
            {fx.label}
          </button>
        ))}
      </div>

      <h3>Sounds</h3>
      <div className="sound-grid">
        {SOUND_BUTTONS.map((sound) => (
          <button
            key={sound.name}
            className={`brick-btn brick-yellow sound-btn ${train?.lastSound === sound.name ? "brick-selected" : ""}`}
            disabled={!ready}
            onClick={() => send({ type: "cmd", action: "sound", name: sound.name })}
          >
            <span className="sound-emoji">{sound.emoji}</span>
            {sound.label}
          </button>
        ))}
      </div>

      <h3>Beeps & tunes <span className="hint">(the audible tones — 4, 6 and 8 are mute)</span></h3>
      <div className="beep-row">
        {TONES.map((tone) => (
          <button
            key={tone}
            className="brick-btn brick-green beep-btn"
            disabled={!ready}
            onClick={() => send({ type: "cmd", action: "tone", value: tone })}
          >
            ♪{tone}
          </button>
        ))}
        {MELODY_BUTTONS.map((melody) => (
          <button
            key={melody.name}
            className="brick-btn brick-green beep-btn jingle-btn"
            disabled={!ready}
            title="A little playTone melody"
            onClick={() => send({ type: "cmd", action: "melody", name: melody.name })}
          >
            {melody.emoji} {melody.label}
          </button>
        ))}
      </div>

      <h3>Sound lab <span className="hint">(hunt for hidden sounds — raw values 0–255)</span></h3>
      <div className="lab-row">
        <input
          className="lab-input"
          type="number" min="0" max="255"
          value={labValue}
          disabled={!ready}
          onChange={(event) => setLabValue(event.target.value)}
          aria-label="Raw sound/tone value"
        />
        <button
          className="brick-btn brick-green beep-btn"
          disabled={!ready}
          title="playTone with this raw value"
          onClick={() => send({ type: "cmd", action: "tone", value: labNumber() })}
        >
          ▶ Tone
        </button>
        <button
          className="brick-btn brick-yellow beep-btn"
          disabled={!ready}
          title="playSound with this raw value (the 5 named sounds live at 3, 5, 7, 9, 10)"
          onClick={() => send({ type: "cmd", action: "soundRaw", value: labNumber() })}
        >
          ▶ Sound
        </button>
      </div>

    </Card>
  );
}

/* ──────────────────────────────── log card ────────────────────────────── */

function LogCard({ logLines }) {
  const [showRaw, setShowRaw] = useState(false);
  const bodyRef = useRef(null);
  const lines = showRaw ? logLines : logLines.filter((line) => line.tag !== "RAW");

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <Card color="green" title="Train log" icon="📜" className="log-card">
      <label className="log-toggle">
        <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />
        show raw protocol frames
      </label>
      <div className="log-body" ref={bodyRef}>
        {lines.length === 0 && <div className="log-empty">Waiting for the server…</div>}
        {lines.map((line, i) => (
          <div className="log-line" key={i}>
            <span className="log-t">{line.t.toFixed(3)}s</span>
            <span className={`log-tag tag-${line.tag}`}>{line.tag}</span>
            <span className="log-msg">{line.message}</span>
            {line.data !== undefined && <span className="log-data">{JSON.stringify(line.data)}</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ────────────────────────────────── app ───────────────────────────────── */

export default function App() {
  const { wsStatus, train, logLines, send } = useTrainSocket(WS_URL);
  const status = train?.status ?? "offline";
  const ready = wsStatus === "open" && status === "connected";

  return (
    <div className="app">
      <header className="header">
        <h1><span className="logo-emoji">🚂</span> Duplo Train Control</h1>
        <div className="pills">
          <Pill tone={wsStatus === "open" ? "ok" : "bad"}>
            🔌 server {wsStatus === "open" ? "connected" : wsStatus}
          </Pill>
          <Pill tone={status === "connected" ? "ok" : status === "scanning" ? "warn" : "bad"}>
            🚂 {status === "connected" ? (train?.name ?? "train") : status}
          </Pill>
          {train?.mock && <Pill tone="mock">🧪 mock train</Pill>}
        </div>
      </header>

      {wsStatus !== "open" && (
        <div className="banner banner-bad">
          Can't reach the server at {WS_URL} — start it with <code>npm run server</code> (or <code>npm run server:mock</code> without the train).
        </div>
      )}
      {wsStatus === "open" && status === "scanning" && (
        <div className="banner banner-warn">
          Scanning for the train… press the green button on the train base! 🟢
        </div>
      )}
      {wsStatus === "open" && status === "disconnected" && (
        <div className="banner banner-warn">
          Train disconnected — it auto-sleeps quickly. Press the green button and the server will re-pair.
        </div>
      )}

      <main className="grid">
        <DriveCard train={train} ready={ready} send={send} />
        <SensorsCard train={train} />
        <FunCard train={train} ready={ready} send={send} />
        <LogCard logLines={logLines} />
      </main>

      <footer className="footer">
        server.js bridges the train over BLE (node-poweredup) · this panel talks to it via WebSocket · not affiliated with the LEGO Group
      </footer>
    </div>
  );
}
