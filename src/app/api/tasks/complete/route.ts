import { auth } from "@clerk/nextjs/server";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type CompletionType = "task" | "reminder";

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
  const type = typeRaw as CompletionType;

  if (!id || (type !== "task" && type !== "reminder")) {
    return NextResponse.json(
      { error: "Missing id or type" },
      { status: 400 },
    );
  }

  const table = type === "reminder" ? "reminders" : "tasks";
  const userColumn = type === "reminder" ? "user_id" : "clerk_user_id";

  const { error } = await supabaseServerAdmin
    .from(table)
    .update({ completed: true })
    .eq("id", id)
    .eq(userColumn, userId);

  if (error) {
    console.error("[tasks:complete]", error);
    return NextResponse.json(
      {
        error: "Couldn't save completion. Check your connection and try again.",
      },
      { status: 500 },
    );
  }

  const cancelResult = await supabaseServerAdmin.from("notifications").update({
    status: "cancelled",
  })
    .eq("source_type", type)
    .eq("source_id", id)
    .eq("status", "pending");

  if (cancelResult.error) {
    console.error("[tasks:complete/cancel_notif]", cancelResult.error);
  }

  return NextResponse.json({ success: true });
}
