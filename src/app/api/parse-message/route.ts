import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 20;

/**
 * Freeform message → structured finance intent, using Claude. This is the
 * "smart" path of the chat: it understands paraphrased / messy Indonesian or
 * English instead of relying on rigid regex patterns.
 *
 * It is OPTIONAL by design — if ANTHROPIC_API_KEY is unset, or Claude errors
 * (e.g. credit exhausted), we return { kind: "none" } and the client silently
 * falls back to the local regex parser. No key, no cost, app still works.
 */

const Intent = z.object({
  kind: z
    .enum(["transaction", "transfer", "goal_contribution", "none"])
    .describe("Detected intent. Use 'none' if the message is not about recording money (e.g. a question or chit-chat)."),
  transaction: z
    .object({
      type: z.enum(["income", "expense"]),
      amount: z.number().describe("Amount in IDR as a plain integer, no separators (e.g. 50000)."),
      category: z.string().describe("MUST be one of the provided category names that matches the type."),
      description: z.string().describe("Short, clean label of 2-5 words. No amount, no wallet/payment-method name."),
      date: z.string().describe("ISO date YYYY-MM-DD. Resolve relative dates against 'today'. Default to today if unspecified."),
      wallet_id: z.string().nullable().describe("An id from the wallet list, or null if the user didn't indicate one."),
    })
    .nullable(),
  transfer: z
    .object({
      from_wallet_id: z.string().describe("Source wallet id from the list."),
      to_wallet_id: z.string().describe("Destination wallet id from the list."),
      amount: z.number(),
    })
    .nullable(),
  goal_contribution: z
    .object({
      goal_id: z.string().describe("Goal id from the list."),
      amount: z.number(),
      wallet_id: z.string().nullable().describe("Source wallet id, or null."),
    })
    .nullable(),
});

interface NamedId { id: string; name: string }
interface NamedType { name: string; type: string }

interface Body {
  text: string;
  locale?: "id" | "en";
  today?: string;
  wallets?: NamedId[];
  goals?: NamedId[];
  categories?: NamedType[];
}

const SYSTEM = `You are CallFin's finance parser. Turn one user message into a single structured intent.

Rules:
- "transaction": the user is recording an expense or income (e.g. "jajan seblak 25rb pake gopay", "gajian 5 juta masuk BCA").
- "transfer": moving money between two of the user's own wallets ("pindahin 500k dari BCA ke GoPay").
- "goal_contribution": putting money toward a savings goal ("nabung 200rb buat dana darurat").
- "none": anything else — questions, greetings, unclear messages.
- Indonesian money shorthand: "rb"/"k"/"ribu" = thousand, "jt"/"juta" = million. Output amount as a plain integer in IDR.
- category MUST be exactly one of the provided category names and match the transaction type (income vs expense).
- wallet_id / to_wallet_id / from_wallet_id / goal_id MUST be ids copied from the provided lists. If you can't confidently match one, use null (for wallet_id) or kind:"none".
- Keep description concise and human (2-5 words); never include the amount or the wallet name in it.
- Only the field matching "kind" should be non-null; set the others to null.`;

function buildPrompt(b: Body): string {
  const today = b.today || new Date().toISOString().slice(0, 10);
  const wallets = (b.wallets ?? []).map((w) => `- ${w.id}: ${w.name}`).join("\n") || "(none)";
  const goals = (b.goals ?? []).map((g) => `- ${g.id}: ${g.name}`).join("\n") || "(none)";
  const incomeCats = (b.categories ?? []).filter((c) => c.type === "income").map((c) => c.name).join(", ") || "(none)";
  const expenseCats = (b.categories ?? []).filter((c) => c.type === "expense").map((c) => c.name).join(", ") || "(none)";

  return `Today: ${today}
Language: ${b.locale === "en" ? "English" : "Indonesian"}

Wallets:
${wallets}

Goals:
${goals}

Expense categories: ${expenseCats}
Income categories: ${incomeCats}

User message: "${b.text}"`;
}

export async function POST(req: Request) {
  // No key → no AI. Client falls back to the local regex parser.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ kind: "none", source: "no-key" });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ kind: "none", source: "bad-request" });
  }
  if (!body.text || typeof body.text !== "string") {
    return Response.json({ kind: "none", source: "bad-request" });
  }

  try {
    const { object } = await generateObject({
      model: anthropic("claude-haiku-4-5"),
      schema: Intent,
      system: SYSTEM,
      prompt: buildPrompt(body),
      temperature: 0,
      maxOutputTokens: 1024, // the intent object is tiny — cap output to stay cheap
    });
    return Response.json({ ...object, source: "ai" });
  } catch (err) {
    console.error("[parse-message] AI parse failed, falling back:", err);
    return Response.json({ kind: "none", source: "error" });
  }
}
