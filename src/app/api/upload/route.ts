import { NextRequest, NextResponse } from "next/server";
import { runUploadPipeline } from "@/lib/pipeline";
import type { RoleType } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const roleApplied = form.get("role_applied");
  const allowDuplicate = form.get("allow_duplicate") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (roleApplied !== "PM" && roleApplied !== "SPM") {
    return NextResponse.json({ error: "role_applied must be PM or SPM" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await runUploadPipeline({
      buffer,
      mimeType: file.type,
      filename: file.name,
      roleApplied: roleApplied as RoleType,
      allowDuplicate,
    });

    if ("duplicateDetected" in result) {
      return NextResponse.json(
        {
          duplicate: true,
          existingCandidateId: result.existingCandidateId,
          message:
            "This exact file has already been uploaded. Re-upload with allow_duplicate=true to process it as a separate record anyway.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Upload pipeline failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload pipeline failed" },
      { status: 500 }
    );
  }
}
