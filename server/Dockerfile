# =========================================================
# Stage 1: Build Stage (Compile TypeScript)
# =========================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools & dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and configuration files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to dist/ folder
RUN npm run build

# =========================================================
# Stage 2: Production Stage (Minimal Alpine Runtime)
# =========================================================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security hardening
RUN chown -R node:node /app
USER node

EXPOSE 5000

# Container Healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => { if (r.statusCode !== 200) process.exit(1); })"

CMD ["node", "dist/app.js"]
