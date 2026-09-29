import { NextResponse } from "next/server";
import { getAllCandidatesWithDetails } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const candidates = await getAllCandidatesWithDetails();
    return NextResponse.json({ candidates });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load candidates" },
      { status: 500 }
    );
  }
}
