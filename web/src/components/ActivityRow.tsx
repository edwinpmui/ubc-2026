import Link from "next/link";
import { describeActivity } from "@/lib/activity";
import { formatSettle, formatUsd, timeAgo } from "@/lib/format";
import type { Activity, PublicUser } from "@/lib/types";
import { Avatar, PennyMark } from "./Avatar";

export function ActivityRow({
  activity,
  viewerId,
  users,
}: {
  activity: Activity;
  viewerId: string;
  users: Map<string, PublicUser>;
}) {
  const view = describeActivity(activity, viewerId, users);
  const amountClass = { in: "text-mint", out: "text-ink", neutral: "text-muted" }[view.direction];
  const sign = { in: "+", out: "−", neutral: "" }[view.direction];

  return (
    <Link
      href={`/receipt/${activity.id}`}
      className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-cream"
    >
      {view.counterparty ? (
        <Avatar name={view.counterparty.name} seed={view.counterparty.handle} />
      ) : (
        <PennyMark />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{view.title}</p>
        <p className="truncate text-xs text-muted">
          {activity.memo || "No note"} · {timeAgo(activity.createdAt)} · settled {formatSettle(activity.settleMs)}
        </p>
      </div>
      <span className={`text-sm font-semibold tabular-nums ${amountClass}`}>
        {sign}
        {formatUsd(activity.amount)}
      </span>
    </Link>
  );
}
