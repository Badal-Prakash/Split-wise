import { Schema, model, models } from "mongoose";
const ActivitySchema = new Schema({ actorId: Schema.Types.ObjectId, groupId: Schema.Types.ObjectId, type: String, payload: Schema.Types.Mixed }, { timestamps: true });
export const Activity = models.Activity || model("Activity", ActivitySchema);
