import { useCallback, useEffect, useRef, useState } from "react";
import { useTrainSocket } from "./useTrainSocket.js";
import { useDriveControl } from "./useDriveControl.js";
import { useGamepad } from "./useGamepad.js";
import { RadialMenu } from "./RadialMenu.jsx";

// ?ws=1234 overrides the WebSocket port (default 8081, see server.js)
const WS_PORT = new URLSearchParams(location.search).get("ws") ?? 8081;
const WS_URL = `ws://${location.hostname}:${WS_PORT}`;

// Powered UP LED color ids → UI colors (LEGO-ish palette)
const LED_COLORS = {
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

const LIGHT_COLOR_WHEEL = [
  ...LED_ORDER.map((color) => ({
    id: `led-${color}`,
    type: "led",
    color,
    label: LED_COLORS[color].name,
    hex: LED_COLORS[color].hex,
  })),
  { id: "led-0", type: "led", color: 0, label: "Off", hex: "#2E2E2E" },
];
const LIGHT_EFFECT_WHEEL = [
  ...EFFECT_BUTTONS.map((effect) => ({
    id: `effect-${effect.name}`,
    type: "effect",
    name: effect.name,
    label: effect.label,
    emoji: effect.emoji,
  })),
  { id: "effect-none", type: "effect", name: "none", label: "Stop effect", emoji: "⏹️" },
];
const SOUND_WHEEL = [
  ...SOUND_BUTTONS.map((sound) => ({
    id: `sound-${sound.name}`,
    type: "sound",
    name: sound.name,
    label: sound.label,
    emoji: sound.emoji,
  })),
];
const BEEP_WHEEL = TONES.map((tone) => ({
  id: `tone-${tone}`,
  type: "tone",
  value: tone,
  label: `Beep ${tone}`,
  emoji: `♪${tone}`,
}));
const RADIAL_MENU_DEAD_ZONE = 0.3;

function itemAtVector(items, { x, y }) {
  const sector = 360 / items.length;
  const angle = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
  return items[Math.round(angle / sector) % items.length];
}

function radialItems(kind) {
  switch (kind) {
    case "colors":
      return LIGHT_COLOR_WHEEL;
    case "effects":
      return LIGHT_EFFECT_WHEEL;
    case "beeps":
      return BEEP_WHEEL;
    default:
      return SOUND_WHEEL;
  }
}

function radialSelection(kind, vector) {
  if (vector.magnitude < RADIAL_MENU_DEAD_ZONE) return null;
  return itemAtVector(radialItems(kind), vector);
}

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

function DriveCard({ power, speed, ready, setPower, stop, gamepad }) {
  const gaugePct = Math.min(Math.abs(speed), 400) / 400 * 50;

  const onSlide = (event) => {
    setPower(Number(event.target.value));
  };

  return (
    <Card color="red" title="Drive" icon="🎛️">
      <div className="preset-row">
        {SPEED_PRESETS.map((preset) => (
          <button
            key={preset.value}
            className={`brick-btn brick-blue ${power === preset.value ? "brick-selected" : ""}`}
            title={`${preset.title} (${preset.value})`}
            disabled={!ready}
            onClick={() => setPower(preset.value, { force: true })}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <button
        className="brick-btn brick-red stop-btn"
        disabled={!ready}
        onClick={() => stop()}
      >
        ⛔ STOP
      </button>
      <div className="slider-row">
        <input
          type="range" min="-100" max="100" step="5"
          value={power}
          disabled={!ready}
          onChange={onSlide}
          onPointerUp={(event) => setPower(Number(event.target.value), { force: true })}
          aria-label="Motor power"
        />
        <div className="slider-scale"><span>-100</span><span>0</span><span>+100</span></div>
      </div>
      <div className="readout">
        commanded power <b>{power}</b>
      </div>
      <div className="gamepad-readout">
        {gamepad
          ? <>🎮 <b>{gamepad.id}</b> · left stick: drive · L1: effects · L2: colors · R1: beeps · R2: sounds</>
          : "🎮 No gamepad — mouse and touch controls stay available"}
      </div>
      <div className="drive-speedometer">
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
    </Card>
  );
}

/* ─────────────────────────── lights & sounds card ─────────────────────── */

function FunCard({ train, ready, send }) {
  const activeEffect = train?.effect ?? null;

  return (
    <Card color="yellow" title="Lights & Sounds" icon="🎪">
      <h3>Hub LED</h3>
      <div className="led-grid">
        {LED_ORDER.map((id) => (
          <button
            key={id}
            className={`led-swatch ${train?.ledColor === id && !activeEffect ? "led-selected" : ""}`}
            style={{ background: LED_COLORS[id].hex }}
            title={LED_COLORS[id].name}
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

      <h3>Beeps & tunes</h3>
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
  const [radialMenu, setRadialMenu] = useState(null);
  const radialMenuRef = useRef(null);
  const { power, setDrivePower, stop } = useDriveControl({
    trainPower: train?.power,
    ready,
    send,
  });

  const closeRadialMenu = useCallback(() => {
    radialMenuRef.current = null;
    setRadialMenu(null);
  }, []);

  const openRadialMenu = useCallback((kind) => {
    const menu = { kind, selected: null, items: radialItems(kind) };
    radialMenuRef.current = menu;
    setRadialMenu(menu);
  }, []);

  const runRadialAction = useCallback((item) => {
    if (!ready || !item) return;
    switch (item.type) {
      case "led":
        send({ type: "cmd", action: "led", color: item.color });
        break;
      case "effect":
        send({ type: "cmd", action: "effect", name: item.name });
        break;
      case "sound":
        send({ type: "cmd", action: "sound", name: item.name });
        break;
      case "tone":
        send({ type: "cmd", action: "tone", value: item.value });
        break;
      default:
        break;
    }
  }, [ready, send]);

  const updateRadialSelection = useCallback((kind, vector) => {
    const item = radialSelection(kind, vector);
    const current = radialMenuRef.current;
    if (!current || current.kind !== kind || current.selected?.id === item?.id) return;
    const next = { ...current, selected: item };
    radialMenuRef.current = next;
    setRadialMenu(next);
  }, []);

  const confirmRadialMenu = useCallback((item) => {
    const selected = item ?? radialMenuRef.current?.selected;
    runRadialAction(selected);
    closeRadialMenu();
  }, [closeRadialMenu, runRadialAction]);

  const gamepad = useGamepad({
    enabled: true,
    // Let the wheels open even with no train nearby, so their layout and
    // controller mapping can be checked safely. Actions still require ready.
    menusEnabled: true,
    onPower: (value) => setDrivePower(value, { source: "gamepad" }),
    onStop: () => stop({ source: "gamepad" }),
    onHorn: () => {
      if (ready) send({ type: "cmd", action: "sound", name: "HORN" });
    },
    onMenuOpen: openRadialMenu,
    onMenuVector: updateRadialSelection,
    onMenuConfirm: confirmRadialMenu,
    onMenuCancel: closeRadialMenu,
  });

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
          <Pill tone={gamepad.controller ? "ok" : gamepad.supported ? "warn" : "bad"}>
            🎮 {gamepad.controller ? "gamepad connected" : gamepad.supported ? "no gamepad" : "Gamepad API unavailable"}
          </Pill>
          <Pill tone={train?.battery == null ? "warn" : train.battery <= 20 ? "bad" : train.battery <= 50 ? "warn" : "ok"}>
            🔋 {train?.battery == null ? "battery —" : `${train.battery}%`}
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
        <DriveCard
          power={power}
          speed={train?.speed ?? 0}
          ready={ready}
          setPower={setDrivePower}
          stop={stop}
          gamepad={gamepad.controller}
        />
        <FunCard train={train} ready={ready} send={send} />
        <LogCard logLines={logLines} />
      </main>

      {radialMenu && (
        <RadialMenu
          menu={radialMenu}
          preview={!ready}
          onSelect={confirmRadialMenu}
          onCancel={closeRadialMenu}
        />
      )}

      <footer className="footer">
        not affiliated with the LEGO Group
      </footer>
    </div>
  );
}
