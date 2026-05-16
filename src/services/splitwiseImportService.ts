import * as XLSX from "xlsx";
import { Readable } from "stream";
import csv from "csv-parser";
export type ImportRow = Record<string,string>;
export async function parseSplitwiseFile(buffer: Buffer, filename: string): Promise<ImportRow[]> {
  if (filename.endsWith(".xlsx")) {
    const book = XLSX.read(buffer);
    const sheet = book.Sheets[book.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: "" }) as ImportRow[];
  }
  return new Promise((resolve,reject)=>{
    const rows: ImportRow[] = [];
    Readable.from(buffer).pipe(csv()).on("data",r=>rows.push(r)).on("end",()=>resolve(rows)).on("error",reject);
  });
}
export function previewImport(rows: ImportRow[]) {
  const normalized = rows.map((r,i)=>({
    row: i+1,
    date: r.Date || r.date || r["Expense date"],
    description: r.Description || r.description || r.Details || r.details,
    category: r.Category || r.category || "General",
    cost: Number(r.Cost || r.cost || r.Amount || 0),
    currency: r.Currency || r.currency || "USD",
    group: r.Group || r.group || "Imported",
    paidBy: r["Paid by"] || r.paidBy || r.Payer || "",
    owedBy: r["Owed by"] || r.owedBy || r.Participant || "",
    notes: r.Notes || r.notes || "",
    type: /settle|payment/i.test(r.Type || r.type || r.Description || "") ? "settlement" : "expense"
  }));
  const duplicates = normalized.filter((r,i,a)=>a.findIndex(x=>x.date===r.date&&x.description===r.description&&x.cost===r.cost&&x.group===r.group) !== i);
  const errors = normalized.filter((r)=>!r.date || !r.description || Number.isNaN(r.cost));
  return {
    rows: normalized,
    duplicates,
    errors,
    mapping: {
      date: "Date / Expense date",
      description: "Description / Details",
      amount: "Cost / Amount",
      participants: "Paid by / Owed by",
    },
    rollbackToken: Buffer.from(`${Date.now()}:${normalized.length}`).toString("base64url"),
    summary: {
      expenses: normalized.filter((row)=>row.type==="expense").length,
      settlements: normalized.filter((row)=>row.type==="settlement").length,
      groups: new Set(normalized.map(r=>r.group)).size,
      currencies: [...new Set(normalized.map(r=>r.currency))],
    }
  };
}
