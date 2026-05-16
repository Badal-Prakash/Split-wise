import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { Expense } from "@/models/Expense";
import { RecurringExpense } from "@/models/RecurringExpense";

export function nextOccurrence(from: Date, cadence: string, interval = 1) {
  if (cadence === "daily") return addDays(from, interval);
  if (cadence === "weekly") return addWeeks(from, interval);
  if (cadence === "monthly") return addMonths(from, interval);
  if (cadence === "yearly") return addYears(from, interval);
  return addDays(from, interval);
}

export async function generateDueRecurringExpenses(now = new Date()) {
  const due = await RecurringExpense.find({
    nextRunAt: { $lte: now },
    pausedAt: { $exists: false },
    canceledAt: { $exists: false },
    $or: [{ endAt: { $exists: false } }, { endAt: { $gte: now } }],
  });

  const generated = [];
  for (const recurring of due) {
    const expense = await Expense.create({
      ...recurring.template,
      date: recurring.nextRunAt,
      recurringExpenseId: recurring._id,
    });
    recurring.lastGeneratedExpenseId = expense._id;
    recurring.nextRunAt = nextOccurrence(recurring.nextRunAt, recurring.cadence, recurring.interval);
    await recurring.save();
    generated.push(expense);
  }

  return generated;
}
