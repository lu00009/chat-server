FROM node:20-alpine AS builder

WORKDIR /app

# 1. Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 2. Copy Prisma and .env, then generate Prisma client
COPY prisma ./prisma
COPY .env .
RUN npx prisma generate

# 3. Copy all source code (including 'src' and 'swagger' related files)
#    This must happen *before* 'pnpm run build' which depends on these files.
COPY . .

# 4. Run the build script (which should include swagger-gen and tsc)
#    Remove the separate 'RUN pnpm run swagger-gen' if 'pnpm run build' already does it.
RUN pnpm run build

# 5. Copy generated files if they are not part of the standard 'dist' output
RUN cp -r src/generated dist/generated

# --- If 'pnpm run swagger-gen' generated 'swagger-output.json' in the root,
# --- no separate RUN command is needed here, as it's part of the 'pnpm run build' chain
# --- and will be available in /app from the COPY . . command.

FROM node:20-alpine

WORKDIR /app

# Copy only the necessary runtime artifacts from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist/generated /app/dist/generated

COPY .env .

RUN npm install -g pnpm # Install pnpm globally in the final image for the CMD

EXPOSE 3000

CMD ["pnpm", "start"]