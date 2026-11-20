// Run with: npm test   (node --test with built-in TypeScript stripping, no extra dependencies)
import assert from "node:assert/strict";
import { test } from "node:test";
import { allocate, netBalances, resolveSplit, simplifyDebts, type LedgerExpense } from "../src/lib/ledger.ts";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const equal = (total: number, ids: string[]) => resolveSplit(total, "equal", ids);
const paid = (userId: string, cents: number) => [{ userId, cents }];

test("allocate always adds up to the total", () => {
  for (const [total, weights] of [
    [100, [1, 1, 1]],
    [1, [1, 1, 1]],
    [999, [3, 2, 7]],
    [10_000, [1, 1, 1, 1, 1, 1, 1]],
  ] as [number, number[]][]) {
    assert.equal(sum(allocate(total, weights)), total);
  }
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
});

test("resolveSplit: equal, exact and shares", () => {
  assert.deepEqual(equal(1000, ["a", "b", "c", "d"]).map((p) => p.cents), [250, 250, 250, 250]);
  assert.deepEqual(resolveSplit(1000, "exact", ["a", "b"], [700, 300]).map((p) => p.cents), [700, 300]);
  assert.deepEqual(resolveSplit(900, "shares", ["a", "b"], [2, 1]).map((p) => p.cents), [600, 300]);
  assert.throws(() => resolveSplit(1000, "exact", ["a", "b"], [700, 200]), /add up/);
  assert.throws(() => resolveSplit(1000, "equal", []), /at least one/);
  assert.throws(() => resolveSplit(1000, "equal", ["a", "a"]), /twice/);
  assert.throws(() => resolveSplit(0, "equal", ["a"]), /more than/);
});

test("multiple payers, partial participation (the trip example)", () => {
  const ids = ["alice", "bob", "carol", "dan"];
  const expenses: LedgerExpense[] = [
    { paidBy: paid("alice", 12000), splitAmong: equal(12000, ids) }, // hotel, everyone
    { paidBy: paid("bob", 6000), splitAmong: equal(6000, ["alice", "bob", "carol"]) }, // dinner, Dan skipped
    { paidBy: paid("carol", 4000), splitAmong: equal(4000, ids) }, // gas, everyone
  ];
  const balances = netBalances(ids, expenses);
  assert.deepEqual(Object.fromEntries(balances), { alice: 6000, bob: 0, carol: -2000, dan: -4000 });
  assert.deepEqual(simplifyDebts(balances), [
    { fromId: "dan", toId: "alice", cents: 4000 },
    { fromId: "carol", toId: "alice", cents: 2000 },
  ]);
});

test("one expense paid by two people", () => {
  const ids = ["a", "b", "c"];
  const expense = { paidBy: [{ userId: "a", cents: 8000 }, { userId: "b", cents: 4000 }], splitAmong: equal(12000, ids) };
  const balances = netBalances(ids, [expense]);
  assert.deepEqual(Object.fromEntries(balances), { a: 4000, b: 0, c: -4000 });
  assert.deepEqual(simplifyDebts(balances), [{ fromId: "c", toId: "a", cents: 4000 }]);
});

test("settlements count toward balances", () => {
  const ids = ["a", "b"];
  const expenses = [{ paidBy: paid("a", 1000), splitAmong: equal(1000, ids) }];
  const partly = netBalances(ids, expenses, [{ fromId: "b", toId: "a", cents: 200 }]);
  assert.deepEqual(simplifyDebts(partly), [{ fromId: "b", toId: "a", cents: 300 }]);
  const fully = netBalances(ids, expenses, [{ fromId: "b", toId: "a", cents: 500 }]);
  assert.deepEqual(simplifyDebts(fully), []);
});

test("balances always net to zero and plans stay under n transfers", () => {
  let seed = 42;
  const rand = (n: number) => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) % n);
  for (let round = 0; round < 200; round++) {
    const ids = Array.from({ length: 2 + rand(8) }, (_, i) => `u${i}`);
    const expenses: LedgerExpense[] = Array.from({ length: 1 + rand(6) }, () => {
      const total = 1 + rand(50_000);
      const among = ids.filter(() => rand(3) > 0);
      return { paidBy: paid(ids[rand(ids.length)], total), splitAmong: equal(total, among.length ? among : [ids[0]]) };
    });
    const balances = netBalances(ids, expenses);
    assert.equal(sum([...balances.values()]), 0);

    const plan = simplifyDebts(balances);
    assert.ok(plan.length <= ids.length - 1);
    const after = netBalances(ids, expenses, plan);
    assert.ok([...after.values()].every((c) => c === 0), "plan settles everyone");
  }
});
