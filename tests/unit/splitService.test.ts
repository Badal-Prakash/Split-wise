import { expenseToEdges, normalizeSplits } from "@/services/splitService";

test("splits equal amounts with cent remainder adjustment", () => {
  expect(normalizeSplits(100, "equal", [{ userId: "A" }, { userId: "B" }, { userId: "C" }])).toEqual([
    { userId: "A", amount: 33.34 },
    { userId: "B", amount: 33.33 },
    { userId: "C", amount: 33.33 },
  ]);
});

test("validates percentage split totals", () => {
  expect(() => normalizeSplits(100, "percentage", [{ userId: "A", percentage: 60 }, { userId: "B", percentage: 30 }])).toThrow();
});

test("creates balance edges for multiple payers", () => {
  const splits = normalizeSplits(100, "equal", [{ userId: "A" }, { userId: "B" }, { userId: "C" }]);
  expect(expenseToEdges({ amount: 100, paidBy: "A", payers: [{ userId: "A", amount: 60 }, { userId: "B", amount: 40 }], splitBetween: splits })).toEqual([
    { fromUser: "C", toUser: "A", amount: 26.66 },
    { fromUser: "C", toUser: "B", amount: 6.67 },
  ]);
});
