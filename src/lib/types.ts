export type RoleType = "PM" | "SPM";

export type CandidateStatus =
  | "uploaded"
  | "needs_manual_review"
  | "scored"
  | "reviewed"
  | "sent";

export interface PersonalDetails {
  name: string | null;
  email: string | null;
  phone: string | null;
  other?: string[];
}

export interface Candidate {
  id: string;
  role_applied: RoleType;
  personal_details: PersonalDetails;
  cv_content: string | null;
  original_filename: string;
  file_hash: string | null;
  status: CandidateStatus;
  needs_manual_review: boolean;
  manual_review_reason: string | null;
  duplicate_of_candidate_id: string | null;
  created_at: string;
}

export interface ScoreRow {
  id: string;
  candidate_id: string;
  rubric_role: RoleType;
  criterion_name: string;
  criterion_score: number;
  criterion_reason: string;
  weight: number;
  created_at: string;
}

export interface RubricTotal {
  candidate_id: string;
  rubric_role: RoleType;
  weighted_total: number;
}

export interface Brief {
  candidate_id: string;
  brief_text: string;
  created_at: string;
}

export interface EmailDraft {
  id: string;
  candidate_id: string;
  draft_type: "invite" | "rejection";
  subject: string;
  body: string;
  sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface RubricCriterion {
  id: string;
  role: RoleType;
  criterion_name: string;
  description: string;
  weight: number;
  sort_order: number;
}

// Shape returned by GET /api/candidates: everything the dashboard needs for one card.
export interface CandidateWithDetails extends Candidate {
  scores: ScoreRow[];
  totals: RubricTotal[];
  brief: Brief | null;
  drafts: EmailDraft[];
}
