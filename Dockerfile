FROM node:20-alpine

WORKDIR /app

# Copy package manager and dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
