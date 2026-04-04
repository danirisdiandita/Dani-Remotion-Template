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

  // 🛠️ Node Environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Parse and export the validated environment variables
const parsedEnv = envSchema.parse(process.env);

export const ENV = {
  db: {
    direct: parsedEnv.DATABASE_URL,
    pool: parsedEnv.DATABASE_URL_POOL,
  },
  auth: {
    secret: parsedEnv.BETTER_AUTH_SECRET,
    url: parsedEnv.BETTER_AUTH_URL,
  },
  video: {
    port: parsedEnv.REMOTION_STUDIO_PORT,
  },
  email: {
    resend: parsedEnv.RESEND_API_KEY,
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
