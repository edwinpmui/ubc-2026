import { Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { formatUsd, timeAgo } from "@/lib/format";
import { splitsFor, userDirectory } from "@/lib/services";
import { requirePageUser } from "@/lib/session";
import { splitProgress } from "@/lib/splits";

export default async function SplitsPage() {
  const user = await requirePageUser();
  const splits = splitsFor(user);
  const users = userDirectory();

  return (
    <>
      <PageHeader
        title="Splits"
        action={
          <Link href="/splits/new" className="btn-primary !px-4 !py-2">
            <Plus size={16} /> New
          </Link>
        }
      />
      <div className="flex flex-col gap-3 px-5 pb-8">
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
