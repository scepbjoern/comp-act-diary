# ---- Dependencies stage ----
# Phase 9: Separate layer for better caching
FROM node:24-bookworm AS deps
WORKDIR /app

# System build deps for native modules (e.g. sharp)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Optional Proxy (no effect if not provided)
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    NO_PROXY=${NO_PROXY}

# Phase 9: Environment variables for build (API keys, database, etc.)
ARG OPENAI_API_KEY
ARG TOGETHERAI_API_KEY
ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG CACHEBUST

ENV OPENAI_API_KEY=${OPENAI_API_KEY} \
    TOGETHERAI_API_KEY=${TOGETHERAI_API_KEY} \
    DATABASE_URL=${DATABASE_URL} \
    NEXTAUTH_URL=${NEXTAUTH_URL} \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Phase 9: Copy only package files for better layer caching
COPY package*.json ./

# DEBUG: Show what we're actually building
RUN echo "=== DEBUG: Prisma version in package-lock.json ===" \
 && cat package-lock.json | grep -A3 '"prisma"' \
 && echo "=== DEBUG: Prisma version in package.json ===" \
 && cat package.json | grep -A2 '"prisma"' \
 && echo "=== DEBUG: Full package.json content ===" \
 && cat package.json

# Show versions
RUN node -v && npm -v

# Harden npm config and print it
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-maxtimeout 600000 \
 && npm config set fetch-timeout 600000 \
 && npm config set fund false \
 && npm config set audit false \
 && npm config set registry https://registry.npmjs.org/ \
 && npm config set prefer-online true \
 && echo "=== npm config list ===" \
 && npm config list

# Verify registry reachability during build
RUN npm ping --registry=https://registry.npmjs.org || true

# Install ALL dependencies (including dev) for build
RUN npm ci --no-audit --no-fund --ignore-scripts --verbose \
 || (echo 'Dumping npm logs...' \
     && (test -d /root/.npm/_logs && find /root/.npm/_logs -type f -name '*.log' -print -exec cat {} \; || true) \
     && exit 1)

# Ensure native modules like sharp are properly built
RUN npm rebuild sharp --verbose || true

# Phase 9: Generate Prisma client in deps stage
COPY prisma ./prisma
RUN npx prisma generate

# ---- Build stage ----
FROM node:24-bookworm AS build
WORKDIR /app

# Phase 9: Pass build args to build stage
ARG OPENAI_API_KEY
ARG TOGETHERAI_API_KEY
ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG MAPBOX_ACCESS_TOKEN
ARG NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

ENV OPENAI_API_KEY=${OPENAI_API_KEY} \
    TOGETHERAI_API_KEY=${TOGETHERAI_API_KEY} \
    DATABASE_URL=${DATABASE_URL} \
    NEXTAUTH_URL=${NEXTAUTH_URL} \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET} \
    MAPBOX_ACCESS_TOKEN=${MAPBOX_ACCESS_TOKEN} \
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=${NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}

# Copy dependencies from deps stage (including generated Prisma client)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY package*.json ./

# Phase 9: Prisma client already generated in deps stage, no need to regenerate

# Phase 9: Copy source code (layer cache not invalidated by code changes to package.json)
COPY . .

# Build Next.js with standalone output
RUN npm run build

# Phase 9: Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# ---- Runtime stage ----
# Phase 9: Use Alpine for smaller image size
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Set user UID/GID dynamically BEFORE copying files
# This allows --chown to use the correct user from the start
ARG UID=1000
ARG GID=1000
RUN if [ "$UID" != "1000" ] || [ "$GID" != "1000" ]; then \
    deluser node 2>/dev/null || true && \
    delgroup node 2>/dev/null || true && \
    addgroup -g $GID node && \
    adduser -u $UID -G node -s /bin/sh -D node; \
  fi

# Install ffmpeg for audio chunking + postgresql-client for migrations
RUN apk add --no-cache ffmpeg postgresql-client

# Phase 9: Copy standalone Next.js output with correct ownership
# Using --chown avoids slow chown -R on OverlayFS (saves ~15-20 minutes!)
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/deploy/entrypoint.sh ./entrypoint.sh

# Copy Prisma CLI and dependencies for migrations (not included in standalone)
COPY --from=build --chown=node:node /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=build --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=node:node /app/node_modules/prisma ./node_modules/prisma

# Remove any existing esbuild to avoid version conflicts with tsx
# Then install tsx and typescript for runtime scripts
RUN rm -rf /app/node_modules/esbuild /app/node_modules/*/esbuild 2>/dev/null || true \
 && npm install tsx@4.19.2 typescript@5.5.4 --no-save \
 && chown -R node:node /app/node_modules

# Ensure entrypoint is executable and create writable uploads directory
RUN chmod +x ./entrypoint.sh \
 && mkdir -p /app/uploads \
 && chown node:node /app/uploads

USER node
EXPOSE 3000

# Phase 9: Use Node.js standalone server instead of npm start
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]