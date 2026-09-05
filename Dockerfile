# Multi-stage production Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json tsconfig.json vite.config.ts ./
RUN npm ci

# Copy source files
COPY . .

# Build Vite client assets and bundle server.ts with esbuild
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled bundles from builder stage
COPY --from=builder /app/dist ./dist

# Create unprivileged user for security compliance in Kubernetes
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

CMD ["node", "dist/server.cjs"]
