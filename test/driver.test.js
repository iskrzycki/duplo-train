import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setImmediate as nextTurn, setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
// Import just the device class: importing node-poweredup's entry point would
// load native Bluetooth. The tests use the installed library with a fake hub.
import { DuploTrainBaseMotor } from "node-poweredup/dist/devices/duplotrainbasemotor.js";
import { makeMotorDriver } from "../driver.js";
import { makeLedAnimator } from "../effects.js";

function makeMotor(send) {
  const hub = new EventEmitter();
  hub.isPortVirtual = () => false;
  hub.send = send;
  return new DuploTrainBaseMotor(hub, 0);
}

test("Police and motor keep-alives share a hub without requiring command feedback", async (t) => {
  const frames = [];
  const motor = makeMotor(async (frame) => { frames.push([...frame]); });
  const driver = makeMotorDriver(motor);
  const animator = makeLedAnimator((color) =>
    motor.hub.send(Buffer.from([0x81, 17, 0x10, 0x51, 0, color])));
  t.after(() => { animator.stop(); driver.dispose(); });
  await driver.set(40);
  animator.start("police");
  await sleep(400);
  await driver.set(-40);
  await sleep(200);
  await driver.stop();
  animator.stop();
  const motorFrames = frames.filter((frame) => frame[1] === 0);
  const ledFrames = frames.filter((frame) => frame[1] === 17);
  assert.ok(motorFrames.length >= 6);
  assert.deepEqual(ledFrames.map((frame) => frame[5]), [9, 0, 9]);
  assert.ok(motorFrames.some((frame) => frame[5] === 216));
  assert.equal(motorFrames.at(-1)[5], 0);
});

for (const feedback of ["missing", "before-write-callback"]) {
  test(`driving and STOP bypass a library queue wedged by ${feedback} feedback`, async (t) => {
    const frames = [];
    const motor = makeMotor(async (frame) => {
      frames.push([...frame]);
      if ((frame[2] & 1) && feedback === "before-write-callback") motor.finish(0x0a);
    });

    // Reproduce the old bug in the real library: even interrupt=true and
    // stop() fail to transmit after one missing/early 0x82 notification.
    motor.setPower(40, true);
    await nextTurn();
    motor.setPower(-40, true);
    motor.stop();
    await nextTurn();
    assert.equal(frames.length, 1);

    const driver = makeMotorDriver(motor, { refreshMs: 10 });
    t.after(() => driver.dispose());
    await driver.set(40);
    await sleep(35);
    assert.ok(frames.length >= 3, "keep-alives must still reach the transport");
    await driver.set(-40);
    await driver.stop();
    assert.deepEqual(frames.at(-2), [0x81, 0, 0x10, 0x51, 0, 216]);
    assert.deepEqual(frames.at(-1), [0x81, 0, 0x10, 0x51, 0, 0]);
    assert.ok(frames.slice(1).every((frame) => frame[2] === 0x10));
    const stoppedCount = frames.length;
    await sleep(25);
    assert.equal(frames.length, stoppedCount, "STOP must also stop keep-alives");
  });
}

test("slow writes coalesce newer power and STOP without building a keep-alive backlog", async (t) => {
  const frames = [];
  let completeFirstWrite;
  const motor = makeMotor((frame) => {
    frames.push([...frame]);
    return frames.length === 1
      ? new Promise((resolve) => { completeFirstWrite = resolve; })
      : Promise.resolve();
  });
  const driver = makeMotorDriver(motor, { refreshMs: 5 });
  t.after(() => driver.dispose());
  const forward = driver.set(40);
  const reverse = driver.set(-40);
  await sleep(30);
  const stop = driver.stop();
  assert.equal(frames.length, 1);
  completeFirstWrite();
  await Promise.all([forward, reverse, stop]);
  assert.deepEqual(frames.map((frame) => frame[5]), [40, 0]);
});

test("transport errors are observable and do not poison later commands", async (t) => {
  const failure = new Error("GATT write failed");
  const frames = [];
  const errors = [];
  let fail = false;
  const motor = makeMotor(async (frame) => {
    if (fail) throw failure;
    frames.push([...frame]);
  });
  const driver = makeMotorDriver(motor, { refreshMs: 5, onError: (err) => errors.push(err) });
  t.after(() => driver.dispose());
  await driver.set(40);
  fail = true;
  await sleep(25);
  assert.ok(errors.length > 0, "background write failures must be reported");
  await assert.rejects(driver.set(-40), failure);
  fail = false;
  await driver.stop();
  assert.equal(frames.at(-1)[5], 0);
});

test("disconnect discards pending power and prevents further writes", async () => {
  const frames = [];
  let completeWrite;
  const motor = makeMotor((frame) => {
    frames.push([...frame]);
    return new Promise((resolve) => { completeWrite = resolve; });
  });
  const driver = makeMotorDriver(motor);
  const forward = driver.set(40);
  const reverse = driver.set(-40);
  driver.dispose();
  completeWrite();
  await Promise.all([forward, reverse, driver.set(60), driver.stop()]);
  assert.equal(frames.length, 1);
  assert.equal(driver.power, 0);
});

test("STOP cancels an active ramp so it cannot restart the train", async (t) => {
  const frames = [];
  const motor = makeMotor(async (frame) => { frames.push([...frame]); });
  const driver = makeMotorDriver(motor);
  t.after(() => driver.dispose());
  const ramp = driver.ramp(0, 40, 40, 4);
  await driver.stop();
  await ramp;
  assert.deepEqual(frames.map((frame) => frame[5]), [10, 0]);
  assert.equal(driver.power, 0);
});
