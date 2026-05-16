import { Schema, model, models } from "mongoose";

const GroupInviteSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  invitedUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  email: { type: String, lowercase: true, trim: true },
  token: { type: String, required: true, unique: true, index: true },
  mode: { type: String, enum: ["user", "link"], required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "canceled"], default: "pending", index: true },
  expiresAt: Date,
  acceptedAt: Date,
  rejectedAt: Date,
}, { timestamps: true });

GroupInviteSchema.index({ groupId: 1, invitedUserId: 1, status: 1 });
GroupInviteSchema.index({ email: 1, status: 1 });

export const GroupInvite = models.GroupInvite || model("GroupInvite", GroupInviteSchema);
