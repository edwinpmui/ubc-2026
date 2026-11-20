"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/client";

export function ActionButton({
  url,
  payload,
  children,
  className = "btn-primary",
  toReceipt = false,
  pendingLabel = "Settling…",
  confirm,
  redirectTo,
}: {
  url: string;
  payload?: unknown;
  children: React.ReactNode;
  className?: string;
  toReceipt?: boolean;
  pendingLabel?: string;
  /** Ask before running, e.g. for deletes. */
  confirm?: string;
  /** Navigate here on success instead of refreshing the current page. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setPending(true);
    setError("");
    try {
      const result = await postJson<{ id?: string }>(url, payload);
      if (toReceipt && result.id) router.push(`/receipt/${result.id}`);
      else if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={pending} className={`${className} !py-2`}>
        {pending ? (
          <>
            <Loader2 size={14} className="animate-spin" /> {pendingLabel}
          </>
        ) : (
          children
        )}
      </button>
      {error && <p className="max-w-56 text-right text-xs text-rose">{error}</p>}
    </div>
  );
}
