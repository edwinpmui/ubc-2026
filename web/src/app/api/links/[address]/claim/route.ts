import { body, paramRoute } from "@/lib/api";
import { claimLink } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ address: string }>(async (req, { address }) => {
  const user = await requireUser();
  const { signature } = await body<{ signature: string }>(req);
  return claimLink(user, address, signature ?? "");
});
