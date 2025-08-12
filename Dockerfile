# LocAI - Railway Deployment Dockerfile
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production + dev for build)
RUN npm ci && npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p .next .sessions && \
    chmod -R 755 .next .sessions

# Build the application as root (to avoid permission issues)
RUN npm run build

# Create non-root user after build
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of built files to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user for runtime
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start server with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]