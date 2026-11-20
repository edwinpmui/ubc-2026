"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { postJson } from "@/lib/client";
import { formatUsd } from "@/lib/format";
import { allocate, fromCents, resolveSplit, toCents, type SplitMode } from "@/lib/ledger";
import type { GroupExpense, PublicUser } from "@/lib/types";
import { sanitizeAmount } from "./AmountInput";
import { Avatar } from "./Avatar";

const MODES: { mode: SplitMode; label: string; hint: string }[] = [
  { mode: "equal", label: "Equally", hint: "Everyone ticked pays the same." },
  { mode: "exact", label: "Exact $", hint: "Type what each person owes." },
  { mode: "shares", label: "Shares", hint: "e.g. 2 for someone who had twice as much." },
];

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
        on ? "border-copper bg-copper text-white" : "border-line bg-white"
      }`}
    >
      {on && <Check size={13} strokeWidth={3} />}
    </span>
  );
}

const smallInput =
  "w-full rounded-xl border border-line py-1.5 pl-6 pr-2 text-right text-sm font-semibold tabular-nums outline-none focus:border-copper";

function initialValues(expense: GroupExpense): Record<string, string> {
  if (expense.splitMode === "exact") {
    return Object.fromEntries(expense.splitAmong.map((p) => [p.userId, fromCents(p.cents)]));
  }
  if (expense.splitMode === "shares") {
    return Object.fromEntries(expense.splitAmong.map((p) => [p.userId, String(expense.weights?.[p.userId] ?? 1)]));
  }
  return {};
}

export function ExpenseComposer({
  groupId,
  members,
  meId,
  initial,
}: {
  groupId: string;
  members: PublicUser[];
  meId: string;
  /** When set, the composer edits this expense instead of adding a new one. */
  initial?: GroupExpense;
}) {
  const router = useRouter();
  const [description, setDescription] = useState(initial?.description ?? "");
  const [total, setTotal] = useState(initial ? fromCents(initial.totalCents) : "");
  const [payerIds, setPayerIds] = useState<string[]>(initial ? initial.paidBy.map((p) => p.userId) : [meId]);
  const [payerOverrides, setPayerOverrides] = useState<Record<string, string>>(
    initial && initial.paidBy.length > 1
      ? Object.fromEntries(initial.paidBy.map((p) => [p.userId, fromCents(p.cents)]))
      : {},
  );
  const [mode, setMode] = useState<SplitMode>(initial?.splitMode ?? "equal");
  const [amongIds, setAmongIds] = useState<string[]>(
    initial ? initial.splitAmong.map((p) => p.userId) : members.map((m) => m.id),
  );
  const [values, setValues] = useState<Record<string, string>>(initial ? initialValues(initial) : {});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const totalCents = toCents(total);
  const name = (id: string) => (id === meId ? "You" : (members.find((m) => m.id === id)?.name ?? "?"));
  const ordered = (ids: string[]) => members.map((m) => m.id).filter((id) => ids.includes(id));
  const toggle = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  // Who paid: even by default, editable per person when more than one person paid.
  const payers = useMemo(() => {
    const ids = ordered(payerIds);
    const even = allocate(totalCents, ids.map(() => 1));
    return ids.map((id, i) => ({
      userId: id,
      cents: payerOverrides[id] !== undefined ? toCents(payerOverrides[id]) : even[i],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payerIds, payerOverrides, totalCents]);
  const paidSum = payers.reduce((s, p) => s + p.cents, 0);
  const payerMismatch = payers.length > 1 && totalCents > 0 && paidSum !== totalCents;

  // Who it's for: the same math the server runs, so the preview matches what gets saved.
  const among = ordered(amongIds);
  const rawValues = among.map((id) =>
    mode === "exact" ? toCents(values[id] ?? "") : mode === "shares" ? Number(values[id] ?? "1") : 0,
  );
  const preview = useMemo(() => {
    if (totalCents <= 0 || among.length === 0) return { shares: new Map<string, number>(), error: "" };
    try {
      const portions = resolveSplit(totalCents, mode, among, rawValues);
      return { shares: new Map(portions.map((p) => [p.userId, p.cents])), error: "" };
    } catch (err) {
      return { shares: new Map<string, number>(), error: (err as Error).message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCents, mode, among.join(), rawValues.join()]);

  const ready =
    description.trim() && totalCents > 0 && payers.length > 0 && !payerMismatch && among.length > 0 && !preview.error;

  async function save() {
    setPending(true);
    setError("");
    try {
      await postJson(initial ? `/api/groups/${groupId}/expenses/${initial.id}` : `/api/groups/${groupId}/expenses`, {
        description,
        total: fromCents(totalCents),
        paidBy: payers.map((p) => ({ userId: p.userId, amount: fromCents(p.cents) })),
        mode,
        splitAmong: among.map((id, i) => ({
          userId: id,
          value: mode === "exact" ? fromCents(rawValues[i]) : String(rawValues[i] || 1),
        })),
      });
      router.push(`/splits/groups/${groupId}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-5 pb-6">
      <div className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="description">What was it?</label>
          <input
            id="description"
            className="input"
            placeholder="Hotel, dinner, gas…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="total">Total</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
            <input
              id="total"
              inputMode="decimal"
              className="input !pl-8 text-lg font-semibold tabular-nums"
              placeholder="0.00"
              value={total}
              onChange={(e) => setTotal(sanitizeAmount(e.target.value))}
            />
          </div>
        </div>
      </div>

      <section>
        <span className="label">Who paid?</span>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-white">
          {members.map((m) => {
            const selected = payerIds.includes(m.id);
            const payer = payers.find((p) => p.userId === m.id);
            return (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => {
                    setPayerIds((ids) => toggle(ids, m.id));
                    setPayerOverrides({});
                  }}
                >
                  <Toggle on={selected} />
                  <Avatar name={m.name} seed={m.handle} size={30} />
                  <span className="truncate text-sm font-medium">{name(m.id)}</span>
                </button>
                {selected && payers.length > 1 && (
                  <div className="relative w-24">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                    <input
                      inputMode="decimal"
                      aria-label={`${name(m.id)} paid`}
                      value={payerOverrides[m.id] ?? fromCents(payer?.cents ?? 0)}
                      onChange={(e) => setPayerOverrides((o) => ({ ...o, [m.id]: sanitizeAmount(e.target.value) }))}
                      className={smallInput}
                    />
                  </div>
                )}
                {selected && payers.length === 1 && totalCents > 0 && (
                  <span className="text-sm font-semibold tabular-nums">{formatUsd(fromCents(totalCents))}</span>
                )}
              </li>
            );
          })}
        </ul>
        {payerMismatch && (
          <p className="mt-2 text-xs text-rose">
            Payments add up to {formatUsd(fromCents(paidSum))}, not {formatUsd(fromCents(totalCents))}.
          </p>
        )}
      </section>

      <section>
        <span className="label">Split it</span>
        <div className="mb-2 grid grid-cols-3 gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
          {MODES.map((m) => (
            <button
              key={m.mode}
              type="button"
              onClick={() => setMode(m.mode)}
              className={`rounded-xl py-2 text-xs font-semibold transition ${
                mode === m.mode ? "bg-ink text-white" : "text-muted hover:bg-cream"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mb-3 text-xs text-muted">{MODES.find((m) => m.mode === mode)?.hint} Untick anyone who wasn&apos;t in on it.</p>

        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-white">
          {members.map((m) => {
            const included = amongIds.includes(m.id);
            const share = preview.shares.get(m.id);
            return (
              <li key={m.id} className={`flex items-center gap-3 px-3 py-2.5 ${included ? "" : "opacity-50"}`}>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setAmongIds((ids) => toggle(ids, m.id))}
                >
                  <Toggle on={included} />
                  <Avatar name={m.name} seed={m.handle} size={30} />
                  <span className="truncate text-sm font-medium">{name(m.id)}</span>
                </button>
                {included && mode === "exact" && (
                  <div className="relative w-24">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                    <input
                      inputMode="decimal"
                      aria-label={`${name(m.id)} owes`}
                      placeholder="0.00"
                      value={values[m.id] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [m.id]: sanitizeAmount(e.target.value) }))}
                      className={smallInput}
                    />
                  </div>
                )}
                {included && mode === "shares" && (
                  <input
                    inputMode="numeric"
                    aria-label={`${name(m.id)} shares`}
                    value={values[m.id] ?? "1"}
                    onChange={(e) => setValues((v) => ({ ...v, [m.id]: e.target.value.replace(/\D/g, "").slice(0, 3) }))}
                    className="w-14 rounded-xl border border-line px-2 py-1.5 text-center text-sm font-semibold tabular-nums outline-none focus:border-copper"
                  />
                )}
                {included && mode !== "exact" && (
                  <span className="w-20 text-right text-sm font-semibold tabular-nums">
                    {share !== undefined ? formatUsd(fromCents(share)) : "—"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {preview.error && <p className="mt-2 text-xs text-rose">{preview.error}</p>}
      </section>

      {error && <p className="rounded-2xl bg-rose-soft px-4 py-3 text-sm text-rose">{error}</p>}

      <button className="btn-primary !py-3.5" disabled={!ready || pending} onClick={save}>
        {pending && <Loader2 size={16} className="animate-spin" />}
        {pending
          ? "Saving…"
          : initial
            ? "Save changes"
            : totalCents > 0
              ? `Add ${formatUsd(fromCents(totalCents))} expense`
              : "Add expense"}
      </button>
    </div>
  );
}
