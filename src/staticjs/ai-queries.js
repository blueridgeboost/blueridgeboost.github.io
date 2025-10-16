import OpenAI from "openai";

import path from 'path';
import dotenv from 'dotenv';
// Construct the path to the .env file
const envPath = path.join(process.cwd(), '..', '.env');
// Load the .env file
await dotenv.config({ path: envPath });

const client = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://api.poe.com/v1",
 });

export async function extractKeywords(description, maxKeywords = 5, taxonomy = null) {
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
        model: "gpt-5",
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
export async function extractTopics(description, maxTopics=5, extraGuidance="") {
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
        - Output a JSON array of strings only; no extra text.
        ${extraGuidance || ""}
        `.trim();

     const resp = await client.chat.completions.create({
        model: "gpt-5",
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