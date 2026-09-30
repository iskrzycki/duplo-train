import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
import { makeLedAnimator } from "../effects.js";

test("Police skips ticks during a slow write, including across effect restarts", async (t) => {
  const colors = [];
  let completeWrite;
  const animator = makeLedAnimator((color) => {
    colors.push(color);
    return new Promise((resolve) => { completeWrite = resolve; });
  });
  t.after(() => animator.stop());
  animator.start("police");
  await sleep(400);
  assert.deepEqual(colors, [9]);
  animator.stop();
  animator.start("police");
  await sleep(200);
  assert.deepEqual(colors, [9], "restarting must not overlap the pending write");
  completeWrite();
  await sleep(200);
  assert.deepEqual(colors, [9, 9]);
  animator.stop();
  completeWrite();
  await sleep(200);
  assert.equal(colors.length, 2, "settling a write must not restart a stopped effect");
});

test("async LED failures are reported and subsequent ticks can recover", async (t) => {
  const colors = [];
  const errors = [];
  const failure = new Error("LED write failed");
  const animator = makeLedAnimator(async (color) => {
    colors.push(color);
    if (colors.length === 1) throw failure;
  }, { onError: (err) => errors.push(err) });
  t.after(() => animator.stop());
  animator.start("police");
  await sleep(400);
  assert.deepEqual(errors, [failure]);
  assert.deepEqual(colors, [9, 0]);
});
