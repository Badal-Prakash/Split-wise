import { connectDb } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { ok, fail } from "@/lib/http";
import { Activity } from "@/models/Activity";
import { Expense } from "@/models/Expense";
import { Group } from "@/models/Group";
import { Settlement } from "@/models/Settlement";
import { buildImportExpense, parseSplitwiseFile, previewImport } from "@/services/splitwiseImportService";

export async function POST(req: Request) {
  await connectDb();
  const uid = await currentUserId();
  if (!uid) return fail("Unauthorized", 401);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("file required");

  const groupId = String(form.get("groupId") ?? "");
  const mode = String(form.get("mode") ?? "preview");
  const buffer = Buffer.from(await file.arrayBuffer());
  const preview = previewImport(await parseSplitwiseFile(buffer, file.name));

  if (mode !== "import") return ok(preview);
  if (!groupId) return fail("Select a group before importing");

  const group: any = await Group.findOne({ _id: groupId, members: uid, deletedAt: { $exists: false } }).select("_id members defaultCurrency").lean();
  if (!group) return fail("Group not found", 404);

  let userMapping: Record<string, string> = {};
  try {
    userMapping = JSON.parse(String(form.get("userMapping") ?? "{}"));
  } catch {
    return fail("Invalid user mapping");
  }

  const memberIds = new Set((group.members ?? []).map((member: any) => String(member)));
  const missing = preview.participants.filter((sourceName) => !userMapping[sourceName]);
  if (missing.length) return fail(`Map every CSV person before importing: ${missing.join(", ")}`);
  const invalid = Object.entries(userMapping).filter(([, userId]) => !memberIds.has(String(userId)));
  if (invalid.length) return fail("Every mapped user must be a member of the selected group");

  const result = { createdExpenses: 0, createdSettlements: 0, skippedDuplicates: 0, errors: [] as string[] };

  for (const row of preview.rows) {
    if (preview.errors.some((errorRow) => errorRow.row === row.row)) {
      result.errors.push(`Row ${row.row}: missing date, description, amount, or person balance`);
      continue;
    }

    try {
      const built = buildImportExpense(row, userMapping);
      if (built.type === "settlement") {
        await Settlement.create({ ...built.settlement, groupId });
        result.createdSettlements += 1;
        continue;
      }

      const date = new Date(built.expense.date);
      const duplicate = await Expense.exists({
        groupId,
        title: built.expense.title,
        amount: built.expense.amount,
        currency: built.expense.currency,
        date: { $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()), $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) },
        deletedAt: { $exists: false },
      });
      if (duplicate) {
        result.skippedDuplicates += 1;
        continue;
      }

      const expense = await Expense.create({ ...built.expense, groupId });
      await Group.findByIdAndUpdate(groupId, { $addToSet: { expenses: expense._id } });
      result.createdExpenses += 1;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : `Row ${row.row}: unable to import`);
    }
  }

  await Activity.create({ actorId: uid, groupId, type: "import.completed", payload: { ...result, source: "splitwise", filename: file.name } });
  return ok({ ...preview, importResult: result });
}
