import { notFound } from "next/navigation";
import { ExpenseComposer } from "@/components/ExpenseComposer";
import { PageHeader } from "@/components/PageHeader";
import { groupFor, userDirectory } from "@/lib/services";
import { requirePageUser } from "@/lib/session";
import type { Group, PublicUser } from "@/lib/types";

export default async function NewExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  let group: Group;
  try {
    group = groupFor(user, id);
  } catch {
    notFound();
  }
  const users = userDirectory();
  const members = group.memberIds.map((m) => users.get(m)).filter((m): m is PublicUser => Boolean(m));

  return (
    <>
      <PageHeader title="Add expense" back={`/splits/groups/${group.id}`} />
      <p className="-mt-1 px-5 pb-4 text-sm text-muted">{group.name}</p>
      <ExpenseComposer groupId={group.id} members={members} meId={user.id} />
    </>
  );
}
