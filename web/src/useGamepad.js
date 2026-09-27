import { useEffect, useRef, useState } from "react";

const DEAD_ZONE = 0.14;
const POWER_STEP = 5;
const HEARTBEAT_MS = 100;
const TRIGGER_THRESHOLD = 0.5;
const MENU_VECTOR_EPSILON = 0.02;

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
 *   button 0 (bottom face button) → horn
 *   button 1 (right face button)  → stop / cancel a radial menu
 *   L1 / L2 / R1 / R2              → hold-to-select effects / colors / beeps / sounds wheels
 */
export function useGamepad({
  enabled,
  menusEnabled,
  onPower,
  onStop,
  onHorn,
  onMenuOpen,
  onMenuVector,
  onMenuConfirm,
  onMenuCancel,
}) {
  const [controller, setController] = useState(null);
  const activeIndex = useRef(null);
  const previousButtons = useRef([]);
  const previousTriggers = useRef({ left: false, right: false });
  const lastPower = useRef(0);
  const lastReportedAt = useRef(0);
  const activeMenu = useRef(null);
  const previousMenuVector = useRef({ x: 0, y: 0, magnitude: 0 });
  const callbacks = useRef({
    menusEnabled,
    onPower,
    onStop,
    onHorn,
    onMenuOpen,
    onMenuVector,
    onMenuConfirm,
    onMenuCancel,
  });

  useEffect(() => {
    callbacks.current = {
      menusEnabled,
      onPower,
      onStop,
      onHorn,
      onMenuOpen,
      onMenuVector,
      onMenuConfirm,
      onMenuCancel,
    };
  }, [menusEnabled, onPower, onStop, onHorn, onMenuOpen, onMenuVector, onMenuConfirm, onMenuCancel]);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.getGamepads) return;

    let frame;

    const resetMenuVector = () => {
      previousMenuVector.current = { x: 0, y: 0, magnitude: 0 };
    };

    const cancelMenu = () => {
      if (!activeMenu.current) return;
      activeMenu.current = null;
      resetMenuVector();
      callbacks.current.onMenuCancel();
    };

    const confirmMenu = () => {
      if (!activeMenu.current) return;
      activeMenu.current = null;
      resetMenuVector();
      callbacks.current.onMenuConfirm();
    };

    const openMenu = (menu) => {
      activeMenu.current = menu;
      lastPower.current = 0;
      resetMenuVector();
      // Opening a wheel always stops the train, even if the left stick was
      // already centred. Selecting an effect, color, or sound must never
      // keep it moving.
      callbacks.current.onStop();
      callbacks.current.onMenuOpen(menu);
    };

    const remember = (pad) => {
      setController((current) => {
        if (current?.index === pad.index && current.id === pad.id && current.mapping === pad.mapping) {
          return current;
        }
        return { index: pad.index, id: pad.id, mapping: pad.mapping };
      });
    };

    const stopForSafety = () => {
      cancelMenu();
      if (lastPower.current === 0) return;
      lastPower.current = 0;
      callbacks.current.onStop();
    };

    const forget = ({ stop = false } = {}) => {
      if (stop) stopForSafety();
      activeIndex.current = null;
      previousButtons.current = [];
      previousTriggers.current = { left: false, right: false };
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

      const buttons = pad.buttons.map((button) => button.pressed);
      const leftBumper = Boolean(pad.buttons[4]?.pressed || pad.buttons[4]?.value > TRIGGER_THRESHOLD);
      const rightBumper = Boolean(pad.buttons[5]?.pressed || pad.buttons[5]?.value > TRIGGER_THRESHOLD);
      const leftTrigger = Boolean(pad.buttons[6]?.pressed || pad.buttons[6]?.value > TRIGGER_THRESHOLD);
      const rightTrigger = Boolean(pad.buttons[7]?.pressed || pad.buttons[7]?.value > TRIGGER_THRESHOLD);

      if (activeMenu.current && !callbacks.current.menusEnabled) cancelMenu();

      if (!activeMenu.current && callbacks.current.menusEnabled) {
        if (leftBumper && !previousButtons.current[4]) openMenu("effects");
        else if (leftTrigger && !previousTriggers.current.left) openMenu("colors");
        else if (rightBumper && !previousButtons.current[5]) openMenu("beeps");
        else if (rightTrigger && !previousTriggers.current.right) openMenu("sounds");
      }

      if (activeMenu.current) {
        const menu = activeMenu.current;
        const x = pad.axes[2] ?? 0;
        const y = pad.axes[3] ?? 0;
        const magnitude = Math.min(1, Math.hypot(x, y));
        const previous = previousMenuVector.current;
        if (
          Math.abs(x - previous.x) > MENU_VECTOR_EPSILON
          || Math.abs(y - previous.y) > MENU_VECTOR_EPSILON
          || Math.abs(magnitude - previous.magnitude) > MENU_VECTOR_EPSILON
        ) {
          previousMenuVector.current = { x, y, magnitude };
          callbacks.current.onMenuVector(menu, { x, y, magnitude });
        }

        if (buttons[1] && !previousButtons.current[1]) cancelMenu();
        else if (
          (menu === "effects" && !leftBumper)
          || (menu === "colors" && !leftTrigger)
          || (menu === "beeps" && !rightBumper)
          || (menu === "sounds" && !rightTrigger)
        ) confirmMenu();

        previousButtons.current = buttons;
        previousTriggers.current = { left: leftTrigger, right: rightTrigger };
        frame = requestAnimationFrame(tick);
        return;
      }

      const power = stickToPower(pad.axes[1] ?? 0);
      const changed = power !== lastPower.current;
      const heartbeatDue = power !== 0 && now - lastReportedAt.current >= HEARTBEAT_MS;
      if (changed || heartbeatDue) {
        lastPower.current = power;
        lastReportedAt.current = now;
        callbacks.current.onPower(power);
      }

      if (buttons[0] && !previousButtons.current[0]) callbacks.current.onHorn();
      if (buttons[1] && !previousButtons.current[1]) callbacks.current.onStop();
      previousButtons.current = buttons;
      previousTriggers.current = { left: leftTrigger, right: rightTrigger };

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
