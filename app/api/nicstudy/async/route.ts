import { NextResponse } from "next/server";
// import { auth } from "@/lib/auth";
// import { headers } from "next/headers"; 
// adding change little
import { createTaskAPI } from "@/lib/cloud-task";
import { ENV } from "@/config/constant";

export async function POST(req: Request) {
  // const session = await auth.api.getSession({
  //   headers: await headers(),
  // });

  // if (!session) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Determine target URL for the actual rendering logic
    const targetUrl = ENV.gcp.endpointUrl?.replace("/api/render", "/api/nicstudy");

    // Create the Cloud Task to process rendering in the background
    await createTaskAPI({
      body: JSON.stringify({ ...body, compositionType: "nicstudy" }),
      url: targetUrl
    });

    return NextResponse.json({
      success: true,
      message: "NicStudy carousel rendering task queued successfully"
    });
  } catch (error: any) {
    console.error("NicStudy Async Error:", error);
    return NextResponse.json(
      { error: "Failed to queue nicstudy task", details: error.message },
      { status: 500 }
    );
  }
}
