import { Schema, model, models } from "mongoose";
const SplitSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  percentage: Number,
  shares: Number,
  adjustment: Number,
  excluded: { type: Boolean, default: false }
}, { _id: false });
const PayerSchema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User" }, amount: Number }, { _id: false });
const CommentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  body: String,
  parentId: Schema.Types.ObjectId,
  mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
  editedAt: Date,
  deletedAt: Date,
  reactions: [{ userId: { type: Schema.Types.ObjectId, ref: "User" }, emoji: String, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });
const ExpenseSchema = new Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  paidBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  payers: [PayerSchema],
  splitBetween: [SplitSchema],
  splitType: { type: String, enum: ["equal","exact","percentage","shares","unequal","adjustment"], default: "equal" },
  notes: String,
  receipt: String,
  receipts: [{ url: String, filename: String, mimeType: String, size: Number, ocrText: String, extracted: Schema.Types.Mixed }],
  attachments: [String],
  category: String,
  tags: [String],
  date: { type: Date, default: Date.now },
  groupId: { type: Schema.Types.ObjectId, ref: "Group" },
  recurringExpenseId: { type: Schema.Types.ObjectId, ref: "RecurringExpense" },
  recurring: { enabled: Boolean, cadence: String, interval: Number, nextRunAt: Date, pausedAt: Date, cancelAt: Date },
  comments: [CommentSchema],
  editHistory: [{ actorId: Schema.Types.ObjectId, before: Schema.Types.Mixed, after: Schema.Types.Mixed, createdAt: { type: Date, default: Date.now } }],
  deletedAt: Date,
  deletedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
ExpenseSchema.index({ groupId: 1, date: -1 });
ExpenseSchema.index({ paidBy: 1, date: -1 });
ExpenseSchema.index({ "splitBetween.userId": 1, date: -1 });
ExpenseSchema.index({ title: "text", tags: "text", category: "text", notes: "text", "comments.body": "text" });
export const Expense = models.Expense || model("Expense", ExpenseSchema);
