
# Build React frontend
FROM node:22-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Run Express backend
FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/server.js ./
COPY --from=frontend-build /frontend/dist ./public

ENV NODE_ENV=production
USER node

EXPOSE 8000

CMD ["node", "server.js"]
