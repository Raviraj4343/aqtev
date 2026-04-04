import Food from "../models/food.model.js";
import FoodData from "../data/foods.js";
import asyncHandler from "../utils/AsyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeTerm = (text = "") => String(text).toLowerCase().trim();
const tokenizeTerm = (text = "") =>
  normalizeTerm(text).split(/\s+/).filter(Boolean).slice(0, 8);
const CACHE_TTL_MS = 2 * 60 * 1000;
const responseCache = new Map();

const STATIC_FOODS = Array.isArray(FoodData) ? FoodData : [];
const STATIC_SEARCH_INDEX = STATIC_FOODS.map((item) => ({
  item,
  searchText: `${normalizeTerm(item?.name)} ${normalizeTerm(item?.nameHindi)}`,
}));

const getCache = (key) => {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.ts > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return cached.value;
};

const setCache = (key, value) => {
  responseCache.set(key, { ts: Date.now(), value });
};

const scoreSearchMatch = (item = {}, normalizedTerm = "", tokens = []) => {
  const searchText =
    `${normalizeTerm(item?.name)} ${normalizeTerm(item?.nameHindi)}`.trim();
  if (!searchText) return 0;

  const hasAllTokens =
    tokens.length > 0 && tokens.every((token) => searchText.includes(token));
  if (!hasAllTokens) return 0;

  let score = tokens.reduce(
    (sum, token) => sum + (searchText.includes(token) ? 12 : 0),
    0
  );

  if (normalizedTerm && searchText.includes(normalizedTerm)) score += 40;
  if (normalizedTerm && searchText.startsWith(normalizedTerm)) score += 25;
  if (normalizedTerm && normalizeTerm(item?.name) === normalizedTerm)
    score += 50;

  return score;
};

const rankAndTrimFoods = (foods = [], term = "", limit = 10) => {
  const normalizedTerm = normalizeTerm(term);
  const tokens = tokenizeTerm(normalizedTerm);
  const maxItems = Math.max(1, Number(limit) || 10);

  return [...foods]
    .map((item) => ({
      item,
      score: scoreSearchMatch(item, normalizedTerm, tokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.item?.name || "").localeCompare(
        String(b.item?.name || "")
      );
    })
    .slice(0, maxItems)
    .map((entry) => entry.item);
};

const boostRules = {
  protein: {
    minField: "proteinPerUnit",
    minValue: 6,
    sortBy: "proteinPerUnit",
    excludeCategory: null,
  },
  energy: {
    minField: "caloriesPerUnit",
    minValue: 150,
    sortBy: "caloriesPerUnit",
    excludeCategory: "snack",
  },
  fiber: {
    minField: "fiberPerUnit",
    minValue: 3,
    sortBy: "fiberPerUnit",
    excludeCategory: null,
  },
};

const filterStaticFoods = ({ diet, category, q, limit }) => {
  const term = normalizeTerm(q);
  const tokens = tokenizeTerm(term);
  let items = STATIC_FOODS;

  if (diet === "veg") {
    items = items.filter((item) => item.dietType === "veg");
  }

  if (category) {
    items = items.filter((item) => item.category === category);
  }

  if (term) {
    const matched = STATIC_SEARCH_INDEX.filter((entry) =>
      tokens.every((token) => entry.searchText.includes(token))
    ).map((entry) => entry.item);

    const categoryFiltered = category
      ? matched.filter((item) => item.category === category)
      : matched;

    items =
      diet === "veg"
        ? categoryFiltered.filter((item) => item.dietType === "veg")
        : categoryFiltered;
  }

  if (term) {
    const ranked = rankAndTrimFoods(items, term, Number(limit) || items.length);
    if (limit && Number(limit) > 0) return ranked.slice(0, Number(limit));
    return ranked;
  }

  if (limit && Number(limit) > 0) {
    return items.slice(0, Number(limit));
  }

  return items;
};

const formatBoostFood = (item = {}, nutrient = "") => {
  const unit = item.unit || "serving";
  if (nutrient === "protein") {
    return {
      ...item,
      highlight: `${Number(item.proteinPerUnit || 0)} g protein per ${unit}`,
    };
  }
  if (nutrient === "energy") {
    return {
      ...item,
      highlight: `${Number(item.caloriesPerUnit || 0)} kcal per ${unit}`,
    };
  }
  return {
    ...item,
    highlight: `${Number(item.fiberPerUnit || 0)} g fiber per ${unit}`,
  };
};

const dedupeFoodsByName = (foods = []) => {
  const unique = [];
  const seen = new Set();

  for (const item of foods) {
    const name = String(item?.name || "").toLowerCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    unique.push(item);
  }

  return unique;
};

const getAllFoods = asyncHandler(async (req, res) => {
  const { diet, category } = req.query;
  const parsedLimit = Number(req.query.limit);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(2000, parsedLimit)
      : 120;
  const cacheKey = `all:${diet || "all"}:${category || "all"}:${limit}`;
  const cached = getCache(cacheKey);

  if (cached) {
    res.set("Cache-Control", "public, max-age=120");
    return res
      .status(200)
      .json(new ApiResponse(200, cached, "Foods fetched successfully."));
  }

  const filter = { isActive: true };

  if (diet) {
    // veg users see only veg; non_veg/mixed see all
    if (diet === "veg") {
      filter.dietType = "veg";
    } else {
      filter.dietType = { $in: ["veg", "non_veg", "mixed"] };
    }
  }

  if (category) {
    filter.category = category;
  }

  let dbQuery = Food.find(filter)
    .sort({ category: 1, name: 1 })
    .limit(limit)
    .lean()
    .select(
      "name nameHindi unit caloriesPerUnit proteinPerUnit carbsPerUnit fatsPerUnit fiberPerUnit calciumPerUnit vitamins category dietType"
    );

  let foods = await dbQuery;

  // Fallback for environments where seeding has not run yet.
  if (!foods.length) {
    foods = filterStaticFoods({ diet, category, limit });
  }

  setCache(cacheKey, foods);
  res.set("Cache-Control", "public, max-age=120");

  return res
    .status(200)
    .json(new ApiResponse(200, foods, "Foods fetched successfully."));
});

const searchFoods = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const term = String(q || "").trim();
  if (!term || term.length < 1) {
    throw new ApiError(400, "Search query is required.");
  }

  const limit = Math.max(1, Math.min(20, Number(req.query.limit) || 10));
  const safeTerm = term.slice(0, 64);
  const normalizedTerm = normalizeTerm(safeTerm);
  const tokens = tokenizeTerm(normalizedTerm);

  const cacheKey = `search:${safeTerm.toLowerCase()}:${limit}`;
  const cached = getCache(cacheKey);

  if (cached) {
    res.set("Cache-Control", "public, max-age=120");
    return res
      .status(200)
      .json(new ApiResponse(200, cached, "Search results."));
  }

  const safeRegex = new RegExp(escapeRegex(safeTerm), "i");
  const tokenClauses = tokens.map((token) => {
    const tokenRegex = new RegExp(escapeRegex(token), "i");
    return { $or: [{ name: tokenRegex }, { nameHindi: tokenRegex }] };
  });

  const query = {
    isActive: true,
    $or: [
      { name: safeRegex },
      { nameHindi: safeRegex },
      ...(tokenClauses.length > 0 ? [{ $and: tokenClauses }] : []),
    ],
  };

  let foods = await Food.find(query)
    .limit(Math.min(80, limit * 6))
    .lean()
    .select(
      "name nameHindi unit caloriesPerUnit proteinPerUnit carbsPerUnit fatsPerUnit fiberPerUnit calciumPerUnit vitamins category dietType"
    );

  foods = rankAndTrimFoods(foods, normalizedTerm, limit);

  if (!foods.length) {
    foods = filterStaticFoods({ q: normalizedTerm, limit });
  }

  setCache(cacheKey, foods);
  res.set("Cache-Control", "public, max-age=120");

  return res.status(200).json(new ApiResponse(200, foods, "Search results."));
});

const getFoodById = asyncHandler(async (req, res) => {
  const food = await Food.findById(req.params.id);
  if (!food || !food.isActive) {
    throw new ApiError(404, "Food item not found.");
  }

  return res.status(200).json(new ApiResponse(200, food, "Food item fetched."));
});

const getCategories = asyncHandler(async (req, res) => {
  const cacheKey = "categories";
  const cached = getCache(cacheKey);

  if (cached) {
    res.set("Cache-Control", "public, max-age=120");
    return res
      .status(200)
      .json(new ApiResponse(200, cached, "Categories fetched."));
  }

  let categories = await Food.distinct("category", { isActive: true });

  if (!categories.length) {
    categories = [...new Set(FoodData.map((item) => item.category))];
  }

  setCache(cacheKey, categories);
  res.set("Cache-Control", "public, max-age=120");

  return res
    .status(200)
    .json(new ApiResponse(200, categories, "Categories fetched."));
});

const getBoostFoods = asyncHandler(async (req, res) => {
  const nutrient = String(req.query.nutrient || "").toLowerCase();
  const diet = req.query.diet;
  const limit = Math.max(1, Math.min(12, Number(req.query.limit) || 6));

  if (!boostRules[nutrient]) {
    throw new ApiError(400, "Invalid nutrient. Use protein, energy, or fiber.");
  }

  const rule = boostRules[nutrient];
  const cacheKey = `boost:${nutrient}:${diet || "all"}:${limit}`;
  const cached = getCache(cacheKey);

  if (cached) {
    res.set("Cache-Control", "public, max-age=120");
    return res
      .status(200)
      .json(new ApiResponse(200, cached, "Boost foods fetched."));
  }

  const filter = {
    isActive: true,
    [rule.minField]: { $gte: rule.minValue },
  };

  if (rule.excludeCategory) {
    filter.category = { $ne: rule.excludeCategory };
  }

  if (diet === "veg") {
    filter.dietType = "veg";
  }

  let foods = await Food.find(filter)
    .sort({
      [rule.sortBy]: -1,
      proteinPerUnit: -1,
      fiberPerUnit: -1,
      caloriesPerUnit: -1,
    })
    .limit(limit * 3)
    .lean()
    .select(
      "name nameHindi unit caloriesPerUnit proteinPerUnit carbsPerUnit fatsPerUnit fiberPerUnit calciumPerUnit vitamins category dietType"
    );

  if (!foods.length) {
    foods = filterStaticFoods({ diet })
      .filter((item) => Number(item?.[rule.minField] || 0) >= rule.minValue)
      .filter(
        (item) =>
          !rule.excludeCategory || item.category !== rule.excludeCategory
      )
      .sort(
        (a, b) => Number(b?.[rule.sortBy] || 0) - Number(a?.[rule.sortBy] || 0)
      )
      .slice(0, limit * 3);
  }

  const deduped = dedupeFoodsByName(foods)
    .slice(0, limit)
    .map((item) => formatBoostFood(item, nutrient));

  setCache(cacheKey, deduped);
  res.set("Cache-Control", "public, max-age=120");

  return res
    .status(200)
    .json(new ApiResponse(200, deduped, "Boost foods fetched."));
});

export { getAllFoods, searchFoods, getFoodById, getCategories, getBoostFoods };
