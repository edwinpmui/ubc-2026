import { body, route } from "@/lib/api";
import { createSplit } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await body<{ memo: string; myShare: string; shares: { handle: string; amount: string }[] }>(req);
  return createSplit(user, { memo: input.memo ?? "", myShare: input.myShare ?? "0", shares: input.shares ?? [] });
});
