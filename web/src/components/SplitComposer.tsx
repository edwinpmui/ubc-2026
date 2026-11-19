"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { postJson } from "@/lib/client";
import { formatUsd } from "@/lib/format";
import type { PublicUser } from "@/lib/types";
import { sanitizeAmount } from "./AmountInput";
import { Avatar } from "./Avatar";
import { UserPicker } from "./UserPicker";

function evenSplit(totalCents: number, parts: number) {
  const base = Math.floor(totalCents / parts);
  const remainder = totalCents - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

const toCents = (value: string) => Math.round(Number(value || 0) * 100);
const fromCents = (cents: number) => (cents / 100).toFixed(2);

export function SplitComposer({ me }: { me: PublicUser }) {
  const router = useRouter();
  const [memo, setMemo] = useState("");
  const [total, setTotal] = useState("");
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [includeMe, setIncludeMe] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const shares = useMemo(() => {
    const parts = friends.length + (includeMe ? 1 : 0);
    if (!parts) return { mine: 0, friends: [] as number[] };
    const even = evenSplit(toCents(total), parts);
    const friendShares = friends.map((f, i) =>
      overrides[f.id] !== undefined ? toCents(overrides[f.id]) : even[i + (includeMe ? 1 : 0)],
    );
    const mine = includeMe ? Math.max(0, toCents(total) - friendShares.reduce((a, b) => a + b, 0)) : 0;
    return { mine, friends: friendShares };
  }, [friends, includeMe, overrides, total]);

  const owedTotal = shares.friends.reduce((a, b) => a + b, 0);
  const mismatch = !includeMe && owedTotal !== toCents(total);
  const ready = memo.trim() && toCents(total) > 0 && friends.length > 0 && shares.friends.every((c) => c > 0) && !mismatch;

  async function create() {
    setPending(true);
    setError("");
    try {
      const split = await postJson<{ id: number }>("/api/splits", {
        memo,
        myShare: fromCents(shares.mine),
        shares: friends.map((f, i) => ({ handle: f.handle, amount: fromCents(shares.friends[i]) })),
      });
      router.push(`/splits/${split.id}`);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 pb-6">
      <div>
        <label className="label" htmlFor="memo">What&apos;s the bill?</label>
        <input id="memo" className="input" placeholder="Sushi night 🍣" value={memo} onChange={(e) => setMemo(e.target.value)} />
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

      <div>
        <span className="label">Who&apos;s in?</span>
        <UserPicker
          onSelect={(user) => user && setFriends((list) => [...list, user])}
          exclude={friends.map((f) => f.id)}
          placeholder="Add friends"
        />
        <ul className="mt-3 flex flex-col divide-y divide-line rounded-2xl border border-line">
          <li className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={me.name} seed={me.handle} size={34} />
            <span className="flex-1 text-sm font-medium">You</span>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={includeMe} onChange={(e) => setIncludeMe(e.target.checked)} className="accent-copper" />
              I&apos;m paying a share
            </label>
            {includeMe && <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatUsd(fromCents(shares.mine))}</span>}
          </li>
          {friends.map((friend, i) => (
            <li key={friend.id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={friend.name} seed={friend.handle} size={34} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{friend.name}</span>
              <div className="relative w-24">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">$</span>
                <input
                  inputMode="decimal"
                  value={overrides[friend.id] ?? fromCents(shares.friends[i])}
                  onChange={(e) => setOverrides((o) => ({ ...o, [friend.id]: sanitizeAmount(e.target.value) }))}
                  className="w-full rounded-xl border border-line py-1.5 pl-6 pr-2 text-right text-sm font-semibold tabular-nums outline-none focus:border-copper"
                />
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-muted hover:bg-cream"
                aria-label={`Remove ${friend.name}`}
                onClick={() => {
                  setFriends((list) => list.filter((f) => f.id !== friend.id));
                  setOverrides(({ [friend.id]: _removed, ...rest }) => rest);
                }}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        {Object.keys(overrides).length > 0 && (
          <button type="button" className="mt-2 text-xs font-semibold text-copper" onClick={() => setOverrides({})}>
            Reset to even split
          </button>
        )}
        {mismatch && (
          <p className="mt-2 text-xs text-rose">
            Shares add up to {formatUsd(fromCents(owedTotal))}, not {formatUsd(total || 0)}.
          </p>
        )}
      </div>

      {error && <p className="rounded-2xl bg-rose-soft px-4 py-3 text-sm text-rose">{error}</p>}

      <button className="btn-primary !py-3.5" disabled={!ready || pending} onClick={create}>
        {pending && <Loader2 size={16} className="animate-spin" />}
        {pending ? "Creating split…" : `Request ${formatUsd(fromCents(owedTotal))} from ${friends.length || "friends"}`}
      </button>
    </div>
  );
}
