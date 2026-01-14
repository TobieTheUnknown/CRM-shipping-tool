const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Chemin des données via variable d'environnement DATA_PATH ou dossier courant
const dataPath = process.env.DATA_PATH || __dirname;
const dbPath = path.join(dataPath, 'crm.db');

console.log(`📁 Chemin données: ${dataPath}`);
console.log(`💾 Base de données: ${dbPath}`);

// S'assurer que le dossier existe
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

const db = new Database(dbPath);
console.log('✅ Connecté à la base de données SQLite.');

function initDatabase() {
  // Table Clients
  db.exec(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT,
    email TEXT,
    telephone TEXT,
    adresse TEXT,
    ville TEXT,
    code_postal TEXT,
    pays TEXT DEFAULT 'France',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Table Produits
  db.exec(`CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    description TEXT,
    prix REAL,
    poids REAL,
    stock INTEGER DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Table Colis
  db.exec(`CREATE TABLE IF NOT EXISTS colis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_suivi TEXT UNIQUE,
    client_id INTEGER NOT NULL,
    statut TEXT DEFAULT 'En préparation',
    poids REAL,
    dimensions TEXT,
    adresse_expedition TEXT,
    ville_expedition TEXT,
    code_postal_expedition TEXT,
    pays_expedition TEXT DEFAULT 'France',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_expedition DATETIME,
    date_livraison DATETIME,
    notes TEXT,
    reference TEXT,
    FOREIGN KEY (client_id) REFERENCES clients (id)
  )`);

  // Migrations pour colonnes additionnelles
  try { db.exec(`ALTER TABLE colis ADD COLUMN reference TEXT`); } catch (err) {}
  try { db.exec(`ALTER TABLE clients ADD COLUMN wallet TEXT`); } catch (err) {}
  try { db.exec(`ALTER TABLE clients ADD COLUMN lien TEXT`); } catch (err) {}
  try { db.exec(`ALTER TABLE clients ADD COLUMN pseudo TEXT`); } catch (err) {}
  try { db.exec(`ALTER TABLE colis ADD COLUMN adresse_ligne2 TEXT`); } catch (err) {}

  // Table Produits dans Colis (relation many-to-many)
  db.exec(`CREATE TABLE IF NOT EXISTS colis_produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colis_id INTEGER NOT NULL,
    produit_id INTEGER NOT NULL,
    quantite INTEGER DEFAULT 1,
    lien TEXT,
    FOREIGN KEY (colis_id) REFERENCES colis (id) ON DELETE CASCADE,
    FOREIGN KEY (produit_id) REFERENCES produits (id)
  )`);

  // Migration: ajouter lien si manquant
  try { db.exec(`ALTER TABLE colis_produits ADD COLUMN lien TEXT`); } catch (err) {}

  // Migration: ajouter ref aux produits
  try { db.exec(`ALTER TABLE produits ADD COLUMN ref TEXT`); } catch (err) {}

  // Table Dimensions de cartons
  db.exec(`CREATE TABLE IF NOT EXISTS dimensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    longueur REAL NOT NULL,
    largeur REAL NOT NULL,
    hauteur REAL NOT NULL,
    poids_carton REAL DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migration: ajouter poids_carton si manquant
  try { db.exec(`ALTER TABLE dimensions ADD COLUMN poids_carton REAL DEFAULT 0`); } catch (err) {}

  try { db.exec(`ALTER TABLE produits ADD COLUMN dimension_id INTEGER REFERENCES dimensions(id)`); } catch (err) {}

  // Table Timbres (stamps with tracking numbers)
  db.exec(`CREATE TABLE IF NOT EXISTS timbres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_suivi TEXT UNIQUE NOT NULL,
    poids_categorie TEXT NOT NULL,
    poids_min REAL NOT NULL,
    poids_max REAL NOT NULL,
    utilise INTEGER DEFAULT 0,
    colis_id INTEGER,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (colis_id) REFERENCES colis (id) ON DELETE SET NULL
  )`);

  // Table Catégories de timbres (types personnalisables)
  db.exec(`CREATE TABLE IF NOT EXISTS timbre_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    poids_min REAL NOT NULL,
    poids_max REAL NOT NULL,
    type TEXT DEFAULT 'national',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insérer les catégories par défaut si la table est vide
  const catCount = db.prepare('SELECT COUNT(*) as count FROM timbre_categories').get();
  if (catCount && catCount.count === 0) {
    const defaultCategories = [
      ['Moins de 20g', 0, 20, 'national'],
      ['21g - 100g', 21, 100, 'national'],
      ['101g - 250g', 101, 250, 'national'],
      ['251g - 500g', 251, 500, 'national'],
      ['501g - 1kg', 501, 1000, 'national'],
      ['1kg - 2kg', 1001, 2000, 'national']
    ];
    const stmtCat = db.prepare('INSERT INTO timbre_categories (nom, poids_min, poids_max, type) VALUES (?, ?, ?, ?)');
    defaultCategories.forEach(c => stmtCat.run(...c));
    console.log('🎫 Catégories de timbres par défaut créées.');
  }

  // Insérer les dimensions par défaut si la table est vide
  const count = db.prepare('SELECT COUNT(*) as count FROM dimensions').get();
  if (count && count.count === 0) {
    const defaultDimensions = [
      ['Petit', 20, 15, 10, 1],
      ['Moyen', 30, 20, 15, 1],
      ['Grand', 40, 30, 20, 1],
      ['Très grand', 50, 40, 30, 1],
      ['Extra large', 60, 40, 40, 1]
    ];
    const stmt = db.prepare('INSERT INTO dimensions (nom, longueur, largeur, hauteur, is_default) VALUES (?, ?, ?, ?, ?)');
    defaultDimensions.forEach(d => stmt.run(...d));
    console.log('📦 Dimensions par défaut créées.');
  }

  console.log('✅ Tables de base de données initialisées.');
}

initDatabase();

module.exports = db;
module.exports.dataPath = dataPath;
