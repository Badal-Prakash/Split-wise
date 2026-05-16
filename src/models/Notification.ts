import { Schema, model, models } from "mongoose";
const NotificationSchema = new Schema({ userId: Schema.Types.ObjectId, type: String, title: String, body: String, readAt: Date }, { timestamps: true });
export const Notification = models.Notification || model("Notification", NotificationSchema);
