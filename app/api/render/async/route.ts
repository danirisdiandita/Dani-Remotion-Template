import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createTaskAPI } from "@/lib/cloud-task";
import { ENV } from "@/config/constant";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { projectId, compositionType, ...props } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    let targetUrl = ENV.gcp.endpointUrl;
    if (compositionType === "nicstudy") {
      targetUrl = targetUrl?.replace("/api/render", "/api/nicstudy");
    } else if (compositionType === "carousel") {
      targetUrl = targetUrl?.replace("/api/render", "/api/carousel");
    }

    // Creating the task to be processed asynchronously
    await createTaskAPI({
      body: JSON.stringify({ projectId, compositionType, ...props }),
      url: targetUrl
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
