FROM oven/bun:1.3-alpine
WORKDIR /app

# Install needed packages
RUN apk add --no-cache yq

# Set environment variables
ENV NODE_ENV=production

# Allow version override during build
ARG VERSION=development
ENV SHELLY_EM_HISTORY2INFLUX_VERSION=${VERSION}

# Copy package files first for better layer caching
COPY run.sh package.json bun.lock README.md tsconfig.json ./
COPY src/ ./src/
COPY config/ ./config/

# Install dependencies
RUN bun install --production --frozen-lockfile

# Run the application
CMD ["/app/run.sh"]