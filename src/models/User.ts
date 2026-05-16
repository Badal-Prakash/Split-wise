import { Schema, model, models } from "mongoose";
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true, lowercase: true },
  password: { type: String, required: true },
  avatar: String,
  currency: { type: String, default: "USD" },
  timezone: { type: String, default: "UTC" },
  theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
  notificationSettings: {
    expenseAlerts: { type: Boolean, default: true },
    settlementReminders: { type: Boolean, default: true },
    groupInvites: { type: Boolean, default: true },
    commentMentions: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  resetToken: String,
  resetTokenExpiresAt: Date,
  deletedAt: Date
}, { timestamps: true });
export const User = models.User || model("User", UserSchema);
