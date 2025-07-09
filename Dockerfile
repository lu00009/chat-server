# Use a Node.js base image
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally and then install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client (it will go into node_modules)
RUN npx prisma generate

# Copy the rest of your application code
COPY . .

# Build your TypeScript application
RUN pnpm run build

# REMOVED: The line `RUN cp -r src/generated dist/generated` is removed
# because src/generated does not exist after `npx prisma generate`.

# Stage 2: Production image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy node_modules from the builder stage. This includes the Prisma Client.
COPY --from=builder /app/node_modules ./node_modules

# Copy the built application code
COPY --from=builder /app/dist ./dist

# Copy Prisma schema (needed for `prisma migrate deploy` at runtime)
COPY --from=builder /app/prisma ./prisma

# Copy package.json (needed for `start` script)
COPY --from=builder /app/package.json ./package.json

# REMOVED: The line `COPY --from=builder /app/dist/generated /app/dist/generated` is removed
# because the generated client is part of node_modules, not a separate dist/generated folder.

# Install pnpm globally (if your start script uses it, otherwise remove)
RUN npm install -g pnpm

# Expose the port your app runs on
EXPOSE 3000

# Command to run your application
CMD ["pnpm", "start"]
