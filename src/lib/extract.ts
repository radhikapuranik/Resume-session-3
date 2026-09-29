import mammoth from "mammoth";
import type { PersonalDetails } from "./types";

export interface ExtractionResult {
  ok: boolean;
  rawText: string;
  error?: string;
}

export async function extractRawText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<ExtractionResult> {
  try {
    const isDocx =
      mimeType.includes("wordprocessingml") ||
      filename.toLowerCase().endsWith(".docx");
    const isPdf = mimeType.includes("pdf") || filename.toLowerCase().endsWith(".pdf");

    if (isDocx) {
      const { value } = await mammoth.extractRawText({ buffer });
      if (!value || !value.trim()) {
        return { ok: false, rawText: "", error: "DOCX produced no extractable text" };
      }
      return { ok: true, rawText: value };
    }

    if (isPdf) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        if (!result.text || !result.text.trim()) {
          return { ok: false, rawText: "", error: "PDF produced no extractable text (likely scanned/image-only)" };
        }
        return { ok: true, rawText: result.text };
      } finally {
        await parser.destroy();
      }
    }

    return { ok: false, rawText: "", error: `Unsupported file type: ${mimeType || filename}` };
  } catch (err) {
    return {
      ok: false,
      rawText: "",
      error: err instanceof Error ? err.message : "Unknown extraction error",
    };
  }
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Matches phone numbers with optional country code, spaces/dashes/dots/parens,
// 7-15 digits total. Deliberately permissive since CV formats vary a lot.
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{2,4}\)[-.\s]?)?\d{3,5}[-.\s]?\d{3,5}(?:[-.\s]?\d{2,4})?/g;

function looksLikeName(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.length > 60) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  if (/\d/.test(trimmed)) return false;
  if (/[@/|]/.test(trimmed)) return false;
  // Every word should start with a capital letter (allows for names like "O'Brien", "van Dyk")
  return words.every((w) => /^[A-Z]/.test(w) || /^(van|de|der|von|bin|al)$/i.test(w));
}

const SECTION_HEADERS =
  /^(experience|education|skills|projects|summary|objective|profile|contact|references|certifications|achievements|work history|employment)/i;

/**
 * Splits raw CV text into personal_details (name/email/phone/other identifiers)
 * and cv_content (everything else). Deliberately regex/heuristic-only, never an
 * AI call, so PII never reaches any model even in this first step.
 */
export function splitPersonalDetails(rawText: string): {
  personalDetails: PersonalDetails;
  cvContent: string;
} {
  const lines = rawText.split(/\r?\n/);

  const emails = Array.from(new Set(rawText.match(EMAIL_RE) ?? []));
  const email = emails[0] ?? null;

  const phoneCandidates = (rawText.match(PHONE_RE) ?? [])
    .map((p) => p.trim())
    .filter((p) => p.replace(/\D/g, "").length >= 7 && p.replace(/\D/g, "").length <= 15);
  const phone = phoneCandidates[0] ?? null;

  // Name: look at the first several non-empty lines (CVs almost always lead
  // with the candidate's name), skipping anything that's clearly a header,
  // an email, or a phone number.
  let name: string | null = null;
  for (const line of lines.slice(0, 8)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (SECTION_HEADERS.test(trimmed)) break;
    if (EMAIL_RE.test(trimmed) || PHONE_RE.test(trimmed)) continue;
    if (looksLikeName(trimmed)) {
      name = trimmed;
      break;
    }
  }

  const linkedinMatches = rawText.match(/linkedin\.com\/[^\s|,]+/gi) ?? [];
  const other = Array.from(new Set(linkedinMatches));

  // Redact identified PII lines/substrings from the body that goes to the AI.
  let cvContent = rawText;
  if (name) {
    cvContent = cvContent.split(name).join("[REDACTED]");
  }
  for (const e of emails) {
    cvContent = cvContent.split(e).join("[REDACTED]");
  }
  for (const p of phoneCandidates) {
    cvContent = cvContent.split(p).join("[REDACTED]");
  }
  for (const l of other) {
    cvContent = cvContent.split(l).join("[REDACTED]");
  }

  return {
    personalDetails: { name, email, phone, other: other.length ? other : undefined },
    cvContent: cvContent.trim(),
  };
}
