import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { downloadFromS3 } from "@/lib/s3-utils";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      throw new Error("Missing projectId in request");
    }

    console.log(`🎬 Starting render process for Project ID: ${projectId}`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        compositions: {
          orderBy: { order: 'asc' },
          include: {
            assets: {
              include: { asset: true }
            },
            overlayTexts: true,
          }
        }
      }
    });

    if (!project) throw new Error("Project not found");

    const counter = project.counter || 0;
    const videoSequence = [];
    const tmpDirEnv = process.env.TMP_RENDER_DIR || "./public/tmp";
    const absoluteTmpDir = path.resolve(process.cwd(), tmpDirEnv);

    // Ensure our tmp directory exists
    if (!fs.existsSync(absoluteTmpDir)) {
      await fs.promises.mkdir(absoluteTmpDir, { recursive: true });
    }

    // Build the sequence using the requested modulo logic and download files
    for (const comp of project.compositions) {
      const videoAssets = comp.assets.filter((a: any) => a.asset.type === 'video');
      const texts = comp.overlayTexts;

      if (videoAssets.length === 0 || texts.length === 0) {
        throw new Error(`Composition order ${comp.order} is missing assets or texts.`);
      }



      const assetIndex = counter % videoAssets.length;
      const textIndex = counter % texts.length;

      const s3Key = videoAssets[assetIndex].asset.s3Key;
      const overlayText = texts[textIndex].text;

      // Extract just the file name extension for the local copy
      const ext = path.extname(s3Key) || '.mp4';
      const localFilename = `${randomUUID()}${ext}`;
      const localPath = path.join(absoluteTmpDir, localFilename);

      console.log(`Downloading ${s3Key} to ${localPath}...`);
      await downloadFromS3(s3Key, localPath);

      // Add to sequence - since staticFile() looks inside 'public/', 
      // we store the relative path if we use public/tmp
      const publicRelativePath = tmpDirEnv.replace('./public/', '') + '/' + localFilename;
      videoSequence.push({
        src: publicRelativePath,
        text: overlayText,
      });
    }

    console.log("Built Sequence:", videoSequence);

    // 1. Resolve paths
    const entryFile = path.resolve(process.cwd(), "src/index.ts");
    const outputLocation = path.resolve(process.cwd(), `public/renders/${project.id}-${Date.now()}.mp4`);

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
      inputProps: { videoSequence },
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
      chromiumOptions: {},
      timeoutInMilliseconds: 1000 * 60 * 10,
    });

    console.log("✅ Render complete:", outputLocation);

    // 6. Increment counter successfully
    await prisma.project.update({
      where: { id: projectId },
      data: { counter: { increment: 1 } }
    });

    return Response.json({
      success: true,
      url: outputLocation.split('public')[1], // Return relative URL like '/renders/...'
      filename: path.basename(outputLocation)
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
