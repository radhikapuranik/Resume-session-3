"use client";

import { useState } from "react";
import { RUBRIC } from "@/lib/rubric";

export default function RubricPanel() {
  const [role, setRole] = useState<"PM" | "SPM">("PM");
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">The rubric</p>
          <h2 className="font-serif text-2xl leading-tight">What your best hires had in common</h2>
        </div>
        <div className="flex shrink-0 rounded-full border border-line bg-paper p-0.5 text-xs font-medium">
          {(["PM", "SPM"] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setOpen(null); }}
              className={`rounded-full px-3 py-1 transition ${role === r ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-line">
        {RUBRIC[role].map((c, i) => (
          <li key={c.name}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center gap-3 py-2.5 text-left">
              <span className="font-mono w-10 text-sm font-semibold text-clay">{c.weight}%</span>
              <span className="flex-1 text-sm font-medium">{c.name}</span>
              <span className="text-muted">{open === i ? "−" : "+"}</span>
            </button>
            {open === i && <p className="pb-3 pl-13 text-xs leading-relaxed text-muted" style={{ paddingLeft: "3.25rem" }}>{c.text}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Weights sum to 100% per role. SPM sets a higher bar on independence and cross-team reach.</p>
    </section>
  );
}
