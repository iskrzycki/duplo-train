import { useEffect, useRef, useState } from "react";

const DEAD_ZONE = 0.14;
const POWER_STEP = 5;
const HEARTBEAT_MS = 100;

function stickToPower(axis) {
  if (Math.abs(axis) < DEAD_ZONE) return 0;

  const normalized = (Math.abs(axis) - DEAD_ZONE) / (1 - DEAD_ZONE);
  const curved = normalized ** 1.6;
  const value = (axis < 0 ? 1 : -1) * curved * 100;
  return Math.round(value / POWER_STEP) * POWER_STEP;
}

function getConnectedGamepad(index) {
  const pads = navigator.getGamepads?.() ?? [];
  if (index != null && pads[index]?.connected) return pads[index];
  return [...pads].find((pad) => pad?.connected) ?? null;
}

/**
 * Browser input adapter. It deliberately knows nothing about WebSockets or
 * buttons in the UI; callers receive semantic train actions instead.
 *
 * Mapping:
 *   left stick Y  → drive power
 *   button 0      → horn
 *   button 1      → stop
 */
export function useGamepad({ enabled, onPower, onStop, onHorn }) {
  const [controller, setController] = useState(null);
  const activeIndex = useRef(null);
  const previousButtons = useRef([]);
  const lastPower = useRef(0);
  const lastReportedAt = useRef(0);
  const callbacks = useRef({ onPower, onStop, onHorn });

  useEffect(() => {
    callbacks.current = { onPower, onStop, onHorn };
  }, [onPower, onStop, onHorn]);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.getGamepads) return;

    let frame;

    const remember = (pad) => {
      setController((current) => {
        if (current?.index === pad.index && current.id === pad.id && current.mapping === pad.mapping) {
          return current;
        }
        return { index: pad.index, id: pad.id, mapping: pad.mapping };
      });
    };

    const stopForSafety = () => {
      if (lastPower.current === 0) return;
      lastPower.current = 0;
      callbacks.current.onStop();
    };

    const forget = ({ stop = false } = {}) => {
      if (stop) stopForSafety();
      activeIndex.current = null;
      previousButtons.current = [];
      lastReportedAt.current = 0;
      setController(null);
    };

    const tick = (now) => {
      const pad = getConnectedGamepad(activeIndex.current);
      if (!pad) {
        if (activeIndex.current != null) forget({ stop: true });
        frame = requestAnimationFrame(tick);
        return;
      }

      activeIndex.current = pad.index;
      remember(pad);

      const power = stickToPower(pad.axes[1] ?? 0);
      const changed = power !== lastPower.current;
      const heartbeatDue = power !== 0 && now - lastReportedAt.current >= HEARTBEAT_MS;
      if (changed || heartbeatDue) {
        lastPower.current = power;
        lastReportedAt.current = now;
        callbacks.current.onPower(power);
      }

      const buttons = pad.buttons.map((button) => button.pressed);
      if (buttons[0] && !previousButtons.current[0]) callbacks.current.onHorn();
      if (buttons[1] && !previousButtons.current[1]) callbacks.current.onStop();
      previousButtons.current = buttons;

      frame = requestAnimationFrame(tick);
    };

    const onConnected = ({ gamepad }) => {
      if (activeIndex.current == null) {
        activeIndex.current = gamepad.index;
        remember(gamepad);
      }
    };

    const onDisconnected = ({ gamepad }) => {
      if (gamepad.index === activeIndex.current) forget({ stop: true });
    };

    const onVisibilityChange = () => {
      if (document.hidden) stopForSafety();
    };

    window.addEventListener("gamepadconnected", onConnected);
    window.addEventListener("gamepaddisconnected", onDisconnected);
    window.addEventListener("blur", stopForSafety);
    document.addEventListener("visibilitychange", onVisibilityChange);

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      stopForSafety();
      window.removeEventListener("gamepadconnected", onConnected);
      window.removeEventListener("gamepaddisconnected", onDisconnected);
      window.removeEventListener("blur", stopForSafety);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  return {
    supported: typeof navigator !== "undefined" && Boolean(navigator.getGamepads),
    controller,
  };
}
