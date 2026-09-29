"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateWithDetails, RoleType } from "@/lib/types";

function scoreBar(criterionScore: number) {
  const pct = Math.max(0, Math.min(100, (criterionScore / 10) * 100));
  return (
    <div className="h-1.5 w-full rounded bg-neutral-800">
      <div className="h-1.5 rounded bg-neutral-300" style={{ width: `${pct}%` }} />
    </div>
  );
}

function RubricBreakdown({
  candidate,
  rubricRole,
  total,
}: {
  candidate: CandidateWithDetails;
  rubricRole: RoleType;
  total: number | undefined;
}) {
  const scores = candidate.scores
    .filter((s) => s.rubric_role === rubricRole)
    .sort((a, b) => b.weight - a.weight);

  if (!scores.length) return null;

  return (
    <div className="rounded border border-neutral-800 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          {rubricRole} rubric
        </span>
        <span className="text-sm font-semibold">{total?.toFixed(1) ?? "—"} / 10</span>
      </div>
      <div className="space-y-2">
        {scores.map((s) => (
          <div key={s.criterion_name}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300">
                {s.criterion_name}{" "}
                <span className="text-neutral-500">({Math.round(s.weight * 100)}%)</span>
              </span>
              <span className="text-neutral-400">{s.criterion_score}/10</span>
            </div>
            {scoreBar(s.criterion_score)}
            <p className="mt-1 text-xs text-neutral-500">{s.criterion_reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CandidateCard({
  candidate,
  aboveLine,
}: {
  candidate: CandidateWithDetails;
  aboveLine: boolean;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pmTotal = candidate.totals.find((t) => t.rubric_role === "PM")?.weighted_total;
  const spmTotal = candidate.totals.find((t) => t.rubric_role === "SPM")?.weighted_total;

  const draftType = aboveLine ? "invite" : "rejection";
  const draft = candidate.drafts.find((d) => d.draft_type === draftType);

  const name = candidate.personal_details?.name;
  const email = candidate.personal_details?.email;

  async function confirmSend() {
    if (!draft) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft_type: draftType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Send failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Send failed — check your connection.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{name ?? "Name not detected"}</h3>
            {candidate.needs_manual_review && (
              <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs text-red-300">
                needs manual review
              </span>
            )}
            {candidate.duplicate_of_candidate_id && (
              <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">
                duplicate upload
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            {email ?? "no email detected"} · {candidate.original_filename}
          </p>
        </div>
        <span className="shrink-0 rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300">
          {candidate.status}
        </span>
      </div>

      {candidate.needs_manual_review && candidate.manual_review_reason && (
        <p className="mt-2 rounded bg-red-950/40 p-2 text-xs text-red-300">
          {candidate.manual_review_reason}
        </p>
      )}

      {(pmTotal !== undefined || spmTotal !== undefined) && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RubricBreakdown candidate={candidate} rubricRole="PM" total={pmTotal} />
          <RubricBreakdown candidate={candidate} rubricRole="SPM" total={spmTotal} />
        </div>
      )}

      {candidate.brief && (
        <div className="mt-3 rounded border border-blue-900/60 bg-blue-950/20 p-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-300">
            Interview brief
          </p>
          <p className="text-sm text-neutral-200">{candidate.brief.brief_text}</p>
        </div>
      )}

      {draft && (
        <div className="mt-3 rounded border border-neutral-800 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
              {draftType === "invite" ? "Interview invite draft" : "Rejection draft"}
            </span>
            {draft.sent ? (
              <span className="rounded bg-green-900/50 px-1.5 py-0.5 text-xs text-green-300">
                sent {draft.sent_at ? new Date(draft.sent_at).toLocaleString() : ""}
              </span>
            ) : (
              <button
                onClick={confirmSend}
                disabled={sending || !email}
                className="rounded bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
              >
                {sending ? "Sending…" : "Confirm"}
              </button>
            )}
          </div>
          <p className="text-sm font-medium text-neutral-200">{draft.subject}</p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-neutral-400">{draft.body}</p>
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
