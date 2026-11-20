import { paramRoute } from "@/lib/api";
import { settleAllGroupDebts } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string }>(async (_req, { id }) => {
  return settleAllGroupDebts(await requireUser(), id);
});
