import { auth } from "@clerk/nextjs/server";
import { supabaseServerAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  const bodyUnknown = await req.json() as { notificationId?: string };

  const notificationId =
    typeof bodyUnknown.notificationId === "string"
      ? bodyUnknown.notificationId.trim()
      : "";

  if (!notificationId) {
    return NextResponse.json({ error: "Missing notificationId" }, {
      status: 400,
    });
  }

  const { error } = await supabaseServerAdmin.from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    console.error("[push:read]", error);
  }

  return NextResponse.json({ success: true });
}
