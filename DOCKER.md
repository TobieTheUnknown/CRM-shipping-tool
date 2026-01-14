# ShipTrack CRM - Guide Docker

## Image Docker Hub

L'application est disponible sur Docker Hub: `tobtheunknown/shiptrack-crm:latest`

## Démarrage rapide

### Option 1: Docker Compose (Recommandé)

#### Sur Mac/Windows/Linux (développement local)
```bash
docker compose -f docker-compose.local.yml up -d
```

#### Sur Synology NAS
1. Créer le dossier: `/volume1/docker/crm/data`
2. Lancer:
```bash
docker compose up -d
```

### Option 2: Docker run

```bash
docker run -d \
  --name shiptrack-crm \
  -p 6389:6389 \
  -v ./data:/data \
  -e NODE_ENV=production \
  -e PORT=6389 \
  -e TZ=Europe/Paris \
  --restart unless-stopped \
  tobtheunknown/shiptrack-crm:latest
```

## Accès à l'application

Ouvrez votre navigateur: `http://localhost:6389`

## Nouvelles fonctionnalités (14/01/2026)

### 1. Recherche de colis par lien ou numéro de suivi
- Barre de recherche en temps réel dans l'onglet "Colis"
- Recherche dans les numéros de suivi La Poste
- Recherche dans les liens des produits associés

### 2. Affichage des colis par client
- Cliquez sur le nom d'un client dans la liste des colis
- Affichage de tous les colis associés au client
- Organisation par statut (En préparation, Problématiques, Envoyés)
- Cliquez sur un colis pour l'éditer directement

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| PORT | 6389 | Port d'écoute du serveur |
| NODE_ENV | production | Environnement Node.js |
| DATA_PATH | /data | Chemin de stockage de la base de données |
| TZ | Europe/Paris | Fuseau horaire |

## Volumes

| Volume hôte | Volume container | Description |
|-------------|------------------|-------------|
| ./data | /data | Base de données SQLite persistante |

## Mise à jour

```bash
# Arrêter le conteneur
docker compose down

# Télécharger la dernière version
docker pull tobtheunknown/shiptrack-crm:latest

# Redémarrer
docker compose up -d
```

## Build local (développeurs)

```bash
# Build l'image
docker build -t tobtheunknown/shiptrack-crm:latest .

# Push sur Docker Hub (nécessite authentification)
docker login
docker push tobtheunknown/shiptrack-crm:latest
```

## Support

Port: 6389
Repository: https://github.com/TobieTheUnknown/CRM-shipping-tool
