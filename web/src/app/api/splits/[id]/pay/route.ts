import { paramRoute } from "@/lib/api";
import { paySplit } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string }>(async (_req, { id }) => {
  return paySplit(await requireUser(), Number(id));
});
