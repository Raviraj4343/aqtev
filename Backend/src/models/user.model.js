import mongoose from "mongoose";
import bcrypt from "bcrypt";
import {
  ACTIVITY_LEVELS,
  GOALS,
  DIET_PREFERENCES,
  GENDER,
} from "../constants.js";

const userSchema = new mongoose.Schema(
  {
    // ── Auth fields ──
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // never return password in queries
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    avatarPublicId: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: Date,
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationExpires: Date,

    // ── Profile fields (one-time setup) ──
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    age: {
      type: Number,
      min: [10, "Age must be at least 10"],
      max: [120, "Invalid age"],
    },
    gender: {
      type: String,
      enum: Object.values(GENDER),
    },
    heightCm: {
      type: Number,
      min: [50, "Height seems too low"],
      max: [300, "Height seems too high"],
    },
    weightKg: {
      type: Number,
      min: [10, "Weight seems too low"],
      max: [500, "Weight seems too high"],
    },
    bodyFatPercent: {
      type: Number,
      min: 1,
      max: 70,
    },
    goal: {
      type: String,
      enum: Object.values(GOALS),
      default: GOALS.MAINTAIN,
    },
    activityLevel: {
      type: String,
      enum: Object.values(ACTIVITY_LEVELS),
      default: ACTIVITY_LEVELS.SEDENTARY,
    },
    dietPreference: {
      type: String,
      enum: Object.values(DIET_PREFERENCES),
      default: DIET_PREFERENCES.MIXED,
    },
  },
  {
    timestamps: true,
  }
);

// ── Hash password before saving ──
// Use async pre hook without calling `next()` — return a Promise instead.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
});

// ── Compare password ──
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ── Strip sensitive fields for JSON output ──
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.avatarPublicId;
  return obj;
};

const User = mongoose.model("User", userSchema);

export default User;
