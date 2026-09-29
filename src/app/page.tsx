import { getAllCandidatesWithDetails } from "@/lib/data";
import UploadForm from "@/components/UploadForm";
import Dashboard from "@/components/Dashboard";
import RubricPanel from "@/components/RubricPanel";

export const dynamic = "force-dynamic";

const STEPS = [
  ["01", "Upload", "CV + applied role"],
  ["02", "Strip", "Name, email, phone are split off and never reach the AI"],
  ["03", "Score", "Every CV against both PM and SPM rubrics"],
  ["04", "Brief & draft", "Top 5 per role get a brief and invite; the rest a warm rejection"],
  ["05", "You decide", "One click sends. Nothing goes out without you"],
];

export default async function Home() {
  const candidates = await getAllCandidatesWithDetails();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20 pt-10 sm:px-8">
      <header className="rise mb-10 flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-3">Kargo · Product hiring · For Arjun</p>
          <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            The shortlist, <em className="text-clay">ranked by who you&rsquo;ve actually hired well.</em>
          </h1>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-muted">
          Scored against a rubric drawn from your best hires — not the job spec. The system recommends. You decide.
        </p>
      </header>

      <ol className="rise mb-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
        {STEPS.map(([n, t, d]) => (
          <li key={n} className="bg-card p-4">
            <span className="font-mono text-[0.7rem] text-clay">{n}</span>
            <p className="font-serif text-lg leading-tight">{t}</p>
            <p className="mt-1 text-xs leading-snug text-muted">{d}</p>
          </li>
        ))}
      </ol>

      <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <UploadForm />
        <RubricPanel />
      </div>

      <Dashboard candidates={candidates} />

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        <strong className="text-ink">Privacy.</strong> Personal details are extracted deterministically and stored separately.
        Only the redacted CV text is sent to the model, and emails are personalised with the stored name at send time.
      </footer>
    </main>
  );
}
