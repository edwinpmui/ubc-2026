import { Link2, QrCode, Send, Timer, UsersRound, Wallet } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { ActivityRow } from "@/components/ActivityRow";
import { Avatar } from "@/components/Avatar";
import { formatSettle, formatUsd } from "@/lib/format";
import {
  activityFor,
  openRequestsFor,
  safeBalance,
  splitsFor,
  statsFor,
  userDirectory,
} from "@/lib/services";
import { requirePageUser } from "@/lib/session";

const actions = [
  { href: "/pay", label: "Pay or request", icon: Send },
  { href: "/splits/new", label: "Split a bill", icon: UsersRound },
  { href: "/links", label: "Pay link", icon: Link2 },
  { href: "/me", label: "My code", icon: QrCode },
];

export default async function HomePage() {
  const user = await requirePageUser();
  const [balance, users] = [await safeBalance(user.address), userDirectory()];
  const activity = activityFor(user);
  const stats = statsFor(user);
  const requests = openRequestsFor(user);
  const owedSplits = splitsFor(user).flatMap((split) => {
    const share = split.shares.find((s) => s.userId === user.id && !s.activityId);
    return share ? [{ split, share }] : [];
  });
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6 px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Hey {firstName} 👋</p>
          <h1 className="text-xl font-semibold">Your Penny</h1>
        </div>
        <Link href="/me">
          <Avatar name={user.name} seed={user.handle} size={42} />
        </Link>
      </header>

      <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-copper/40 blur-3xl" />
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60">
          <Wallet size={13} /> Balance
        </p>
        <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">
          {balance === null ? "—" : formatUsd(balance)}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="text-xs text-white/60">Fees you skipped</p>
            <p className="mt-0.5 font-semibold text-[#f0b48a]">{formatUsd(stats.feesAvoided)}</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="flex items-center gap-1 text-xs text-white/60">
              <Timer size={12} /> Avg settle time
            </p>
            <p className="mt-0.5 font-semibold">{stats.count ? formatSettle(stats.avgSettleMs) : "—"}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-4 gap-2">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-2 text-center text-xs font-medium">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-copper-soft text-copper transition hover:bg-copper hover:text-white">
              <Icon size={22} />
            </span>
            {label}
          </Link>
        ))}
      </section>

      {(requests.incoming.length > 0 || owedSplits.length > 0) && (
        <section>
          <h2 className="section-title">Needs your attention</h2>
          <div className="flex flex-col gap-2">
            {requests.incoming.map((request) => {
              const requester = users.get(request.requesterId);
              if (!requester) return null;
              return (
                <div key={request.id} className="card flex items-center gap-3 p-3">
                  <Avatar name={requester.name} seed={requester.handle} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {requester.name} requests <strong>{formatUsd(request.amount)}</strong>
                    </p>
                    <p className="truncate text-xs text-muted">{request.memo || "No note"}</p>
                  </div>
                  <div className="flex items-start gap-1">
                    <ActionButton
                      url={`/api/requests/${request.id}/decline`}
                      className="btn-ghost !px-3"
                      pendingLabel="…"
                    >
                      Decline
                    </ActionButton>
                    <ActionButton
                      url="/api/pay"
                      payload={{ to: requester.handle, amount: request.amount, memo: request.memo, requestId: request.id }}
                      className="btn-primary !px-4"
                      toReceipt
                    >
                      Pay
                    </ActionButton>
                  </div>
                </div>
              );
            })}
            {owedSplits.map(({ split, share }) => {
              const creator = users.get(split.creatorId);
              return (
                <Link key={split.id} href={`/splits/${split.id}`} className="card flex items-center gap-3 p-3 hover:bg-cream">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-copper-soft text-copper">
                    <UsersRound size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Your share of {split.memo}: <strong>{formatUsd(share.amount)}</strong>
                    </p>
                    <p className="text-xs text-muted">Split by {creator?.name ?? "a friend"}</p>
                  </div>
                  <span className="btn-primary !px-4 !py-2">Pay</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {requests.outgoing.length > 0 && (
        <section>
          <h2 className="section-title">Waiting on</h2>
          <div className="flex flex-col gap-1">
            {requests.outgoing.map((request) => {
              const payer = users.get(request.payerId);
              return (
                <div key={request.id} className="flex items-center gap-3 px-2 py-2">
                  <Avatar name={payer?.name ?? "?"} seed={payer?.handle} size={32} />
                  <p className="flex-1 text-sm">
                    {payer?.name} · <span className="text-muted">{request.memo || "No note"}</span>
                  </p>
                  <span className="text-sm font-semibold tabular-nums">{formatUsd(request.amount)}</span>
                  <ActionButton url={`/api/requests/${request.id}/decline`} className="btn-ghost !px-3" pendingLabel="…">
                    Cancel
                  </ActionButton>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Activity</h2>
        {activity.length === 0 ? (
          <div className="card p-6 text-center text-sm text-muted">
            Nothing here yet. Send your first payment and watch it settle in about a second.
          </div>
        ) : (
          <div className="-mx-2 flex flex-col">
            {activity.slice(0, 25).map((a) => (
              <ActivityRow key={a.id} activity={a} viewerId={user.id} users={users} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
