"use client";

import { useState } from "react";
import type { CandidateWithDetails, RoleType } from "@/lib/types";
import CandidateCard from "./CandidateCard";

const TOP_N = 5;

function rankForRole(candidates: CandidateWithDetails[], role: RoleType) {
  return candidates
    .filter((c) => c.role_applied === role && !c.duplicate_of_candidate_id && !c.needs_manual_review)
    .sort((a, b) => {
      const at = a.totals.find((t) => t.rubric_role === role)?.weighted_total ?? -1;
      const bt = b.totals.find((t) => t.rubric_role === role)?.weighted_total ?? -1;
      return bt - at;
    });
}

function RoleColumn({ title, candidates, role }: { title: string; candidates: CandidateWithDetails[]; role: RoleType }) {
  const ranked = rankForRole(candidates, role);
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-4 flex items-baseline justify-between border-b border-ink pb-2">
        <h2 className="font-serif text-2xl">{title}</h2>
        <span className="font-mono text-xs text-muted">{ranked.length} ranked · top {TOP_N} invited</span>
      </div>
      <div className="space-y-4">
        {ranked.length === 0 && <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">No candidates yet — drop a CV above.</p>}
        {ranked.map((c, i) => (
          <div key={c.id}>
            {i === TOP_N && (
              <div className="mb-4 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-clay/50" />
                <span className="eyebrow !text-clay">The line · below receive a warm decline</span>
                <span className="h-px flex-1 bg-clay/50" />
              </div>
            )}
            <CandidateCard candidate={c} aboveLine={i < TOP_N} rank={i + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ candidates }: { candidates: CandidateWithDetails[] }) {
  const flagged = candidates.filter((c) => c.needs_manual_review);
  const [showFlagged, setShowFlagged] = useState(true);

  return (
    <div className="space-y-10">
      {flagged.length > 0 && (
        <div className="rounded-xl border border-rust/40 bg-rust-soft/50 p-4">
          <button onClick={() => setShowFlagged(!showFlagged)} className="flex w-full items-center justify-between">
            <h2 className="font-serif text-xl text-rust">Needs manual review ({flagged.length})</h2>
            <span className="text-xs text-rust">{showFlagged ? "hide" : "show"}</span>
          </button>
          {showFlagged && (
            <div className="mt-3 space-y-3">
              {flagged.map((c) => <CandidateCard key={c.id} candidate={c} aboveLine={false} />)}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-10 lg:flex-row">
        <RoleColumn title="Product Manager" candidates={candidates} role="PM" />
        <RoleColumn title="Senior Product Manager" candidates={candidates} role="SPM" />
      </div>
    </div>
  );
}
