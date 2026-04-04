import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";

export async function POST(req: Request) {
  try {
    const inputProps = await req.json();
    console.log("🎬 Starting render process for Dani composition with inputProps:", inputProps);

    // 1. Resolve paths
    const entryFile = path.resolve(process.cwd(), "src/index.ts");
    const outputLocation = path.resolve(process.cwd(), "public/renders/Dani.mp4");

    // 2. Ensure output directory exists
    const outputDir = path.dirname(outputLocation);
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // 3. Bundle the project
    console.log("📦 Bundling project...");
    const serveUrl = await bundle(entryFile);

    // 4. Select the "Dani" composition
    console.log("🔍 Selecting composition 'Dani'...");
    const composition = await selectComposition({
      serveUrl,
      id: "Dani",
      inputProps: inputProps || {},
    });

    // 5. Render the media
    console.log("🎥 Rendering frames...");
    await renderMedia({
      composition,
      serveUrl,
      outputLocation,
      codec: "h264",
      onProgress: ({ progress }) => {
        console.log(`Render progress: ${Math.floor(progress * 100)}%`);
      },
      chromiumOptions: {
        // Chromium options can be configured here if necessary
      },
      timeoutInMilliseconds: 1000 * 60 * 10,
    });

    console.log("✅ Render complete:", outputLocation);

    return Response.json({
      success: true,
      url: "/renders/Dani.mp4",
      filename: `Dani-Production-${new Date().getTime()}.mp4`
    });

  } catch (error) {
    console.error("❌ Render failed:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: String(error)
    }, { status: 500 });
  }
}
