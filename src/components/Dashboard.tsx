"use client";

import type { CandidateWithDetails, RoleType } from "@/lib/types";
import CandidateCard from "./CandidateCard";

const TOP_N = 5;

function rankForRole(candidates: CandidateWithDetails[], role: RoleType) {
  return candidates
    .filter(
      (c) => c.role_applied === role && !c.duplicate_of_candidate_id && !c.needs_manual_review
    )
    .sort((a, b) => {
      const at = a.totals.find((t) => t.rubric_role === role)?.weighted_total ?? -1;
      const bt = b.totals.find((t) => t.rubric_role === role)?.weighted_total ?? -1;
      return bt - at;
    });
}

function RoleColumn({ title, candidates, role }: { title: string; candidates: CandidateWithDetails[]; role: RoleType }) {
  const ranked = rankForRole(candidates, role);

  return (
    <div className="flex-1 min-w-0">
      <h2 className="mb-3 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-neutral-500">({ranked.length})</span>
      </h2>
      <div className="space-y-3">
        {ranked.length === 0 && (
          <p className="text-sm text-neutral-500">No candidates yet.</p>
        )}
        {ranked.map((c, i) => (
          <CandidateCard key={c.id} candidate={c} aboveLine={i < TOP_N} />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ candidates }: { candidates: CandidateWithDetails[] }) {
  const flagged = candidates.filter((c) => c.needs_manual_review);

  return (
    <div className="space-y-6">
      {flagged.length > 0 && (
        <div className="rounded-lg border border-red-900 bg-red-950/30 p-4">
          <h2 className="mb-2 text-sm font-semibold text-red-300">
            Needs manual review ({flagged.length})
          </h2>
          <div className="space-y-3">
            {flagged.map((c) => (
              <CandidateCard key={c.id} candidate={c} aboveLine={false} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <RoleColumn title="Product Manager" candidates={candidates} role="PM" />
        <RoleColumn title="Senior Product Manager" candidates={candidates} role="SPM" />
      </div>
    </div>
  );
}
