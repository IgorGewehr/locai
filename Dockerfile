# LocAI - Railway Deployment Dockerfile
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy application code
COPY --chown=nextjs:nodejs . .

# Create .next directory with proper permissions
RUN mkdir -p .next && chown -R nextjs:nodejs .next

# Create sessions directory for WhatsApp (Baileys)
RUN mkdir -p .sessions && chown -R nextjs:nodejs .sessions

# Switch to non-root user
USER nextjs

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start server with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]