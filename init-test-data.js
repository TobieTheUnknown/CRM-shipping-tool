const db = require('./database');

console.log('Initialisation des données de test...\n');

// Clients de test
const clients = [
  {
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@email.fr',
    telephone: '0123456789',
    adresse: '10 Rue de Rivoli',
    ville: 'Paris',
    code_postal: '75001',
    pays: 'France',
    wallet: JSON.stringify(['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh']),
    lien: JSON.stringify(['https://www.vinted.fr/member/12345', 'https://www.ebay.fr/usr/jean_dupont'])
  },
  {
    nom: 'Martin',
    prenom: 'Sophie',
    email: 'sophie.martin@email.fr',
    telephone: '0234567890',
    adresse: '25 Avenue des Champs',
    ville: 'Lyon',
    code_postal: '69001',
    pays: 'France',
    wallet: JSON.stringify(['0x8Ba1f109551bD432803012645Ac136ddd64DBA72']),
    lien: JSON.stringify(['https://www.leboncoin.fr/boutique/sophie_martin', 'https://www.instagram.com/sophie_collectibles/'])
  },
  {
    nom: 'Bernard',
    prenom: 'Pierre',
    email: 'pierre.bernard@email.be',
    telephone: '+32123456789',
    adresse: '456 Avenue Louise',
    ville: 'Bruxelles',
    code_postal: '1050',
    pays: 'Belgique',
    wallet: JSON.stringify(['bc1q5d5h88k8j4gks2v8hahx9s2pc3lfvhzgphhzmn']),
    lien: JSON.stringify(['https://www.2ememain.be/u/pierre_bernard/'])
  },
  {
    nom: 'Rossi',
    prenom: 'Maria',
    email: 'maria.rossi@email.it',
    telephone: '+39123456789',
    adresse: '12 Via Roma',
    ville: 'Rome',
    code_postal: '00100',
    pays: 'Italie',
    wallet: JSON.stringify(['0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359']),
    lien: JSON.stringify(['https://www.subito.it/utente/maria_rossi'])
  },
  {
    nom: 'Garcia',
    prenom: 'Carlos',
    email: 'carlos.garcia@email.es',
    telephone: '+34123456789',
    adresse: '89 Calle Mayor',
    ville: 'Madrid',
    code_postal: '28013',
    pays: 'Espagne',
    wallet: JSON.stringify(['bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4']),
    lien: JSON.stringify(['https://www.wallapop.com/user/carlos_garcia', 'https://www.milanuncios.com/carlos_garcia'])
  },
  {
    nom: 'Petit',
    prenom: 'Julie',
    email: 'julie.petit@email.fr',
    telephone: '0345678901',
    adresse: '78 Boulevard Haussmann',
    ville: 'Paris',
    code_postal: '75008',
    pays: 'France',
    wallet: JSON.stringify(['0x71C7656EC7ab88b098defB751B7401B5f6d8976F']),
    lien: JSON.stringify(['https://www.vinted.fr/member/julie_p', 'https://www.depop.com/juliepetit/'])
  },
  {
    nom: 'Müller',
    prenom: 'Hans',
    email: 'hans.muller@email.de',
    telephone: '+49123456789',
    adresse: '34 Hauptstraße',
    ville: 'Berlin',
    code_postal: '10115',
    pays: 'Allemagne',
    wallet: JSON.stringify(['bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq']),
    lien: JSON.stringify(['https://www.ebay.de/usr/hans_muller'])
  },
  {
    nom: 'Lefebvre',
    prenom: 'Marc',
    email: 'marc.lefebvre@email.fr',
    telephone: '0456789012',
    adresse: '15 Rue de la Paix',
    ville: 'Marseille',
    code_postal: '13001',
    pays: 'France',
    wallet: JSON.stringify(['0x9C1B344e88f0dcDC5270f64C4c75F9e6a9B2d3Be']),
    lien: JSON.stringify(['https://www.vinted.fr/member/marc_collector'])
  }
];

// Produits de test
const produits = [
  { nom: 'iPhone 15 Pro', description: 'Smartphone Apple dernier modèle 256GB Titane', prix: 1199.00, poids: 0.5, stock: 15 },
  { nom: 'Samsung Galaxy S24 Ultra', description: 'Smartphone Samsung haut de gamme 512GB', prix: 1299.00, poids: 0.45, stock: 20 },
  { nom: 'MacBook Pro 16"', description: 'Ordinateur portable Apple M3 Pro 18GB RAM', prix: 2499.00, poids: 2.1, stock: 8 },
  { nom: 'AirPods Pro 2', description: 'Écouteurs sans fil Apple USB-C', prix: 279.00, poids: 0.1, stock: 50 },
  { nom: 'iPad Air M2', description: 'Tablette Apple 11 pouces 128GB WiFi', prix: 699.00, poids: 0.6, stock: 12 },
  { nom: 'Apple Watch Series 9', description: 'Montre connectée Apple GPS 45mm', prix: 449.00, poids: 0.15, stock: 25 },
  { nom: 'PlayStation 5', description: 'Console Sony PS5 Slim Digital Edition', prix: 449.00, poids: 3.2, stock: 5 },
  { nom: 'Nintendo Switch OLED', description: 'Console Nintendo Switch modèle OLED', prix: 349.00, poids: 0.8, stock: 18 },
  { nom: 'DualSense Edge', description: 'Manette sans fil PS5 Pro', prix: 219.00, poids: 0.35, stock: 30 },
  { nom: 'Carte Pokémon Dracaufeu', description: 'Carte rare 1ère édition Français', prix: 850.00, poids: 0.01, stock: 3 },
  { nom: 'LEGO Star Wars Faucon', description: 'LEGO UCS Millenium Falcon 75192', prix: 899.00, poids: 8.5, stock: 2 },
  { nom: 'Sneakers Nike Dunk Low', description: 'Baskets Nike Dunk Low Panda pointure 42', prix: 129.00, poids: 1.2, stock: 22 },
  { nom: 'Casque Sony WH-1000XM5', description: 'Casque audio sans fil réduction bruit', prix: 399.00, poids: 0.4, stock: 16 },
  { nom: 'GoPro Hero 12 Black', description: 'Caméra action 5.3K60 avec accessoires', prix: 449.00, poids: 0.3, stock: 10 },
  { nom: 'Figurine Funko Pop Rare', description: 'Funko Pop exclusive édition limitée', prix: 45.00, poids: 0.25, stock: 35 }
];

// Colis de test avec produits
const colisData = [
  {
    client_id: 1,
    numero_suivi: 'FR2026010001',
    statut: 'En préparation',
    poids: 0.5,
    dimensions: '15x10x5cm',
    reference: 'REF-2026-001',
    notes: 'Client VIP - Emballage soigné',
    produits: [{ produit_id: 1, quantite: 1, lien: 'https://www.vinted.fr/items/3456789012-iphone-15-pro-256gb' }]
  },
  {
    client_id: 2,
    numero_suivi: 'FR2026010002',
    statut: 'Out of stock',
    poids: 0.1,
    dimensions: '10x8x4cm',
    reference: 'REF-2026-002',
    notes: 'Emballage cadeau demandé',
    produits: [{ produit_id: 4, quantite: 1, lien: 'https://www.leboncoin.fr/image_son/2345678901.htm' }]
  },
  {
    client_id: 3,
    numero_suivi: 'BE2026010003',
    statut: 'Envoyé',
    poids: 0.45,
    dimensions: '16x11x6cm',
    reference: 'REF-2026-003',
    notes: 'Livraison express - Signature requise',
    date_expedition: new Date().toISOString(),
    produits: [{ produit_id: 2, quantite: 1, lien: 'https://www.2ememain.be/item/samsung-s24-ultra-512gb' }]
  },
  {
    client_id: 4,
    numero_suivi: 'IT2026010004',
    statut: 'Envoyé',
    poids: 2.1,
    dimensions: '45x30x10cm',
    reference: 'REF-2026-004',
    notes: 'FRAGILE - Ordinateur portable - Assurance 2500€',
    date_expedition: new Date(Date.now() - 86400000).toISOString(),
    produits: [{ produit_id: 3, quantite: 1, lien: 'https://www.subito.it/macbook-pro-16-m3' }]
  },
  {
    client_id: 5,
    numero_suivi: 'ES2026010005',
    statut: 'Envoyé',
    poids: 0.6,
    dimensions: '30x25x3cm',
    reference: 'REF-2026-005',
    notes: 'Livré et signé par le destinataire',
    date_expedition: new Date(Date.now() - 172800000).toISOString(),
    date_livraison: new Date(Date.now() - 86400000).toISOString(),
    produits: [{ produit_id: 5, quantite: 1, lien: 'https://www.wallapop.com/item/ipad-air-m2-128gb' }]
  },
  {
    client_id: 1,
    numero_suivi: 'FR2026010006',
    statut: 'Incomplet',
    poids: 0.15,
    dimensions: '12x10x5cm',
    reference: 'REF-2026-006',
    notes: 'Adresse à confirmer - Client contacté le 13/01',
    produits: [{ produit_id: 6, quantite: 1, lien: 'https://www.vinted.fr/items/apple-watch-series-9-gps' }]
  },
  {
    client_id: 6,
    numero_suivi: 'FR2026010007',
    statut: 'En préparation',
    poids: 3.2,
    dimensions: '50x35x12cm',
    reference: 'REF-2026-007',
    notes: 'Console neuve scellée - Attention au poids',
    produits: [{ produit_id: 7, quantite: 1, lien: 'https://www.vinted.fr/items/ps5-slim-digital-neuve' }]
  },
  {
    client_id: 7,
    numero_suivi: 'DE2026010008',
    statut: 'Envoyé',
    poids: 1.1,
    dimensions: '35x25x8cm',
    reference: 'REF-2026-008',
    notes: 'Envoi international - Douanes OK',
    date_expedition: new Date(Date.now() - 259200000).toISOString(),
    produits: [
      { produit_id: 8, quantite: 1, lien: 'https://www.ebay.de/itm/nintendo-switch-oled' },
      { produit_id: 9, quantite: 1, lien: 'https://www.ebay.de/itm/dualsense-edge-controller' }
    ]
  },
  {
    client_id: 2,
    numero_suivi: 'FR2026010009',
    statut: 'Envoyé',
    poids: 0.01,
    dimensions: '12x10x2cm',
    reference: 'REF-2026-009',
    notes: 'Carte protégée - Lettre suivie recommandée',
    date_expedition: new Date(Date.now() - 345600000).toISOString(),
    date_livraison: new Date(Date.now() - 172800000).toISOString(),
    produits: [{ produit_id: 10, quantite: 1, lien: 'https://www.cardmarket.com/fr/Pokemon/Products/Singles/Base-Set/Charizard' }]
  },
  {
    client_id: 8,
    numero_suivi: 'FR2026010010',
    statut: 'En préparation',
    poids: 8.5,
    dimensions: '60x50x18cm',
    reference: 'REF-2026-010',
    notes: 'LEGO - Boîte volumineuse - Prévoir grand carton',
    produits: [{ produit_id: 11, quantite: 1, lien: 'https://www.vinted.fr/items/lego-millennium-falcon-75192' }]
  },
  {
    client_id: 1,
    numero_suivi: 'FR2026010011',
    statut: 'Envoyé',
    poids: 1.65,
    dimensions: '40x30x15cm',
    reference: 'REF-2026-011',
    notes: 'Colis multiple - 3ème commande du client',
    date_expedition: new Date(Date.now() - 432000000).toISOString(),
    date_livraison: new Date(Date.now() - 259200000).toISOString(),
    produits: [
      { produit_id: 12, quantite: 1, lien: 'https://www.vinted.fr/items/nike-dunk-low-panda-42' },
      { produit_id: 13, quantite: 1, lien: 'https://www.vinted.fr/items/casque-sony-wh1000xm5' }
    ]
  },
  {
    client_id: 6,
    numero_suivi: 'FR2026010012',
    statut: 'En préparation',
    poids: 0.3,
    dimensions: '22x18x10cm',
    reference: 'REF-2026-012',
    notes: 'GoPro avec tous les accessoires',
    produits: [{ produit_id: 14, quantite: 1, lien: 'https://www.leboncoin.fr/image_son/gopro-hero-12-black' }]
  },
  {
    client_id: 8,
    numero_suivi: 'FR2026010013',
    statut: 'Envoyé',
    poids: 0.75,
    dimensions: '25x20x15cm',
    reference: 'REF-2026-013',
    notes: 'Collection de 3 Funko Pop - Bien protéger',
    date_expedition: new Date(Date.now() - 518400000).toISOString(),
    produits: [{ produit_id: 15, quantite: 3, lien: 'https://www.vinted.fr/items/funko-pop-lot-exclusives' }]
  }
];

// Fonction pour insérer les clients
function insertClients() {
  console.log('\n--- Création des clients ---');
  const stmt = db.prepare(`
    INSERT INTO clients (nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  clients.forEach((client) => {
    try {
      stmt.run(
        client.nom,
        client.prenom,
        client.email,
        client.telephone,
        client.adresse,
        client.ville,
        client.code_postal,
        client.pays,
        client.wallet || null,
        client.lien || null
      );
      console.log(`✓ Client créé: ${client.nom} ${client.prenom} (${client.pays})`);
    } catch (err) {
      console.error(`Erreur insertion client ${client.nom}:`, err.message);
    }
  });
}

// Fonction pour insérer les produits
function insertProduits() {
  console.log('\n--- Création des produits ---');
  const stmt = db.prepare(`
    INSERT INTO produits (nom, description, prix, poids, stock)
    VALUES (?, ?, ?, ?, ?)
  `);

  produits.forEach((produit) => {
    try {
      stmt.run(produit.nom, produit.description, produit.prix, produit.poids, produit.stock);
      console.log(`✓ Produit créé: ${produit.nom} - ${produit.prix}€`);
    } catch (err) {
      console.error(`Erreur insertion produit ${produit.nom}:`, err.message);
    }
  });
}

// Fonction pour insérer les colis
function insertColis() {
  console.log('\n--- Création des colis ---');
  const stmtColis = db.prepare(`
    INSERT INTO colis (
      numero_suivi, client_id, statut, poids, dimensions, reference,
      adresse_expedition, ville_expedition, code_postal_expedition, pays_expedition,
      notes, date_creation, date_expedition, date_livraison
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const stmtColisProduits = db.prepare(`
    INSERT INTO colis_produits (colis_id, produit_id, quantite, lien)
    VALUES (?, ?, ?, ?)
  `);

  colisData.forEach((colis) => {
    try {
      const client = clients[colis.client_id - 1];
      const result = stmtColis.run(
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
      );

      const colisId = result.lastInsertRowid;

      // Insérer les produits associés
      if (colis.produits && colis.produits.length > 0) {
        colis.produits.forEach((produit) => {
          stmtColisProduits.run(
            colisId,
            produit.produit_id,
            produit.quantite || 1,
            produit.lien || null
          );
        });
        console.log(`✓ Colis créé: ${colis.numero_suivi} - ${colis.statut} (${colis.produits.length} produit(s))`);
      } else {
        console.log(`✓ Colis créé: ${colis.numero_suivi} - ${colis.statut}`);
      }
    } catch (err) {
      console.error(`Erreur insertion colis ${colis.numero_suivi}:`, err.message);
    }
  });
}

// Exécution
function init() {
  try {
    insertClients();
    insertProduits();
    insertColis();
    console.log('\n✅ Toutes les données de test ont été créées avec succès!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

init();
