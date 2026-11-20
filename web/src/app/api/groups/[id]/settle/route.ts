import { body, paramRoute } from "@/lib/api";
import { settleGroupDebt } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const input = await body<{ toId: string }>(req);
  return settleGroupDebt(user, id, input.toId ?? "");
});
