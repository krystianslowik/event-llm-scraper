FROM node:20

WORKDIR /app

# Install required OS dependencies
RUN apt-get update && \
    apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    libwayland-client0

# Copy package files and install dependencies (including devDependencies)
COPY package*.json ./
RUN npm install --include=dev

# Install ts-node globally
RUN npm install -g ts-node

# Copy the entire project
COPY . .

# Debug: list all files to confirm our project structure
RUN find . -type f

# Run migrations, install Chromium via Playwright, then start the server using ts-node.
CMD ["sh", "-c", "ls -la && npx playwright install chromium && npx knex migrate:latest && ts-node src/server.ts"]