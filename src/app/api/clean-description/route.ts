import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { generateDescription } from "@/lib/chat-ai";

export const maxDuration = 15;

interface Body {
  text: string;
  category: string;
  type: "income" | "expense";
  amount: number;
  wallet?: string;
  walletNames?: string[];
  locale?: "id" | "en";
}

const SYSTEM = `You are a finance app assistant. Your job is to turn a user's raw transaction note into a clean, short description.

Rules:
- Output ONLY the cleaned description. No JSON, no quotes, no markdown.
- 2–6 words, max 40 characters.
- Remove the amount, currency words, wallet/payment method names — those are stored separately.
- Keep meaningful nouns and adjectives (what was bought, where, why).
- Match the language of the input (Indonesian or English).
- Capitalize the first letter only.
- If the input is too short or has no real description content, output the category name as-is.`;

function userPrompt(b: Body) {
  return `Raw note: "${b.text}"
Category: ${b.category}
Type: ${b.type}
Amount: ${b.amount}
Wallet: ${b.wallet ?? "—"}
Other wallets to avoid mentioning: ${(b.walletNames ?? []).join(", ") || "—"}

Cleaned description:`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body.text || typeof body.text !== "string") {
      return Response.json({ description: body?.category ?? "Lainnya" }, { status: 200 });
    }

    // Local regex fallback — also used when no API key
    const fallback = generateDescription(
      body.text,
      body.category,
      body.walletNames ?? (body.wallet ? [body.wallet] : []),
      body.type,
    );

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ description: fallback, source: "local" });
    }

    try {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: SYSTEM,
        prompt: userPrompt(body),
        temperature: 0.3,
      });

      let cleaned = (text || "").trim();
      // Trim wrapping quotes / markdown the model may have added
      cleaned = cleaned.replace(/^["'`*_]+|["'`*_]+$/g, "").trim();
      // Cap length
      if (cleaned.length > 60) cleaned = cleaned.slice(0, 60).trim();
      if (cleaned.length < 2) cleaned = fallback;

      return Response.json({ description: cleaned, source: "ai" });
    } catch (err) {
      console.error("AI cleanup failed, using fallback:", err);
      return Response.json({ description: fallback, source: "local-fallback" });
    }
  } catch (err) {
    console.error("clean-description error:", err);
    return Response.json({ description: "Lainnya", source: "error" }, { status: 200 });
  }
}
