import { paramRoute } from "@/lib/api";
import { cancelLink } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ address: string }>(async (_req, { address }) => {
  return cancelLink(await requireUser(), address);
});
