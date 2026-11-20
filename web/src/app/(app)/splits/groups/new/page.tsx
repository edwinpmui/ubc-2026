import { GroupComposer } from "@/components/GroupComposer";
import { PageHeader } from "@/components/PageHeader";
import { publicUser } from "@/lib/services";
import { requirePageUser } from "@/lib/session";

export default async function NewGroupPage() {
  const user = await requirePageUser();

  return (
    <>
      <PageHeader title="New group" back="/splits" />
      <GroupComposer me={publicUser(user)} />
    </>
  );
}
