# Stage 1: Dependencies
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
# Install all dependencies including devDependencies (needed for build and bundle)
RUN npm install --legacy-peer-deps
COPY . .
# Required environment variables for build-time (often needed by Next.js or Prisma)
# In production, these should be passed as build args if needed, 
# but for bundling they usually need the source.
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ARG DATABASE_URL_POOL
ENV DATABASE_URL_POOL=$DATABASE_URL_POOL

# Generate Prisma Client
RUN npx prisma generate

# Run the user-requested bundle and build steps
RUN npm run bundle && npm run build 

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


CMD npx prisma migrate deploy && npm start 
