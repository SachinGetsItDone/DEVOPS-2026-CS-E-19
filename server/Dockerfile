# Use official lightweight Node.js 20 LTS Alpine image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose backend API port
EXPOSE 8000

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Start Express server
CMD ["node", "src/index.js"]
