import { Check, Clock, ExternalLink, PartyPopper } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { txUrl } from "@/lib/config";
import { read } from "@/lib/db";
import { formatUsd } from "@/lib/format";
import { userDirectory } from "@/lib/services";
import { requirePageUser } from "@/lib/session";
import { splitProgress } from "@/lib/splits";

function PaidBadge({ href }: { href: string | null }) {
  const className = "flex items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 text-[11px] font-semibold text-mint";
  const content = (
    <>
      <Check size={12} /> Paid
    </>
  );
  return href ? <Link href={href} className={className}>{content}</Link> : <span className={className}>{content}</span>;
}

export default async function SplitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const split = read((db) => db.splits.find((s) => s.id === Number(id)));
  if (!split || (split.creatorId !== user.id && !split.shares.some((s) => s.userId === user.id))) notFound();

  const users = userDirectory();
  const creator = users.get(split.creatorId);
  const progress = splitProgress(split);
  const myShare = split.shares.find((s) => s.userId === user.id);
  const explorer = txUrl(split.txHash);

  return (
    <>
      <PageHeader title={split.memo} back="/splits" />
      <div className="flex flex-col gap-5 px-5 pb-8">
        <section className="rounded-3xl bg-ink p-6 text-white">
          <p className="text-xs uppercase tracking-wider text-white/60">
            {split.creatorId === user.id ? "Collected so far" : `${creator?.name} covered the bill`}
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">
            {formatUsd(progress.collected)}
            <span className="text-xl text-white/50"> of {formatUsd(progress.owed)}</span>
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#f0b48a] transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-3 text-sm text-white/70">
            {progress.paid} of {split.shares.length} paid · bill total {formatUsd(progress.total)}
          </p>
        </section>

        {progress.done && (
          <div className="flex items-center gap-3 rounded-3xl bg-mint-soft p-4 text-sm text-mint animate-rise">
            <PartyPopper size={20} /> Everyone&apos;s paid up. This split is settled.
          </div>
        )}

        {myShare && !myShare.activityId && (
          <div className="card flex items-center gap-3 p-4">
            <div className="flex-1">
              <p className="text-sm text-muted">Your share</p>
              <p className="text-2xl font-semibold tabular-nums">{formatUsd(myShare.amount)}</p>
            </div>
            <ActionButton url={`/api/splits/${split.id}/pay`} toReceipt className="btn-primary !px-6">
              Pay {creator?.name.split(" ")[0]}
            </ActionButton>
          </div>
        )}

        <section>
          <h2 className="section-title">Who&apos;s in</h2>
          <ul className="card divide-y divide-line">
            <li className="flex items-center gap-3 p-4">
              <Avatar name={creator?.name ?? "?"} seed={creator?.handle} size={36} />
              <p className="flex-1 text-sm font-medium">
                {split.creatorId === user.id ? "You" : creator?.name} <span className="text-muted">· paid the bill</span>
              </p>
              <span className="text-sm tabular-nums text-muted">{formatUsd(split.creatorShare)}</span>
            </li>
            {split.shares.map((share) => {
              const member = users.get(share.userId);
              return (
                <li key={share.userId} className="flex items-center gap-3 p-4">
                  <Avatar name={member?.name ?? "?"} seed={member?.handle} size={36} />
                  <p className="flex-1 text-sm font-medium">{share.userId === user.id ? "You" : member?.name}</p>
                  <span className="text-sm font-semibold tabular-nums">{formatUsd(share.amount)}</span>
                  {share.activityId ? (
                    <PaidBadge
                      href={share.userId === user.id || split.creatorId === user.id ? `/receipt/${share.activityId}` : null}
                    />
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-muted">
                      <Clock size={12} /> Pending
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {explorer && (
          <a href={explorer} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-copper">
            Split #{split.id} recorded onchain <ExternalLink size={12} />
          </a>
        )}
      </div>
    </>
  );
}
