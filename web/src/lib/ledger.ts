// Pure group-expense math. All amounts are integer cents so totals always balance exactly.
// No imports: this module runs on the server, in the browser (composer previews) and under `node --test`.

export type SplitMode = "equal" | "exact" | "shares";

export interface Portion {
  userId: string;
  cents: number;
}

export interface LedgerExpense {
  paidBy: Portion[];
  splitAmong: Portion[];
}

export interface LedgerTransfer {
  fromId: string;
  toId: string;
  cents: number;
}

export const toCents = (value: string | number) => Math.round(Number(value || 0) * 100);
export const fromCents = (cents: number) => (cents / 100).toFixed(2);

/** Divide `total` cents by integer weights using the largest-remainder method. Ties go to earlier entries. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const result = exact.map(Math.floor);
  let leftover = total - result.reduce((a, b) => a + b, 0);
  const order = exact
    .map((value, i) => ({ i, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (leftover <= 0) break;
    result[i] += 1;
    leftover -= 1;
  }
  return result;
}

/**
 * Resolve who owes what for one expense.
 * - equal:  `values` is ignored; everyone listed pays the same (leftover cents go to the first people).
 * - exact:  `values` are cents and must add up to `total`.
 * - shares: `values` are positive integer weights (e.g. 2 for someone who had two drinks).
 */
export function resolveSplit(total: number, mode: SplitMode, userIds: string[], values: number[] = []): Portion[] {
  if (!Number.isInteger(total) || total <= 0) throw new Error("The total must be more than $0.");
  if (userIds.length === 0) throw new Error("Pick at least one person to split with.");
  if (new Set(userIds).size !== userIds.length) throw new Error("Someone is listed twice.");

  let cents: number[];
  if (mode === "equal") {
    cents = allocate(total, userIds.map(() => 1));
  } else if (mode === "exact") {
    if (values.length !== userIds.length || values.some((v) => !Number.isInteger(v) || v < 0)) {
      throw new Error("Enter an amount for everyone.");
    }
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum !== total) throw new Error(`Amounts add up to $${fromCents(sum)}, not $${fromCents(total)}.`);
    cents = values;
  } else {
    if (values.length !== userIds.length || values.some((v) => !Number.isInteger(v) || v <= 0 || v > 100)) {
      throw new Error("Shares are whole numbers from 1 to 100.");
    }
    cents = allocate(total, values);
  }
  return userIds.map((userId, i) => ({ userId, cents: cents[i] })).filter((p) => p.cents > 0);
}

/**
 * Net balance per member: positive means the group owes them, negative means they owe the group.
 * Settlement payments count like money paid: sending moves you up, receiving moves you down.
 */
export function netBalances(
  memberIds: string[],
  expenses: LedgerExpense[],
  settlements: LedgerTransfer[] = [],
): Map<string, number> {
  const balances = new Map(memberIds.map((id) => [id, 0]));
  const add = (id: string, cents: number) => balances.set(id, (balances.get(id) ?? 0) + cents);

  for (const expense of expenses) {
    for (const p of expense.paidBy) add(p.userId, p.cents);
    for (const p of expense.splitAmong) add(p.userId, -p.cents);
  }
  for (const s of settlements) {
    add(s.fromId, s.cents);
    add(s.toId, -s.cents);
  }
  return balances;
}

/**
 * Greedy debt simplification: repeatedly match the biggest debtor with the biggest creditor.
 * Produces at most n − 1 transfers. Ties are broken by id so the plan is stable between page loads.
 */
export function simplifyDebts(balances: Map<string, number>): LedgerTransfer[] {
  const byAmount = (a: { id: string; cents: number }, b: { id: string; cents: number }) =>
    b.cents - a.cents || a.id.localeCompare(b.id);

  const creditors = [...balances].filter(([, c]) => c > 0).map(([id, cents]) => ({ id, cents }));
  const debtors = [...balances].filter(([, c]) => c < 0).map(([id, cents]) => ({ id, cents: -cents }));
  const transfers: LedgerTransfer[] = [];

  while (creditors.length && debtors.length) {
    creditors.sort(byAmount);
    debtors.sort(byAmount);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const cents = Math.min(creditor.cents, debtor.cents);
    transfers.push({ fromId: debtor.id, toId: creditor.id, cents });
    creditor.cents -= cents;
    debtor.cents -= cents;
    if (creditor.cents === 0) creditors.shift();
    if (debtor.cents === 0) debtors.shift();
  }
  return transfers;
}
