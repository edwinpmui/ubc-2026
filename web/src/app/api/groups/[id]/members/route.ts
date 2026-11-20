import { body, paramRoute } from "@/lib/api";
import { addGroupMember } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const input = await body<{ handle: string }>(req);
  return addGroupMember(user, id, input.handle ?? "");
});
