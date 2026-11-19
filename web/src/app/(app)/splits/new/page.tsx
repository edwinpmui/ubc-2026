import { PageHeader } from "@/components/PageHeader";
import { SplitComposer } from "@/components/SplitComposer";
import { publicUser } from "@/lib/services";
import { requirePageUser } from "@/lib/session";

export default async function NewSplitPage() {
  const user = await requirePageUser();

  return (
    <>
      <PageHeader title="Split a bill" back="/splits" />
      <SplitComposer me={publicUser(user)} />
    </>
  );
}
