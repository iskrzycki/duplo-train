import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { setImmediate as nextTurn, setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
import Characteristic from "@stoprocent/noble/lib/characteristic.js";
import { NobleDevice } from "node-poweredup/dist/nobleabstraction.js";
import { LPF2Hub } from "node-poweredup/dist/hubs/lpf2hub.js";
import { DuploTrainBaseMotor } from "node-poweredup/dist/devices/duplotrainbasemotor.js";
import { BLECharacteristic } from "node-poweredup/dist/consts.js";
import { installBleWriteQueue } from "../transport.js";
import { makeMotorDriver } from "../driver.js";
import { makeLedAnimator } from "../effects.js";

const UUID = BLECharacteristic.LPF2_ALL;
const output = (port, value) => Buffer.from([0x81, port, 0x10, 0x51, 0, value]);

function makeHub() {
  const frames = [];
  // Only the native binding is fake. Use the installed characteristic,
  // node-poweredup BLE adapter and LPF2 framing to reproduce callback loss.
  const characteristic = new Characteristic({
    write(peripheral, service, uuid, data) { frames.push([...data]); },
  }, "train", "service", UUID.replace(/-/g, ""), ["write", "notify"]);
  const ble = Object.assign(new EventEmitter(), {
    connected: true,
    _characteristics: { [characteristic.uuid]: characteristic },
    _sanitizeUUID: NobleDevice.prototype._sanitizeUUID,
    writeToCharacteristic: NobleDevice.prototype.writeToCharacteristic,
  });
  const hub = new LPF2Hub(ble);
  const complete = async (err) => {
    characteristic.emit("write", err);
    await nextTurn();
  };
  return { hub, frames, complete };
}

test("unserialized noble writes lose the LED callback when a motor write overlaps", async () => {
  const { hub, frames, complete } = makeHub();
  let ledDone = false;
  let motorDone = false;
  hub.send(output(17, 9), UUID).then(() => { ledDone = true; });
  hub.send(output(0, 40), UUID).then(() => { motorDone = true; });
  assert.equal(frames.length, 2);
  await complete();
  await complete();
  assert.equal(motorDone, true);
  assert.equal(ledDone, false, "the first promise remains pending despite both native completions");
});

test("shared queue preserves callbacks for LED, motor, speaker and setup writes", async (t) => {
  const { hub, frames, complete } = makeHub();
  installBleWriteQueue(hub);
  t.after(() => hub.emit("disconnect"));
  const messages = [output(17, 9), output(0, 40), output(1, 3), Buffer.from([0x41, 19, 0, 1, 0, 0, 0, 1])];
  const commands = messages.map((message) => hub.send(message, UUID));
  assert.equal(frames.length, 1, "only one native write may be outstanding per hub");
  for (let i = 0; i < messages.length; i++) {
    assert.deepEqual(frames[i].slice(2), [...messages[i]]);
    await complete();
    assert.equal(frames.length, Math.min(i + 2, messages.length));
  }
  await Promise.all(commands);
});

test("Police keeps blinking after overlapping motor and manual color commands", async (t) => {
  const { hub, frames, complete } = makeHub();
  installBleWriteQueue(hub);
  const driver = makeMotorDriver(new DuploTrainBaseMotor(hub, 0), { refreshMs: 10000 });
  const animator = makeLedAnimator((color) => hub.send(output(17, color), UUID));
  t.after(() => { animator.stop(); driver.dispose(); hub.emit("disconnect"); });
  animator.start("police");
  await sleep(200);
  assert.equal(frames.length, 1); // first effect write deliberately still pending
  const drive = driver.set(40);
  const manualColor = hub.send(output(17, 3), UUID);
  assert.equal(frames.length, 1);
  await complete(); // LED -> motor
  await complete(); // motor -> manual LED
  await complete();
  await Promise.all([drive, manualColor]);
  await sleep(200);
  assert.deepEqual(frames.at(-1).slice(2), [...output(17, 0)], "the effect must advance after the collision");
  await complete();
  animator.stop();
  const stop = driver.stop();
  await complete();
  await stop;
  assert.deepEqual(frames.at(-1).slice(2), [...output(0, 0)]);
});

test("a completed write error rejects its command without poisoning the queue", async (t) => {
  const { hub, frames, complete } = makeHub();
  installBleWriteQueue(hub);
  t.after(() => hub.emit("disconnect"));
  const failure = new Error("GATT rejected the write");
  const rejected = assert.rejects(hub.send(output(17, 9), UUID), failure);
  const next = hub.send(output(0, 0), UUID);
  await complete(failure);
  await rejected;
  assert.equal(frames.length, 2);
  await complete();
  await next;
});

test("disconnect rejects pending work and late callbacks cannot replay queued motor power", async () => {
  const { hub, frames, complete } = makeHub();
  installBleWriteQueue(hub);
  const led = assert.rejects(hub.send(output(17, 9), UUID), /disconnected/);
  const drive = assert.rejects(hub.send(output(0, 40), UUID), /disconnected/);
  hub.emit("disconnect");
  await Promise.all([led, drive]);
  await complete();
  await assert.rejects(hub.send(output(0, 60), UUID), /disconnected/);
  assert.equal(frames.length, 1);
});

test("missing native callbacks report a timeout and discard the queue instead of replaying it", async () => {
  const { hub, frames, complete } = makeHub();
  const stalls = [];
  installBleWriteQueue(hub, { writeTimeoutMs: 10, onStall: (err) => stalls.push(err) });
  const led = assert.rejects(hub.send(output(17, 9), UUID), /timed out/);
  const drive = assert.rejects(hub.send(output(0, 40), UUID), /timed out/);
  await sleep(25);
  await Promise.all([led, drive]);
  assert.equal(stalls.length, 1);
  await complete();
  await assert.rejects(hub.send(output(0, 60), UUID), /timed out/);
  assert.equal(frames.length, 1);
});
