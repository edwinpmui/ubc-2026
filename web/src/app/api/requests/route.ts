import { body, route } from "@/lib/api";
import { createRequest } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await body<{ from: string; amount: string; memo: string }>(req);
  return createRequest(user, { from: input.from ?? "", amount: input.amount ?? "", memo: input.memo ?? "" });
});
