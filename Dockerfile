FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY .env .
RUN npx prisma generate

COPY . .
RUN pnpm run build
RUN cp -r src/generated dist/generated

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist/generated /app/dist/generated
COPY .env .

RUN npm install -g pnpm

EXPOSE 3000

CMD ["pnpm", "start"]