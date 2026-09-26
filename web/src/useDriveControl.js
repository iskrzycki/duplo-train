import { useCallback, useEffect, useRef, useState } from "react";

const POWER_STEP = 5;
const SEND_INTERVAL_MS = 80;

function clampPower(value) {
  const rounded = Math.round(Number(value) / POWER_STEP) * POWER_STEP;
  return Math.max(-100, Math.min(100, Number.isFinite(rounded) ? rounded : 0));
}

/**
 * The single command path for every driving input. Mouse, touch, keyboard
 * accessibility controls, and a gamepad all update this state and send the
 * same WebSocket protocol command.
 */
export function useDriveControl({ trainPower, ready, send }) {
  const [power, setPower] = useState(() => clampPower(trainPower));
  const lastInputAt = useRef(0);
  const lastSentAt = useRef(0);

  // The server is authoritative while nobody is actively operating a control.
  // A short grace period prevents an older state broadcast from snapping the
  // slider back while a user is moving it or holding a stick.
  useEffect(() => {
    if (Date.now() - lastInputAt.current > 250) {
      setPower(clampPower(trainPower));
    }
  }, [trainPower]);

  const setDrivePower = useCallback((value, { force = false, source = "panel" } = {}) => {
    const next = clampPower(value);
    const now = Date.now();

    lastInputAt.current = now;
    setPower(next);

    if (!ready) return;
    if (!force && next !== 0 && now - lastSentAt.current < SEND_INTERVAL_MS) return;

    lastSentAt.current = now;
    send({
      type: "cmd",
      action: "power",
      value: next,
      ...(source === "gamepad" ? { source } : {}),
    });
  }, [ready, send]);

  const stop = useCallback(({ source = "panel" } = {}) => {
    lastInputAt.current = Date.now();
    lastSentAt.current = Date.now();
    setPower(0);

    if (!ready) return;
    send({
      type: "cmd",
      action: "stop",
      ...(source === "gamepad" ? { source } : {}),
    });
  }, [ready, send]);

  return { power, setDrivePower, stop };
}
