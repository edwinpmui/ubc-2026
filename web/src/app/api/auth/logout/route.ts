import { route } from "@/lib/api";
import { endSession } from "@/lib/session";

export const POST = route(async () => {
  await endSession();
});
