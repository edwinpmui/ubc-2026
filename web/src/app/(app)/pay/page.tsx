import { PageHeader } from "@/components/PageHeader";
import { PayForm } from "@/components/PayForm";
import { read } from "@/lib/db";
import { publicUser, safeBalance } from "@/lib/services";
import { requirePageUser } from "@/lib/session";

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; amount?: string; memo?: string }>;
}) {
  const user = await requirePageUser();
  const { to, amount, memo } = await searchParams;
  const handle = to?.toLowerCase().replace(/^@/, "");
  const recipient = handle ? read((db) => db.users.find((u) => u.handle === handle && u.id !== user.id)) : undefined;

  return (
    <>
      <PageHeader title="Pay or request" back="/home" />
      <PayForm
        initialRecipient={recipient ? publicUser(recipient) : null}
        initialAmount={amount && /^\d+(\.\d{1,2})?$/.test(amount) ? amount : ""}
        initialMemo={memo ?? ""}
        balance={await safeBalance(user.address)}
      />
    </>
  );
}
