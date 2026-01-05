const db = require('./database');

console.log('Initialisation des données de test...\n');

// Clients de test
const clients = [
  { nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@email.fr', telephone: '0123456789', adresse: '10 Rue de Rivoli', ville: 'Paris', code_postal: '75001', pays: 'France' },
  { nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@email.fr', telephone: '0234567890', adresse: '25 Avenue des Champs', ville: 'Lyon', code_postal: '69001', pays: 'France' },
  { nom: 'Bernard', prenom: 'Pierre', email: 'pierre.bernard@email.be', telephone: '+32123456789', adresse: '456 Avenue Louise', ville: 'Bruxelles', code_postal: '1050', pays: 'Belgique' },
  { nom: 'Rossi', prenom: 'Maria', email: 'maria.rossi@email.it', telephone: '+39123456789', adresse: '12 Via Roma', ville: 'Rome', code_postal: '00100', pays: 'Italie' },
  { nom: 'Garcia', prenom: 'Carlos', email: 'carlos.garcia@email.es', telephone: '+34123456789', adresse: '89 Calle Mayor', ville: 'Madrid', code_postal: '28013', pays: 'Espagne' }
];

// Produits de test
const produits = [
  { nom: 'iPhone 15 Pro', description: 'Smartphone Apple dernier modèle', prix: 1199.00, poids: 0.5, stock: 15 },
  { nom: 'Samsung Galaxy S24', description: 'Smartphone Samsung haut de gamme', prix: 899.00, poids: 0.45, stock: 20 },
  { nom: 'MacBook Pro 16"', description: 'Ordinateur portable Apple M3', prix: 2499.00, poids: 2.1, stock: 8 },
  { nom: 'AirPods Pro 2', description: 'Écouteurs sans fil Apple', prix: 279.00, poids: 0.1, stock: 50 },
  { nom: 'iPad Air', description: 'Tablette Apple 11 pouces', prix: 699.00, poids: 0.6, stock: 12 },
  { nom: 'Apple Watch Series 9', description: 'Montre connectée Apple', prix: 449.00, poids: 0.15, stock: 25 }
];

// Fonction pour insérer les clients
function insertClients() {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO clients (nom, prenom, email, telephone, adresse, ville, code_postal, pays)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    clients.forEach((client, index) => {
      stmt.run(
        [client.nom, client.prenom, client.email, client.telephone, client.adresse, client.ville, client.code_postal, client.pays],
        function(err) {
          if (err) {
            console.error(`Erreur insertion client ${client.nom}:`, err.message);
          } else {
            console.log(`✓ Client créé: ${client.nom} ${client.prenom} (${client.pays})`);
          }
          count++;
          if (count === clients.length) {
            stmt.finalize();
            resolve();
          }
        }
      );
    });
  });
}

// Fonction pour insérer les produits
function insertProduits() {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO produits (nom, description, prix, poids, stock)
      VALUES (?, ?, ?, ?, ?)
    `);

    let count = 0;
    produits.forEach((produit) => {
      stmt.run(
        [produit.nom, produit.description, produit.prix, produit.poids, produit.stock],
        function(err) {
          if (err) {
            console.error(`Erreur insertion produit ${produit.nom}:`, err.message);
          } else {
            console.log(`✓ Produit créé: ${produit.nom} - ${produit.prix}€`);
          }
          count++;
          if (count === produits.length) {
            stmt.finalize();
            resolve();
          }
        }
      );
    });
  });
}

// Fonction pour insérer les colis
function insertColis() {
  return new Promise((resolve, reject) => {
    const colisData = [
      {
        client_id: 1,
        numero_suivi: 'FR2026010001',
        statut: 'En préparation',
        poids: 0.5,
        dimensions: '15x10x5cm',
        reference: 'REF-2026-001',
        notes: 'Client VIP\nItem: iPhone 15 Pro\nLien: https://www.apple.com/fr/iphone-15-pro/\nPrix: 1199€\nN° Colis/mois: COL-01-2026'
      },
      {
        client_id: 2,
        numero_suivi: 'FR2026010002',
        statut: 'Prêt à expédier',
        poids: 0.1,
        dimensions: '10x8x4cm',
        reference: 'REF-2026-002',
        notes: 'Emballage cadeau\nItem: AirPods Pro 2\nLien: https://www.apple.com/fr/airpods-pro/\nPrix: 279€\nN° Colis/mois: COL-02-2026'
      },
      {
        client_id: 3,
        numero_suivi: 'BE2026010003',
        statut: 'Expédié',
        poids: 0.45,
        dimensions: '16x11x6cm',
        reference: 'REF-2026-003',
        notes: 'Livraison express\nItem: Samsung Galaxy S24\nLien: https://www.samsung.com/\nPrix: 899€\nN° Colis/mois: COL-03-2026',
        date_expedition: new Date().toISOString()
      },
      {
        client_id: 4,
        numero_suivi: 'IT2026010004',
        statut: 'En transit',
        poids: 2.1,
        dimensions: '45x30x10cm',
        reference: 'REF-2026-004',
        notes: 'Fragile - Ordinateur portable\nItem: MacBook Pro 16"\nLien: https://www.apple.com/fr/macbook-pro/\nPrix: 2499€\nN° Colis/mois: COL-04-2026',
        date_expedition: new Date(Date.now() - 86400000).toISOString()
      },
      {
        client_id: 5,
        numero_suivi: 'ES2026010005',
        statut: 'Livré',
        poids: 0.6,
        dimensions: '30x25x3cm',
        reference: 'REF-2026-005',
        notes: 'Signé par le destinataire\nItem: iPad Air\nLien: https://www.apple.com/fr/ipad-air/\nPrix: 699€\nN° Colis/mois: COL-05-2026',
        date_expedition: new Date(Date.now() - 172800000).toISOString(),
        date_livraison: new Date(Date.now() - 86400000).toISOString()
      },
      {
        client_id: 1,
        numero_suivi: 'FR2026010006',
        statut: 'Livré',
        poids: 0.15,
        dimensions: '12x10x5cm',
        reference: 'REF-2026-006',
        notes: 'Client satisfait\nItem: Apple Watch Series 9\nLien: https://www.apple.com/fr/apple-watch-series-9/\nPrix: 449€\nN° Colis/mois: COL-06-2026',
        date_expedition: new Date(Date.now() - 259200000).toISOString(),
        date_livraison: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO colis (
        numero_suivi, client_id, statut, poids, dimensions, reference,
        adresse_expedition, ville_expedition, code_postal_expedition, pays_expedition,
        notes, date_creation, date_expedition, date_livraison
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    colisData.forEach((colis, index) => {
      const client = clients[colis.client_id - 1];
      stmt.run(
        [
          colis.numero_suivi,
          colis.client_id,
          colis.statut,
          colis.poids,
          colis.dimensions,
          colis.reference,
          client.adresse,
          client.ville,
          client.code_postal,
          client.pays,
          colis.notes,
          new Date().toISOString(),
          colis.date_expedition || null,
          colis.date_livraison || null
        ],
        function(err) {
          if (err) {
            console.error(`Erreur insertion colis ${colis.numero_suivi}:`, err.message);
          } else {
            console.log(`✓ Colis créé: ${colis.numero_suivi} - ${colis.statut}`);
          }
          count++;
          if (count === colisData.length) {
            stmt.finalize();
            resolve();
          }
        }
      );
    });
  });
}

// Exécution séquentielle
async function init() {
  try {
    console.log('\n--- Création des clients ---');
    await insertClients();

    console.log('\n--- Création des produits ---');
    await insertProduits();

    console.log('\n--- Création des colis ---');
    await insertColis();

    console.log('\n✅ Toutes les données de test ont été créées avec succès!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

init();
