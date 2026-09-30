/**
 * Serialize every hub write, across all ports, before it reaches noble.
 *
 * @stoprocent/noble 2.8.0 uses onceExclusive("write") on a characteristic:
 * starting another write removes the previous write's completion callback.
 * LPF2 shares ONE characteristic for motor, LED, speaker and setup messages.
 * Per-device queues cannot prevent this collision. No native BLE imports here.
 */

const installed = new WeakSet();

export function installBleWriteQueue(hub, { writeTimeoutMs = 2000, onStall = () => {} } = {}) {
  if (installed.has(hub)) return;
  installed.add(hub);
  const originalSend = hub.send.bind(hub);
  const queue = [];
  let active = null;
  let closed = null;

  function close(err) {
    closed = err;
    if (active) {
      clearTimeout(active.timer);
      active.reject(err);
      active = null;
    }
    for (const command of queue.splice(0)) command.reject(err);
  }

  function finish(command, err) {
    if (active !== command) return; // ignore a late callback after disconnect/timeout
    clearTimeout(command.timer);
    active = null;
    if (err) command.reject(err);
    else command.resolve();
    flush();
  }

  function flush() {
    if (active || closed || !queue.length) return;
    const command = queue.shift();
    active = command;
    command.timer = setTimeout(() => {
      const err = new Error(`BLE write timed out after ${writeTimeoutMs} ms — queued commands discarded; reconnect required`);
      // Do not continue after a missing callback: a late completion could
      // otherwise be assigned to a new write, or stale power could be replayed.
      close(err);
      onStall(err);
    }, writeTimeoutMs);
    command.timer.unref?.();
    try {
      Promise.resolve(originalSend(command.message, command.uuid))
        .then(() => finish(command), (err) => finish(command, err));
    } catch (err) {
      finish(command, err);
    }
  }

  hub.send = (message, uuid) => new Promise((resolve, reject) => {
    if (closed) { reject(closed); return; }
    queue.push({ message: Buffer.from(message), uuid, resolve, reject });
    flush();
  });
  hub.once("disconnect", () => close(new Error("Hub disconnected — queued BLE writes discarded")));
}
