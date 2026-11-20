import { notFound } from "next/navigation";
import { ExpenseComposer } from "@/components/ExpenseComposer";
import { PageHeader } from "@/components/PageHeader";
import { groupFor, userDirectory } from "@/lib/services";
import { requirePageUser } from "@/lib/session";
import type { Group, PublicUser } from "@/lib/types";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string; expenseId: string }> }) {
  const user = await requirePageUser();
  const { id, expenseId } = await params;
  let group: Group;
  try {
    group = groupFor(user, id);
  } catch {
    notFound();
  }
  const expense = group.expenses.find((e) => e.id === expenseId);
  if (!expense || (expense.addedById !== user.id && group.creatorId !== user.id)) notFound();

  // Current members plus anyone on this expense who has since left, so their rows still show.
  const ids = [...new Set([...group.memberIds, ...[...expense.paidBy, ...expense.splitAmong].map((p) => p.userId)])];
  const users = userDirectory();
  const members = ids.map((m) => users.get(m)).filter((m): m is PublicUser => Boolean(m));

  return (
    <>
      <PageHeader title="Edit expense" back={`/splits/groups/${group.id}`} />
      <p className="-mt-1 px-5 pb-4 text-sm text-muted">{group.name}</p>
      <ExpenseComposer groupId={group.id} members={members} meId={user.id} initial={expense} />
    </>
  );
}
