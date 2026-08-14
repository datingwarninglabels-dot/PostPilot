import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Platform } from "./posts";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (client) return client;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY — copy .env.local.example to .env.local and fill in your Anthropic API key."
    );
  }
  client = new Anthropic();
  return client;
}

const PLATFORM_GUIDANCE: Record<Platform, string> = {
  facebook:
    "Facebook post: 1-3 short paragraphs, conversational, can include a call to action and relevant emoji sparingly.",
  instagram:
    "Instagram caption: punchy opening line, short line breaks, end with 3-8 relevant hashtags on their own line.",
  tiktok:
    "TikTok caption: very short (under 150 characters), casual/trendy tone, 3-5 hashtags.",
};

/** Drafts a single social post's copy from a plain-English product description. Pure text generation — no platform APIs involved. */
export async function draftPostContent(
  platform: Platform,
  productDescription: string
): Promise<string> {
  const response = await getClient().messages.create({
    model: "claude-opus-5",
    max_tokens: 1024,
    thinking: { type: "disabled" },
    output_config: { effort: "medium" },
    system:
      "You write social media product-announcement posts for a brand. Output ONLY the post copy itself — no preamble, no explanation, no quotation marks around it.",
    messages: [
      {
        role: "user",
        content: `Platform: ${platform}\nStyle: ${PLATFORM_GUIDANCE[platform]}\n\nNew product description:\n${productDescription}\n\nWrite the post.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return text content");
  }
  return textBlock.text.trim();
}
