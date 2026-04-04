import dotenv from "dotenv";
import mongoose from "mongoose";
import Food from "../data/foods.js";
import FoodModel from "../models/food.model.js";
import { DB_NAME, MONGODB_URI } from "../constants.js";

dotenv.config();

const dedupeFoodsByName = (foods) => {
  const seenNames = new Set();
  const uniqueFoods = [];
  let skippedCount = 0;

  foods.forEach((food) => {
    if (seenNames.has(food.name)) {
      skippedCount += 1;
      return;
    }

    seenNames.add(food.name);
    uniqueFoods.push(food);
  });

  return { uniqueFoods, skippedCount };
};

const hasMojibakeHint = (value = "") => /[ÃÂà][\x80-\xBF]?/.test(String(value));

const decodeLatin1ToUtf8 = (value = "") =>
  Buffer.from(String(value), "latin1").toString("utf8");

const normalizeHindiText = (value = "") => {
  if (!value) return value;

  let normalized = String(value).normalize("NFC");

  // Repair common mojibake only when the input looks corrupted.
  if (hasMojibakeHint(normalized)) {
    const repaired = decodeLatin1ToUtf8(normalized).normalize("NFC");

    // Accept repair only if it produced Devanagari and removed mojibake hints.
    if (/\p{Script=Devanagari}/u.test(repaired) && !hasMojibakeHint(repaired)) {
      normalized = repaired;
    }
  }

  return normalized;
};

const sanitizeFoodRecords = (foods) => {
  let repairedCount = 0;

  const sanitized = foods.map((food) => {
    const currentHindi = food?.nameHindi || "";
    const fixedHindi = normalizeHindiText(currentHindi);

    if (fixedHindi !== currentHindi) repairedCount += 1;

    return {
      ...food,
      nameHindi: fixedHindi,
    };
  });

  return { sanitized, repairedCount };
};

const seed = async () => {
  try {
    await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
    console.log("Connected to MongoDB");

    await FoodModel.deleteMany({});
    console.log("Cleared existing food data");

    const { sanitized, repairedCount } = sanitizeFoodRecords(Food);
    if (repairedCount > 0) {
      console.log(`Repaired encoding for ${repairedCount} Hindi food names.`);
    }

    const { uniqueFoods, skippedCount } = dedupeFoodsByName(sanitized);
    if (skippedCount > 0) {
      console.log(
        `Skipped ${skippedCount} duplicate food names from source data.`
      );
    }

    const inserted = await FoodModel.insertMany(uniqueFoods);
    console.log(`Seeded ${inserted.length} food items successfully.`);

    await mongoose.disconnect();
    console.log("MongoDB disconnected.");
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
