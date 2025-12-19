import mongoose, { Document, Schema } from "mongoose";

export interface IReservation extends Document {
  resourceId: mongoose.Types.ObjectId;
  userId: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema: Schema = new Schema(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: "Resource",
      required: [true, "Resource ID is required"],
      index: true,
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },
  },
  {
    timestamps: true,
  }
);

ReservationSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });
ReservationSchema.index({ endTime: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IReservation>("Reservation", ReservationSchema);
