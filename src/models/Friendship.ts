import { Schema, model, models } from "mongoose";

const FriendshipSchema = new Schema({
  requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  addresseeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending" },
  recentInteractionAt: Date,
}, { timestamps: true });

FriendshipSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });
FriendshipSchema.index({ requesterId: 1, status: 1 });
FriendshipSchema.index({ addresseeId: 1, status: 1 });

export const Friendship = models.Friendship || model("Friendship", FriendshipSchema);
