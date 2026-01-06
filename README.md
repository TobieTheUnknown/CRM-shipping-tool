# 🚢 ShipTrack CRM

**ShipTrack** est un outil CRM léger et puissant conçu pour simplifier la gestion logistique, le suivi des colis et la préparation des envois. Idéal pour les petites structures ou l'auto-hébergement (ex: Synology NAS).

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/TobieTheUnknown/CRM-shipping-tool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📸 Showcase (Les screenshots arrivent soon - maybe)

### 📊 Tableau de Bord (Dashboard)
Visualisez en un coup d'œil l'état de vos expéditions : colis en préparation, en attente ou déjà envoyés.


### 👥 Gestion des Clients
Un répertoire complet pour gérer vos contacts, avec fonction de remplissage automatique pour gagner du temps.


### 📦 Gestion des Stocks & Produits
Suivez l'inventaire de vos produits. Le stock est automatiquement décrémenté lors de la création d'un nouveau colis.


### 🎫 Gestion des Timbres (La Poste)
Importez vos numéros de suivi en vrac par catégorie de poids et suivez leur disponibilité en temps réel.

### 📝 Création de Colis
Un workflow fluide pour lier un client, des produits et un numéro de suivi. Gérez les dimensions et le poids pour vos étiquettes.

### ⚙️ Paramètres de Personnalisation
Configurez votre logo pour les étiquettes et définissez des dimensions de cartons standards (Vin, Enveloppe, UPS, etc.).

---

## ✨ Fonctionnalités Clés

- **📦 Suivi en Temps Réel** : Gestion des différents statuts d'expédition (En préparation, En attente, Envoyé).
- **📉 Synchronisation des Stocks** : Mise à jour automatique de l'inventaire lors des envois.
- **🏷️ Génération d'Étiquettes** : Support des logos personnalisés et des dimensions standardisées.
- **📥 Import en Vrac** : Importation massive de numéros de suivi (Timbres) et de données clients.
- **🐳 Prêt pour Docker** : Déploiement facile et persistant, optimisé pour NAS Synology.

---

## 🚀 Installation & Déploiement

### Via Docker Compose (Recommandé)

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/TobieTheUnknown/CRM-shipping-tool.git
   cd CRM-shipping-tool
   ```

2. Configurez votre fichier `docker-compose.yml` (ajustez les volumes si nécessaire).

3. Lancez le conteneur :
   ```bash
   docker-compose up -d
   ```

L'application sera accessible sur `http://localhost:6389`.

### Installation Locale (Développement)

```bash
npm install
npm start
```

---

## 🛠️ Stack Technique

- **Backend** : Node.js (Express)
- **Base de données** : SQLite (via Better-SQLite3)
- **Frontend** : HTML5 / CSS3 (Styling premium avec Glassmorphism)
- **PDF** : PDFKit pour la génération d'étiquettes
- **Docker** : Image multi-stage optimisée

---

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE).

---
*Développé avec ❤️ par [TobieTheUnknown](https://github.com/TobieTheUnknown)*
