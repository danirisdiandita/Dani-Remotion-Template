import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createTaskAPI } from "@/lib/cloud-task";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Creating the task to be processed asynchronously
    // This calls the internal render endpoint (via Cloud Run / Task URL)
    await createTaskAPI({
      body: JSON.stringify({ projectId }),
    });

    return NextResponse.json({ success: true, message: "Rendering task queued successfully" });
  } catch (error: any) {
    console.error("Async Render Queue Error:", error);
    return NextResponse.json(
      { error: "Failed to queue render task", details: error.message },
      { status: 500 }
    );
  }
}
