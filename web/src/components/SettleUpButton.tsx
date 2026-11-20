"use client";

import { HandCoins, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";
import { formatUsd } from "@/lib/format";

export function SettleUpButton({
  groupId,
  total,
  payees,
}: {
  groupId: string;
  /** Total the viewer owes, as a dollar string. */
  total: string;
  /** Who gets paid, e.g. [{ name: "Bob", amount: "42.00" }]. */
  payees: { name: string; amount: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function settle() {
    if (payees.length > 1) {
      const lines = payees.map((p) => `• ${p.name}: ${formatUsd(p.amount)}`).join("\n");
      if (!window.confirm(`Settle up ${formatUsd(total)}?\n\n${lines}\n\nEach is a separate instant payment.`)) return;
    }
    setPending(true);
    setError("");
    try {
      const result = await postJson<{ id?: string }>(`/api/groups/${groupId}/settle-all`);
      if (result.id) {
        router.push(`/receipt/${result.id}`);
      } else {
        router.replace(`/splits/groups/${groupId}?settled=1`);
        router.refresh();
      }
    } catch (err) {
      setError((err as Error).message);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const label =
    payees.length === 1 ? `Pay ${payees[0].name.split(" ")[0]} ${formatUsd(total)}` : `Settle up ${formatUsd(total)}`;

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={settle}
        disabled={pending}
        className="btn w-full bg-white !py-3.5 text-ink hover:bg-cream"
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {payees.length > 1 ? `Paying ${payees.length} people…` : "Settling…"}
          </>
        ) : (
          <>
            <HandCoins size={16} /> {label}
          </>
        )}
      </button>
      {payees.length > 1 && !pending && (
        <p className="mt-2 text-center text-xs text-white/60">
          Pays {payees.map((p) => p.name.split(" ")[0]).join(" and ")} in one tap
        </p>
      )}
      {error && <p className="mt-2 rounded-2xl bg-rose-soft px-3 py-2 text-xs text-rose">{error}</p>}
    </div>
  );
}
