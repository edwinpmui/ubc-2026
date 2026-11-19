import type { Split } from "./types";

export function splitProgress(split: Split) {
  const owed = split.shares.reduce((sum, s) => sum + Number(s.amount), 0);
  const collected = split.shares.filter((s) => s.activityId).reduce((sum, s) => sum + Number(s.amount), 0);
  const paid = split.shares.filter((s) => s.activityId).length;
  return {
    owed,
    collected,
    paid,
    total: owed + Number(split.creatorShare),
    percent: owed ? Math.round((collected / owed) * 100) : 0,
    done: paid === split.shares.length,
  };
}
