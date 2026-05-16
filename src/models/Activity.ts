import { Schema, model, models } from "mongoose";
const ActivitySchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User" },
  groupId: { type: Schema.Types.ObjectId, ref: "Group" },
  type: String,
  payload: Schema.Types.Mixed,
}, { timestamps: true });
export const Activity = models.Activity || model("Activity", ActivitySchema);
