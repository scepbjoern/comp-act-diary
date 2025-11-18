# ---- Dependencies stage ----
# Phase 9: Separate layer for better caching
FROM node:22-bookworm AS deps
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

ENV OPENAI_API_KEY=${OPENAI_API_KEY} \
    TOGETHERAI_API_KEY=${TOGETHERAI_API_KEY} \
    DATABASE_URL=${DATABASE_URL} \
    NEXTAUTH_URL=${NEXTAUTH_URL} \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Phase 9: Copy only package files for better layer caching
COPY package*.json ./

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
RUN npm ci --no-audit --no-fund --ignore-scripts --verbose --legacy-peer-deps \
 || (echo 'Dumping npm logs...' \
     && (test -d /root/.npm/_logs && find /root/.npm/_logs -type f -name '*.log' -print -exec cat {} \; || true) \
     && exit 1)

# Ensure native modules like sharp are properly built
RUN npm rebuild sharp --verbose || true

# Phase 9: Generate Prisma client in deps stage
COPY prisma ./prisma
RUN npx prisma generate

# ---- Build stage ----
FROM node:22-bookworm AS build
WORKDIR /app

# Phase 9: Pass build args to build stage
ARG OPENAI_API_KEY
ARG TOGETHERAI_API_KEY
ARG DATABASE_URL
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET

ENV OPENAI_API_KEY=${OPENAI_API_KEY} \
    TOGETHERAI_API_KEY=${TOGETHERAI_API_KEY} \
    DATABASE_URL=${DATABASE_URL} \
    NEXTAUTH_URL=${NEXTAUTH_URL} \
    NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

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
RUN npm ci --omit=dev --ignore-scripts --legacy-peer-deps

# ---- Runtime stage ----
# Phase 9: Use Alpine for smaller image size
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Phase 9: Copy standalone Next.js output (much smaller than full node_modules)
# Standalone includes only the minimal runtime dependencies
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/deploy/entrypoint.sh ./entrypoint.sh

# Ensure entrypoint is executable and create writable uploads directory
RUN chmod +x ./entrypoint.sh \
 && mkdir -p /app/uploads \
 && chown -R node:node /app

# Set user UID/GID dynamically if provided (for host permissions)
ARG UID=1000
ARG GID=1000
RUN if [ "$UID" != "1000" ] || [ "$GID" != "1000" ]; then \
    delgroup node 2>/dev/null || true && \
    addgroup -g $GID node && \
    deluser node 2>/dev/null || true && \
    adduser -u $UID -G node -s /bin/sh -D node; \
  fi

USER node
EXPOSE 3000

# Phase 9: Use Node.js standalone server instead of npm start
CMD ["node", "server.js"]