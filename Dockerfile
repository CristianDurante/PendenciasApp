FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build:web

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PENDENCIAS_DB_PATH=/data/pendencias.db
COPY package*.json ./
COPY --from=build /app/prisma ./prisma
RUN npm ci
COPY --from=build /app/out/renderer ./out/renderer
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

RUN mkdir -p /data
EXPOSE 3939
VOLUME ["/data"]
CMD ["node", "--import", "tsx", "server/index.ts"]