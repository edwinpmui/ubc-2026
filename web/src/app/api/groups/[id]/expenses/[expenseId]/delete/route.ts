import { paramRoute } from "@/lib/api";
import { deleteGroupExpense } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string; expenseId: string }>(async (_req, { id, expenseId }) => {
  deleteGroupExpense(await requireUser(), id, expenseId);
});
