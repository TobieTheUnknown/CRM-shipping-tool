const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'crm.db'));
console.log('Connecté à la base de données SQLite.');

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

  // Ajouter la colonne reference si elle n'existe pas (pour migration)
  try {
    db.exec(`ALTER TABLE colis ADD COLUMN reference TEXT`);
  } catch (err) {
    // Colonne existe déjà
  }

  // Ajouter les colonnes wallet et lien aux clients (pour migration)
  try {
    db.exec(`ALTER TABLE clients ADD COLUMN wallet TEXT`);
  } catch (err) {}

  try {
    db.exec(`ALTER TABLE clients ADD COLUMN lien TEXT`);
  } catch (err) {}

  // Ajouter ligne d'adresse supplémentaire pour les colis
  try {
    db.exec(`ALTER TABLE colis ADD COLUMN adresse_ligne2 TEXT`);
  } catch (err) {}

  // Table Produits dans Colis (relation many-to-many)
  db.exec(`CREATE TABLE IF NOT EXISTS colis_produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colis_id INTEGER NOT NULL,
    produit_id INTEGER NOT NULL,
    quantite INTEGER DEFAULT 1,
    FOREIGN KEY (colis_id) REFERENCES colis (id) ON DELETE CASCADE,
    FOREIGN KEY (produit_id) REFERENCES produits (id)
  )`);

  // Table Dimensions de cartons
  db.exec(`CREATE TABLE IF NOT EXISTS dimensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    longueur REAL NOT NULL,
    largeur REAL NOT NULL,
    hauteur REAL NOT NULL,
    is_default INTEGER DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Ajouter dimension_id aux produits pour lien optionnel
  try {
    db.exec(`ALTER TABLE produits ADD COLUMN dimension_id INTEGER REFERENCES dimensions(id)`);
  } catch (err) {}

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
    console.log('Dimensions par défaut créées.');
  }

  console.log('Tables de base de données initialisées.');
}

initDatabase();

module.exports = db;
