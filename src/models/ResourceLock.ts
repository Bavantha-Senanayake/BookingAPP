import mongoose, { Document, Schema } from "mongoose";

export interface IResourceLock extends Document {
  resourceId: mongoose.Types.ObjectId;
  lockedAt: Date;
  expiresAt: Date;
}

const ResourceLockSchema: Schema = new Schema(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      ref: "Resource",
      required: true,
      unique: true,
    },
    lockedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

ResourceLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IResourceLock>(
  "ResourceLock",
  ResourceLockSchema
);
