import { getAllCandidatesWithDetails } from "@/lib/data";
import UploadForm from "@/components/UploadForm";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const candidates = await getAllCandidatesWithDetails();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <h1 className="mb-1 text-2xl font-bold">Hiring Dashboard</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Upload a CV, review the scored breakdown, and confirm one email at a time.
      </p>
      <div className="mb-8">
        <UploadForm />
      </div>
      <Dashboard candidates={candidates} />
    </main>
  );
}
