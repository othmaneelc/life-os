FROM node:20-alpine AS builder
WORKDIR /app
COPY client/package*.json client/
RUN cd client && npm ci
COPY client/ client/
RUN cd client && npm run build

FROM node:20-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
COPY server/package*.json server/
RUN apk add --no-cache build-base python3 && cd server && npm ci --omit=dev && apk del build-base python3 && rm -rf /root/.npm /root/.cache
COPY server/ server/
COPY --from=builder /app/client/dist /app/client/dist
# Railway: create a Volume in the dashboard mounted at /app/data for SQLite persistence
EXPOSE 3001
ENV NODE_ENV=production
ENV CLIENT_URL=http://localhost:3001
WORKDIR /app/server
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]
