import { auth } from "@clerk/nextjs/server";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type SnoozeType = "task" | "reminder";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseServerAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const payload = await req.json() as {
    id?: unknown;
    type?: unknown;
    minutes?: unknown;
  };

  const id =
    typeof payload.id === "string"
      ? payload.id.trim()
      : typeof payload.id === "number"
        ? String(payload.id)
        : "";

  const typeRaw = typeof payload.type === "string"
    ? payload.type.trim()
    : "";
  const type = typeRaw as SnoozeType;

  const rawMinutes =
    typeof payload.minutes === "number" && Number.isFinite(payload.minutes)
      ? payload.minutes
      : 10;

  const minutes =
    typeof rawMinutes === "number" && Number.isFinite(rawMinutes)
      ? Math.max(1, Math.min(24 * 60, Math.round(rawMinutes)))
      : 10;

  if (!id || (type !== "task" && type !== "reminder")) {
    return NextResponse.json(
      { error: "Missing id or type" },
      { status: 400 },
    );
  }

  const newDue = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  const table = type === "reminder" ? "reminders" : "tasks";
  const userColumn = type === "reminder" ? "user_id" : "clerk_user_id";

  const { error } = await supabaseServerAdmin.from(table).update({
    due_date: newDue,
  }).eq("id", id).eq(userColumn, userId);

  if (error) {
    console.error("[tasks:snooze]", error);
    return NextResponse.json(
      {
        error: "Couldn't snooze task. Check your connection and try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, new_due_date: newDue });
}
