# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package.json and lock file first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy all application code (including src, prisma, etc.)
COPY . .

# Ensure Prisma Client is generated inside the container after copying schema
# This step is CRUCIAL to ensure the client matches the schema copied into the image
RUN npx prisma generate

# Expose the port your app runs on
EXPOSE 3000

# Command to run your application in development
CMD ["pnpm", "dev"]