import { paramRoute } from "@/lib/api";
import { config } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { findLink, publicUser, userDirectory } from "@/lib/services";
import { currentUser } from "@/lib/session";

export const GET = paramRoute<{ address: string }>(async (_req, { address }) => {
  const link = findLink(address);
  if (!link) throw new AppError("We couldn't find this pay link.", 404);
  const viewer = await currentUser();
  const sender = userDirectory().get(link.senderId);

  return {
    claimAddress: link.claimAddress,
    amount: link.amount,
    memo: link.memo,
    status: link.expiresAt < Date.now() && link.status === "open" ? "expired" : link.status,
    expiresAt: link.expiresAt,
    sender: sender ? { name: sender.name, handle: sender.handle } : null,
    chainId: config.chainId,
    contract: config.pennyAddress,
    viewer: viewer ? { ...publicUser(viewer), isSender: viewer.id === link.senderId } : null,
  };
});
