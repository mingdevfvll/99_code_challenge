FROM node:22-alpine AS deps

WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build

WORKDIR /app
COPY tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run db:generate
RUN npm run build
RUN npm run build:seed
RUN npm prune --omit=dev && npm cache clean --force

FROM node:22-alpine AS runner

WORKDIR /app
RUN apk add --no-cache openssl

COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000
USER node
CMD ["./docker-entrypoint.sh"]
