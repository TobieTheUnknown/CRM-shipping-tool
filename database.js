const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'crm.db'), (err) => {
  if (err) {
    console.error('Erreur connexion base de données:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite.');
    initDatabase();
  }
});

function initDatabase() {
  // Table Clients
  db.run(`CREATE TABLE IF NOT EXISTS clients (
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
  db.run(`CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    description TEXT,
    prix REAL,
    poids REAL,
    stock INTEGER DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Table Colis
  db.run(`CREATE TABLE IF NOT EXISTS colis (
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
  db.run(`ALTER TABLE colis ADD COLUMN reference TEXT`, (err) => {
    // Ignore l'erreur si la colonne existe déjà
    if (err && !err.message.includes('duplicate column')) {
      console.error('Erreur ajout colonne reference:', err.message);
    }
  });

  // Ajouter les colonnes wallet et lien aux clients (pour migration)
  db.run(`ALTER TABLE clients ADD COLUMN wallet TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Erreur ajout colonne wallet:', err.message);
    }
  });

  db.run(`ALTER TABLE clients ADD COLUMN lien TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('Erreur ajout colonne lien:', err.message);
    }
  });
  // Table Produits dans Colis (relation many-to-many)
  db.run(`CREATE TABLE IF NOT EXISTS colis_produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colis_id INTEGER NOT NULL,
    produit_id INTEGER NOT NULL,
    quantite INTEGER DEFAULT 1,
    FOREIGN KEY (colis_id) REFERENCES colis (id) ON DELETE CASCADE,
    FOREIGN KEY (produit_id) REFERENCES produits (id)
  )`);

  console.log('Tables de base de données initialisées.');
}

module.exports = db;
