import { supabaseAdmin } from "./supabase";
import type {
  Candidate,
  CandidateWithDetails,
  ScoreRow,
  RubricTotal,
  Brief,
  EmailDraft,
} from "./types";

export async function getAllCandidatesWithDetails(): Promise<CandidateWithDetails[]> {
  const db = supabaseAdmin();

  const [{ data: candidates, error: candErr }, { data: scores }, { data: totals }, { data: briefs }, { data: drafts }] =
    await Promise.all([
      db.from("candidates").select("*").order("created_at", { ascending: false }),
      db.from("scores").select("*"),
      db.from("rubric_totals").select("*"),
      db.from("briefs").select("*"),
      db.from("email_drafts").select("*"),
    ]);

  if (candErr) throw new Error(candErr.message);

  const scoresByCandidate = new Map<string, ScoreRow[]>();
  for (const s of (scores ?? []) as ScoreRow[]) {
    const arr = scoresByCandidate.get(s.candidate_id) ?? [];
    arr.push(s);
    scoresByCandidate.set(s.candidate_id, arr);
  }

  const totalsByCandidate = new Map<string, RubricTotal[]>();
  for (const t of (totals ?? []) as RubricTotal[]) {
    const arr = totalsByCandidate.get(t.candidate_id) ?? [];
    arr.push(t);
    totalsByCandidate.set(t.candidate_id, arr);
  }

  const briefByCandidate = new Map<string, Brief>();
  for (const b of (briefs ?? []) as Brief[]) {
    briefByCandidate.set(b.candidate_id, b);
  }

  const draftsByCandidate = new Map<string, EmailDraft[]>();
  for (const d of (drafts ?? []) as EmailDraft[]) {
    const arr = draftsByCandidate.get(d.candidate_id) ?? [];
    arr.push(d);
    draftsByCandidate.set(d.candidate_id, arr);
  }

  return ((candidates ?? []) as Candidate[]).map((c) => ({
    ...c,
    scores: scoresByCandidate.get(c.id) ?? [],
    totals: totalsByCandidate.get(c.id) ?? [],
    brief: briefByCandidate.get(c.id) ?? null,
    drafts: draftsByCandidate.get(c.id) ?? [],
  }));
}
