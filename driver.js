/**
 * Continuous-drive controller for the DUPLO train motor.
 *
 * The train base has a motion watchdog: after a single power command from
 * standstill it cuts the motor within ~200 ms if it doesn't sense the wheels
 * turning. The official app works around this by re-sending the motor
 * command continuously — so do we: while power ≠ 0, the driver re-sends it
 * every `refreshMs`. Raw WriteDirectModeData frames use "execute immediately,
 * no feedback" (0x10). The library's setPower(..., true) still waits for
 * 0x82 feedback and can wedge permanently when feedback is lost or races
 * the BLE write callback — even interrupt=true and stop() cannot recover it.
 * Await BLE writes, not command feedback, and keep at most one newer command
 * while a write is in flight. Keep-alives never accumulate behind a slow write.
 * The hub must also use installBleWriteQueue() from transport.js so LED and
 * speaker writes cannot steal the motor write's noble completion callback.
 *
 * Use set()/ramp()/stop() instead of touching the motor directly, then
 * dispose() when the hub disconnects. No native BLE imports here — the motor
 * only needs portId and send(frame), as exposed by node-poweredup's Device.
 */

import { log, sleep } from "./log.js";

export function makeMotorDriver(motor, {
  refreshMs = 100,
  onError = (err) => log("ERR", `motor keep-alive write failed: ${err.message}`),
} = {}) {
  let current = 0;
  let disposed = false;
  let revision = 0;
  let inFlight = false;
  let pending = null;

  async function flush() {
    if (inFlight || !pending || disposed) return;
    const command = pending;
    pending = null;
    inFlight = true;
    try {
      // Device.send() bypasses the port command queue but retains the normal
      // connection check, LPF2 characteristic and hub.send() logging.
      await motor.send(Buffer.from([0x81, motor.portId, 0x10, 0x51, 0x00, command.power]));
      command.resolve();
    } catch (err) {
      command.reject(err);
    } finally {
      inFlight = false;
      flush();
    }
  }

  function write(power) {
    if (disposed || !motor) return Promise.resolve();
    if (pending) {
      pending.power = power; // the newest requested power (including STOP) wins
      return pending.promise;
    }
    const command = { power };
    command.promise = new Promise((resolve, reject) => {
      command.resolve = resolve;
      command.reject = reject;
    });
    pending = command;
    flush();
    return command.promise;
  }

  const clampPower = (power) => Math.max(-100, Math.min(100, Math.round(Number(power) || 0)));
  const timer = setInterval(() => {
    if (current !== 0 && !inFlight && !disposed) {
      write(current).catch(onError);
    }
  }, refreshMs);
  timer.unref?.(); // never keep the process alive just for the keep-alive

  return {
    get power() { return current; },
    set(power) {
      if (disposed) return Promise.resolve();
      revision++;
      current = clampPower(power);
      return write(current);
    },
    async ramp(from, to, ms, steps = 8) {
      const rampRevision = ++revision;
      for (let i = 1; i <= steps; i++) {
        if (disposed || revision !== rampRevision) return;
        current = clampPower(from + ((to - from) * i) / steps);
        await write(current);
        await sleep(ms / steps);
      }
    },
    stop() {
      revision++;
      current = 0;
      return write(0);
    },
    dispose() {
      disposed = true;
      revision++;
      current = 0;
      clearInterval(timer);
      pending?.resolve();
      pending = null;
    },
  };
}
