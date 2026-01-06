# ShipTrack CRM - Docker pour Synology NAS
FROM node:20-alpine

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1000 crm && adduser -u 1000 -G crm -s /bin/sh -D crm

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm ci --only=production && npm cache clean --force

# Copier le code source
COPY server.js ./
COPY database.js ./
COPY init-test-data.js ./
COPY public/ ./public/

# Créer le dossier de données
RUN mkdir -p /data && chown -R crm:crm /data /app

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_PATH=/data

# Exposer le port
EXPOSE 3000

# Passer à l'utilisateur non-root
USER crm

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/stats || exit 1

# Démarrer le serveur
CMD ["node", "server.js"]
