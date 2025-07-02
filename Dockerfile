FROM node:20-alpine AS builder

# Add these two lines for the builder stage
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate

RUN pnpm run build
RUN cp -r src/generated dist/generated

FROM node:20-alpine

# Add these two lines for the final stage
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist/generated /app/dist/generated

RUN npm install -g pnpm

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && pnpm start"]