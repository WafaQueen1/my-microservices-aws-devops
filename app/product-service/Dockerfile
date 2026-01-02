# Product Service Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Create log directory
RUN mkdir -p /var/log/product-service

# Install app dependencies
# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application source
COPY src/ ./src/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    chown -R nodejs:nodejs /var/log/product-service

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health/live || exit 1

# Start the application
CMD ["node", "src/index.js"]
