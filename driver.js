/**
 * Continuous-drive controller for the DUPLO train motor.
 *
 * The train base has a motion watchdog: after a single power command from
 * standstill it cuts the motor within ~200 ms if it doesn't sense the wheels
 * turning. The official app works around this by re-sending the motor
 * command continuously — so do we: while power ≠ 0, the driver re-sends it
 * every `refreshMs`. Writes go out with the "execute immediately" flag
 * (interrupt=true), which also flushes any stale queued motor commands, so
 * the keep-alive can never back up the command queue.
 *
 * Use set()/ramp()/stop() instead of touching the motor directly, then
 * dispose() when the hub disconnects. No BLE imports here — works with any
 * object exposing setPower(power, interrupt) and stop().
 */

import { sleep } from "./log.js";

export function makeMotorDriver(motor, { refreshMs = 100 } = {}) {
  let current = 0;
  const timer = setInterval(() => {
    if (current !== 0 && motor) {
      try { motor.setPower(current, true); } catch { /* device detached mid-run */ }
    }
  }, refreshMs);
  timer.unref?.(); // never keep the process alive just for the keep-alive

  return {
    get power() { return current; },
    set(power) {
      current = power;
      try { return motor?.setPower(power, true); } catch { /* detached */ }
    },
    async ramp(from, to, ms, steps = 8) {
      for (let i = 1; i <= steps; i++) {
        current = Math.round(from + ((to - from) * i) / steps);
        try { motor?.setPower(current, true); } catch { /* detached */ }
        await sleep(ms / steps);
      }
      current = to;
    },
    stop() {
      current = 0;
      try { return motor?.stop(); } catch { /* detached */ }
    },
    dispose() { clearInterval(timer); },
  };
}
