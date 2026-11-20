import { ArrowRight, CircleCheck, LogOut, PartyPopper, Pencil, Plus, Receipt, Trash2, UserMinus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/ActionButton";
import { AddMember } from "@/components/AddMember";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/PageHeader";
import { SettleUpButton } from "@/components/SettleUpButton";
import { read } from "@/lib/db";
import { formatSettle, formatUsd, timeAgo } from "@/lib/format";
import { fromCents } from "@/lib/ledger";
import { groupFor, groupSummary, userDirectory } from "@/lib/services";
import { requirePageUser } from "@/lib/session";
import type { Group, GroupExpense, PublicUser } from "@/lib/types";

const usd = (cents: number) => formatUsd(fromCents(cents));

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

function describeExpense(expense: GroupExpense, nameOf: (id: string) => string, memberCount: number) {
  const payers = joinNames(expense.paidBy.map((p) => nameOf(p.userId)));
  const people = expense.splitAmong.length;
  const how =
    expense.splitMode === "equal"
      ? people === memberCount
        ? "split evenly with everyone"
        : `split evenly ${people} ways`
      : expense.splitMode === "shares"
        ? `split by shares across ${people}`
        : `split by exact amounts across ${people}`;
  return `${payers} paid · ${how}`;
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ settled?: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;
  const settledFlag = (await searchParams).settled === "1";
  let group: Group;
  try {
    group = groupFor(user, id);
  } catch {
    notFound();
  }

  const users = userDirectory();
  const member = (uid: string): PublicUser =>
    users.get(uid) ?? { id: uid, handle: "unknown", name: "Unknown", address: "0x0000000000000000000000000000000000000000" };
  const nameOf = (uid: string) => (uid === user.id ? "You" : member(uid).name);
  const firstName = (uid: string) => member(uid).name.split(" ")[0];

  const { balances, plan, totalCents, settled } = groupSummary(group);
  const myBalance = balances.get(user.id) ?? 0;
  const myPayments = plan.filter((t) => t.fromId === user.id);
  const owedToMe = plan.filter((t) => t.toId === user.id);
  const otherTransfers = plan.filter((t) => t.fromId !== user.id && t.toId !== user.id);
  const expenses = [...group.expenses].sort((a, b) => b.createdAt - a.createdAt);
  const settlements = [...group.settlements].sort((a, b) => b.createdAt - a.createdAt);

  // After a multi-person settle-up the button lands back here with ?settled=1; show what just went out.
  const justSettled = settledFlag
    ? settlements.filter((s) => s.fromId === user.id && Date.now() - s.createdAt < 2 * 60 * 1000)
    : [];
  const settleMs = new Map(
    read((db) => db.activity.filter((a) => justSettled.some((s) => s.activityId === a.id))).map((a) => [a.id, a.settleMs]),
  );

  return (
    <>
      <PageHeader title={group.name} back="/splits" />
      <div className="flex flex-col gap-5 px-5 pb-8">
        <section className="rounded-3xl bg-ink p-6 text-white">
          <p className="text-xs uppercase tracking-wider text-white/60">
            {myBalance > 0 ? "You're owed" : myBalance < 0 ? "You owe" : "Your balance"}
          </p>
          <p
            className={`mt-1 text-4xl font-semibold tabular-nums ${
              myBalance > 0 ? "text-[#8fe0b5]" : myBalance < 0 ? "text-[#f0b48a]" : ""
            }`}
          >
            {myBalance === 0 ? "All square" : usd(Math.abs(myBalance))}
          </p>
          <p className="mt-3 text-sm text-white/70">
            {usd(totalCents)} spent · {group.expenses.length} expense{group.expenses.length === 1 ? "" : "s"} ·{" "}
            {group.memberIds.length} people
          </p>
          <div className="mt-4 flex -space-x-2">
            {group.memberIds.map((uid) => (
              <div key={uid} className="rounded-full ring-2 ring-ink">
                <Avatar name={member(uid).name} seed={member(uid).handle} size={28} />
              </div>
            ))}
          </div>
          {myPayments.length > 0 && (
            <SettleUpButton
              groupId={group.id}
              total={fromCents(myPayments.reduce((sum, t) => sum + t.cents, 0))}
              payees={myPayments.map((t) => ({ name: member(t.toId).name, amount: fromCents(t.cents) }))}
            />
          )}
          {owedToMe.length > 0 && (
            <p className="mt-4 text-sm text-white/70">
              Waiting on {joinNames(owedToMe.map((t) => `${firstName(t.fromId)} (${usd(t.cents)})`))}
            </p>
          )}
        </section>

        {justSettled.length > 0 && (
          <div className="flex items-center gap-3 rounded-3xl bg-mint-soft p-4 text-sm text-mint animate-rise">
            <CircleCheck size={20} className="shrink-0" />
            <span>
              Settled up. You paid {joinNames(justSettled.map((s) => `${firstName(s.toId)} ${usd(s.cents)}`))}, final
              onchain in {formatSettle(justSettled.reduce((sum, s) => sum + (settleMs.get(s.activityId) ?? 0), 0))}.
            </span>
          </div>
        )}

        <Link href={`/splits/groups/${group.id}/expense`} className="btn-primary !py-3.5">
          <Plus size={16} /> Add expense
        </Link>

        {settled && (
          <div className="flex items-center gap-3 rounded-3xl bg-mint-soft p-4 text-sm text-mint animate-rise">
            <PartyPopper size={20} /> Everyone&apos;s square. Add another expense whenever.
          </div>
        )}

        {plan.length > 0 && (
          <section>
            <h2 className="section-title">Settle up</h2>
            <p className="-mt-1 mb-3 text-xs text-muted">
              The fewest payments that square everyone up: {plan.length} instead of up to{" "}
              {(group.memberIds.length * (group.memberIds.length - 1)) / 2}.
            </p>
            <ul className="card divide-y divide-line">
              {myPayments.map((t) => (
                <li key={`${t.fromId}-${t.toId}`} className="flex items-center gap-3 p-4">
                  <Avatar name={member(t.toId).name} seed={member(t.toId).handle} size={36} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">You owe {member(t.toId).name}</p>
                    <p className="text-lg font-semibold tabular-nums">{usd(t.cents)}</p>
                  </div>
                  <ActionButton url={`/api/groups/${group.id}/settle`} payload={{ toId: t.toId }} toReceipt className="btn-primary !px-5">
                    Pay {firstName(t.toId)}
                  </ActionButton>
                </li>
              ))}
              {owedToMe.map((t) => (
                <li key={`${t.fromId}-${t.toId}`} className="flex items-center gap-3 p-4">
                  <Avatar name={member(t.fromId).name} seed={member(t.fromId).handle} size={36} />
                  <p className="flex-1 text-sm font-medium">{member(t.fromId).name} owes you</p>
                  <span className="text-sm font-semibold tabular-nums text-mint">{usd(t.cents)}</span>
                </li>
              ))}
              {otherTransfers.map((t) => (
                <li key={`${t.fromId}-${t.toId}`} className="flex items-center gap-2 p-4 text-sm text-muted">
                  <span className="font-medium text-ink">{firstName(t.fromId)}</span>
                  <ArrowRight size={14} />
                  <span className="flex-1 font-medium text-ink">{firstName(t.toId)}</span>
                  <span className="font-semibold tabular-nums text-ink">{usd(t.cents)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="section-title">Balances</h2>
          <ul className="card divide-y divide-line">
            {group.memberIds.map((uid) => {
              const cents = balances.get(uid) ?? 0;
              return (
                <li key={uid} className="flex items-center gap-3 p-4">
                  <Avatar name={member(uid).name} seed={member(uid).handle} size={32} />
                  <p className="flex-1 text-sm font-medium">{nameOf(uid)}</p>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      cents > 0 ? "text-mint" : cents < 0 ? "text-rose" : "text-muted"
                    }`}
                  >
                    {cents > 0
                      ? `${uid === user.id ? "get" : "gets"} back ${usd(cents)}`
                      : cents < 0
                        ? `${uid === user.id ? "owe" : "owes"} ${usd(-cents)}`
                        : "square"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="section-title">Expenses</h2>
          {expenses.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-6 text-center">
              <Receipt size={22} className="text-copper" />
              <p className="text-sm text-muted">
                No expenses yet. Log who paid for what and Penny works out who owes whom.
              </p>
            </div>
          ) : (
            <ul className="card divide-y divide-line">
              {expenses.map((e) => {
                const myShare = e.splitAmong.find((p) => p.userId === user.id)?.cents ?? 0;
                const canDelete = e.addedById === user.id || group.creatorId === user.id;
                return (
                  <li key={e.id} className="flex items-start gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{e.description}</p>
                      <p className="text-xs text-muted">{describeExpense(e, nameOf, group.memberIds.length)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {myShare ? `Your share ${usd(myShare)}` : "You're not in this one"} · {timeAgo(e.createdAt)}
                        {e.editedAt ? " · edited" : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums">{usd(e.totalCents)}</span>
                      {canDelete && (
                        <div className="flex items-start">
                          <Link
                            href={`/splits/groups/${group.id}/expense/${e.id}`}
                            className="rounded-full p-1.5 text-muted hover:bg-cream hover:text-ink"
                            aria-label={`Edit ${e.description}`}
                          >
                            <Pencil size={14} />
                          </Link>
                          <ActionButton
                            url={`/api/groups/${group.id}/expenses/${e.id}/delete`}
                            className="rounded-full p-1.5 text-muted hover:bg-cream hover:text-rose"
                            pendingLabel=""
                            confirm={`Delete “${e.description}” (${usd(e.totalCents)})? Everyone's balances will be recalculated.`}
                          >
                            <Trash2 size={14} aria-label={`Delete ${e.description}`} />
                          </ActionButton>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {settlements.length > 0 && (
          <section>
            <h2 className="section-title">Settled onchain</h2>
            <ul className="card divide-y divide-line">
              {settlements.map((s) => {
                const involved = s.fromId === user.id || s.toId === user.id;
                const row = (
                  <>
                    <p className="flex-1 text-sm">
                      <span className="font-medium">{nameOf(s.fromId)}</span> paid{" "}
                      <span className="font-medium">{s.toId === user.id ? "you" : member(s.toId).name}</span>
                      <span className="block text-xs text-muted">{timeAgo(s.createdAt)}</span>
                    </p>
                    <span className="text-sm font-semibold tabular-nums">{usd(s.cents)}</span>
                  </>
                );
                return (
                  <li key={s.id}>
                    {involved ? (
                      <Link href={`/receipt/${s.activityId}`} className="flex items-center gap-3 p-4 hover:bg-cream">
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 p-4">{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h2 className="section-title">Members</h2>
          <ul className="card mb-3 divide-y divide-line">
            {group.memberIds.map((uid) => {
              const isOwner = uid === group.creatorId;
              const isMe = uid === user.id;
              const canRemove = !isOwner && (isMe || user.id === group.creatorId);
              return (
                <li key={uid} className="flex items-center gap-3 p-3">
                  <Avatar name={member(uid).name} seed={member(uid).handle} size={30} />
                  <p className="flex-1 text-sm font-medium">
                    {nameOf(uid)} <span className="text-xs text-muted">@{member(uid).handle}</span>
                  </p>
                  {isOwner && <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Owner</span>}
                  {canRemove && (
                    <ActionButton
                      url={`/api/groups/${group.id}/members/${uid}/remove`}
                      className="btn-ghost !px-3 !py-1 text-xs"
                      pendingLabel={isMe ? "Leaving…" : "Removing…"}
                      redirectTo={isMe ? "/splits" : undefined}
                      confirm={
                        isMe
                          ? `Leave ${group.name}? You'll stay on past expenses, but you won't see the group anymore.`
                          : `Remove ${member(uid).name} from ${group.name}? They stay on past expenses.`
                      }
                    >
                      {isMe ? (
                        <>
                          <LogOut size={12} /> Leave
                        </>
                      ) : (
                        <>
                          <UserMinus size={12} /> Remove
                        </>
                      )}
                    </ActionButton>
                  )}
                </li>
              );
            })}
          </ul>
          <AddMember groupId={group.id} memberIds={group.memberIds} />
          <p className="mt-2 text-xs text-muted">People can only leave or be removed once they&apos;re square.</p>
        </section>
      </div>
    </>
  );
}
