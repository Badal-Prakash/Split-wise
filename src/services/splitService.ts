export type SplitType = "equal" | "exact" | "percentage" | "shares" | "unequal" | "adjustment";
export type SplitInput = { userId: string; amount?: number; percentage?: number; shares?: number; adjustment?: number; excluded?: boolean };
export type PayerInput = { userId: string; amount: number };
export type NormalizedSplit = SplitInput & { amount: number };

const toCents = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100);
const fromCents = (value: number) => Number((value / 100).toFixed(2));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

function allocateRemainder(totalCents: number, rawWeights: number[]) {
  const weightTotal = sum(rawWeights);
  if (weightTotal <= 0) throw new Error("Split weights must be greater than zero");

  const exact = rawWeights.map((weight) => (totalCents * weight) / weightTotal);
  const floors = exact.map(Math.floor);
  let remainder = totalCents - sum(floors);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < remainder; i += 1) floors[order[i % order.length].index] += 1;
  return floors;
}

function assertTotal(totalCents: number, splitCents: number[], label: string) {
  const actual = sum(splitCents);
  if (actual !== totalCents) throw new Error(`${label} must add up to the expense total`);
}

export function normalizePayers(amount: number, paidBy?: string, payers?: PayerInput[]) {
  const totalCents = toCents(amount);
  const normalized = payers?.length ? payers : paidBy ? [{ userId: paidBy, amount }] : [];
  if (!normalized.length) throw new Error("At least one payer is required");

  const payerCents = normalized.map((payer) => toCents(payer.amount));
  assertTotal(totalCents, payerCents, "Payers");
  return normalized.map((payer, index) => ({ ...payer, amount: fromCents(payerCents[index]) }));
}

export function normalizeSplits(amount: number, splitType: SplitType | string, splits: SplitInput[]): NormalizedSplit[] {
  const included = splits.filter((split) => !split.excluded);
  if (!included.length) throw new Error("At least one participant is required");

  const totalCents = toCents(amount);
  let cents: number[];

  if (splitType === "equal") {
    cents = allocateRemainder(totalCents, included.map(() => 1));
  } else if (splitType === "percentage") {
    const percentageTotal = included.reduce((total, split) => total + Number(split.percentage ?? 0), 0);
    if (Math.abs(percentageTotal - 100) > 0.0001) throw new Error("Percentages must add up to 100");
    cents = allocateRemainder(totalCents, included.map((split) => Number(split.percentage ?? 0)));
  } else if (splitType === "shares") {
    cents = allocateRemainder(totalCents, included.map((split) => Number(split.shares ?? 0)));
  } else if (splitType === "exact" || splitType === "unequal") {
    cents = included.map((split) => toCents(Number(split.amount ?? 0)));
    assertTotal(totalCents, cents, "Split amounts");
  } else if (splitType === "adjustment") {
    cents = included.map((split) => toCents(Number(split.amount ?? 0) + Number(split.adjustment ?? 0)));
    assertTotal(totalCents, cents, "Adjusted split amounts");
  } else {
    throw new Error("Unsupported split type");
  }

  return included.map((split, index) => ({ ...split, amount: fromCents(cents[index]) }));
}

export function expenseToEdges(expense: { amount: number; paidBy?: string; payers?: PayerInput[]; splitBetween: NormalizedSplit[] }) {
  const payers = normalizePayers(expense.amount, expense.paidBy, expense.payers);
  const balances = new Map<string, number>();

  for (const split of expense.splitBetween) {
    balances.set(split.userId, (balances.get(split.userId) ?? 0) - toCents(split.amount));
  }
  for (const payer of payers) {
    balances.set(payer.userId, (balances.get(payer.userId) ?? 0) + toCents(payer.amount));
  }

  const debtors = [...balances.entries()].filter(([, cents]) => cents < 0).map(([userId, cents]) => ({ userId, cents: -cents }));
  const creditors = [...balances.entries()].filter(([, cents]) => cents > 0).map(([userId, cents]) => ({ userId, cents }));
  const edges: { fromUser: string; toUser: string; amount: number }[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const moved = Math.min(debtors[debtorIndex].cents, creditors[creditorIndex].cents);
    edges.push({ fromUser: debtors[debtorIndex].userId, toUser: creditors[creditorIndex].userId, amount: fromCents(moved) });
    debtors[debtorIndex].cents -= moved;
    creditors[creditorIndex].cents -= moved;
    if (debtors[debtorIndex].cents === 0) debtorIndex += 1;
    if (creditors[creditorIndex].cents === 0) creditorIndex += 1;
  }

  return edges.filter((edge) => edge.fromUser !== edge.toUser && edge.amount > 0);
}
