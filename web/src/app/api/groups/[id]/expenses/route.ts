import { body, paramRoute } from "@/lib/api";
import { addGroupExpense, type ExpenseInput } from "@/lib/services";
import { requireUser } from "@/lib/session";

export const POST = paramRoute<{ id: string }>(async (req, { id }) => {
  const user = await requireUser();
  const input = await body<ExpenseInput>(req);
  return addGroupExpense(user, id, {
    description: input.description ?? "",
    total: input.total ?? "",
    paidBy: input.paidBy ?? [],
    mode: input.mode ?? "equal",
    splitAmong: input.splitAmong ?? [],
  });
});
