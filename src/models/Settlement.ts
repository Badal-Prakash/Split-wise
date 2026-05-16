import { Schema, model, models } from "mongoose";
const SettlementSchema = new Schema({
  fromUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
  toUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  paymentMethod: { type: String, enum: ["cash","upi","bank","card","other"], default: "cash" },
  notes: String,
  history: [{ actorId: Schema.Types.ObjectId, status: String, amount: Number, notes: String, createdAt: { type: Date, default: Date.now } }],
  status: { type: String, enum: ["pending","partial","settled"], default: "pending" },
  groupId: { type: Schema.Types.ObjectId, ref: "Group" },
  date: { type: Date, default: Date.now }
}, { timestamps: true });
SettlementSchema.index({ fromUser: 1, toUser: 1, date: -1 });
SettlementSchema.index({ groupId: 1, date: -1 });
export const Settlement = models.Settlement || model("Settlement", SettlementSchema);
