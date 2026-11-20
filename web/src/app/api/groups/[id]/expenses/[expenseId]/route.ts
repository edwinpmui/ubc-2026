import { body, paramRoute } from "@/lib/api";
import { updateGroupExpense, type ExpenseInput } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string; expenseId: string }>(async (req, { id, expenseId }) => {
  const user = await requireUser();
  const input = await body<ExpenseInput>(req);
  return updateGroupExpense(user, id, expenseId, {
    description: input.description ?? "",
    total: input.total ?? "",
    paidBy: input.paidBy ?? [],
    mode: input.mode ?? "equal",
    splitAmong: input.splitAmong ?? [],
  });
});
