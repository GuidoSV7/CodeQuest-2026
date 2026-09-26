# syntax=docker/dockerfile:1

# --- deps: install all deps (incl. Nest CLI / TypeScript for build) ---
FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# --- build: compile NestJS → dist/ ---
FROM deps AS build
WORKDIR /app

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npm run build \
  && npm prune --omit=dev

# --- runner: lean production image ---
FROM node:22-alpine AS runner
WORKDIR /app

ARG GIT_COMMIT=unknown
ENV NODE_ENV=production
ENV PORT=3000
ENV GIT_COMMIT=$GIT_COMMIT

RUN apk add --no-cache libc6-compat wget \
  && addgroup -S nodejs \
  && adduser -S nestjs -G nodejs

COPY --from=build --chown=nestjs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:3000/api/health" >/dev/null 2>&1 || exit 1

CMD ["node", "dist/main.js"]
