"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RoleType = "PM" | "SPM";

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<RoleType>("PM");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDuplicate, setPendingDuplicate] = useState<{ file: File; role: RoleType } | null>(
    null
  );

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
        setMessage(data.message ?? "Duplicate file detected.");
        return;
      }

      if (!res.ok) {
        setMessage(data.error ?? "Upload failed.");
        return;
      }

      setPendingDuplicate(null);
      if (data.needsManualReview) {
        setMessage(`Uploaded, but flagged for manual review: ${data.manualReviewReason}`);
      } else {
        setMessage("Uploaded and scored.");
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setMessage("Upload failed — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleType)}
          disabled={busy}
          className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm"
        >
          <option value="PM">Product Manager</option>
          <option value="SPM">Senior Product Manager</option>
        </select>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) submit(file, role, false);
          }}
          className="text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:text-neutral-100 hover:file:bg-neutral-700"
        />
        {busy && <span className="text-sm text-neutral-400">Processing…</span>}
      </div>

      {message && <p className="mt-3 text-sm text-neutral-300">{message}</p>}

      {pendingDuplicate && (
        <div className="mt-3 flex items-center gap-3 rounded border border-amber-700 bg-amber-950/40 p-3 text-sm">
          <span>This file was already uploaded. Process it again as a separate record?</span>
          <button
            className="rounded bg-amber-700 px-3 py-1 text-white hover:bg-amber-600"
            disabled={busy}
            onClick={() => submit(pendingDuplicate.file, pendingDuplicate.role, true)}
          >
            Upload anyway
          </button>
          <button
            className="rounded border border-neutral-700 px-3 py-1 hover:bg-neutral-800"
            onClick={() => setPendingDuplicate(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
