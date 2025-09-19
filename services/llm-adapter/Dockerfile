# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --only=production && npm cache clean --force

COPY src/ ./src/

RUN npm run build

# Production stage
FROM node:18-alpine

RUN apk add --no-cache dumb-init curl

RUN addgroup -g 1001 -S career && \
    adduser -S career -u 1001 -G career

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs && \
    chown -R career:career /app

USER career

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8083/health || exit 1

EXPOSE 8083

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
