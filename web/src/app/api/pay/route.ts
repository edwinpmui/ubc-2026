import { body, route } from "@/lib/api";
import { pay } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await body<{ to: string; amount: string; memo: string; requestId: string }>(req);
  return pay(user, { to: input.to ?? "", amount: input.amount ?? "", memo: input.memo ?? "", requestId: input.requestId });
});
