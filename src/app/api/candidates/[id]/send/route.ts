import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendCandidateEmail, isResendConfigured } from "@/lib/resend";
import type { Candidate, EmailDraft } from "@/lib/types";

// TEMPORARY: no verified Resend domain yet, so every email goes to this address instead of the candidate's. Remove once a domain is verified.
const TEMP_RECIPIENT_OVERRIDE = "radhika_puranik@pg27.mesaschool.co";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const draftType = body.draft_type as "invite" | "rejection" | undefined;

  if (draftType !== "invite" && draftType !== "rejection") {
    return NextResponse.json({ error: "draft_type must be 'invite' or 'rejection'" }, { status: 400 });
  }

  if (!isResendConfigured()) {
    return NextResponse.json(
      { error: "Resend is not configured yet. Add RESEND_API_KEY to .env.local to enable sending." },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  const { data: candidate, error: candErr } = await db
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single<Candidate>();
  if (candErr || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const email = candidate.personal_details?.email;
  if (!email) {
    return NextResponse.json(
      { error: "This candidate has no detected email address — nothing to send to. Resolve via manual review." },
      { status: 400 }
    );
  }

  const { data: draft, error: draftErr } = await db
    .from("email_drafts")
    .select("*")
    .eq("candidate_id", id)
    .eq("draft_type", draftType)
    .single<EmailDraft>();
  if (draftErr || !draft) {
    return NextResponse.json({ error: "Draft not found for this candidate" }, { status: 404 });
  }
  if (draft.sent) {
    return NextResponse.json({ error: "This email has already been sent" }, { status: 409 });
  }

  const name = candidate.personal_details?.name;
  const greetName = name && name.trim() ? name.trim().split(/\s+/)[0] : "there";
  const subject = draft.subject.split("[[CANDIDATE_NAME]]").join(name ?? "there");
  const finalBody = draft.body.split("[[CANDIDATE_NAME]]").join(greetName);

  const sendResult = await sendCandidateEmail({ to: TEMP_RECIPIENT_OVERRIDE, subject, body: finalBody });
  if (!sendResult.ok) {
    return NextResponse.json({ error: sendResult.error }, { status: 502 });
  }

  const sentAt = new Date().toISOString();
  await db
    .from("email_drafts")
    .update({ sent: true, sent_at: sentAt, subject, body: finalBody })
    .eq("id", draft.id);
  await db.from("candidates").update({ status: "sent" }).eq("id", id);

  return NextResponse.json({ ok: true, sentAt });
}
