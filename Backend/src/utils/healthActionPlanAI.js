import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-002",
];

const getModelCandidates = () => {
  const configured = String(process.env.HEALTH_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
  return [configured, ...MODEL_CANDIDATES.filter((name) => name !== configured)];
};

const getGeminiApiKey = () => {
  const key = String(
    process.env.GUIDE_API_KEY || process.env.GEMINI_API_KEY || process.env.HEALTH_API || ""
  ).trim();
  if (!key) {
    throw new Error("GUIDE_API_KEY (or GEMINI_API_KEY) is missing in environment variables.");
  }
  return key;
};

const isRateLimitError = (err) => {
  const message = String(err?.message || "").toLowerCase();
  return message.includes("429") || message.includes("too many requests") || message.includes("quota");
};

const extractRetrySeconds = (err) => {
  const message = String(err?.message || "");
  const match = message.match(/retry\s+in\s+([\d.]+)s/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.ceil(seconds) : null;
};

const wrapGeminiError = (err, modelName) => {
  const e = new Error(err?.message || "Gemini request failed.");
  if (isRateLimitError(err)) {
    const retryAfter = extractRetrySeconds(err);
    e.message = retryAfter
      ? `Gemini quota limit reached for ${modelName}. Please retry in ${retryAfter}s.`
      : `Gemini quota limit reached for ${modelName}. Please retry shortly.`;
    e.statusCode = 429;
    e.retryAfterSeconds = retryAfter;
  } else {
    e.statusCode = 502;
  }
  e.modelName = modelName;
  return e;
};

const MAX_WORDS = 15;

const trimWords = (text = "", maxWords = MAX_WORDS) =>
  String(text)
    .trim()
    .split(/\s+/)
    .slice(0, maxWords)
    .join(" ");

const buildPrompt = (payload) => {
  const {
    goal,
    dietPreference,
    bmi,
    bmiCategory,
    requiredCalories,
    requiredProtein,
    actualCalories,
    actualProtein,
    sleepHours,
    steps,
    waterIntake,
    calorieGap,
    proteinGap,
    dailyDiet,
    medicalConditions,
  } = payload;

  return `You are an AI health and fitness assistant for a smart health app.

Analyze the user's data and generate a personalized, practical, and safe recommendation plan.

User Data:
- Goal: ${goal || "maintain"} (fat loss / muscle gain / maintenance)
- BMI Category: ${bmiCategory || "unknown"}
- Daily Calorie Gap: ${calorieGap ?? 0}
- Protein Gap: ${proteinGap ?? 0}
- Steps per day: ${steps ?? "not logged"}
- Sleep (hours): ${sleepHours ?? "not logged"}
- Diet Preference: ${dietPreference || "unknown"} (veg / non-veg / vegan)
- Conditions Summary: ${medicalConditions || "none"}
- Daily diet notes: ${dailyDiet || "none"}
- Required calories: ${requiredCalories ?? "unknown"}
- Required protein (g): ${requiredProtein ?? "unknown"}
- Today's calories: ${actualCalories ?? 0}
- Today's protein (g): ${actualProtein ?? 0}
- BMI value: ${bmi ?? "unknown"}
- Water intake: ${waterIntake ?? "not logged"}

Instructions:
- Be realistic and actionable (no generic advice)
- Avoid medical diagnosis
- Focus on small daily improvements
- Keep recommendations beginner-friendly
- If risk exists, clearly mention it

Return ONLY valid JSON (no text outside JSON):

{
  "actionPlan": [
    "3 clear daily actions"
  ],
  "riskFlags": [
    "any health or lifestyle risks"
  ],
  "nutritionFocus": [
    "specific food or nutrient advice"
  ],
  "trainingFocus": [
    "exercise recommendations"
  ],
  "recoveryFocus": [
    "sleep, hydration, recovery tips"
  ]
}

Ensure each array has at least 2-4 concise items. Keep each item under 15 words.
`;
};

const safeJsonParse = (rawText) => {
  const text = String(rawText || "").trim();

  try {
    return JSON.parse(text);
  } catch {
    // handle fenced or extra text responses
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error("Invalid JSON from model");
  }
};

const normalizePlan = (parsed) => {
  const normalizeList = (value, min = 2, max = 4) => {
    const list = Array.isArray(value)
      ? value
          .map((item) => trimWords(item, MAX_WORDS))
          .filter(Boolean)
      : [];

    if (list.length < min) {
      throw new Error("Model returned insufficient items in one or more sections");
    }

    return list.slice(0, max);
  };

  return {
    actionPlan: normalizeList(parsed?.actionPlan, 2, 4),
    riskFlags: normalizeList(parsed?.riskFlags, 2, 4),
    nutritionFocus: normalizeList(parsed?.nutritionFocus, 2, 4),
    trainingFocus: normalizeList(parsed?.trainingFocus, 2, 4),
    recoveryFocus: normalizeList(parsed?.recoveryFocus, 2, 4),
  };
};

const generateActionPlanPrompt = (model, prompt) =>
  model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.5,
    },
  });

const attemptPlanGeneration = async (model, payload) => {
  const primaryPrompt = buildPrompt(payload);
  const primaryResult = await generateActionPlanPrompt(model, primaryPrompt);
  const firstText = String(primaryResult?.response?.text?.() || "").trim();
  if (!firstText) {
    throw new Error("Empty response from model");
  }

  try {
    return normalizePlan(safeJsonParse(firstText));
  } catch {
    const repairPrompt = `Return ONLY valid JSON for this schema, with 2 to 4 concise items in each array:\n\n{\n  "actionPlan": ["..."],\n  "riskFlags": ["..."],\n  "nutritionFocus": ["..."],\n  "trainingFocus": ["..."],\n  "recoveryFocus": ["..."]\n}\n\nUse this user context to regenerate recommendations:\n${buildPrompt(payload)}\n\nDo not include markdown, explanation, or extra keys.`;
    const repairResult = await generateActionPlanPrompt(model, repairPrompt);
    const repairText = String(repairResult?.response?.text?.() || "").trim();
    if (!repairText) {
      throw new Error("Empty response from model");
    }
    return normalizePlan(safeJsonParse(repairText));
  }
};

const generateGuideLiveSuggestion = async (payload) => {
  const apiKey = getGeminiApiKey();

  const {
    userName,
    userPrompt,
    chatHistory,
    goal,
    age,
    gender,
    heightCm,
    weightKg,
    activityLevel,
    dietPreference,
    bmi,
    bmiCategory,
    requiredCalories,
    requiredProtein,
    actualCalories,
    actualProtein,
    sleepHours,
    steps,
    waterIntake,
    calorieGap,
    proteinGap,
  } = payload || {};

  const historyBlock = Array.isArray(chatHistory) && chatHistory.length
    ? chatHistory
        .slice(-12)
        .map((entry, index) => {
          const role = entry?.role === "assistant" ? "Coach" : "User";
          return `${index + 1}. ${role}: ${String(entry?.content || "").trim()}`;
        })
        .join("\n")
    : "No previous messages in this chat.";

  const client = new GoogleGenerativeAI(apiKey);
  const prompt = `You are FitCek's conversational AI health coach.

Talk naturally like ChatGPT: warm, concise, and interactive.
Speak directly to the user by name when possible.
User name: ${userName || "there"}

User context:
- Goal: ${goal || "maintain"}
- Age: ${age ?? "unknown"}
- Gender: ${gender || "unknown"}
- Height (cm): ${heightCm ?? "unknown"}
- Weight (kg): ${weightKg ?? "unknown"}
- Activity level: ${activityLevel || "unknown"}
- Diet preference: ${dietPreference || "unknown"}
- BMI: ${bmi ?? "unknown"} (${bmiCategory || "unknown"})
- Required calories: ${requiredCalories ?? "unknown"}
- Required protein (g): ${requiredProtein ?? "unknown"}
- Today's calories: ${actualCalories ?? 0}
- Today's protein (g): ${actualProtein ?? 0}
- Calorie gap: ${calorieGap ?? 0}
- Protein gap: ${proteinGap ?? 0}
- Sleep (hours): ${sleepHours ?? "not logged"}
- Steps: ${steps ?? "not logged"}
- Water intake: ${waterIntake ?? "not logged"}

Current chat context (session-only, not permanently stored):
${historyBlock}

User question/request:
${String(userPrompt || "").trim()}

Instructions:
- Respond conversationally, not in rigid templates.
- Keep replies short (usually 2-6 lines), clear, and personalized.
- Use chat context and latest user intent to adapt your response.
- Give an instant direct answer in the same message.
- Include multiple practical options when possible (for example low, medium, high effort).
- Do not ask follow-up questions unless the user explicitly asks for clarification.
- Do not ask for profile details that are already present in User context above.
- Avoid repeating the same structure every turn.
- Avoid medical diagnosis; if risk exists, mention it calmly and suggest professional care when needed.
- Do NOT return JSON unless explicitly asked.
`;

  let lastError = null;
  let text = "";

  for (const modelName of getModelCandidates()) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      text = String(result?.response?.text?.() || "").trim();
      if (text) {
        console.info(`[HEALTH_AI] Live suggestion model selected: ${modelName}`);
        break;
      }
    } catch (err) {
      lastError = wrapGeminiError(err, modelName);
      const message = String(err?.message || "").toLowerCase();
      const isModelLookupError =
        message.includes("model") &&
        (message.includes("not found") || message.includes("not supported"));
      if (!isModelLookupError) {
        throw lastError;
      }
    }
  }

  if (!text) {
    if (lastError) throw lastError;
    throw new Error("Empty response from model");
  }

  return text;
};

const generateRealtimeActionPlan = async (payload) => {
  const apiKey = getGeminiApiKey();

  const client = new GoogleGenerativeAI(apiKey);

  let lastError = null;
  let plan = null;

  for (const modelName of getModelCandidates()) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      plan = await attemptPlanGeneration(model, payload);
      console.info(`[HEALTH_AI] Action plan model selected: ${modelName}`);
      break;
    } catch (err) {
      const message = String(err?.message || "").toLowerCase();
      const isModelLookupError =
        message.includes("model") &&
        (message.includes("not found") || message.includes("not supported"));
      const isStructuredOutputError =
        message.includes("invalid json") ||
        message.includes("insufficient items") ||
        message.includes("empty response");

      if (isModelLookupError || isStructuredOutputError) {
        lastError = err;
        continue;
      }

      lastError = wrapGeminiError(err, modelName);
      throw lastError;
    }
  }

  if (!plan) {
    if (lastError?.statusCode) throw lastError;
    throw new Error(lastError?.message || "Unable to generate action plan from model output");
  }

  return plan;
};

export { generateRealtimeActionPlan, generateGuideLiveSuggestion };
