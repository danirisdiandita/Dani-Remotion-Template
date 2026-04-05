/**
 * 🌍 Centralised Environment Configuration
 * This file provides a single source of truth for all environment variables.
 * We avoid strict Zod validation during construction to prevent Docker build failure,
 * while still providing safe defaults.
 */

const getEnv = (key: string, defaultValue: string = ""): string => {
  return process.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const val = process.env[key];
  return val ? parseInt(val, 10) : defaultValue;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return val === "true";
};

export const ENV = {
  db: {
    direct: getEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db"),
    pool: getEnv("DATABASE_URL_POOL") || getEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db"),
  },
  auth: {
    secret: getEnv("BETTER_AUTH_SECRET", "dummy-secret-at-least-32-chars-long-1234"),
    url: getEnv("BETTER_AUTH_URL", "http://localhost:3000"),
  },
  video: {
    port: getEnvNumber("REMOTION_STUDIO_PORT", 8080),
  },
  email: {
    resend: getEnv("RESEND_API_KEY", "re_dummy_123"),
  },
  s3: {
    endpoint: getEnv("S3_ENDPOINT", "127.0.0.1"),
    port: getEnvNumber("S3_PORT", 9004),
    accessKey: getEnv("S3_ACCESS_KEY"),
    secretKey: getEnv("S3_SECRET_KEY"),
    region: getEnv("S3_REGION", "us-east-1"),
    bucket: getEnv("S3_BUCKET", "video-editor"),
    useSsl: getEnvBoolean("S3_USE_SSL", false),
  },
  gcp: {
    clientEmail: getEnv("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL"),
    privateKey: getEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")?.replace(/\\n/g, "\n"),
    projectId: getEnv("GOOGLE_SERVICE_ACCOUNT_PROJECT_ID"),
    location: getEnv("GOOGLE_VERTEX_AI_LOCATION", "asia-southeast1"),
    queueName: getEnv("QUEUE_NAME", "render-queue"),
    endpointUrl: getEnv("VIDEO_PLATFORM_ENDPOINT_URL"),
  },
  isProd: process.env.NODE_ENV === "production",
  isDev: process.env.NODE_ENV !== "production",
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
