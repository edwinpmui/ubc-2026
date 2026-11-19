import { body, route } from "@/lib/api";
import { publicUser, signup } from "@/lib/services";
import { startSession } from "@/lib/session";

export const POST = route(async (req) => {
  const input = await body<{ handle: string; name: string; password: string }>(req);
  const user = await signup({ handle: input.handle ?? "", name: input.name ?? "", password: input.password ?? "" });
  await startSession(user.id);
  return publicUser(user);
});
