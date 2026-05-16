import * as XLSX from "xlsx";
import { Readable } from "stream";
import csv from "csv-parser";

export type ImportRow = Record<string, string>;
export type ParticipantBalance = { sourceName: string; amount: number };
export type PreviewRow = {
  row: number;
  date: string;
  description: string;
  category: string;
  cost: number;
  currency: string;
  group: string;
  notes: string;
  type: "expense" | "settlement";
  balances: ParticipantBalance[];
};

const reservedHeaders = new Set(["date", "description", "category", "cost", "currency", "group", "notes", "type", "expense date", "details", "amount", "paid by", "owed by", "payer", "participant"]);

function value(row: ImportRow, keys: string[]) {
  for (const key of keys) {
    const found = Object.keys(row).find((header) => header.trim().toLowerCase() === key.toLowerCase());
    if (found && String(row[found] ?? "").trim()) return String(row[found]).trim();
  }
  return "";
}

function numberValue(input: unknown) {
  const cleaned = String(input ?? "").replace(/,/g, "").trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isBlankRow(row: ImportRow) {
  return Object.values(row).every((item) => !String(item ?? "").trim());
}

function isSummaryRow(row: ImportRow) {
  const description = value(row, ["Description", "Details", "description", "details"]);
  return /^total balance$/i.test(description);
}

export async function parseSplitwiseFile(buffer: Buffer, filename: string): Promise<ImportRow[]> {
  if (filename.endsWith(".xlsx")) {
    const book = XLSX.read(buffer);
    const sheet = book.Sheets[book.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" }) as ImportRow[];
  }
  return new Promise((resolve, reject) => {
    const rows: ImportRow[] = [];
    Readable.from(buffer).pipe(csv()).on("data", (row) => rows.push(row)).on("end", () => resolve(rows)).on("error", reject);
  });
}

export function detectParticipantColumns(rows: ImportRow[]) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return headers.filter((header) => {
    const normalized = header.trim().toLowerCase();
    if (!normalized || reservedHeaders.has(normalized)) return false;
    return rows.some((row) => String(row[header] ?? "").trim() && Number.isFinite(numberValue(row[header])));
  });
}

export function previewImport(rows: ImportRow[]) {
  const sourceRows = rows.filter((row) => !isBlankRow(row) && !isSummaryRow(row));
  const participantColumns = detectParticipantColumns(sourceRows);
  const normalized: PreviewRow[] = sourceRows.map((row, index) => {
    const description = value(row, ["Description", "Details", "description", "details"]);
    const category = value(row, ["Category", "category"]) || "General";

    return {
      row: index + 1,
      date: value(row, ["Date", "Expense date", "date"]),
      description,
      category,
      cost: numberValue(value(row, ["Cost", "Amount", "cost", "amount"])),
      currency: value(row, ["Currency", "currency"]) || "INR",
      group: value(row, ["Group", "group"]) || "Imported",
      notes: value(row, ["Notes", "notes"]),
      type: /payment|settle|settlement|paid/i.test(`${value(row, ["Type", "type"])} ${category} ${description}`) ? "settlement" : "expense",
      balances: participantColumns.map((sourceName) => ({ sourceName, amount: numberValue(row[sourceName]) })).filter((item) => item.amount !== 0),
    };
  });
  const duplicates = normalized.filter((row, index, all) => all.findIndex((item) => item.date === row.date && item.description === row.description && item.cost === row.cost && item.group === row.group) !== index);
  const errors = normalized.filter((row) => !row.date || !row.description || Number.isNaN(row.cost) || row.cost <= 0 || !row.balances.length);

  return {
    rows: normalized,
    participants: participantColumns,
    duplicates,
    errors,
    mapping: {
      date: "Date / Expense date",
      description: "Description / Details",
      amount: "Cost / Amount",
      participants: "CSV person columns after Currency",
    },
    rollbackToken: Buffer.from(`${Date.now()}:${normalized.length}`).toString("base64url"),
    summary: {
      expenses: normalized.filter((row) => row.type === "expense").length,
      settlements: normalized.filter((row) => row.type === "settlement").length,
      groups: new Set(normalized.map((row) => row.group)).size,
      currencies: [...new Set(normalized.map((row) => row.currency))],
    },
  };
}

const toCents = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100);
const fromCents = (value: number) => Number((value / 100).toFixed(2));

function allocateCents(totalCents: number, weights: number[]) {
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  if (totalCents <= 0 || totalWeight <= 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (totalCents * weight) / totalWeight);
  const floors = exact.map(Math.floor);
  let remainder = totalCents - floors.reduce((total, value) => total + value, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - Math.floor(value) })).sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; index < remainder; index += 1) floors[order[index % order.length].index] += 1;
  return floors;
}

export function buildImportExpense(row: PreviewRow, userMapping: Record<string, string>) {
  const mapped = row.balances.map((balance) => ({ ...balance, userId: userMapping[balance.sourceName] })).filter((balance) => balance.userId);
  const positives = mapped.filter((balance) => balance.amount > 0);
  const negatives = mapped.filter((balance) => balance.amount < 0);
  if (!positives.length || !negatives.length) throw new Error(`Row ${row.row}: map at least one payer and one participant`);

  if (row.type === "settlement") {
    const payer = positives.sort((a, b) => b.amount - a.amount)[0];
    const receiver = negatives.sort((a, b) => a.amount - b.amount)[0];
    return {
      type: "settlement" as const,
      settlement: {
        fromUser: payer.userId,
        toUser: receiver.userId,
        amount: fromCents(Math.min(toCents(payer.amount), Math.abs(toCents(receiver.amount)))),
        currency: row.currency,
        paymentMethod: "other",
        status: "settled",
        notes: row.description,
        date: row.date,
      },
    };
  }

  const amountCents = toCents(row.cost);
  const positiveCents = positives.map((balance) => toCents(balance.amount));
  const negativeCents = negatives.map((balance) => Math.abs(toCents(balance.amount)));
  const creditorSplitCents = allocateCents(Math.max(0, amountCents - negativeCents.reduce((total, value) => total + value, 0)), positiveCents);
  const payers = positives.map((balance, index) => ({ userId: balance.userId, amount: fromCents(positiveCents[index] + creditorSplitCents[index]) }));
  const splitBetween = [
    ...negatives.map((balance, index) => ({ userId: balance.userId, amount: fromCents(negativeCents[index]) })),
    ...positives.map((balance, index) => ({ userId: balance.userId, amount: fromCents(creditorSplitCents[index]) })).filter((split) => split.amount > 0),
  ];

  return {
    type: "expense" as const,
    expense: {
      title: row.description,
      amount: row.cost,
      currency: row.currency,
      paidBy: payers[0].userId,
      payers,
      splitBetween,
      splitType: "exact",
      category: row.category,
      notes: row.notes,
      tags: ["imported", "splitwise"],
      date: row.date,
    },
  };
}
