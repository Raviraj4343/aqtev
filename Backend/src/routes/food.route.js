import express from "express";
import {
  getAllFoods,
  searchFoods,
  getFoodById,
  getCategories,
  getBoostFoods,
} from "../controllers/food.controller.js";

const router = express.Router();

router.get("/search", searchFoods);
router.get("/categories", getCategories);
router.get("/boost", getBoostFoods);
router.get("/", getAllFoods);
router.get("/:id", getFoodById);

export default router;
