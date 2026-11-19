import { paramRoute } from "@/lib/api";
import { declineRequest } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string }>(async (_req, { id }) => {
  declineRequest(await requireUser(), id);
});
