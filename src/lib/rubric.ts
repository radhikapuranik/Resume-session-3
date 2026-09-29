// Display copy of the rubric seeded in supabase/seed_rubric.sql (single source: rubric.txt).
export const RUBRIC = {
  PM: [
    { name: "Self-Initiated Ownership", weight: 30, text: "At least one instance of stepping outside the assigned role — solving an unassigned problem — and building a fix or way of working others adopted unprompted. Strong execution of assigned work alone doesn't count." },
    { name: "Ground-Floor Logistics Exposure", weight: 20, text: "Hands-on work inside freight, customs, carrier or port operations (not software built near it), described specifically enough to name what the work involved day to day." },
    { name: "Failure Into Durable Practice", weight: 25, text: "A specific moment something broke, and the response was a lasting change — a written process or build — not a one-off patch." },
    { name: "Trusted With Unsupervised Calls", weight: 25, text: "A named instance where someone let them decide alone on real stakes (money, client, deadline) with a concrete outcome. \"No manager above me\" alone doesn't count." },
  ],
  SPM: [
    { name: "Self-Initiated Ownership", weight: 35, text: "The PM pattern shown more than once, and at least once reaching beyond their own desk: other teams came to depend on what they built." },
    { name: "Ground-Floor Logistics Exposure", weight: 15, text: "PM bar, plus that operational grounding visibly shaped a later, higher-stakes technical or architectural call." },
    { name: "Failure Into Durable Practice", weight: 20, text: "PM bar, but the change survived contact with more than one team — other people changed how they work because of it." },
    { name: "Trusted With Unsupervised Calls", weight: 30, text: "PM bar at a cross-functional or strategic level, ideally with a direct quote or explicit statement from someone else confirming the trust." },
  ],
} as const;
