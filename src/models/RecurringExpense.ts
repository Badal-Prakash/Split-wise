import { Schema, model, models } from "mongoose";

const RecurringExpenseSchema = new Schema({
  template: { type: Schema.Types.Mixed, required: true },
  cadence: { type: String, enum: ["daily", "weekly", "monthly", "yearly", "custom"], required: true },
  interval: { type: Number, default: 1 },
  nextRunAt: { type: Date, required: true },
  endAt: Date,
  pausedAt: Date,
  canceledAt: Date,
  editFutureOnly: { type: Boolean, default: true },
  reminderDaysBefore: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  lastGeneratedExpenseId: { type: Schema.Types.ObjectId, ref: "Expense" },
}, { timestamps: true });

RecurringExpenseSchema.index({ nextRunAt: 1, pausedAt: 1, canceledAt: 1 });
RecurringExpenseSchema.index({ createdBy: 1, updatedAt: -1 });

export const RecurringExpense = models.RecurringExpense || model("RecurringExpense", RecurringExpenseSchema);
