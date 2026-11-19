import { route } from "@/lib/api";
import { searchUsers } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const GET = route(async (req) => {
  const user = await requireUser();
  return searchUsers(new URL(req.url).searchParams.get("q") ?? "", user);
});
