FROM node:22-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build

WORKDIR /app
ARG NEXT_PUBLIC_API_URL

COPY . .
RUN NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" npm run build

FROM node:22-alpine AS runner

WORKDIR /app

COPY --chown=node:node --from=build /app/public ./public
COPY --chown=node:node --from=build /app/.next/standalone ./
COPY --chown=node:node --from=build /app/.next/static ./.next/static

EXPOSE 3000
USER node
CMD ["node", "server.js"]
