import { body, route } from "@/lib/api";
import { createLink } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await body<{ claimAddress: string; amount: string; memo: string }>(req);
  return createLink(user, {
    claimAddress: input.claimAddress ?? "",
    amount: input.amount ?? "",
    memo: input.memo ?? "",
  });
});
