# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:20-alpine
WORKDIR /app

# Install CA certificates (required for HTTPS requests to external sites in Alpine)
RUN apk add --no-cache ca-certificates tzdata

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy app files
COPY server.js cache.js utils.js scrapers.js frontend.js ./

# Set environment
ENV NODE_ENV=production
ENV PORT=9000
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/api/health', (r) => {if(r.statusCode!==200)process.exit(1);})"

# Run app
CMD ["node", "server.js"]
