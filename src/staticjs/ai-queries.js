import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractKeywords(description, maxKeywords = 15, taxonomy = null) {
  const system = "You are an SEO keyword extractor. Output JSON array only.";
  const user = `
Extract SEO keywords from the description below.

Rules:
- Output a JSON array of strings only; no extra text.
- ${maxKeywords} keyphrases max.
- Each keyphrase is 1–3 words, lowercase, no punctuation, no stopwords.
- Prioritize specific, intent-rich terms; deduplicate.
${taxonomy ? `- Only use terms from this taxonomy: ${JSON.stringify(taxonomy)}` : ""}
description: "${description.replace(/"/g, '\\"')}"
  `.trim();

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  const raw = resp.choices?.[0]?.message?.content?.trim() || "[]";

  // Best-effort JSON parsing
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}

// Extract topics using OpenAI GPT-4o mini via Chat Completions API
// Set your key: process.env.OPENAI_API_KEY (Node) or provide directly (browser: store securely!)
async function extractTopicsWithGpt(description, {
  apiKey = (typeof process !== "undefined" && process.env && process.env.OPENAI_API_KEY) || "",
  model = "gpt-4o-mini",
  maxTopics = 10,
  temperature = 0.2,
  extraGuidance = ""
} = {}) {
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  if (!description || !description.trim()) return [];

  const system = [
    "You extract concise, specific course topics suitable for schema.org Course.keywords/about.",
    "Return only JSON matching the schema. No explanations."
  ].join(" ");

  const user = `
Description:
${description}

Requirements:
- Extract ${maxTopics} or fewer topics, each 1–4 words.
- Prefer concrete subjects (e.g., "supervised learning", "window functions", "pandas") over generic words ("basics", "course").
- Remove duplicates and near-duplicates; normalize casing (lowercase except proper nouns like Python, AWS).
- No punctuation except hyphens, plus, dot when integral to term (e.g., "C++", ".NET").
- Output only JSON.
${extraGuidance || ""}
`.trim();

  // Strict JSON schema to keep output parseable
  const responseFormat = {
    type: "json_schema",
    json_schema: {
      name: "topics_schema",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          topics: {
            type: "array",
            items: {
              type: "string",
              minLength: 1,
              maxLength: 60
            },
            maxItems: maxTopics
          }
        },
        required: ["topics"]
      }
    }
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: responseFormat,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  // Parse the JSON object from the assistant message
  let topics = [];
  try {
    const content = data.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    topics = Array.isArray(parsed?.topics) ? parsed.topics : [];
  } catch (e) {
    // Fallback: try to salvage text
    topics = [];
  }

  // Final cleanup: de-dup, trim
  const seen = new Set();
  const cleaned = [];
  for (const t of topics) {
    const norm = String(t).trim();
    if (!norm) continue;
    const key = norm.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(norm);
    }
  }
  return cleaned;
}