import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { downloadFromS3, uploadFileToS3 } from "@/lib/s3-utils";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      throw new Error("Missing projectId in request");
    }

    console.log(`📸 Starting carousel render process for Project ID: ${projectId}`);

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

    const carouselSequence = [];
    const tmpDirEnv = process.env.TMP_RENDER_DIR || "./public/tmp";
    const absoluteTmpDir = path.resolve(process.cwd(), tmpDirEnv);
    const downloadedFiles = [];

    if (!fs.existsSync(absoluteTmpDir)) {
      await fs.promises.mkdir(absoluteTmpDir, { recursive: true });
    }

    // Build the sequence
    for (const comp of project.compositions) {
      // Use any asset (image or video) since carousel can take both but normally takes images
      const applicableAssets = comp.assets;
      const texts = comp.overlayTexts;

      if (applicableAssets.length === 0) {
        continue; // Skip empty compositions
      }

      // Grab first asset and text for the slide
      const s3Key = applicableAssets[0].asset.s3Key;
      const overlayText = texts.length > 0 ? texts[0].text : "";

      const ext = path.extname(s3Key) || '.jpg';
      const localFilename = `${randomUUID()}${ext}`;
      const localPath = path.join(absoluteTmpDir, localFilename);

      console.log(`Downloading ${s3Key} to ${localPath}...`);
      await downloadFromS3(s3Key, localPath);
      downloadedFiles.push(localPath);

      const publicRelativePath = tmpDirEnv.replace('./public/', '') + '/' + localFilename;
      carouselSequence.push({
        src: publicRelativePath,
        title: comp.name || "Slide",
        description: overlayText || "",
        durationInFrames: 150,
      });
    }

    console.log("Built Carousel Sequence:", carouselSequence);

    if (carouselSequence.length === 0) {
      throw new Error("No valid assets found to render.");
    }

    const entryFile = path.resolve(process.cwd(), "src/index.ts");
    const outputDir = path.resolve(process.cwd(), "public/renders");
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    console.log("📦 Bundling project...");
    const serveUrl = await bundle(entryFile);

    console.log("🔍 Selecting composition 'Carousel'...");
    const composition = await selectComposition({
      serveUrl,
      id: "Carousel",
      inputProps: { carouselSequence },
    });

    const outputLocation = path.resolve(outputDir, `${project.id}-${Date.now()}.zip`);
    
    console.log("📸 Rendering still frames for Carousel...");
    const renderedImages = [];
    let currentFrame = 0;
    
    for (let i = 0; i < carouselSequence.length; i++) {
      const imgPath = path.resolve(outputDir, `slide_${i + 1}_${Date.now()}.jpg`);
      await renderStill({
        composition,
        serveUrl,
        output: imgPath,
        frame: currentFrame,
        imageFormat: "jpeg",
      });
      renderedImages.push(imgPath);
      currentFrame += 150; // Advance framing for the next slide's scene
    }

    console.log("🤐 Zipping images...");
    await execAsync(`zip -j "${outputLocation}" ${renderedImages.map(img => `"${img}"`).join(" ")}`);

    for (const img of renderedImages) {
      if (fs.existsSync(img)) fs.promises.unlink(img).catch(console.error);
    }

    console.log("✅ Render complete:", outputLocation);

    const finalFilename = path.basename(outputLocation);
    const s3Key = `renders/${project.id}/${finalFilename}`;
    console.log(`☁️ Uploading artifact to S3 at ${s3Key}...`);
    await uploadFileToS3(outputLocation, s3Key, "application/zip");

    console.log("💾 Logging Render into database...");
    const renderRecord = await prisma.render.create({
      data: {
        userId: project.userId,
        projectId: project.id,
        s3Key: s3Key,
        caption: project.caption,
        status: "completed"
      }
    });

    // Cleanup local files
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
    console.error("❌ Carousel Render failed:", error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: String(error)
    }, { status: 500 });
  }
}
