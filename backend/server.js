// ============================================
// Synapse AI — Express Backend Server
// ============================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

// ── Firebase Admin SDK Init ──
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

// ── API Clients are now initialized dynamically per request ──

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

// ── Simple Rate Limiter (in-memory) ──
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute per user

function rateLimit(req, res, next) {
  const userId = req.user?.uid || req.ip;
  const now = Date.now();
  
  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, []);
  }
  
  const timestamps = rateLimitMap.get(userId).filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests. Please slow down." });
  }
  
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  next();
}

// Clean up rate limit map every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}, 5 * 60 * 1000);

// ── Auth Middleware ──
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — no token provided" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Unauthorized — invalid token" });
  }
}

// ── Aura System Prompt ──
const AURA_SYSTEM_PROMPT = `You are Aura, a brilliant, warm, and insightful AI assistant created by Synapse AI. 
You provide helpful, accurate, and conversational responses. 
You are friendly yet professional, concise yet thorough. 
You use markdown formatting when helpful (bold, lists, code blocks, etc.).
You never reveal your underlying model or API — you are simply "Aura".
When asked who you are, you say: "I'm Aura, your AI assistant by Synapse AI."`;

// ── Chat Endpoint (SSE Streaming) ──
app.post("/api/chat", verifyFirebaseToken, rateLimit, async (req, res) => {
  const { messages, model, persona } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array is required" });
  }

  // Check if any message in the conversation contains an image
  let hasImage = false;
  for (const msg of messages) {
    if (Array.isArray(msg.content) && msg.content.some(block => block.type === "image_url")) {
      hasImage = true;
      break;
    }
  }

  let targetModel = model || "z-ai/glm4.7";
  let baseURL = process.env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1";
  let activeApiKey = null;
  
  if (targetModel === "z-ai/glm4.7") {
    activeApiKey = process.env.GLM_API_KEY;
  } else if (targetModel === "openai/gpt-oss-120b") {
    activeApiKey = process.env.GPT_OSS_120B_API_KEY;
  } else if (targetModel === "stepfun-ai/step-3.5-flash") {
    activeApiKey = process.env.STEP_FLASH_API_KEY;
  } else {
    // Default fallback if unsupported model passed
    activeApiKey = process.env.DEFAULT_API_KEY;
  }

  // If there's an image, route to the vision model regardless of selected model
  if (hasImage) {
    targetModel = "mistralai/mistral-large-3-675b-instruct-2512";
    activeApiKey = process.env.VISION_API_KEY;
    console.log("[VISION] Image detected — routing to Mistral Large 3 675B");
  }

  if (!activeApiKey) {
    console.error(`[ERROR] Missing API Key for model: ${targetModel}`);
    return res.status(400).json({ error: "Missing API Key for the selected model. Please configure your .env file." });
  }

  const activeAiClient = new OpenAI({
    apiKey: activeApiKey,
    baseURL: baseURL,
  });

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    console.log(`[DEBUG] Routing request to: ${targetModel}`);

    const systemPromptText = hasImage 
      ? "You are Aura, a helpful AI vision assistant by Synapse AI. You MUST look at the image carefully and describe/analyze/solve whatever is shown. If it is a math or science problem, solve it step by step. Always respond as if you can clearly see the image."
      : (persona || AURA_SYSTEM_PROMPT);

    let apiMessages = messages;
    
    // Mistral Small 3.1 uses standard OpenAI image_url format — no transformation needed.
    // Messages are already in the correct { type: "image_url", image_url: { url: "data:..." } } format.
    // Log what we're sending for debugging:
    if (hasImage) {
      const lastMsg = apiMessages[apiMessages.length - 1];
      if (Array.isArray(lastMsg?.content)) {
        const imgBlock = lastMsg.content.find(b => b.type === "image_url");
        const urlLen = imgBlock?.image_url?.url?.length || 0;
        console.log(`[VISION] Sending to API — url length: ${urlLen} chars, model: ${targetModel}`);
      }
    }

    const params = {
      model: targetModel,
      messages: [
        { role: "system", content: systemPromptText },
        ...apiMessages,
      ],
      stream: true,
      temperature: 0.7,
      top_p: 0.7,
      max_tokens: 4096,
    };

    // Specialized Parameters for Mistral Large 3 Vision
    if (targetModel === "mistralai/mistral-large-3-675b-instruct-2512") {
      params.max_tokens = 2048;
      params.temperature = 0.15;
      params.top_p = 1.0;
    }

    // Specialized Thinking Parameters for GLM 4.7
    if (targetModel === "z-ai/glm4.7") {
      params.chat_template_kwargs = { "enable_thinking": true, "clear_thinking": false };
      params.max_tokens = 16384;
    }

    // Specialized Parameters for Step-Flash (Aura Coder)
    if (targetModel === "stepfun-ai/step-3.5-flash") {
      params.max_tokens = 16384;
      params.top_p = 0.9;
    }

    const stream = await activeAiClient.chat.completions.create(params);

    let streamDone = false;
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta || {};
      const content = delta.content;
      const reasoning = delta.reasoning_content;
      
      if (reasoning) {
        res.write(`data: ${JSON.stringify({ reasoning })}\n\n`);
      }
      
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      
      // Mark done only after all content has been sent
      if (chunk.choices[0]?.finish_reason === "stop" || chunk.choices[0]?.finish_reason === "length") {
        streamDone = true;
      }
    }
    // Send done AFTER the loop finishes to ensure all chunks are processed
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("AI API error:", err.message, err.response?.data);
    console.error("Full error:", JSON.stringify(err, null, 2));
    
    let errorMsg = "Aura encountered an issue. Please try again.";
    if (hasImage) {
      // Log the REAL error so we can debug:
      const realError = err?.error?.message || err?.message || JSON.stringify(err);
      console.error(`[ERROR] Vision model failed. Model: ${targetModel} | Error: ${realError}`);
      if (err.status === 404 || realError.includes("not found") || realError.includes("404")) {
        errorMsg = "Vision model not available on this API account. Contact support.";
      } else if (err.status === 400) {
        errorMsg = `Image rejected by API: ${realError}`;
      } else if (err.status === 401) {
        errorMsg = "Invalid Vision API Key.";
      } else {
        errorMsg = `Image analysis failed: ${realError}`;
      }
    } else if (err.status === 429) {
      errorMsg = "Rate limit exceeded. Please wait a moment.";
    } else if (err.status === 401) {
      errorMsg = "Invalid API Key. Please check your credentials.";
    }
    
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: errorMsg });
    }
  }
});

// ── Token Verification Endpoint ──
app.post("/api/verify-token", verifyFirebaseToken, (req, res) => {
  res.json({ valid: true, uid: req.user.uid, email: req.user.email });
});

// ── Fallback: Serve index.html ──
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});
app.listen(PORT, () => {
  console.log(`\n  ✦ Synapse AI Server running at http://localhost:${PORT}\n`);
});
