import "dotenv/config";
import http from "http";

const PORT = process.env.AI_SERVER_PORT || 3001;
const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GOOGLE_GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_BASE_URL = process.env.GOOGLE_GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta";

if (!GEMINI_KEY) {
  console.error("Missing GOOGLE_GEMINI_API_KEY. Set it in your .env file before running the server.");
  process.exit(1);
}

console.log(`Initializing AI backend with model: ${GEMINI_MODEL}`);

const allowedOrigins = new Set(["http://localhost:8080", "http://127.0.0.1:8080"]);

function getCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function handleAIRequest(req, res) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const bodyText = Buffer.concat(chunks).toString("utf-8");

  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json", ...getCorsHeaders(req.headers.origin) });
    res.end(JSON.stringify({ error: "Invalid JSON body." }));
    return;
  }

  const { question, selectedAnswer, correctAnswer } = payload;
  if (!question || !selectedAnswer || !correctAnswer) {
    res.writeHead(400, { "Content-Type": "application/json", ...getCorsHeaders(req.headers.origin) });
    res.end(JSON.stringify({ error: "Missing question, selectedAnswer, or correctAnswer." }));
    return;
  }

  const prompt = `You are a strict and highly knowledgeable tutor.

A student has answered a multiple-choice question incorrectly. Your job is to correct them firmly but professionally.

Instructions:
- Clearly state that the student's answer is incorrect.
- Provide the correct answer immediately.
- Explain why the correct answer is right.
- Explain why the student's chosen answer is wrong.
- Keep the explanation clear, structured, and concise (not too long, but detailed enough to understand).
- Maintain a strict, teacher-like tone (no jokes, no fluff).

Question:
${question}

Student's Answer:
${selectedAnswer}

Correct Answer:
${correctAnswer}
`;

  try {
    const endpoint = `${GEMINI_BASE_URL.replace(/\/+$/, "")}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500000000,
      },
    };

    console.log(`Calling Gemini endpoint: ${GEMINI_MODEL}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errorText);
      res.writeHead(response.status || 500, { "Content-Type": "application/json", ...getCorsHeaders(req.headers.origin) });
      res.end(JSON.stringify({ error: `AI service error: ${errorText}` }));
      return;
    }

    const data = await response.json();
    const explanation = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!explanation) {
      console.error("Gemini returned no text:", JSON.stringify(data));
      res.writeHead(502, { "Content-Type": "application/json", ...getCorsHeaders(req.headers.origin) });
      res.end(JSON.stringify({ error: "AI returned no explanation." }));
      return;
    }

    console.log("Gemini explanation generated successfully. Length:", explanation.length);
    console.log("Explanation preview:", explanation.substring(0, 150));
    res.writeHead(200, { "Content-Type": "application/json", ...getCorsHeaders(req.headers.origin) });
    res.end(JSON.stringify({ explanation: explanation.trim() }));
  } catch (error) {
    console.error("AI backend error:", error?.message);
    res.writeHead(500, { "Content-Type": "application/json", ...getCorsHeaders(req.headers.origin) });
    res.end(JSON.stringify({ error: error?.message || "Unexpected server error." }));
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = req.url ? new URL(req.url, `http://${req.headers.host || "localhost"}`) : null;
  const pathname = requestUrl?.pathname.replace(/\/+$/, "") || "/";

  if (!req.url) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found." }));
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, getCorsHeaders(req.headers.origin));
    res.end();
    return;
  }

  if (pathname === "/api/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json", ...getCorsHeaders(req.headers.origin) });
    res.end(JSON.stringify({ status: "ok", model: GEMINI_MODEL }));
    return;
  }

  if (pathname === "/api/ai/explain" && req.method === "POST") {
    await handleAIRequest(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Route not found." }));
});

server.listen(PORT, () => {
  console.log(`✅ AI backend running on http://localhost:${PORT}`);
  console.log(`📡 Gemini model: ${GEMINI_MODEL}`);
  console.log(`📝 POST /api/ai/explain to generate explanations`);
});
