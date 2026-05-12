import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServerAdmin } from "@/lib/supabase/server";

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

  const bodyUnknown = await req.json() as { taskId?: string };

  const taskId =
    typeof bodyUnknown.taskId === "string" ? bodyUnknown.taskId.trim() : "";
  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const { error } = await supabaseServerAdmin.from("notifications").update({
    status: "cancelled",
  })
    .eq("user_id", userId)
    .eq("source_type", "task")
    .eq("source_id", taskId)
    .eq("status", "pending");

  if (error) {
    console.error("[push:cancel-task]", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
