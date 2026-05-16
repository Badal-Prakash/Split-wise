import { Expense } from "@/models/Expense";
import { Settlement } from "@/models/Settlement";
import { expenseToEdges } from "@/services/splitService";
import { simplifyDebts, summarizeBalances, type Edge } from "@/services/debtService";

export type BalanceScope = { groupId?: string; userId?: string };

export async function buildBalanceEdges(scope: BalanceScope = {}) {
  const expenseQuery: Record<string, unknown> = { deletedAt: { $exists: false } };
  const settlementQuery: Record<string, unknown> = {};

  if (scope.groupId) {
    expenseQuery.groupId = scope.groupId;
    settlementQuery.groupId = scope.groupId;
  }

  const [expenses, settlements] = await Promise.all([
    Expense.find(expenseQuery).lean(),
    Settlement.find({ ...settlementQuery, status: { $in: ["partial", "settled"] } }).lean(),
  ]);

  const expenseEdges = expenses.flatMap((expense: any) =>
    expenseToEdges({
      amount: expense.amount,
      paidBy: String(expense.paidBy ?? ""),
      payers: (expense.payers ?? []).map((payer: any) => ({ userId: String(payer.userId), amount: payer.amount })),
      splitBetween: (expense.splitBetween ?? []).map((split: any) => ({ ...split, userId: String(split.userId) })),
    }),
  );

  const settlementEdges: Edge[] = settlements.map((settlement: any) => ({
    fromUser: String(settlement.toUser),
    toUser: String(settlement.fromUser),
    amount: settlement.amount,
  }));

  return [...expenseEdges, ...settlementEdges];
}

export async function calculateBalances(scope: BalanceScope = {}) {
  const edges = await buildBalanceEdges(scope);
  const scopedEdges = scope.userId
    ? edges.filter((edge) => edge.fromUser === scope.userId || edge.toUser === scope.userId)
    : edges;

  return {
    summary: summarizeBalances(scopedEdges, scope.userId),
    rawBalances: scopedEdges,
    simplifiedBalances: simplifyDebts(scopedEdges),
  };
}
