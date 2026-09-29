## Hiring Dashboard

Single-user internal tool: upload a CV, get it scored against both the PM and SPM
rubrics, review AI-drafted interview briefs and emails, and send one email at a
time with an explicit Confirm click. Nothing sends automatically.

### Stack

- Next.js 16 (App Router), Tailwind
- Supabase (Postgres) for storage
- Gemini Flash (`@google/generative-ai`) for scoring, briefs, and email drafts
- Resend for sending

### Setup

1. **Supabase**
   - Create a project at supabase.com.
   - In the SQL editor, run `supabase/schema.sql`, then `supabase/seed_rubric.sql`
     (the second seeds `rubric_criteria` directly from `rubric.txt` — don't hand-edit
     the criteria wording anywhere else).
   - Copy the Project URL and the `service_role` key (Project Settings → API).

2. **Environment**
   - Copy `.env.local.example` to `.env.local` and fill in:
     - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY`
     - `RESEND_API_KEY` / `RESEND_FROM_EMAIL` (leave blank until ready — sending
       is disabled with a clear error until these are set)
   - `.env.local` is gitignored (`.env*` in `.gitignore`) — confirmed before any push.

3. **Run locally**
   ```
   npm install
   npm run dev
   ```

4. **Deploy**
   - Push to GitHub, import into Vercel, add the same env vars in the Vercel
     project settings, deploy.

### How the pipeline works

1. Upload a CV (PDF/DOCX) and pick PM or SPM on the upload form.
2. Text is extracted, then split into `personal_details` (name/email/phone —
   regex/heuristic only, never sent to any AI call) and `cv_content` (everything
   else). This happens before any AI call runs.
3. `cv_content` is scored against **both** rubrics (PM and SPM), regardless of
   which role was applied to, using the fixed criteria in `rubric_criteria`
   (seeded from `rubric.txt` — scoring never derives criteria from the JDs).
4. The top 5 (`TOP_CANDIDATES_PER_ROLE`) candidates per applied role, ranked by
   their own-role rubric total, get a 3-sentence interview brief.
5. Every candidate gets both an invite draft and a rejection draft (drafted from
   `cv_content` with a `[[CANDIDATE_NAME]]` placeholder — the real name is
   substituted only at render/send time, never seen by the model).
6. The dashboard shows two ranked columns (PM, SPM), a manual-review section for
   anything that failed extraction or has no detectable PII, and a duplicate-file
   warning on re-upload. Clicking Confirm sends exactly that one candidate's
   currently-relevant draft (invite if they're above the top-5 line, rejection if
   not) via Resend and marks it sent.

### Edge cases handled

- Unreadable/scanned PDF or empty DOCX → `needs_manual_review`, pipeline stops
  before scoring (no silent drop, no crash).
- No name/email/phone detected → flagged for manual review rather than sending
  with a blank or broken placeholder.
- Cross-role score is always shown on the card, even when it's stronger than the
  score for the role applied to.
- Re-uploading the same file (by content hash) is blocked by default; the UI asks
  before creating a second, explicitly-linked record instead of silently
  overwriting scores.
