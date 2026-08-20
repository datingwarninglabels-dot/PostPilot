import "server-only";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type { Platform } from "./posts";

type Provider = "openai" | "gemini";

function getProvider(): Provider {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "openai") return "openai";
  if (raw === "gemini") return "gemini";
  throw new Error(`Unknown AI_PROVIDER "${raw}" — expected "openai" or "gemini".`);
}

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Missing OPENAI_API_KEY — copy .env.local.example to .env.local and fill in your OpenAI API key."
    );
  }
  openaiClient = new OpenAI();
  return openaiClient;
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (geminiClient) return geminiClient;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY — copy .env.local.example to .env.local and fill in your Gemini API key."
    );
  }
  geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return geminiClient;
}

const PLATFORM_GUIDANCE: Record<Platform, string> = {
  facebook:
    "Facebook post: 1-3 short paragraphs, conversational, can include a call to action and relevant emoji sparingly.",
  instagram:
    "Instagram caption: punchy opening line, short line breaks, end with 3-8 relevant hashtags on their own line.",
  tiktok:
    "TikTok caption: very short (under 150 characters), casual/trendy tone, 3-5 hashtags.",
};

const SYSTEM_PROMPT =
  "You write social media product-announcement posts for a brand. Output ONLY the post copy itself — no preamble, no explanation, no quotation marks around it.";

function userPrompt(platform: Platform, productDescription: string): string {
  return `Platform: ${platform}\nStyle: ${PLATFORM_GUIDANCE[platform]}\n\nNew product description:\n${productDescription}\n\nWrite the post.`;
}

async function draftWithOpenAI(platform: Platform, productDescription: string): Promise<string> {
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt(platform, productDescription) },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("OpenAI did not return text content");
  }
  return text.trim();
}

async function draftWithGemini(platform: Platform, productDescription: string): Promise<string> {
  const response = await getGeminiClient().interactions.create({
    model: "gemini-3.7-flash",
    input: userPrompt(platform, productDescription),
    system_instruction: SYSTEM_PROMPT,
  });

  const text = response.output_text;
  if (!text) {
    throw new Error("Gemini did not return text content");
  }
  return text.trim();
}

/** Drafts a single social post's copy from a plain-English product description. Pure text generation — no platform APIs involved. */
export async function draftPostContent(
  platform: Platform,
  productDescription: string
): Promise<string> {
  const provider = getProvider();
  return provider === "gemini"
    ? draftWithGemini(platform, productDescription)
    : draftWithOpenAI(platform, productDescription);
}

const REPLY_SYSTEM_PROMPT =
  "You write brief, on-brand replies to social media comments and DMs for a brand. Output ONLY the reply text — no preamble, no explanation, no quotation marks. Never promise something the brand can't guarantee.";

function replyUserPrompt(platform: Platform, commentBody: string, postContext?: string): string {
  const context = postContext ? `Original post this comment is on:\n${postContext}\n\n` : "";
  return `Platform: ${platform}\n${context}Comment/DM received:\n${commentBody}\n\nWrite a short, friendly reply.`;
}

async function draftReplyWithOpenAI(
  platform: Platform,
  commentBody: string,
  postContext?: string
): Promise<string> {
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    max_tokens: 512,
    messages: [
      { role: "system", content: REPLY_SYSTEM_PROMPT },
      { role: "user", content: replyUserPrompt(platform, commentBody, postContext) },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("OpenAI did not return text content");
  }
  return text.trim();
}

async function draftReplyWithGemini(
  platform: Platform,
  commentBody: string,
  postContext?: string
): Promise<string> {
  const response = await getGeminiClient().interactions.create({
    model: "gemini-3.7-flash",
    input: replyUserPrompt(platform, commentBody, postContext),
    system_instruction: REPLY_SYSTEM_PROMPT,
  });

  const text = response.output_text;
  if (!text) {
    throw new Error("Gemini did not return text content");
  }
  return text.trim();
}

/** Drafts a reply to an incoming comment/DM. Never sent automatically — only ever a starting point for the admin to review, edit, and approve. */
export async function draftReplyContent(
  platform: Platform,
  commentBody: string,
  postContext?: string
): Promise<string> {
  const provider = getProvider();
  return provider === "gemini"
    ? draftReplyWithGemini(platform, commentBody, postContext)
    : draftReplyWithOpenAI(platform, commentBody, postContext);
}
