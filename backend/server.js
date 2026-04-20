const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

/* ============================================================
   PERSISTENT JSON STORAGE
============================================================ */
const DATA_DIR  = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Load users from file
function loadUsers() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      const parsed = JSON.parse(raw);
      console.log(`📂 Loaded ${Object.keys(parsed).length} user(s) from storage.`);
      return parsed;
    }
  } catch (e) {
    console.warn("⚠️  Could not read users.json — starting fresh.", e.message);
  }
  return {};
}

// Save users to file (called after every write)
function saveUsers() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (e) {
    console.error("❌ Failed to save users.json:", e.message);
  }
}

// Load on startup
const users = loadUsers();

// ── Seed admin if not already stored ──────────────────────
if (!users["SREE"]) {
  users["SREE"] = {
    password:     "ssrm123",
    familyGroup:  "SSRM",
    role:         "admin",
    healthData:   [],
    gamification: { totalPoints: 0, streak: 0, lastActiveDate: null },
    today:        { breakfast: false, lunch: false, dinner: false, exercise: false, walking: false, points: 0 }
  };
  saveUsers();
  console.log("🔐 Admin account initialised.");
}

// ── Reset 'today' fields for users whose last day has passed ──
(function resetStaleTodayData() {
  const todayStr = new Date().toDateString();
  let changed = false;
  Object.entries(users).forEach(([, u]) => {
    if (u.gamification.lastActiveDate && u.gamification.lastActiveDate !== todayStr) {
      u.today = { breakfast: false, lunch: false, dinner: false, exercise: false, walking: false, points: 0 };
      changed = true;
    }
  });
  if (changed) {
    saveUsers();
    console.log("🔄 Daily activity counters reset for a new day.");
  }
})();

// ─── PING ───────────────────────────────────────────────────
app.get("/api/ping", (req, res) => res.json({ ok: true }));


/* ============================================================
   HELPER: BMI
============================================================ */
function calcBMI(weight, height) {
  const h   = height / 100;
  const bmi = +(weight / (h * h)).toFixed(1);
  let category;
  if (bmi < 18.5)      category = "Underweight";
  else if (bmi < 25)   category = "Normal";
  else if (bmi < 30)   category = "Overweight";
  else                 category = "Obese";
  return { bmi, category };
}

/* ============================================================
   HELPER: DIET PLAN
============================================================ */
function getDietPlan(category) {
  const plans = {
    Underweight: {
      summary: "High-calorie, nutrient-rich Indian diet to gain healthy weight.",
      meals: {
        Morning: [
          "2 Aloo Paratha with Butter & Curd",
          "1 Glass Full-Cream Milk with Almonds & Saffron",
          "Sooji Halwa with Ghee, Cashews & Raisins",
          "Poha with Groundnuts, Onion & Green Chilli",
          "Besan Chilla with Paneer Stuffing & Chutney",
          "Methi Thepla with Ghee, Pickle & Curd",
          "Uttapam with Coconut Chutney & Sambar"
        ],
        Afternoon: [
          "3 Wheat Rotis + Rajma Masala + 1 Bowl Rice",
          "Chole Bhature with Mint Chutney & Lassi",
          "Dal Makhani + 2 Butter Naan + Pickle",
          "Mutton Curry (or Paneer Tikka Masala) + Rice",
          "Kadhi Pakoda + Jeera Rice + Salad",
          "Mix Veg Sabzi + 3 Rotis + Mango Pickle",
          "Palak Paneer + 2 Rotis + 1 Cup Rice"
        ],
        Evening: [
          "Peanut Jaggery Chikki + 1 Glass Banana Milkshake",
          "Bread with Butter & Jam + Masala Chai",
          "2 Samosa with Green Chutney & Tamarind Chutney",
          "Fox Nut Pudding (Makhane ki Kheer) with Milk",
          "Roasted Peanut & Puffed Rice Mix",
          "Dates & Dried Figs with Warm Milk",
          "Poha Chivda with Cashews & Raisins"
        ],
        Night: [
          "3 Rotis + Chicken Curry / Paneer Bhurji + Raita",
          "Khichdi with Ghee + Potato Sabzi + Papad",
          "Sarson da Saag + 2 Makki di Roti + Lassi",
          "Egg Curry + 2 Rotis + Dal Tadka",
          "Veg / Chicken Biryani with Boondi Raita",
          "Shahi Paneer + 2 Naan + Jeera Rice",
          "Fish Curry (or Mushroom Masala) + 2 Rotis"
        ]
      },
      tips: [
        "Eat every 2–3 hours — never skip a meal",
        "Add ghee or butter to each meal for healthy calories",
        "Include milk, curd, or paneer daily for protein",
        "Drink a glass of warm turmeric milk before bed for extra calories",
        "Have a handful of almonds, cashews, or raisins every day",
        "Avoid maida and junk food — they only add empty calories"
      ]
    },
    Normal: {
      summary: "Balanced Indian diet to maintain your ideal weight and energy.",
      meals: {
        Morning: [
          "Broken Wheat Porridge (Daliya) with Milk & Honey",
          "2 Moong Dal Chilla with Green Chutney",
          "3 Idli + Sambar + Coconut Chutney",
          "Vegetable Upma with Groundnuts & Lemon",
          "Oats Khichdi with Seasonal Vegetables",
          "1 Bowl Sprouts Chaat with Lemon & Chaat Masala",
          "2 Ragi Roti with Curd & Green Chutney"
        ],
        Afternoon: [
          "1 Cup Brown Rice + Dal Tadka + Cucumber Raita",
          "2 Multigrain Roti + Bhindi Masala + Fresh Salad",
          "Rajma Chawal (half cup) + Onion-Tomato Salad",
          "Mix Veg Dal + 2 Jowar Roti + Buttermilk",
          "Chana Masala + 1 Roti + Green Salad",
          "Curd Rice with Cumin + Seasonal Vegetable",
          "Sambar Rice + Papad + Curd"
        ],
        Evening: [
          "Roasted Fox Nuts (Makhana) with Black Salt",
          "Puffed Rice Bhel with Onion, Tomato & Chutney",
          "2 Steamed Dhokla with Green Chutney",
          "1 Guava, Banana or Amla (Seasonal Fruit)",
          "Spiced Buttermilk + 2 Khakhras",
          "Boiled Black Chickpea Chaat with Onion & Lemon",
          "Tomato Vegetable Soup – 1 Cup"
        ],
        Night: [
          "2 Roti + Bottle Gourd Sabzi + Dal",
          "Light Moong Dal Khichdi + Papad + Pickle",
          "Mix Veg Sabzi + 1 Roti + 1 Bowl Curd",
          "Spinach Dal + 1 Cup Rice + Salad",
          "Besan Gatte ki Sabzi + 2 Bajra Roti",
          "Soya Chunks Curry + 2 Rotis + Jeera Rice",
          "Mushroom & Peas Curry + 2 Rotis + Buttermilk"
        ]
      },
      tips: [
        "Drink 8–10 glasses of water every day to stay hydrated",
        "Exercise for at least 30 minutes daily — walk, yoga, or cycling",
        "Keep your night meal light so your body can rest and digest",
        "Avoid fried and packaged foods as much as possible",
        "Have curd or buttermilk daily — it is great for gut health",
        "Choose seasonal fruits and vegetables for freshness and nutrition"
      ]
    },
    Overweight: {
      summary: "Calorie-controlled, high-fibre Indian diet to reduce weight.",
      meals: {
        Morning: [
          "Plain Oats with Skimmed Milk (no sugar) + 1 Amla",
          "Moong Dal Chilla (no oil) with Green Chutney",
          "1 Bowl Vegetable Daliya (no ghee)",
          "2 Vegetable Idli + Sambar (less oil)",
          "1 Ragi Dosa with Tomato Chutney (no butter)",
          "2 Boiled Egg Whites + 1 Multigrain Toast",
          "1 Bowl Mixed Sprouts with Lemon & Black Salt"
        ],
        Afternoon: [
          "1 Multigrain Roti + Large Green Salad + Dal (no tempering)",
          "Half Cup Brown Rice + Grilled Chicken / Tofu + Bhindi Sabzi",
          "Black Chickpea Salad with Onion, Tomato, Cucumber & Lemon",
          "Tinda or Lauki Sabzi + 1 Bajra Roti + Curd",
          "Masoor Dal + 1 Jowar Roti + Cucumber Raita",
          "Moong Sprouts Sabzi + 1 Roti + Vegetable Soup",
          "Grilled Fish / Paneer Tikka + Fresh Salad + 1 Roti"
        ],
        Evening: [
          "Cucumber & Carrot Sticks with Mint Chutney",
          "1 Handful Roasted Chana",
          "1 Cup Green Tea or Tulsi-Ginger Tea (no sugar)",
          "1 Guava or Orange (Seasonal Fruit)",
          "1 Piece Steamed Dhokla (no oil)",
          "Plain Buttermilk (no cream)",
          "Clear Tomato Soup (no butter)"
        ],
        Night: [
          "Clear Spinach Soup + Grilled Fish or Tofu",
          "Bottle Gourd Sabzi + 1 Roti + Dal",
          "Steamed Cauliflower & Carrots with Cumin",
          "Vegetable Daliya Khichdi (no ghee) + Curd",
          "Moong Dal Soup + Boiled Mixed Vegetables",
          "Grilled Paneer (100g) + Sauteed Spinach",
          "Egg Bhurji (no oil) + 1 Multigrain Roti"
        ]
      },
      tips: [
        "Start every morning with 1 glass of warm water and lemon on an empty stomach",
        "Avoid all fried, oily, and refined-flour foods completely",
        "Drink 1 glass of water before each meal to avoid overeating",
        "Walk briskly or cycle for at least 45 minutes every day",
        "Stop eating after 7:00 PM to let your body digest properly",
        "Eat whole fruits instead of packaged juices — the fibre is important"
      ]
    },
    Obese: {
      summary: "Low-calorie, high-fibre Indian diet with daily physical activity.",
      meals: {
        Morning: [
          "Spinach, Mint & Lemon Detox Juice (no sugar)",
          "1 Boiled Egg White + 1 Slice Multigrain Toast",
          "Plain Oats with Skimmed Milk (no sugar) – 1 Small Bowl",
          "Moong Dal Chilla (no oil) with Lemon & Mint Chutney",
          "Ragi Kanji – Thin Porridge with Water (no sugar)",
          "Boiled Sprouts + Cucumber + Tomato Salad",
          "Green Tea or Kahwa with Ginger (no sugar)"
        ],
        Afternoon: [
          "Large Green Salad (Cucumber, Onion, Tomato, Carrot) + Lemon Dressing",
          "Half Cup Brown Rice + Masoor Dal (no tempering) + Vegetable",
          "Boiled Black Chickpeas (no oil) + Curd",
          "Moong Dal Soup + 1 Small Jowar Roti",
          "Bitter Gourd Sabzi + 1 Small Roti",
          "Boiled Sprouts + Mixed Vegetable Salad",
          "Grilled Chicken / Soya Chunks + Steamed Vegetables"
        ],
        Evening: [
          "Cucumber Sticks with Black Salt & Lemon",
          "1 Guava, Jamun or Amla (Low-sugar Fruit)",
          "Clear Vegetable Soup (no butter or cream)",
          "Plain Buttermilk (no sugar, no cream)",
          "Green Tea with Tulsi & Ginger (no sugar)",
          "Half Handful Boiled Black Chickpeas with Black Salt",
          "Tomato Rasam – Thin South Indian Soup"
        ],
        Night: [
          "Clear Vegetable Broth + Steamed Bottle Gourd or Tinda",
          "Moong Dal Soup + Boiled Cauliflower & Carrots",
          "Grilled Fish / Tofu + Sauteed Spinach",
          "1 Small Jowar Roti + Bottle Gourd Sabzi + Dal",
          "Thin Vegetable Daliya Khichdi (no ghee)",
          "Egg White Bhurji (no oil) + Bowl of Fresh Salad",
          "Half Cup Steamed Rice + Thin Masoor Dal"
        ]
      },
      tips: [
        "Drink 500ml of warm water with lemon every morning before eating anything",
        "Exercise for at least 60 minutes daily — walking, swimming, or cycling",
        "Cut out all sugar, sweets, fried food, and refined flour completely",
        "Eat small meals every 3 hours to keep your metabolism active",
        "Finish dinner by 6:30–7:00 PM and avoid all late-night eating",
        "Consult a registered dietician for a personalised weight-loss plan",
        "Choose high-fibre grains like Jowar, Bajra, and Ragi over white rice"
      ]
    }
  };
  return plans[category] || plans.Normal;
}

/* ============================================================
   HELPER: SYMPTOM ANALYSIS
============================================================ */
function analyzeSymptoms(symptoms) {
  const highRiskCombos  = [
    ["Chest Pain", "Shortness of Breath"],
    ["Chest Pain", "Dizziness"],
    ["Chest Pain", "Nausea"],
  ];
  const highRiskSingle  = ["Chest Pain", "Shortness of Breath"];
  const moderateSymptoms = ["Fever", "Headache", "Fatigue", "Dizziness", "Nausea", "Vomiting"];

  let riskLevel   = "Low";
  let suggestions = [];

  for (const combo of highRiskCombos) {
    if (combo.every(s => symptoms.includes(s))) {
      riskLevel = "High";
      suggestions.push("⚠️ URGENT: Chest pain with other symptoms – seek emergency care immediately.");
      break;
    }
  }

  if (riskLevel !== "High") {
    for (const s of highRiskSingle) {
      if (symptoms.includes(s)) {
        riskLevel = "High";
        suggestions.push(`🚨 "${s}" is a serious symptom – consult a doctor immediately.`);
        break;
      }
    }
  }

  if (riskLevel === "Low") {
    const modCount = symptoms.filter(s => moderateSymptoms.includes(s)).length;
    if (modCount >= 2) riskLevel = "Moderate";
  }

  const adviceMap = {
    "Fever":               "Stay hydrated, rest, and monitor temperature. Take paracetamol if above 38.5°C.",
    "Headache":            "Rest in a dark room, drink water, and reduce screen time.",
    "Fatigue":             "Ensure 7–8 hours of sleep. Eat iron-rich foods.",
    "Excess Thirst":       "Monitor blood sugar levels. Could indicate dehydration or diabetes.",
    "Dizziness":           "Sit down immediately. Check blood pressure. Avoid sudden movements.",
    "Chest Pain":          "URGENT: Stop all activity. Call emergency services if pain persists > 5 min.",
    "Shortness of Breath": "Sit upright. Avoid exertion. Seek medical attention.",
    "Nausea":              "Eat small amounts. Sip water. Avoid fatty/spicy food.",
    "Body Pain":           "Rest, apply warm compress. Take OTC pain relief if needed.",
    "Loss of Appetite":    "Eat small frequent meals. Consult doctor if it persists > 3 days.",
    "Vomiting":            "Stay hydrated with ORS or clear fluids. Avoid solid food temporarily.",
    "Poor Sleep":          "Maintain a consistent sleep schedule. Avoid screens 1 hour before bed."
  };

  symptoms.forEach(s => {
    if (adviceMap[s]) suggestions.push(`• ${s}: ${adviceMap[s]}`);
  });

  if (riskLevel === "Low"      && suggestions.length === 0) suggestions.push("✅ Your symptoms indicate low risk. Rest, hydrate, and monitor.");
  if (riskLevel === "Moderate" && suggestions.length <= 1)  suggestions.push("⚠️ Moderate symptoms detected. Rest and consult a doctor if not improving.");

  const doctorMap = {
    "Fever":               "General Physician",
    "Headache":            "Neurologist",
    "Chest Pain":          "Cardiologist",
    "Fatigue":             "General Physician",
    "Dizziness":           "Neurologist",
    "Nausea":              "Gastroenterologist",
    "Body Pain":           "Orthopedic",
    "Shortness of Breath": "Pulmonologist",
    "Excess Thirst":       "Endocrinologist",
    "Loss of Appetite":    "Gastroenterologist",
    "Vomiting":            "Gastroenterologist",
    "Poor Sleep":          "General Physician"
  };
  const doctors = [...new Set(symptoms.map(s => doctorMap[s]).filter(Boolean))];

  return { riskLevel, suggestions, doctors };
}

/* ============================================================
   AUTH ENDPOINTS
============================================================ */

// POST /api/register
app.post("/api/register", (req, res) => {
  const { username, password, familyGroup } = req.body;
  if (!username || !password || !familyGroup)
    return res.status(400).json({ error: "All fields required." });
  if (users[username])
    return res.status(400).json({ error: "Username already exists." });

  // Block anyone trying to register as the reserved admin identity
  if (username === "SREE" && familyGroup === "SSRM")
    return res.status(400).json({ error: "This username is reserved." });

  users[username] = {
    password,
    familyGroup,
    role: "user",
    healthData: [],
    gamification: { totalPoints: 0, streak: 0, lastActiveDate: null },
    today: { breakfast: false, lunch: false, dinner: false, exercise: false, walking: false, points: 0 }
  };
  saveUsers();   // ← persist immediately
  res.json({ message: `Welcome to HealthHub, ${username}! Registered in "${familyGroup}".` });
});

// POST /api/login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user || user.password !== password)
    return res.status(401).json({ error: "Invalid username or password." });

  res.json({
    message: "Login successful.",
    user: { username, familyGroup: user.familyGroup, role: user.role, gamification: user.gamification, today: user.today }
  });
});

/* ============================================================
   BMI ENDPOINT
============================================================ */

// POST /api/bmi
app.post("/api/bmi", (req, res) => {
  const { username, weight, height } = req.body;
  if (!weight || !height) return res.status(400).json({ error: "Weight and height required." });

  const { bmi, category } = calcBMI(weight, height);
  const dietPlan = getDietPlan(category);
  const minW = +(18.5 * (height / 100) ** 2).toFixed(1);
  const maxW = +(24.9 * (height / 100) ** 2).toFixed(1);

  if (username && users[username]) {
    const existing  = users[username].healthData;
    const todayStr  = new Date().toLocaleDateString();
    const idx       = existing.findIndex(h => h.date === todayStr);
    if (idx >= 0) {
      existing[idx].bmi         = bmi;
      existing[idx].bmiCategory = category;
      existing[idx].dietPlan    = dietPlan;
    } else {
      existing.push({ date: todayStr, bmi, bmiCategory: category, dietPlan, symptoms: [], riskLevel: "--", suggestions: [], doctors: [] });
    }
    saveUsers();   // ← persist
  }

  res.json({ bmi, category, dietPlan, minWeight: minW, maxWeight: maxW });
});

/* ============================================================
   SYMPTOM ENDPOINT
============================================================ */

// POST /api/symptoms
app.post("/api/symptoms", (req, res) => {
  const { username, symptoms } = req.body;
  if (!symptoms || !symptoms.length) return res.status(400).json({ error: "Select at least one symptom." });

  const result = analyzeSymptoms(symptoms);

  if (username && users[username]) {
    const todayStr = new Date().toLocaleDateString();
    const existing = users[username].healthData;
    const idx      = existing.findIndex(h => h.date === todayStr);
    if (idx >= 0) {
      existing[idx].symptoms   = symptoms;
      existing[idx].riskLevel  = result.riskLevel;
      existing[idx].suggestions = result.suggestions;
      existing[idx].doctors    = result.doctors;
    } else {
      existing.push({ date: todayStr, bmi: null, bmiCategory: null, dietPlan: null, symptoms, riskLevel: result.riskLevel, suggestions: result.suggestions, doctors: result.doctors });
    }
    saveUsers();   // ← persist
  }

  res.json(result);
});

/* ============================================================
   FAMILY DASHBOARD
============================================================ */

// GET /api/family/:familyGroup
app.get("/api/family/:familyGroup", (req, res) => {
  const { familyGroup } = req.params;
  const members = Object.entries(users)
    .filter(([, u]) => u.familyGroup === familyGroup)
    .map(([name, u]) => {
      const latest = u.healthData[u.healthData.length - 1] || {};
      return {
        name,
        bmi:          latest.bmi         || "--",
        bmiCategory:  latest.bmiCategory || "--",
        riskLevel:    latest.riskLevel   || "--",
        symptoms:     latest.symptoms    || [],
        gamification: u.gamification,
        today:        u.today
      };
    });
  res.json({ familyGroup, members });
});

/* ============================================================
   HEALTH HISTORY
============================================================ */

// GET /api/history/:username
app.get("/api/history/:username", (req, res) => {
  const { username } = req.params;
  if (!users[username]) return res.status(404).json({ error: "User not found." });
  res.json({ history: users[username].healthData });
});

/* ============================================================
   GAMIFICATION
============================================================ */

// POST /api/activity
app.post("/api/activity", (req, res) => {
  const { username, activity } = req.body;
  const user = users[username];
  if (!user) return res.status(404).json({ error: "User not found." });

  const pointsMap = { breakfast: 10, lunch: 10, dinner: 10, exercise: 15, walking: 10 };
  const pts = pointsMap[activity];
  if (!pts) return res.status(400).json({ error: "Unknown activity." });

  if (user.today[activity]) return res.status(400).json({ error: `${activity} already logged today.`, already: true });

  user.today[activity]           = true;
  user.today.points              = (user.today.points || 0) + pts;
  user.gamification.totalPoints  = (user.gamification.totalPoints || 0) + pts;

  // Streak logic
  const todayStr = new Date().toDateString();
  if (user.gamification.lastActiveDate !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    user.gamification.streak = user.gamification.lastActiveDate === yesterday.toDateString()
      ? (user.gamification.streak || 0) + 1
      : 1;
    user.gamification.lastActiveDate = todayStr;
  }

  saveUsers();   // ← persist
  res.json({ message: `+${pts} points for ${activity}!`, today: user.today, gamification: user.gamification });
});

/* ============================================================
   ADMIN PORTAL
============================================================ */

// GET /api/admin
app.get("/api/admin", (req, res) => {
  const { username } = req.query;
  const user = users[username];

  // Triple guard: role + exact username + exact family
  if (!user || user.role !== "admin" || username !== "SREE" || user.familyGroup !== "SSRM")
    return res.status(403).json({ error: "Access denied. Admin only." });

  const families = {};
  Object.entries(users).forEach(([name, u]) => {
    if (!families[u.familyGroup]) families[u.familyGroup] = [];
    const latest = u.healthData[u.healthData.length - 1] || {};
    families[u.familyGroup].push({
      name,
      role:         u.role,
      bmi:          latest.bmi         || "--",
      bmiCategory:  latest.bmiCategory || "--",
      riskLevel:    latest.riskLevel   || "--",
      symptoms:     latest.symptoms    || [],
      suggestions:  latest.suggestions || [],
      totalPoints:  u.gamification.totalPoints || 0,
      streak:       u.gamification.streak      || 0,
      historyCount: u.healthData.length
    });
  });

  res.json({ totalUsers: Object.keys(users).length, families });
});

/* ============================================================
   SERVE FRONTEND
============================================================ */
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/health.html"));
});

app.listen(3000, () => {
  console.log("✅ HealthHub server running on port 3000");
  console.log(`💾 User data stored in: ${DATA_FILE}`);
});