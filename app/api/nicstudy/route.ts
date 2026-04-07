import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl, uploadFileToS3 } from "@/lib/s3-utils";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      title,
      description,
      tipsTitle,
      tips,
      handle,
      titleImage,
      tipsImage,
      ctaImage,
      durationPerSlide = 150,
    } = body;

    if (!projectId) {
      throw new Error("Missing projectId in request");
    }

    console.log(`📸 Starting nicstudy render for Project ID: ${projectId}`);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new Error("Project not found");

    const tmpDirEnv = process.env.TMP_RENDER_DIR || "./public/tmp";
    const absoluteTmpDir = path.resolve(process.cwd(), tmpDirEnv);
    const downloadedFiles: string[] = [];

    if (!fs.existsSync(absoluteTmpDir)) {
      await fs.promises.mkdir(absoluteTmpDir, { recursive: true });
    }

    // Generate pre-signed URLs for images so Remotion (Chromium) can fetch them directly
    const resolveImage = async (src?: string): Promise<string | undefined> => {
      if (!src) return undefined;
      if (src.startsWith("http") || src.startsWith("data:")) return src;

      // Assume it's an S3 key, get a pre-signed download URL
      console.log(`Generating pre-signed URL for S3 key: ${src}`);
      return await getPresignedDownloadUrl(src);
    };

    const resolvedTitleImage = await resolveImage(titleImage);
    const resolvedTipsImage = await resolveImage(tipsImage);
    const resolvedCtaImage = await resolveImage(ctaImage);

    const inputProps = {
      title: title || "Hari 1: Penalaran Umum (PU)",
      description: description || "Fokus: Mengolah informasi secara logis, kritis, dan kuantitatif.",
      tipsTitle: tipsTitle || "Materi Wajib",
      tips: tips || [
        "Logika (Ponens, Tollens, dan Silogisme)",
        "Memperkuat dan Memperlemah Pernyataan",
        "Pernyataan Pasti Benar dan Mungkin Benar",
        "Perbandingan",
        "Pola Bilangan",
        "Analisis Grafik/Tabel",
        "Logika Analitik",
      ],
      handle: handle || "@nicstudy.id",
      durationPerSlide,
      titleImage: resolvedTitleImage,
      tipsImage: resolvedTipsImage,
      ctaImage: resolvedCtaImage,
    };

    console.log("Built nicstudy inputProps:", inputProps);

    const entryFile = path.resolve(process.cwd(), "src/index.ts");
    const outputDir = path.resolve(process.cwd(), "public/renders");
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    console.log("📦 Bundling project...");
    const serveUrl = await bundle(entryFile);

    console.log("🔍 Selecting composition 'nicstudy'...");
    const composition = await selectComposition({
      serveUrl,
      id: "nicstudy",
      inputProps,
    });

    const outputLocation = path.resolve(outputDir, `${project.id}-nicstudy-${Date.now()}.zip`);

    console.log("📸 Rendering 3 still frames for nicstudy...");
    const renderedImages: string[] = [];

    for (let i = 0; i < 3; i++) {
      const imgPath = path.resolve(outputDir, `nicstudy_slide_${i + 1}_${Date.now()}.jpg`);
      await renderStill({
        composition,
        serveUrl,
        output: imgPath,
        frame: i * durationPerSlide,
        imageFormat: "jpeg",
      });
      renderedImages.push(imgPath);
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
        status: "completed",
      },
    });

    // Cleanup local files
    console.log("🧹 Cleaning up local workspace...");
    for (const file of downloadedFiles) {
      if (fs.existsSync(file)) fs.promises.unlink(file).catch(console.error);
    }
    if (fs.existsSync(outputLocation)) fs.promises.unlink(outputLocation).catch(console.error);

    return Response.json({
      success: true,
      url: outputLocation.split("public")[1],
      s3Key: renderRecord.s3Key,
      filename: finalFilename,
    });
  } catch (error) {
    console.error("❌ NicStudy Render failed:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
