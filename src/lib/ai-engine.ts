import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const bloom_SYSTEM_PROMPT = `You are bloom, a friendly and curious student who is eager to learn. The user is your teacher — they are trying to explain a concept to you.

YOUR PERSONALITY:
- You're enthusiastic but genuinely confused sometimes
- You ask "dumb" questions that are actually profound
- You never correct the teacher directly — even if they're wrong
- You use casual, relatable language ("wait, so you're saying...", "ohhh I think I get it but...")
- You occasionally make wrong inferences to test if the teacher catches them

YOUR CORE BEHAVIORS:

1. PROBING QUESTIONS: Ask follow-up questions that force the teacher to go deeper. Don't accept surface-level explanations. Examples:
   - "Wait, but WHY does that happen? Like what's the actual mechanism?"
   - "Okay but what would happen if [edge case]? Would it still work?"
   - "I'm confused — doesn't that contradict what you said about [earlier point]?"

2. WRONG INFERENCES (key technique): Sometimes deliberately state a wrong conclusion to see if the teacher catches it:
   - "Oh so you're saying X causes Y?" (when actually Y causes X)
   - "Wait, so that means [incorrect implication], right?"
   If the teacher corrects you: great, they understand it.
   If they agree with your wrong inference: they have a gap.

3. NAIVE ANALOGIES: Try to restate what they said using a simple analogy, sometimes getting it slightly wrong:
   - "So it's kind of like [imperfect analogy]?"

4. GAP DETECTION: If the teacher skips a step, says "obviously" or "basically", or hand-waves something, push on it:
   - "Hmm you said 'basically X' but I don't actually get that part — can you break it down more?"
   - "You skipped from A to C — what happens at B?"

5. CELEBRATION: When the teacher explains something clearly and correctly, be genuinely excited:
   - "OHHH that makes so much sense now!"
   - "Wait that's actually really cool — so [correct restatement]"

RULES:
- NEVER lecture or teach. You are the STUDENT.
- NEVER say "actually, that's not quite right" — instead, express confusion
- Keep responses SHORT (2-4 sentences usually). You're a student, not writing essays.
- Ask only ONE question at a time. Don't overwhelm the teacher.
- Match the complexity level to the topic — be more confused for hard topics
- Reference earlier parts of the conversation when relevant
- If reference material is provided, prioritize it over your general knowledge. If it conflicts with your general knowledge, trust the reference.

STRUCTURED OUTPUT:
After your conversational response, output a JSON block (fenced with \`\`\`json) containing your analysis:

{
  "concepts_discussed": [
    {
      "name": "concept name",
      "mastery_score": 0-100,
      "evidence": "brief explanation of why you scored this"
    }
  ],
  "gaps_detected": [
    {
      "concept": "concept name",
      "description": "what the teacher seems confused about or skipped"
    }
  ],
  "concept_relationships": [
    {
      "from": "concept A",
      "to": "concept B",
      "relationship": "requires|supports|contradicts|example_of",
      "reasoning": "brief explanation of why these concepts are connected"
    }
  ],
  "overall_session_mastery": 0-100,
  "next_probe_strategy": "what to probe next and why"
}

MASTERY SCORING RUBRIC (be strict — do NOT inflate scores):
- 0-20: Teacher only named the concept or gave a vague one-liner with no real explanation
- 20-40: Surface-level explanation — covers the basics but missing key mechanisms, details, or reasoning
- 40-60: Decent explanation with some depth, but hasn't been tested with probing questions yet
- 60-80: Teacher survived probing questions, corrected your wrong inferences, and showed real understanding
- 80-100: Deep mastery — teacher explained edge cases, caught your wrong inferences, connected to related concepts

CRITICAL SCORING RULES:
- A first-time explanation should NEVER score above 70, no matter how good — they haven't been tested yet
- Mastery must be EARNED through multiple exchanges, not given for a single explanation
- Only increase scores when the teacher successfully handles your probing questions or wrong inferences
- If the teacher agrees with your wrong inference, DROP the score by at least 15 points
- Use the "evidence" field to justify every score with specific examples from the conversation

The JSON analysis is parsed by the system and NOT shown to the user. Only your conversational response is shown.`;

export interface ConceptAnalysis {
  name: string;
  mastery_score: number;
  evidence: string;
}

export interface GapAnalysis {
  concept: string;
  description: string;
}

export interface RelationshipAnalysis {
  from: string;
  to: string;
  relationship: "requires" | "supports" | "contradicts" | "example_of";
  reasoning?: string;
}

export interface bloomAnalysis {
  concepts_discussed: ConceptAnalysis[];
  gaps_detected: GapAnalysis[];
  concept_relationships: RelationshipAnalysis[];
  overall_session_mastery: number;
  next_probe_strategy: string;
}

function findFirstJsonObject(text: string): { start: number; end: number } | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (ch === "}") {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          return { start, end: i };
        }
      }
    }
  }

  return null;
}

function extractJsonText(
  responseText: string,
): { jsonText: string; start: number; end: number } | null {
  const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && typeof jsonMatch.index === "number") {
    return {
      jsonText: jsonMatch[1],
      start: jsonMatch.index,
      end: jsonMatch.index + jsonMatch[0].length - 1,
    };
  }

  const trimmed = responseText.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      JSON.parse(trimmed);
      return { jsonText: trimmed, start: 0, end: responseText.length - 1 };
    } catch {
      // Fall through to brace matching.
    }
  }

  const match = findFirstJsonObject(responseText);
  if (!match) return null;

  const candidate = responseText.slice(match.start, match.end + 1);
  try {
    JSON.parse(candidate);
    return { jsonText: candidate, start: match.start, end: match.end };
  } catch {
    return null;
  }
}

export function parsebloomResponse(responseText: string): {
  chatMessage: string;
  analysis: bloomAnalysis | null;
} {
  let chatMessage = responseText.trim();
  let analysis: bloomAnalysis | null = null;

  const extracted = extractJsonText(responseText);
  if (!extracted) {
    return { chatMessage, analysis };
  }

  try {
    analysis = JSON.parse(extracted.jsonText);
  } catch {
    analysis = null;
  }

  if (analysis) {
    const before = responseText.slice(0, extracted.start).trim();
    const after = responseText.slice(extracted.end + 1).trim();
    chatMessage = [before, after].filter(Boolean).join("\n").trim();
  }

  return { chatMessage, analysis };
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function* streambloomResponse(
  history: ChatMessage[],
  userMessage: string,
  referenceContext?: string,
) {
  const trimmedUserMessage = userMessage.trim();
  const lastHistoryMessage = history[history.length - 1];
  const shouldAppendUserMessage =
    !!trimmedUserMessage &&
    !(
      lastHistoryMessage?.role === "user" &&
      lastHistoryMessage.content.trim() === trimmedUserMessage
    );

  const modelMessages: ChatMessage[] = [
    ...history,
    ...(shouldAppendUserMessage
      ? [{ role: "user" as const, content: trimmedUserMessage }]
      : []),
  ];

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      { role: "system", content: bloom_SYSTEM_PROMPT },
      ...(referenceContext
        ? [
            {
              role: "system" as const,
              content: `REFERENCE MATERIAL (prioritize this over general knowledge):\n${referenceContext}`,
            },
          ]
        : []),
      ...modelMessages,
    ],
    stream: true,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      fullResponse += text;
      yield { type: "text" as const, content: text };
    }
  }

  const { chatMessage, analysis } = parsebloomResponse(fullResponse);

  let finalAnalysis = analysis;

  if (!finalAnalysis) {
    try {
      const transcript = [
        ...modelMessages.map((m) =>
          `${m.role === "user" ? "Teacher" : "bloom"}: ${m.content}`
        ),
        `bloom: ${chatMessage}`,
      ].join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analyze this teaching conversation transcript. Output ONLY a JSON block with your analysis:

\`\`\`json
{
  "concepts_discussed": [
    { "name": "concept name", "mastery_score": 0-100, "evidence": "brief explanation" }
  ],
  "gaps_detected": [
    { "concept": "concept name", "description": "what the teacher seems confused about" }
  ],
  "concept_relationships": [
    { "from": "concept A", "to": "concept B", "relationship": "requires|supports|contradicts|example_of", "reasoning": "brief explanation of why these concepts are connected" }
  ],
  "overall_session_mastery": 0-100
}
\`\`\`

MASTERY SCORING RUBRIC (be strict):
- 0-20: Teacher only named the concept
- 20-40: Surface-level explanation
- 40-60: Decent explanation but untested
- 60-80: Survived probing questions with real understanding
- 80-100: Deep mastery with edge cases and connections`,
          },
          {
            role: "user",
            content: `Here is the transcript of a teaching session:\n\n${transcript}`,
          },
        ],
        max_tokens: 700,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      const { analysis: fallbackAnalysis } = parsebloomResponse(responseText);
      finalAnalysis = fallbackAnalysis;
    } catch {
      finalAnalysis = null;
    }
  }

  if (finalAnalysis) {
    yield { type: "analysis" as const, content: finalAnalysis };
  }

  yield { type: "done" as const, chatMessage, fullResponse };
}
