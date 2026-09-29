import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ResponseSchema, Schema } from "@google/generative-ai";
import type { RoleType, RubricCriterion } from "./types";

function client() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
}

function model(responseSchema?: ResponseSchema) {
  return client().getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: responseSchema
      ? {
          responseMimeType: "application/json",
          responseSchema,
        }
      : undefined,
  });
}

export interface CriterionScoreResult {
  criterion_name: string;
  score: number;
  reason: string;
}

const SCORE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    scores: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          criterion_name: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
          reason: { type: SchemaType.STRING },
        },
        required: ["criterion_name", "score", "reason"],
      },
    },
  },
  required: ["scores"],
};

/**
 * Scores PII-stripped cv_content against one rubric (PM or SPM). Never receives
 * personal_details - callers must only pass cv_content.
 */
export async function scoreCvAgainstRubric(
  cvContent: string,
  rubricRole: RoleType,
  criteria: RubricCriterion[]
): Promise<CriterionScoreResult[]> {
  const criteriaBlock = criteria
    .map(
      (c, i) =>
        `${i + 1}. ${c.criterion_name} (weight ${Math.round(c.weight * 100)}%)\n   What a strong candidate looks like: ${c.description}`
    )
    .join("\n\n");

  const prompt = `You are scoring a candidate's CV against a fixed hiring rubric for the ${rubricRole} role. Use ONLY the criteria below - do not invent your own criteria or add others.

For each criterion, give:
- score: an integer 0-10 (0 = no evidence at all, 10 = exceptional, unambiguous evidence)
- reason: one sentence tied to SPECIFIC content in the CV below (quote or closely paraphrase the actual evidence). If there is no evidence for a criterion, say so plainly and score it low - do not be generous by default.

RUBRIC CRITERIA:
${criteriaBlock}

CANDIDATE CV CONTENT (personal identifying information has already been removed):
"""
${cvContent}
"""

Return JSON matching the schema, with exactly one entry per criterion listed above, using the exact criterion_name text given.`;

  const result = await model(SCORE_SCHEMA).generateContent(prompt);
  const parsed = JSON.parse(result.response.text()) as { scores: CriterionScoreResult[] };
  return parsed.scores;
}

/**
 * Generates a 3-sentence interview brief. Only ever called for top-ranked
 * candidates, and only ever receives cv_content plus their own scores.
 */
export async function generateInterviewBrief(
  cvContent: string,
  roleApplied: RoleType,
  scoreSummary: { criterion_name: string; score: number; reason: string }[]
): Promise<string> {
  const scoresBlock = scoreSummary
    .map((s) => `- ${s.criterion_name}: ${s.score}/10 - ${s.reason}`)
    .join("\n");

  const prompt = `Write a 3-sentence interview brief for a hiring manager about a candidate who ranked in the top tier for the ${roleApplied} role. Do not use the candidate's name (you don't have it) - refer to them as "the candidate".

Sentence 1: who they are (background, in one sentence, grounded in the CV).
Sentence 2: why they ranked here (tie to the strongest scoring evidence below).
Sentence 3: what to probe in the interview (a specific, pointed question or area of scrutiny - especially anything that reads strong on paper but is worth pressure-testing).

CANDIDATE'S RUBRIC SCORES:
${scoresBlock}

CV CONTENT (identifying info removed):
"""
${cvContent}
"""

Return only the 3 sentences as plain text, no preamble, no markdown.`;

  const result = await model().generateContent(prompt);
  return result.response.text().trim();
}

export interface EmailDraftResult {
  subject: string;
  body: string;
}

const EMAIL_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    subject: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
  },
  required: ["subject", "body"],
};

/**
 * Drafts an email using cv_content only. Uses the literal placeholder
 * "[[CANDIDATE_NAME]]" wherever the greeting needs the candidate's name -
 * the caller substitutes the real name from personal_details at render time,
 * after this call returns. The model never sees the real name.
 */
export async function draftCandidateEmail(
  cvContent: string,
  roleApplied: RoleType,
  outcome: "invite" | "rejection"
): Promise<EmailDraftResult> {
  const instructions =
    outcome === "invite"
      ? `Write a warm, specific interview invitation for the ${roleApplied} role. Reference 1-2 concrete things from their background that stood out (without inventing anything not in the CV). Propose that Arjun (the founder) will follow up to schedule a time. Keep it under 150 words.`
      : `Write a warm, specific, respectful rejection for the ${roleApplied} role. This is NOT a form letter - reference something genuine and specific from their background, be honest that the team decided to move forward with other candidates for this role, and leave the door open (e.g. inviting them to apply again in future, or wishing them well specifically). Do not sound like a form letter. Keep it under 150 words.`;

  const prompt = `Draft a candidate email. Use the literal placeholder [[CANDIDATE_NAME]] for the candidate's name anywhere a greeting or name would appear (e.g. "Hi [[CANDIDATE_NAME]],") - you do not know their real name and must not invent one.

${instructions}

CV CONTENT (identifying info removed):
"""
${cvContent}
"""

Return JSON with "subject" and "body". The body should include the [[CANDIDATE_NAME]] placeholder in the greeting and be plain text (no markdown), sign off from "Arjun".`;

  const result = await model(EMAIL_SCHEMA).generateContent(prompt);
  return JSON.parse(result.response.text()) as EmailDraftResult;
}
