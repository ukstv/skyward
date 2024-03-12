import { test } from "uvu";
import * as assert from "uvu/assert";
import { Actioneer } from "./actioneer";
import { setTimeout } from "node:timers/promises";

test("run returns void function", () => {
  const actioneer = new Actioneer();
  const a = actioneer.run(() => {
    throw new Error(`Should not happen`);
  });
  assert.ok(typeof a === "function");
});

test("single run allowed", async () => {
  const actioneer = new Actioneer();
  const runs: Array<string> = [];
  const a = actioneer.run(async () => {
    runs.push("a");
  });
  const b = actioneer.run(async () => {
    runs.push("b");
  });
  a();
  await actioneer;
  assert.throws(() => b());
  assert.equal(runs, ["a"]);
});

test("await actioneer", async () => {
  const actioneer = new Actioneer();
  const runs = new Array<string>();
  actioneer.then(() => {
    runs.push("actioneer");
  });
  const a = actioneer.run(async () => {
    runs.push("a");
  });
  a();
  await actioneer;
  assert.equal(runs, ["a", "actioneer"]);
});

test.run();
