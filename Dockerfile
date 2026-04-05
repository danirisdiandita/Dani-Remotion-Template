# Stage 1: Dependencies
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
# Install all dependencies including devDependencies (needed for build and bundle)
RUN npm install --legacy-peer-deps

# Stage 2: Build
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Required environment variables for build-time (often needed by Next.js or Prisma)
# In production, these should be passed as build args if needed, 
# but for bundling they usually need the source.
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma Client
RUN npx prisma generate

# Run the user-requested bundle and build steps
RUN npm run bundle
RUN SKIP_ENV_VALIDATION=1 npm run build

# Stage 3: Production
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

# Remotion & Puppeteer often need chromium and other libraries to render
# Installing minimal dependencies for headless browser support
RUN apt-get update -y
RUN apt install -y \
  libnss3 \
  libdbus-1-3 \
  libatk1.0-0 \
  libgbm-dev \
  libasound2 \
  libxrandr2 \
  libxkbcommon-dev \
  libxfixes3 \
  libxcomposite1 \
  libxdamage1 \
  libatk-bridge2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  libcups2 \
  chromium

# Set Chrome path for Puppeteer (Remotion often detects this or needs it)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set home directory for the user to avoid npx/npm permission issues
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs --shell /bin/sh --ingroup nodejs nextjs && \
    mkdir -p /home/nextjs && chown nextjs:nodejs /home/nextjs

ENV HOME=/home/nextjs

# Ensure Prisma is available for migrations at runtime
RUN npm install -g prisma

# Copy needed files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/build ./build
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Final ownership check to ensure everything is writeable by our production user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

CMD npx prisma migrate deploy && node server.js
