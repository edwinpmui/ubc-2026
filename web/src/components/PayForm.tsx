"use client";

import { Loader2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";
import { formatUsd, venmoInstantFee } from "@/lib/format";
import type { PublicUser } from "@/lib/types";
import { AmountInput } from "./AmountInput";
import { UserPicker } from "./UserPicker";

const quickNotes = ["🍕 Pizza", "☕ Coffee", "🚕 Ride", "🏠 Rent", "🎟️ Tickets", "🍻 Drinks", "🛒 Groceries"];

export function PayForm({
  initialRecipient,
  initialAmount = "",
  initialMemo = "",
  balance,
}: {
  initialRecipient: PublicUser | null;
  initialAmount?: string;
  initialMemo?: string;
  balance: number | null;
}) {
  const router = useRouter();
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(initialAmount);
  const [memo, setMemo] = useState(initialMemo);
  const [pending, setPending] = useState<"pay" | "request" | null>(null);
  const [error, setError] = useState("");
  const [requested, setRequested] = useState(false);

  const value = Number(amount || 0);
  const ready = recipient && value > 0 && !pending;

  async function submit(kind: "pay" | "request") {
    if (!recipient) return;
    setPending(kind);
    setError("");
    try {
      if (kind === "pay") {
        const activity = await postJson<{ id: string }>("/api/pay", { to: recipient.handle, amount, memo });
        router.push(`/receipt/${activity.id}`);
        return;
      }
      await postJson("/api/requests", { from: recipient.handle, amount, memo });
      setRequested(true);
      setPending(null);
    } catch (err) {
      setError((err as Error).message);
      setPending(null);
    }
  }

  if (requested && recipient) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center animate-rise">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-copper-soft text-3xl animate-pop">📨</div>
        <h2 className="text-xl font-semibold">Request sent</h2>
        <p className="text-muted">
          {recipient.name} will see your request for {formatUsd(amount)} next time they open Penny.
        </p>
        <button className="btn-dark mt-2" onClick={() => router.push("/home")}>Done</button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pb-6">
      <div>
        <span className="label">To</span>
        <UserPicker selected={recipient} onSelect={setRecipient} />
      </div>

      <div>
        <AmountInput value={amount} onChange={setAmount} />
        {balance !== null && (
          <p className="-mt-3 text-center text-xs text-muted">Balance {formatUsd(balance)}</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="memo">What&apos;s it for?</label>
        <input
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="input"
          placeholder="Add a note"
          maxLength={140}
        />
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {quickNotes.map((note) => (
            <button
              key={note}
              type="button"
              onClick={() => setMemo(note)}
              className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:border-copper hover:text-copper"
            >
              {note}
            </button>
          ))}
        </div>
      </div>

      {value > 0 && (
        <div className="flex items-start gap-3 rounded-2xl bg-mint-soft px-4 py-3 text-sm animate-rise">
          <Zap size={18} className="mt-0.5 shrink-0 text-mint" />
          <p className="text-ink/80">
            Lands in about a second for a network fee of around <strong>1¢</strong>. Getting{" "}
            {formatUsd(value)} out instantly with Venmo costs{" "}
            <strong>{formatUsd(venmoInstantFee(value))}</strong>.
          </p>
        </div>
      )}

      {error && <p className="rounded-2xl bg-rose-soft px-4 py-3 text-sm text-rose">{error}</p>}

      <div className="mt-auto grid grid-cols-2 gap-3">
        <button className="btn-ghost !py-3.5" disabled={!ready} onClick={() => submit("request")}>
          {pending === "request" && <Loader2 size={16} className="animate-spin" />}
          Request
        </button>
        <button className="btn-primary !py-3.5" disabled={!ready} onClick={() => submit("pay")}>
          {pending === "pay" && <Loader2 size={16} className="animate-spin" />}
          {pending === "pay" ? "Settling…" : "Pay"}
        </button>
      </div>
    </div>
  );
}
