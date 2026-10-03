# Kaippesi Jothidar — production server image (Express API + PWA).
# Build: docker build -t kaippesi .
# Run:   docker run -p 3000:3000 -v kaippesi-data:/data --env-file .env kaippesi
FROM node:22-slim

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/kaippesi.db

WORKDIR /app

# Install production dependencies only (Capacitor, Playwright etc. are devDependencies).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY shared ./shared
COPY public ./public

# Persistent data (SQLite database, generated VAPID keys). The server also writes data/vapid.json
# relative to /app, so /app/data points at the same persistent directory.
RUN mkdir -p /data && chown node:node /data && ln -s /data /app/data

USER node
VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
