import { Check, ExternalLink, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, PennyMark } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { describeActivity } from "@/lib/activity";
import { networkName, txUrl } from "@/lib/config";
import { read } from "@/lib/db";
import { formatFee, formatSettle, formatUsd, venmoInstantFee } from "@/lib/format";
import { userDirectory } from "@/lib/services";
import { requirePageUser } from "@/lib/session";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const activity = read((db) => db.activity.find((a) => a.id === id));
  if (!activity || (activity.fromId !== user.id && activity.toId !== user.id)) notFound();

  const view = describeActivity(activity, user.id, userDirectory());
  const amount = Number(activity.amount);
  const explorer = txUrl(activity.txHash);
  const feeLabel = activity.sponsored ? "Covered by Penny" : activity.fromId === user.id ? "Paid in USDC" : "Paid by sender";

  return (
    <>
      <PageHeader title="Receipt" back="/home" />
      <div className="flex flex-col gap-5 px-5 pb-8">
        <section className="flex flex-col items-center pt-4 text-center">
          <div className="relative mb-4">
            {view.counterparty ? (
              <Avatar name={view.counterparty.name} seed={view.counterparty.handle} size={72} />
            ) : (
              <PennyMark size={72} />
            )}
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-mint text-white animate-pop">
              <Check size={16} strokeWidth={3} />
            </span>
          </div>
          <p className="text-sm text-muted">{view.title}</p>
          <p className="mt-1 text-6xl font-semibold tracking-tight tabular-nums animate-rise">{formatUsd(amount)}</p>
          {activity.memo && <p className="mt-3 text-lg">{activity.memo}</p>}
          <p className="mt-2 text-xs text-muted">
            {new Date(activity.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-mint-soft p-4">
            <p className="flex items-center gap-1 text-xs font-medium text-mint">
              <Timer size={13} /> Settled in
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-mint">{formatSettle(activity.settleMs)}</p>
            <p className="mt-1 text-xs text-ink/60">Final. No pending, no holds.</p>
          </div>
          <div className="rounded-3xl bg-cream p-4">
            <p className="text-xs font-medium text-muted">Network fee</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{formatFee(activity.feeUsd)}</p>
            <p className="mt-1 text-xs text-muted">{feeLabel}</p>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="section-title !mb-4">The same payment on Venmo</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Standard transfer to bank</dt>
              <dd className="font-medium">1–3 business days</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Instant transfer fee (1.75%)</dt>
              <dd className="font-medium tabular-nums">{formatUsd(venmoInstantFee(amount))}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3">
              <dt className="font-semibold">On Penny</dt>
              <dd className="font-semibold text-mint">
                {formatSettle(activity.settleMs)} · {formatFee(activity.feeUsd)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex items-start gap-3 rounded-3xl border border-line p-4 text-xs text-muted">
          <ShieldCheck size={18} className="shrink-0 text-mint" />
          <div className="min-w-0 flex-1">
            <p>
              Settled on {networkName} in USDC. Anyone can verify this payment, and no one can reverse it.
            </p>
            <p className="mt-1 truncate font-mono">{activity.txHash}</p>
            {explorer && (
              <a href={explorer} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-copper">
                View on explorer <ExternalLink size={12} />
              </a>
            )}
          </div>
        </section>

        <Link href="/home" className="btn-dark !py-3.5">Done</Link>
      </div>
    </>
  );
}
