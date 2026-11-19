import type { Activity, PublicUser } from "./types";

export interface ActivityView {
  title: string;
  counterparty: PublicUser | null;
  direction: "in" | "out" | "neutral";
}

export function describeActivity(a: Activity, viewerId: string, users: Map<string, PublicUser>): ActivityView {
  const from = a.fromId ? (users.get(a.fromId) ?? null) : null;
  const to = a.toId ? (users.get(a.toId) ?? null) : null;
  const outgoing = a.fromId === viewerId;

  switch (a.kind) {
    case "welcome":
      return { title: "Welcome bonus from Penny", counterparty: null, direction: "in" };
    case "link_sent":
      return { title: "You sent a pay link", counterparty: null, direction: "out" };
    case "link_refunded":
      return { title: "Pay link refunded", counterparty: null, direction: "in" };
    case "link_claimed":
      return outgoing
        ? { title: `${to?.name ?? "Someone"} claimed your link`, counterparty: to, direction: "neutral" }
        : { title: `${from?.name ?? "Someone"} sent you a link`, counterparty: from, direction: "in" };
    case "split_paid":
      return outgoing
        ? { title: `You paid ${to?.name ?? "someone"} your share`, counterparty: to, direction: "out" }
        : { title: `${from?.name ?? "Someone"} paid their share`, counterparty: from, direction: "in" };
    default:
      return outgoing
        ? { title: `You paid ${to?.name ?? "someone"}`, counterparty: to, direction: "out" }
        : { title: `${from?.name ?? "Someone"} paid you`, counterparty: from, direction: "in" };
  }
}
