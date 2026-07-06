# Stage 1: Install dependencies and build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Run Next.js build
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone files from builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Next 16's standalone output tracing misses the app-route Turbopack runtime
# (app-route-turbo.runtime.prod.js), so API routes crash at runtime with
# "Cannot find module .../next-server/app-route-turbo.runtime.prod.js".
# Copy the full compiled next-server runtimes to guarantee they're present.
COPY --from=builder /app/node_modules/next/dist/compiled/next-server/ ./node_modules/next/dist/compiled/next-server/

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run the standalone server
CMD ["node", "server.js"]
