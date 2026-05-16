import { Schema, model, models } from "mongoose";
const GroupSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  invitedEmails: [String],
  expenses: [{ type: Schema.Types.ObjectId, ref: "Expense" }],
  category: String,
  categories: [String],
  defaultCurrency: { type: String, default: "USD" },
  avatar: String,
  simplifiedDebts: { type: Boolean, default: true },
  archivedAt: Date,
  deletedAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
GroupSchema.index({ members: 1, updatedAt: -1 });
GroupSchema.index({ name: "text", description: "text", categories: "text" });
export const Group = models.Group || model("Group", GroupSchema);
