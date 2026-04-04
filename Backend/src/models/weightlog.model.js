import mongoose from "mongoose";

const weightLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weightKg: {
      type: Number,
      required: [true, "Weight is required"],
      min: [10, "Weight too low"],
      max: [500, "Weight too high"],
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
    },
    note: {
      type: String,
      maxlength: 200,
    },
  },
  { timestamps: true }
);

// One weight log per user per day
weightLogSchema.index({ userId: 1, date: 1 }, { unique: true });

const WeightLog = mongoose.model("WeightLog", weightLogSchema);
export default WeightLog;
