// ============================================
// Synapse AI — Express Backend Server
// ============================================
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

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

  // Check if any message in the conversation contains an image, audio, or video
  let hasImage = false;
  let hasAudioVideo = false;
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      if (msg.content.some(block => block.type === "image_url")) {
        hasImage = true;
      }
      if (msg.content.some(block => ["audio_url", "video_url", "input_audio"].includes(block.type))) {
        hasAudioVideo = true;
      }
    }
  }

  let targetModel = model || "z-ai/glm4.7";

  // Check if user is requesting to generate an image
  const lastMsg = messages.slice().reverse().find(m => m.role === "user");
  let lastUserText = "";
  if (lastMsg) {
    if (typeof lastMsg.content === "string") lastUserText = lastMsg.content;
    else if (Array.isArray(lastMsg.content)) lastUserText = lastMsg.content.find(c => c.type === "text")?.text || "";
  }

  const isImageRequest = targetModel === "qwen-image" ||
    /^(generate image|generate an image|create image|create an image|make an image|make a picture|generate a picture|draw (?:a |an |me a |me an )?(?:picture|image|photo|illustration|art|painting|portrait|logo|icon|wallpaper))/i.test(lastUserText.trim());

  if (isImageRequest) {
    targetModel = "qwen-image";
  }

  let baseURL = process.env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1";
  let activeApiKey = null;
  
  if (targetModel === "z-ai/glm4.7") {
    activeApiKey = process.env.GLM_API_KEY;
  } else if (targetModel === "openai/gpt-oss-120b") {
    activeApiKey = process.env.GPT_OSS_120B_API_KEY;
  } else if (targetModel === "stepfun-ai/step-3.5-flash") {
    activeApiKey = process.env.STEP_FLASH_API_KEY;
  } else if (targetModel === "qwen-image") {
    activeApiKey = process.env.QWEN_API_KEY || process.env.DEFAULT_API_KEY;
  } else {
    // Default fallback if unsupported model passed
    activeApiKey = process.env.DEFAULT_API_KEY;
  }

  // If there's an image, route to the vision model regardless of selected model
  // (Mistral Large 3 is a great default vision model)
  if (hasImage) {
    targetModel = "mistralai/mistral-large-3-675b-instruct-2512";
    activeApiKey = process.env.VISION_API_KEY || process.env.DEFAULT_API_KEY;
    console.log(`[VISION] Image detected — routing to ${targetModel}`);
  } else if (hasAudioVideo) {
    targetModel = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
    activeApiKey = process.env.AUDIO_VIDEO_API_KEY || process.env.NVIDIA_API_KEY || process.env.DEFAULT_API_KEY;
    console.log(`[AUDIO/VIDEO] Audio/Video detected — routing to ${targetModel}`);
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

    if (targetModel === "qwen-image") {
      // Find the last user message to use as the prompt
      const lastMsg = messages.slice().reverse().find(m => m.role === "user");
      let promptText = "A beautiful AI generated image";
      if (lastMsg) {
        if (typeof lastMsg.content === "string") promptText = lastMsg.content;
        else if (Array.isArray(lastMsg.content)) promptText = lastMsg.content.find(c => c.type === "text")?.text || promptText;
      }

      console.log(`[IMAGE] Generating image for prompt: "${promptText}"`);
      
      const nvImgResponse = await fetch("https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${activeApiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          prompt: promptText,
          seed: 0,
          steps: 4,
          cfg_scale: 0,
          samples: 1,
          height: 1024,
          width: 1024
        })
      });

      if (!nvImgResponse.ok) {
        throw new Error(`Image API error: ${nvImgResponse.status} ${nvImgResponse.statusText}`);
      }

      const imgData = await nvImgResponse.json();
      if (!imgData.artifacts || !imgData.artifacts[0] || !imgData.artifacts[0].base64) {
        throw new Error("Invalid response from Image API: missing artifacts");
      }

      // Convert base64 to a data URL
      const imageUrl = `data:image/jpeg;base64,${imgData.artifacts[0].base64}`;
      
      // Simulate streaming for the frontend UI by sending it as a single chunk
      res.write(`data: ${JSON.stringify({ content: `![Generated Image](${imageUrl})` })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    let systemPromptText = persona || AURA_SYSTEM_PROMPT;
    
    if (hasImage) {
      systemPromptText += "\n\n[VISION MODE ACTIVE] You can see images. Analyze them carefully. If you see math or code, explain/solve it. Always maintain your persona while describing what you see.";
    } else if (hasAudioVideo) {
      systemPromptText += "\n\n[MULTIMODAL MODE ACTIVE] You can hear audio and see video. Analyze the media carefully and answer based on its content while maintaining your persona.";
    }

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

    // Specialized Thinking Parameters for qwen/qwen3.5-122b-a10b
    if (targetModel === "qwen/qwen3.5-122b-a10b") {
      params.chat_template_kwargs = { "enable_thinking": true, "clear_thinking": false };
      params.max_tokens = 16384;
    }

    // Specialized Parameters for Nemotron Omni (Audio/Video)
    if (targetModel === "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning") {
      // Disable reasoning to make the model respond faster
      params.reasoning_budget = 0;
      params.chat_template_kwargs = { "enable_thinking": false, "clear_thinking": true };
      params.max_tokens = 4096;
    }

    // Specialized Parameters for Step-Flash (Aura Coder)
    if (targetModel === "stepfun-ai/step-3.5-flash") {
      params.max_tokens = 16384;
      params.top_p = 0.9;
    }

    const stream = await activeAiClient.chat.completions.create(params);

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
