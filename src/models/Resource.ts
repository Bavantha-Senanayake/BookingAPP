import mongoose, { Document, Schema } from "mongoose";

export interface IResource extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Resource name is required"],
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IResource>("Resource", ResourceSchema);
