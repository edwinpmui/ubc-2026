import { Plus, Tent, UsersRound } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { formatUsd, timeAgo } from "@/lib/format";
import { fromCents } from "@/lib/ledger";
import { groupsFor, groupSummary, splitsFor, userDirectory } from "@/lib/services";
import { requirePageUser } from "@/lib/session";
import { splitProgress } from "@/lib/splits";

export default async function SplitsPage() {
  const user = await requirePageUser();
  const splits = splitsFor(user);
  const groups = groupsFor(user);
  const users = userDirectory();

  return (
    <>
      <PageHeader
        title="Splits"
        action={
          <Link href="/splits/new" className="btn-primary !px-4 !py-2">
            <Plus size={16} /> Bill
          </Link>
        }
      />
      <div className="flex flex-col gap-3 px-5 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="section-title !mb-0">Groups</h2>
          <Link href="/splits/groups/new" className="text-xs font-semibold text-copper">
            + New group
          </Link>
        </div>
        {groups.length === 0 && (
          <Link href="/splits/groups/new" className="card flex items-center gap-3 p-4 transition hover:bg-cream">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-copper-soft text-copper">
              <Tent size={18} />
            </span>
            <span className="text-sm text-muted">
              <span className="block font-semibold text-ink">Trip or shared house?</span>
              Several people pay for different things, and Penny works out the fewest payments to square up.
            </span>
          </Link>
        )}
        {groups.map((group) => {
          const { balances, totalCents } = groupSummary(group);
          const mine = balances.get(user.id) ?? 0;
          return (
            <Link key={group.id} href={`/splits/groups/${group.id}`} className="card p-4 transition hover:bg-cream">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-xs text-muted">
                    {group.memberIds.length} people · {formatUsd(fromCents(totalCents))} spent
                  </p>
                </div>
                <p
                  className={`text-right text-sm font-semibold tabular-nums ${
                    mine > 0 ? "text-mint" : mine < 0 ? "text-rose" : "text-muted"
                  }`}
                >
                  {mine > 0
                    ? `You're owed ${formatUsd(fromCents(mine))}`
                    : mine < 0
                      ? `You owe ${formatUsd(fromCents(-mine))}`
                      : "All square"}
                </p>
              </div>
              <div className="mt-3 flex -space-x-2">
                {group.memberIds.map((uid) => {
                  const m = users.get(uid);
                  return (
                    <div key={uid} className="rounded-full ring-2 ring-white">
                      <Avatar name={m?.name ?? "?"} seed={m?.handle} size={28} />
                    </div>
                  );
                })}
              </div>
            </Link>
          );
        })}

        <h2 className="section-title !mb-0 mt-4">Bills</h2>
        {splits.length === 0 && (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-copper-soft text-copper">
              <UsersRound size={24} />
            </span>
            <p className="font-semibold">No splits yet</p>
            <p className="text-sm text-muted">Covered dinner? Split it and everyone pays their share in a tap.</p>
            <Link href="/splits/new" className="btn-primary mt-2">Split a bill</Link>
          </div>
        )}
        {splits.map((split) => {
          const progress = splitProgress(split);
          const creator = users.get(split.creatorId);
          const mine = split.creatorId === user.id;
          return (
            <Link key={split.id} href={`/splits/${split.id}`} className="card p-4 transition hover:bg-cream">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{split.memo}</p>
                  <p className="text-xs text-muted">
                    {mine ? "You split it" : `Split by ${creator?.name}`} · {timeAgo(split.createdAt)}
                  </p>
                </div>
                <p className="text-right text-sm font-semibold tabular-nums">
                  {formatUsd(progress.collected)}
                  <span className="text-muted"> / {formatUsd(progress.owed)}</span>
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream">
                <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="mt-3 flex -space-x-2">
                {split.shares.map((share) => {
                  const member = users.get(share.userId);
                  return (
                    <div key={share.userId} className={`rounded-full ring-2 ring-white ${share.activityId ? "" : "opacity-40"}`}>
                      <Avatar name={member?.name ?? "?"} seed={member?.handle} size={28} />
                    </div>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
