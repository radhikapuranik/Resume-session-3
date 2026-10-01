import type { CandidateWithDetails, RoleType } from "./types";

export const BAR = 5.0;

export type Decision =
  | { kind: "invite" }
  | { kind: "reject"; note: string | null }
  | { kind: "choose"; note: string };

export function roleTotal(c: CandidateWithDetails, role: RoleType): number | undefined {
  return c.totals.find((t) => t.rubric_role === role)?.weighted_total;
}

function names(list: string[]): string {
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

// One-line call built from the criterion-level scores (not the headline number).
function criteriaCall(c: CandidateWithDetails, role: RoleType): string {
  const scores = c.scores.filter((s) => s.rubric_role === role).sort((a, b) => b.weight - a.weight);
  const weak = scores.filter((s) => s.criterion_score < 4).map((s) => s.criterion_name.toLowerCase());
  const strong = scores.filter((s) => s.criterion_score >= 7).map((s) => s.criterion_name.toLowerCase());
  const parts: string[] = [];
  if (weak.length) parts.push(`Weak on ${names(weak)}`);
  if (strong.length) parts.push(`${weak.length ? "some" : "Real"} strength on ${names(strong)}`);
  if (!parts.length) parts.push("Middling across every criterion with nothing standing out");
  return parts.join("; ") + ".";
}

/** `ranked` = non-duplicate, non-flagged candidates for the role, sorted best-first. */
export function decide(c: CandidateWithDetails, role: RoleType, ranked: CandidateWithDetails[], topN: number): Decision {
  const score = roleTotal(c, role);
  const rank = ranked.findIndex((r) => r.id === c.id);
  if (score === undefined || score >= BAR) return rank >= 0 && rank < topN ? { kind: "invite" } : { kind: "reject", note: null };

  const stronger = ranked.filter((r) => r.id !== c.id && (roleTotal(r, role) ?? -1) > BAR).length;
  const call = criteriaCall(c, role);

  if (stronger > 0) {
    return {
      kind: "reject",
      note: `${call} ${stronger} stronger ${role} candidate${stronger > 1 ? "s are" : " is"} already in the pool, so this one doesn't need to be chased. Rejection is the default.`,
    };
  }
  const alone = ranked.length <= 1;
  const position = alone
    ? "the only one scored for this role so far"
    : rank === 0
      ? "currently the strongest option for this role"
      : `ranked #${rank + 1} of ${ranked.length} for this role, with nobody above the bar yet`;
  return {
    kind: "choose",
    note: `${call} They are ${position}, but below the bar and no stronger ${role} candidate exists yet. Consider holding the invite until more candidates are in, unless you want to move now — your call.`,
  };
}
