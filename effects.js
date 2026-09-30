/**
 * LED light effects for the hub LED — pure timing logic, no BLE imports.
 *
 * Color numbers are Powered UP palette ids (0=off/black … 10=white).
 * An effect is either a fixed `steps` loop or a `random` pool (never
 * repeating the same color twice in a row).
 */

// Step times stay ≥180 ms: LED writes share the BLE link with the 10 Hz
// motor keep-alive. Skip ticks while a previous LED write is still pending.
export const LED_EFFECTS = {
  // double red flash, double blue flash — classic light bar
  police: { emoji: "🚨", ms: 180, steps: [9, 0, 9, 0, 3, 0, 3, 0] },
  // railroad crossing signal: red blink
  crossing: { emoji: "🚧", ms: 450, steps: [9, 0] },
  // the whole Powered UP palette in order
  rainbow: { emoji: "🌈", ms: 300, steps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  // random party colors
  disco: { emoji: "🪩", ms: 200, random: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  // warm flicker, like the firebox of a steam engine
  firebox: { emoji: "🔥", ms: 200, random: [9, 8, 7] },
};

/**
 * Drives an effect by calling `setLed(colorId)` on a timer.
 * One animator per train; start() replaces any running effect.
 * setLed must use the shared hub write queue (transport.js), otherwise a
 * concurrent motor/speaker write can leave its promise pending forever.
 */
export function makeLedAnimator(setLed, { onError = () => {} } = {}) {
  let timer = null;
  let active = null;
  let writing = false;

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    active = null;
  }

  return {
    get active() { return active; },
    start(name) {
      const effect = LED_EFFECTS[name];
      if (!effect) return false;
      stop();
      active = name;
      let step = 0;
      let lastColor = null;
      timer = setInterval(async () => {
        if (writing) return;
        let color;
        if (effect.random) {
          do {
            color = effect.random[Math.floor(Math.random() * effect.random.length)];
          } while (color === lastColor && effect.random.length > 1);
        } else {
          color = effect.steps[step++ % effect.steps.length];
        }
        lastColor = color;
        writing = true;
        try { await setLed(color); }
        catch (err) { onError(err); }
        finally { writing = false; }
      }, effect.ms);
      timer.unref?.();
      return true;
    },
    stop,
  };
}
