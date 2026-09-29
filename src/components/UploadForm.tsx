"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RoleType = "PM" | "SPM";

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<RoleType>("PM");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "warn" | "err" } | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{ file: File; role: RoleType } | null>(null);

  async function submit(file: File, roleApplied: RoleType, allowDuplicate: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("role_applied", roleApplied);
      form.set("allow_duplicate", String(allowDuplicate));

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (res.status === 409 && data.duplicate) {
        setPendingDuplicate({ file, role: roleApplied });
        setMessage({ text: data.message ?? "Duplicate file detected.", tone: "warn" });
        return;
      }
      if (!res.ok) {
        setMessage({ text: data.error ?? "Upload failed.", tone: "err" });
        return;
      }
      setPendingDuplicate(null);
      setMessage(
        data.needsManualReview
          ? { text: `Flagged for manual review: ${data.manualReviewReason}`, tone: "warn" }
          : { text: `${file.name} scored against both rubrics.`, tone: "ok" }
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setMessage({ text: "Upload failed — check your connection and try again.", tone: "err" });
    } finally {
      setBusy(false);
    }
  }

  const tone = { ok: "text-moss", warn: "text-ochre", err: "text-rust" };

  return (
    <section className="rounded-xl border border-line bg-card p-5">
      <p className="eyebrow">Add a candidate</p>
      <h2 className="mb-4 font-serif text-2xl leading-tight">Drop in a CV</h2>

      <div className="mb-3 flex rounded-full border border-line bg-paper p-0.5 text-sm font-medium">
        {(["PM", "SPM"] as const).map((r) => (
          <button
            key={r}
            disabled={busy}
            onClick={() => setRole(r)}
            className={`flex-1 rounded-full px-3 py-1.5 transition ${role === r ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
          >
            {r === "PM" ? "Product Manager" : "Senior PM"}
          </button>
        ))}
      </div>

      <div
        onClick={() => !busy && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) submit(f, role, false);
        }}
        className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 text-center transition ${
          drag ? "border-clay bg-clay-soft" : "border-line hover:border-clay/60"
        } ${busy ? "cursor-wait opacity-70" : ""}`}
      >
        {busy ? (
          <>
            <span className="mb-2 h-5 w-5 animate-spin rounded-full border-2 border-clay border-t-transparent" />
            <p className="text-sm">Reading, redacting, scoring… (~20s)</p>
          </>
        ) : (
          <>
            <p className="font-serif text-lg">Drag a CV here</p>
            <p className="text-xs text-muted">or click to browse · PDF or DOCX · applying as {role}</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) submit(f, role, false);
          }}
        />
      </div>

      {message && <p className={`mt-3 text-sm ${tone[message.tone]}`}>{message.text}</p>}

      {pendingDuplicate && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-ochre-soft p-3 text-sm">
          <span className="flex-1">Already uploaded. Process again as a separate record?</span>
          <button className="rounded-full bg-ink px-3 py-1 text-xs text-paper" disabled={busy}
            onClick={() => submit(pendingDuplicate.file, pendingDuplicate.role, true)}>Upload anyway</button>
          <button className="rounded-full border border-line px-3 py-1 text-xs" onClick={() => setPendingDuplicate(null)}>Cancel</button>
        </div>
      )}
    </section>
  );
}
