import { body, route } from "@/lib/api";
import { login, publicUser } from "@/lib/services";
import { startSession } from "@/lib/session";

export const POST = route(async (req) => {
  const input = await body<{ handle: string; password: string }>(req);
  const user = login({ handle: input.handle ?? "", password: input.password ?? "" });
  await startSession(user.id);
  return publicUser(user);
});
