import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { downloadFromS3, uploadFileToS3 } from "@/lib/s3-utils";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { projectId, videoSequence: overrideSequence, caption: overrideCaption } = await req.json();
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
    const downloadedFiles = [];

    // Ensure our tmp directory exists
    if (!fs.existsSync(absoluteTmpDir)) {
      await fs.promises.mkdir(absoluteTmpDir, { recursive: true });
    }

    // Determine segments (either from override or compositions)
    const segments = overrideSequence || project.compositions;

    // Build the sequence
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      let s3Key = segment.src;
      let overlayText = segment.text;
      let orientation = segment.orientation || 'bottom';

      // Fallback if src/text missing (using database compositions)
      if (!s3Key || !overlayText) {
        // Find matching composition by index (clamping to length)
        const comp = project.compositions[i % project.compositions.length];
        const videoAssets = comp.assets.filter((a: any) => a.asset.type === 'video');
        const texts = comp.overlayTexts;

        if (!s3Key && videoAssets.length === 0) {
          throw new Error(`Composition index ${i} is missing background video assets.`);
        }

        if (!overlayText && texts.length === 0) {
          throw new Error(`Composition index ${i} is missing overlay texts.`);
        }

        if (!s3Key) {
            const assetIndex = counter % videoAssets.length;
            s3Key = videoAssets[assetIndex].asset.s3Key;
        }
        
        if (!overlayText) {
            const textIndex = counter % texts.length;
            overlayText = texts[textIndex].text;
        }

        orientation = comp.orientation || orientation;
      }

      // Extract just the file name extension for the local copy
      const ext = path.extname(s3Key) || '.mp4';
      const localFilename = `${randomUUID()}${ext}`;
      const localPath = path.join(absoluteTmpDir, localFilename);

      console.log(`Downloading ${s3Key} to ${localPath}...`);
      await downloadFromS3(s3Key, localPath);
      downloadedFiles.push(localPath);

      const publicRelativePath = tmpDirEnv.replace('./public/', '') + '/' + localFilename;
      videoSequence.push({
        src: publicRelativePath,
        text: overlayText,
        orientation: orientation,
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

    // 6. Upload artifact to S3
    const finalFilename = path.basename(outputLocation);
    const s3Key = `renders/${project.id}/${finalFilename}`;
    console.log(`☁️ Uploading artifact to S3 at ${s3Key}...`);
    await uploadFileToS3(outputLocation, s3Key, "video/mp4");

    // 7. Save record directly to Render database
    console.log("💾 Logging Render into database...");
    const renderRecord = await prisma.render.create({
      data: {
        userId: project.userId,
        projectId: project.id,
        s3Key: s3Key,
        caption: overrideCaption !== undefined ? overrideCaption : project.caption,
        status: "completed"
      }
    });

    // 8. Increment sequence counter
    await prisma.project.update({
      where: { id: projectId },
      data: { counter: { increment: 1 } }
    });

    // 9. Garbage collect local workspace (ingested S3 buffers & Render)
    console.log("🧹 Cleaning up local workspace...");
    for (const file of downloadedFiles) {
      if (fs.existsSync(file)) fs.promises.unlink(file).catch(console.error);
    }
    if (fs.existsSync(outputLocation)) fs.promises.unlink(outputLocation).catch(console.error);

    return Response.json({
      success: true,
      url: outputLocation.split('public')[1],
      s3Key: renderRecord.s3Key,
      filename: finalFilename
    });

  } catch (error) {
    console.error("❌ Render failed:", error);

    // // Emergency cleanup in case of failure
    // try {
    //   const outputFilenameFallback = `public/renders/${req.url.split('/').pop() || ''}`; // Approximate
    //   // But we mostly care about cleaning downloaded files here
    //   // Ideally we would move downloadedFiles outside try-catch for perfect finally execution, 
    //   // but this is safe enough. 
    // } catch (e) {}

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: String(error)
    }, { status: 500 });
  }
}
