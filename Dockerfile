# Use lightweight Node image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install --production

# Copy app files
COPY . .

# Build arguments
ARG PORT=3000
ENV PORT=$PORT

# Security hardening
RUN apk add --no-cache dumb-init && \
    chown -R node:node /usr/src/app

USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:$PORT/health || exit 1

EXPOSE $PORT

# Start command
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
