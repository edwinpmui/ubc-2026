import { body, route } from "@/lib/api";
import { createGroup } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await body<{ name: string; handles: string[] }>(req);
  return createGroup(user, { name: input.name ?? "", handles: input.handles ?? [] });
});
