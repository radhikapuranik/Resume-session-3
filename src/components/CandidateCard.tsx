"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateWithDetails, RoleType } from "@/lib/types";

function RubricBreakdown({ candidate, role }: { candidate: CandidateWithDetails; role: RoleType }) {
  const scores = candidate.scores.filter((s) => s.rubric_role === role).sort((a, b) => b.weight - a.weight);
  if (!scores.length) return null;
  return (
    <div className="space-y-3">
      {scores.map((s) => {
        const pct = Math.max(0, Math.min(100, s.criterion_score * 10));
        const color = s.criterion_score >= 7 ? "bg-moss" : s.criterion_score >= 4 ? "bg-ochre" : "bg-rust";
        return (
          <div key={s.criterion_name}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">
                {s.criterion_name} <span className="font-normal text-muted">· {Math.round(s.weight * 100)}%</span>
              </span>
              <span className="font-mono">{s.criterion_score}/10</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-line"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-xs leading-snug text-muted">{s.criterion_reason}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function CandidateCard({
  candidate,
  aboveLine,
  rank,
}: {
  candidate: CandidateWithDetails;
  aboveLine: boolean;
  rank?: number;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(aboveLine && rank === 1);
  const [view, setView] = useState<RoleType>(candidate.role_applied);

  const primary = candidate.role_applied;
  const total = (r: RoleType) => candidate.totals.find((t) => t.rubric_role === r)?.weighted_total;
  const mainTotal = total(primary);
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
      if (!res.ok) { setError(data.error ?? "Send failed"); return; }
      router.refresh();
    } catch {
      setError("Send failed — check your connection.");
    } finally {
      setSending(false);
    }
  }

  return (
    <article className={`rise rounded-xl border bg-card ${aboveLine && rank ? "border-ink/70" : "border-line"}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-4 p-4 text-left">
        {rank && <span className="font-serif text-3xl leading-none text-clay/80">{rank}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-serif text-xl leading-tight">{name ?? "Name not detected"}</h3>
            {candidate.needs_manual_review && <span className="rounded-full bg-rust-soft px-2 py-0.5 text-[0.68rem] text-rust">manual review</span>}
            {candidate.duplicate_of_candidate_id && <span className="rounded-full bg-ochre-soft px-2 py-0.5 text-[0.68rem] text-ochre">duplicate</span>}
            {draft?.sent && <span className="rounded-full bg-moss-soft px-2 py-0.5 text-[0.68rem] text-moss">sent</span>}
          </div>
          <p className="truncate text-xs text-muted">{email ?? "no email detected"} · {candidate.original_filename}</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-3xl leading-none">{mainTotal !== undefined ? mainTotal.toFixed(1) : "—"}<span className="text-sm text-muted">/10</span></p>
          <p className="eyebrow mt-1">{aboveLine && rank ? "invite" : rank ? "decline" : candidate.status.replace(/_/g, " ")}</p>
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line p-4">
          {candidate.needs_manual_review && candidate.manual_review_reason && (
            <p className="rounded-lg bg-rust-soft p-3 text-xs text-rust">{candidate.manual_review_reason}</p>
          )}

          {candidate.brief && (
            <div className="rounded-lg bg-clay-soft/60 p-3">
              <p className="eyebrow !text-clay mb-1">Why here · what to probe</p>
              <p className="text-sm leading-relaxed">{candidate.brief.brief_text}</p>
            </div>
          )}

          {candidate.totals.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="eyebrow">Rubric breakdown</p>
                <div className="flex rounded-full border border-line bg-paper p-0.5 text-[0.7rem] font-medium">
                  {(["PM", "SPM"] as const).map((r) => (
                    <button key={r} onClick={() => setView(r)} className={`rounded-full px-2.5 py-0.5 ${view === r ? "bg-ink text-paper" : "text-muted"}`}>
                      {r} {total(r)?.toFixed(1) ?? "—"}
                    </button>
                  ))}
                </div>
              </div>
              <RubricBreakdown candidate={candidate} role={view} />
            </div>
          )}

          {draft && (
            <div className="rounded-lg border border-line bg-paper p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="eyebrow">{draftType === "invite" ? "Interview invite · draft" : "Decline · draft"}</span>
                {draft.sent ? (
                  <span className="text-xs text-moss">Sent {draft.sent_at ? new Date(draft.sent_at).toLocaleString() : ""}</span>
                ) : (
                  <button
                    onClick={confirmSend}
                    disabled={sending || !email}
                    className="rounded-full bg-clay px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-ink disabled:opacity-50"
                  >
                    {sending ? "Sending…" : draftType === "invite" ? "Confirm & send invite" : "Confirm & send"}
                  </button>
                )}
              </div>
              <p className="text-sm font-medium">{draft.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{draft.body}</p>
              {error && <p className="mt-2 text-xs text-rust">{error}</p>}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
