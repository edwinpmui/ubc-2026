"use client";

import { Loader2, Share2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { postJson } from "@/lib/client";
import { formatUsd } from "@/lib/format";
import { AmountInput } from "./AmountInput";
import { CopyButton } from "./CopyButton";
import { QrCode } from "./QrCode";

export function LinkComposer() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ url: string; amount: string } | null>(null);

  async function create() {
    setPending(true);
    setError("");
    try {
      const key = generatePrivateKey();
      const claimAddress = privateKeyToAccount(key).address;
      await postJson("/api/links", { claimAddress, amount, memo });
      setCreated({ url: `${window.location.origin}/claim#${key}`, amount });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  if (created) {
    const share = () =>
      navigator.share?.({ title: "You've got money on Penny", text: `Here's ${formatUsd(created.amount)}!`, url: created.url });

    return (
      <div className="card flex flex-col items-center gap-4 p-6 text-center animate-rise">
        <p className="text-sm text-muted">Your {formatUsd(created.amount)} link is live</p>
        <QrCode value={created.url} size={180} />
        <p className="w-full break-all rounded-2xl bg-cream px-3 py-2 font-mono text-[11px] text-muted">{created.url}</p>
        <div className="flex gap-2">
          <CopyButton value={created.url} label="Copy link" />
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button className="btn-primary !px-4 !py-2" onClick={share}>
              <Share2 size={14} /> Share
            </button>
          )}
        </div>
        <p className="flex items-start gap-2 text-left text-xs text-muted">
          <ShieldCheck size={16} className="shrink-0 text-mint" />
          The claim key lives only in this link. Penny never stores it, so save it now. Unclaimed money comes back
          to you after 7 days.
        </p>
        <button
          className="text-sm font-semibold text-copper"
          onClick={() => {
            setCreated(null);
            setAmount("");
            setMemo("");
          }}
        >
          Make another link
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <p className="text-sm text-muted">
        Send money to anyone with a link, even if they&apos;re not on Penny yet. They sign up and claim it, with no
        fees on their side.
      </p>
      <AmountInput value={amount} onChange={setAmount} />
      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        className="input"
        placeholder="Note (e.g. Happy birthday! 🎂)"
        maxLength={140}
      />
      {error && <p className="mt-3 rounded-2xl bg-rose-soft px-4 py-3 text-sm text-rose">{error}</p>}
      <button className="btn-primary mt-4 w-full !py-3.5" disabled={!Number(amount) || pending} onClick={create}>
        {pending && <Loader2 size={16} className="animate-spin" />}
        {pending ? "Locking funds…" : "Create pay link"}
      </button>
    </div>
  );
}
