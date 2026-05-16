export type Edge = { fromUser: string; toUser: string; amount: number };
const roundMoney = (value: number) => Number(value.toFixed(2));

export function simplifyDebts(edges: Edge[]) {
  const balances = new Map<string, number>();
  for (const e of edges) {
    balances.set(e.fromUser, (balances.get(e.fromUser) ?? 0) - e.amount);
    balances.set(e.toUser, (balances.get(e.toUser) ?? 0) + e.amount);
  }
  const debtors = [...balances.entries()].filter(([,v])=>v < -0.004).map(([id,v])=>({id,amount:roundMoney(-v)}));
  const creditors = [...balances.entries()].filter(([,v])=>v > 0.004).map(([id,v])=>({id,amount:roundMoney(v)}));
  const out: Edge[] = [];
  let i=0,j=0;
  while(i<debtors.length && j<creditors.length){
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    out.push({ fromUser: debtors[i].id, toUser: creditors[j].id, amount: roundMoney(amount) });
    debtors[i].amount = roundMoney(debtors[i].amount - amount);
    creditors[j].amount = roundMoney(creditors[j].amount - amount);
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return out;
}

export function summarizeBalances(edges: Edge[], currentUserId?: string) {
  const perUser = new Map<string, number>();
  for (const edge of edges) {
    perUser.set(edge.fromUser, roundMoney((perUser.get(edge.fromUser) ?? 0) - edge.amount));
    perUser.set(edge.toUser, roundMoney((perUser.get(edge.toUser) ?? 0) + edge.amount));
  }

  const userBalance = currentUserId ? perUser.get(currentUserId) ?? 0 : 0;
  return {
    totalOwed: roundMoney([...perUser.values()].filter((value) => value > 0).reduce((total, value) => total + value, 0)),
    totalOwing: roundMoney([...perUser.values()].filter((value) => value < 0).reduce((total, value) => total + Math.abs(value), 0)),
    netBalance: roundMoney([...perUser.values()].reduce((total, value) => total + value, 0)),
    currentUser: currentUserId
      ? {
          netBalance: roundMoney(userBalance),
          totalOwed: roundMoney(Math.max(userBalance, 0)),
          totalOwing: roundMoney(Math.max(-userBalance, 0)),
        }
      : undefined,
    perUser: [...perUser.entries()].map(([userId, netBalance]) => ({
      userId,
      netBalance: roundMoney(netBalance),
      status: netBalance > 0 ? "owed" : netBalance < 0 ? "owing" : "settled",
    })),
  };
}
