import { createHash } from "crypto";
import { supabaseAdmin } from "./supabase";
import { extractRawText, splitPersonalDetails } from "./extract";
import { scoreCvAgainstRubric, generateInterviewBrief, draftCandidateEmail } from "./gemini";
import type { RoleType, RubricCriterion } from "./types";

const ROLES: RoleType[] = ["PM", "SPM"];
const TOP_N = Number(process.env.TOP_CANDIDATES_PER_ROLE ?? 5);

export interface UploadPipelineResult {
  candidateId: string;
  status: string;
  needsManualReview: boolean;
  manualReviewReason: string | null;
  duplicateOfCandidateId: string | null;
}

export async function runUploadPipeline(opts: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  roleApplied: RoleType;
  allowDuplicate: boolean;
}): Promise<UploadPipelineResult | { duplicateDetected: true; existingCandidateId: string }> {
  const db = supabaseAdmin();
  const fileHash = createHash("sha256").update(opts.buffer).digest("hex");

  const { data: existing } = await db
    .from("candidates")
    .select("id")
    .eq("file_hash", fileHash)
    .is("duplicate_of_candidate_id", null)
    .limit(1)
    .maybeSingle();

  if (existing && !opts.allowDuplicate) {
    return { duplicateDetected: true, existingCandidateId: existing.id };
  }
  const duplicateOfCandidateId = existing?.id ?? null;

  const extraction = await extractRawText(opts.buffer, opts.mimeType, opts.filename);

  if (!extraction.ok) {
    const { data: inserted, error } = await db
      .from("candidates")
      .insert({
        role_applied: opts.roleApplied,
        personal_details: {},
        cv_content: null,
        original_filename: opts.filename,
        file_hash: fileHash,
        status: "needs_manual_review",
        needs_manual_review: true,
        manual_review_reason: extraction.error ?? "Text extraction failed",
        duplicate_of_candidate_id: duplicateOfCandidateId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return {
      candidateId: inserted.id,
      status: "needs_manual_review",
      needsManualReview: true,
      manualReviewReason: extraction.error ?? "Text extraction failed",
      duplicateOfCandidateId,
    };
  }

  const { personalDetails, cvContent } = splitPersonalDetails(extraction.rawText);

  const missingAllPii = !personalDetails.name && !personalDetails.email && !personalDetails.phone;

  const { data: candidate, error: insertErr } = await db
    .from("candidates")
    .insert({
      role_applied: opts.roleApplied,
      personal_details: personalDetails,
      cv_content: cvContent,
      original_filename: opts.filename,
      file_hash: fileHash,
      status: missingAllPii ? "needs_manual_review" : "uploaded",
      needs_manual_review: missingAllPii,
      manual_review_reason: missingAllPii
        ? "No name, email, or phone could be detected on the CV"
        : null,
      duplicate_of_candidate_id: duplicateOfCandidateId,
    })
    .select("id")
    .single();
  if (insertErr) throw insertErr;
  const candidateId = candidate.id as string;

  if (missingAllPii) {
    return {
      candidateId,
      status: "needs_manual_review",
      needsManualReview: true,
      manualReviewReason: "No name, email, or phone could be detected on the CV",
      duplicateOfCandidateId,
    };
  }

  await scoreCandidate(candidateId, cvContent, opts.roleApplied);

  return {
    candidateId,
    status: "scored",
    needsManualReview: false,
    manualReviewReason: null,
    duplicateOfCandidateId,
  };
}

async function scoreCandidate(candidateId: string, cvContent: string, roleApplied: RoleType) {
  const db = supabaseAdmin();

  const { data: allCriteria, error: critErr } = await db
    .from("rubric_criteria")
    .select("*")
    .order("sort_order", { ascending: true });
  if (critErr) throw critErr;
  const criteriaByRole = new Map<RoleType, RubricCriterion[]>();
  for (const role of ROLES) {
    criteriaByRole.set(
      role,
      (allCriteria as RubricCriterion[]).filter((c) => c.role === role)
    );
  }

  // Score against BOTH rubrics regardless of which role was applied to.
  for (const rubricRole of ROLES) {
    const criteria = criteriaByRole.get(rubricRole)!;
    const results = await scoreCvAgainstRubric(cvContent, rubricRole, criteria);

    const rows = results.map((r) => {
      const criterion = criteria.find((c) => c.criterion_name === r.criterion_name);
      const weight = criterion?.weight ?? 0;
      return {
        candidate_id: candidateId,
        rubric_role: rubricRole,
        criterion_name: r.criterion_name,
        criterion_score: r.score,
        criterion_reason: r.reason,
        weight,
      };
    });

    const { error: scoreErr } = await db.from("scores").upsert(rows, {
      onConflict: "candidate_id,rubric_role,criterion_name",
    });
    if (scoreErr) throw scoreErr;

    const weightedTotal = rows.reduce((sum, r) => sum + r.criterion_score * r.weight, 0);
    const { error: totalErr } = await db.from("rubric_totals").upsert(
      { candidate_id: candidateId, rubric_role: rubricRole, weighted_total: weightedTotal },
      { onConflict: "candidate_id,rubric_role" }
    );
    if (totalErr) throw totalErr;
  }

  await db.from("candidates").update({ status: "scored" }).eq("id", candidateId);

  // Draft both emails now so the dashboard has something to show immediately.
  await draftBothEmails(candidateId, cvContent, roleApplied);

  // Recompute which candidates are in the top N for this applied role and
  // (re)generate briefs for exactly that set.
  await recomputeTopBriefs(roleApplied);
}

async function draftBothEmails(candidateId: string, cvContent: string, roleApplied: RoleType) {
  const db = supabaseAdmin();

  const invite = await draftCandidateEmail(cvContent, roleApplied, "invite");
  const rejection = await draftCandidateEmail(cvContent, roleApplied, "rejection");

  const { error } = await db.from("email_drafts").upsert(
    [
      {
        candidate_id: candidateId,
        draft_type: "invite",
        subject: invite.subject,
        body: invite.body,
      },
      {
        candidate_id: candidateId,
        draft_type: "rejection",
        subject: rejection.subject,
        body: rejection.body,
      },
    ],
    { onConflict: "candidate_id,draft_type" }
  );
  if (error) throw error;
}

async function recomputeTopBriefs(roleApplied: RoleType) {
  const db = supabaseAdmin();

  // Resolve candidate ids that applied to this role (excluding duplicate records),
  // then rank them by their weighted total against the matching rubric. Done as
  // two plain queries + in-JS join rather than a Postgrest embedded filter, to
  // keep the query shape unambiguous.
  const { data: applicants, error: applicantsErr } = await db
    .from("candidates")
    .select("id")
    .eq("role_applied", roleApplied)
    .is("duplicate_of_candidate_id", null);
  if (applicantsErr) throw applicantsErr;
  const applicantIds = (applicants ?? []).map((c) => c.id as string);
  const applicantIdSet = new Set(applicantIds);

  let topIds = new Set<string>();
  if (applicantIds.length) {
    const { data: totals, error: totalsErr } = await db
      .from("rubric_totals")
      .select("candidate_id, weighted_total")
      .eq("rubric_role", roleApplied)
      .in("candidate_id", applicantIds)
      .order("weighted_total", { ascending: false })
      .limit(TOP_N);
    if (totalsErr) throw totalsErr;
    topIds = new Set((totals ?? []).map((r) => r.candidate_id as string));
  }

  // Drop briefs for candidates that fell out of the top N for this role.
  const { data: existingBriefs } = await db.from("briefs").select("candidate_id");
  const staleIds = (existingBriefs ?? [])
    .map((b) => b.candidate_id as string)
    .filter((id) => applicantIdSet.has(id) && !topIds.has(id));
  if (staleIds.length) {
    await db.from("briefs").delete().in("candidate_id", staleIds);
  }

  for (const id of topIds) {
    const { data: existingBrief } = await db
      .from("briefs")
      .select("candidate_id")
      .eq("candidate_id", id)
      .maybeSingle();
    if (existingBrief) continue; // already has a brief, don't regenerate

    const [{ data: candidate }, { data: scores }] = await Promise.all([
      db.from("candidates").select("cv_content").eq("id", id).single(),
      db
        .from("scores")
        .select("criterion_name, criterion_score, criterion_reason")
        .eq("candidate_id", id)
        .eq("rubric_role", roleApplied),
    ]);
    if (!candidate?.cv_content || !scores) continue;

    const briefText = await generateInterviewBrief(
      candidate.cv_content,
      roleApplied,
      scores.map((s) => ({
        criterion_name: s.criterion_name,
        score: s.criterion_score,
        reason: s.criterion_reason,
      }))
    );

    await db.from("briefs").upsert(
      { candidate_id: id, brief_text: briefText },
      { onConflict: "candidate_id" }
    );
  }
}
