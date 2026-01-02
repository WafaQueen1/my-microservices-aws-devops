# Order Service Dockerfile
FROM node:18-alpine

WORKDIR /app

RUN mkdir -p /var/log/order-service

COPY package*.json ./

RUN npm install --only=production

COPY src/ ./src/

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app && \
    chown -R nodejs:nodejs /var/log/order-service

USER nodejs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health/live || exit 1

CMD ["node", "src/index.js"]
