# ==========================================
# AssetFlow Enterprise - Dockerfile Producción
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código fuente completo
COPY . .

# Compilar frontend para producción (genera /dist)
RUN npm run build

# Etapa final de producción (imagen ultra liviana)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copiar archivos compilados del frontend y el servidor backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/types.ts ./types.ts
COPY --from=builder /app/firebase.ts ./firebase.ts
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

# Healthcheck interno del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Ejecutar el servidor corporativo
CMD ["tsx", "server.ts"]
