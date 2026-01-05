# 📦 CRM Shipping Tool

Outil web léger et performant pour gérer et tracker vos clients, produits et colis.

## ✨ Fonctionnalités

- **Gestion des clients** : Créez, modifiez et supprimez vos clients avec toutes leurs informations
- **Gestion des produits** : Gérez votre catalogue de produits avec prix, poids et stock
- **Gestion des colis** : Créez et suivez vos expéditions avec statuts en temps réel
- **Sélection multiple** : Sélectionnez plusieurs colis d'un coup
- **Impression d'étiquettes PDF** : Générez et imprimez plusieurs étiquettes d'envoi sur une seule page PDF
- **Tableau de bord** : Statistiques en temps réel de votre activité
- **Interface responsive** : Utilisable sur ordinateur, tablette et mobile

## 🚀 Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm

### Étapes d'installation

1. **Clonez le repository**
```bash
git clone <url-du-repo>
cd CRM-shipping-tool
```

2. **Installez les dépendances**
```bash
npm install
```

3. **Lancez le serveur**
```bash
npm start
```

4. **Accédez à l'application**
Ouvrez votre navigateur et allez sur : `http://localhost:3000`

## 🛠️ Mode développement

Pour lancer le serveur en mode développement avec rechargement automatique :

```bash
npm run dev
```

## 📖 Utilisation

### Gestion des clients
1. Cliquez sur l'onglet "Clients"
2. Cliquez sur "+ Nouveau Client"
3. Remplissez le formulaire avec les informations du client
4. Enregistrez

### Gestion des produits
1. Cliquez sur l'onglet "Produits"
2. Cliquez sur "+ Nouveau Produit"
3. Renseignez les détails du produit
4. Enregistrez

### Création d'un colis
1. Allez dans l'onglet "Colis"
2. Cliquez sur "+ Nouveau Colis"
3. Sélectionnez un client (l'adresse se remplit automatiquement)
4. Renseignez les détails du colis (poids, dimensions, etc.)
5. Ajoutez des notes si nécessaire
6. Enregistrez

### Impression d'étiquettes
1. Dans l'onglet "Colis", cochez les cases des colis à imprimer
2. Cliquez sur "🖨️ Imprimer Étiquettes"
3. Le PDF se télécharge automatiquement avec toutes les étiquettes

## 🗄️ Base de données

L'application utilise SQLite, une base de données légère stockée dans le fichier `crm.db`.

### Structure
- **clients** : Informations des clients
- **produits** : Catalogue de produits
- **colis** : Colis et expéditions
- **colis_produits** : Relation entre colis et produits

## 🎨 Stack technique

- **Backend** : Node.js + Express
- **Base de données** : SQLite3
- **Frontend** : HTML5 + CSS3 + JavaScript Vanilla (pas de framework lourd)
- **PDF** : PDFKit pour la génération d'étiquettes

## 📊 API Endpoints

### Clients
- `GET /api/clients` - Liste tous les clients
- `POST /api/clients` - Créer un client
- `PUT /api/clients/:id` - Modifier un client
- `DELETE /api/clients/:id` - Supprimer un client

### Produits
- `GET /api/produits` - Liste tous les produits
- `POST /api/produits` - Créer un produit
- `PUT /api/produits/:id` - Modifier un produit
- `DELETE /api/produits/:id` - Supprimer un produit

### Colis
- `GET /api/colis` - Liste tous les colis
- `POST /api/colis` - Créer un colis
- `PUT /api/colis/:id` - Modifier un colis
- `DELETE /api/colis/:id` - Supprimer un colis

### Étiquettes
- `POST /api/etiquettes/pdf` - Générer PDF d'étiquettes (body: `{colisIds: [1,2,3]}`)

### Statistiques
- `GET /api/stats` - Obtenir les statistiques globales

## 📝 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.
