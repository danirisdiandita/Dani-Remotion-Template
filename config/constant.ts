import { z } from "zod";

/**
 * 🌍 Centralised Environment Configuration
 * Validates that all required variables are present and correctly typed.
 * This ensures the Production Engine fails early if correctly-formed keys are missing.
 */

const envSchema = z.object({
  // 🗄️ Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_POOL: z.string().url(),

  // 🔐 Better Auth
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  // 📧 Email
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  // 🎥 Remotion
  REMOTION_STUDIO_PORT: z.coerce.number().default(8080),

  // ☁️ S3 Configuration
  S3_ENDPOINT: z.string().default("127.0.0.1"),
  S3_PORT: z.coerce.number().default(9004),
  S3_ACCESS_KEY: z.string().min(1, "S3_ACCESS_KEY is required"),
  S3_SECRET_KEY: z.string().default(""),
  S3_REGION: z.string().default(""),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_USE_SSL: z.string().default("false").transform((val) => val === "true"),

  // 🛠️ Node Environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ☁️ Google Cloud Tasks
  GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PROJECT_ID: z.string().optional(),
  GOOGLE_VERTEX_AI_LOCATION: z.string().default("asia-southeast1"),
  QUEUE_NAME: z.string().default("render-queue"),
  VIDEO_PLATFORM_ENDPOINT_URL: z.string().optional(),
});

// Parse and export the validated environment variables
// During build time, some variables might be missing. We handle this to prevent build failure.
const result = envSchema.safeParse(process.env);

if (!result.success && process.env.NODE_ENV === "production" && !process.env.SKIP_ENV_VALIDATION) {
  console.error("❌ Invalid environment variables:", result.error.format());
  throw new Error("Invalid environment variables");
}

// If validation fails during build, we provide empty strings to prevent the app from crashing during compilation.
const parsedEnv = result.success ? result.data : ({} as any);

export const ENV = {
  db: {
    direct: parsedEnv.DATABASE_URL || "",
    pool: parsedEnv.DATABASE_URL_POOL || "",
  },
  auth: {
    secret: parsedEnv.BETTER_AUTH_SECRET || "dummy-secret-for-build",
    url: parsedEnv.BETTER_AUTH_URL || "http://localhost:3000",
  },
  video: {
    port: parsedEnv.REMOTION_STUDIO_PORT || 8080,
  },
  email: {
    resend: parsedEnv.RESEND_API_KEY || "",
  },
  s3: {
    endpoint: parsedEnv.S3_ENDPOINT || "127.0.0.1",
    port: parsedEnv.S3_PORT || 9004,
    accessKey: parsedEnv.S3_ACCESS_KEY || "",
    secretKey: parsedEnv.S3_SECRET_KEY || "",
    region: parsedEnv.S3_REGION || "",
    bucket: parsedEnv.S3_BUCKET || "",
    useSsl: parsedEnv.S3_USE_SSL || false,
  },
  gcp: {
    clientEmail: parsedEnv.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    privateKey: parsedEnv.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    projectId: parsedEnv.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
    location: parsedEnv.GOOGLE_VERTEX_AI_LOCATION || "asia-southeast1",
    queueName: parsedEnv.QUEUE_NAME || "render-queue",
    endpointUrl: parsedEnv.VIDEO_PLATFORM_ENDPOINT_URL,
  },
  isProd: parsedEnv.NODE_ENV === "production",
  isDev: parsedEnv.NODE_ENV === "development",
};

/**
 * 📦 Static System Constants
 * Define non-environment constants here for a single source of truth.
 */
export const CONSTANTS = {
  PRODUCTION_SUITE_NAME: "Video Engine",
  DEFAULT_VIDEO_FPS: 30,
  RENDER_OUTPUT_PATH: "public/renders",
  SUPPORTED_CODECS: ["h264", "h265", "vp8", "vp9"] as const,
};
