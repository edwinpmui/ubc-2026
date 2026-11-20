import { paramRoute } from "@/lib/api";
import { removeGroupMember } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string; memberId: string }>(async (_req, { id, memberId }) => {
  removeGroupMember(await requireUser(), id, memberId);
});
