const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ============= ROUTES CLIENTS =============

// Récupérer tous les clients
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY date_creation DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Récupérer un client par ID
app.get('/api/clients/:id', (req, res) => {
  db.get('SELECT * FROM clients WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row);
  });
});

// Créer un nouveau client
app.post('/api/clients', (req, res) => {
  const { nom, prenom, email, telephone, adresse, ville, code_postal, pays } = req.body;

  db.run(
    `INSERT INTO clients (nom, prenom, email, telephone, adresse, ville, code_postal, pays)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom, prenom, email, telephone, adresse, ville, code_postal, pays || 'France'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Client créé avec succès' });
    }
  );
});

// Mettre à jour un client
app.put('/api/clients/:id', (req, res) => {
  const { nom, prenom, email, telephone, adresse, ville, code_postal, pays } = req.body;

  db.run(
    `UPDATE clients
     SET nom=?, prenom=?, email=?, telephone=?, adresse=?, ville=?, code_postal=?, pays=?
     WHERE id=?`,
    [nom, prenom, email, telephone, adresse, ville, code_postal, pays, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Client mis à jour', changes: this.changes });
    }
  );
});

// Supprimer un client
app.delete('/api/clients/:id', (req, res) => {
  db.run('DELETE FROM clients WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Client supprimé', changes: this.changes });
  });
});

// ============= ROUTES PRODUITS =============

// Récupérer tous les produits
app.get('/api/produits', (req, res) => {
  db.all('SELECT * FROM produits ORDER BY nom', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Créer un nouveau produit
app.post('/api/produits', (req, res) => {
  const { nom, description, prix, poids, stock } = req.body;

  db.run(
    `INSERT INTO produits (nom, description, prix, poids, stock)
     VALUES (?, ?, ?, ?, ?)`,
    [nom, description, prix, poids, stock || 0],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Produit créé avec succès' });
    }
  );
});

// Mettre à jour un produit
app.put('/api/produits/:id', (req, res) => {
  const { nom, description, prix, poids, stock } = req.body;

  db.run(
    `UPDATE produits
     SET nom=?, description=?, prix=?, poids=?, stock=?
     WHERE id=?`,
    [nom, description, prix, poids, stock, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Produit mis à jour', changes: this.changes });
    }
  );
});

// Supprimer un produit
app.delete('/api/produits/:id', (req, res) => {
  db.run('DELETE FROM produits WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Produit supprimé', changes: this.changes });
  });
});

// ============= ROUTES COLIS =============

// Récupérer tous les colis avec infos client
app.get('/api/colis', (req, res) => {
  const query = `
    SELECT c.*,
           cl.nom as client_nom,
           cl.prenom as client_prenom,
           cl.email as client_email
    FROM colis c
    LEFT JOIN clients cl ON c.client_id = cl.id
    ORDER BY c.date_creation DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Récupérer un colis avec ses produits
app.get('/api/colis/:id', (req, res) => {
  const query = `
    SELECT c.*,
           cl.nom as client_nom,
           cl.prenom as client_prenom,
           cl.adresse as client_adresse,
           cl.ville as client_ville,
           cl.code_postal as client_code_postal,
           cl.pays as client_pays
    FROM colis c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = ?
  `;

  db.get(query, [req.params.id], (err, colis) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Récupérer les produits du colis
    db.all(
      `SELECT cp.*, p.nom, p.description, p.prix
       FROM colis_produits cp
       LEFT JOIN produits p ON cp.produit_id = p.id
       WHERE cp.colis_id = ?`,
      [req.params.id],
      (err, produits) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        colis.produits = produits;
        res.json(colis);
      }
    );
  });
});

// Créer un nouveau colis
app.post('/api/colis', (req, res) => {
  const {
    numero_suivi, client_id, statut, poids, dimensions,
    adresse_expedition, ville_expedition, code_postal_expedition, pays_expedition,
    notes, produits
  } = req.body;

  // Générer un numéro de suivi si non fourni
  const tracking = numero_suivi || `COL${Date.now()}`;

  db.run(
    `INSERT INTO colis (numero_suivi, client_id, statut, poids, dimensions,
                        adresse_expedition, ville_expedition, code_postal_expedition,
                        pays_expedition, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tracking, client_id, statut || 'En préparation', poids, dimensions,
     adresse_expedition, ville_expedition, code_postal_expedition,
     pays_expedition || 'France', notes],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const colisId = this.lastID;

      // Ajouter les produits si fournis
      if (produits && produits.length > 0) {
        const stmt = db.prepare('INSERT INTO colis_produits (colis_id, produit_id, quantite) VALUES (?, ?, ?)');

        produits.forEach(p => {
          stmt.run(colisId, p.produit_id, p.quantite || 1);
        });

        stmt.finalize();
      }

      res.json({ id: colisId, numero_suivi: tracking, message: 'Colis créé avec succès' });
    }
  );
});

// Mettre à jour un colis
app.put('/api/colis/:id', (req, res) => {
  const {
    numero_suivi, statut, poids, dimensions,
    adresse_expedition, ville_expedition, code_postal_expedition, pays_expedition,
    date_expedition, date_livraison, notes
  } = req.body;

  db.run(
    `UPDATE colis
     SET numero_suivi=?, statut=?, poids=?, dimensions=?,
         adresse_expedition=?, ville_expedition=?, code_postal_expedition=?, pays_expedition=?,
         date_expedition=?, date_livraison=?, notes=?
     WHERE id=?`,
    [numero_suivi, statut, poids, dimensions,
     adresse_expedition, ville_expedition, code_postal_expedition, pays_expedition,
     date_expedition, date_livraison, notes, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Colis mis à jour', changes: this.changes });
    }
  );
});

// Supprimer un colis
app.delete('/api/colis/:id', (req, res) => {
  db.run('DELETE FROM colis WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Colis supprimé', changes: this.changes });
  });
});

// ============= GÉNÉRATION D'ÉTIQUETTES PDF =============

app.post('/api/etiquettes/pdf', (req, res) => {
  const { colisIds } = req.body;

  if (!colisIds || colisIds.length === 0) {
    res.status(400).json({ error: 'Aucun colis sélectionné' });
    return;
  }

  // Récupérer les infos des colis
  const placeholders = colisIds.map(() => '?').join(',');
  const query = `
    SELECT c.*,
           cl.nom as client_nom,
           cl.prenom as client_prenom,
           cl.adresse as client_adresse,
           cl.ville as client_ville,
           cl.code_postal as client_code_postal,
           cl.pays as client_pays
    FROM colis c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.id IN (${placeholders})
  `;

  db.all(query, colisIds, (err, colisList) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Créer le PDF
    const doc = new PDFDocument({ size: 'A4', margin: 30 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=etiquettes.pdf');

    doc.pipe(res);

    colisList.forEach((colis, index) => {
      if (index > 0) {
        doc.addPage();
      }

      // Bordure
      doc.rect(30, 30, 535, 350).stroke();

      // Titre
      doc.fontSize(20).font('Helvetica-Bold').text('ÉTIQUETTE D\'EXPÉDITION', 50, 50);

      // Numéro de suivi
      doc.fontSize(14).font('Helvetica').text('N° de suivi:', 50, 90);
      doc.fontSize(16).font('Helvetica-Bold').text(colis.numero_suivi || 'N/A', 50, 110);

      // Code-barres simulé (texte)
      doc.fontSize(10).font('Courier').text(`||||| ${colis.numero_suivi} |||||`, 50, 135);

      // Destinataire
      doc.fontSize(12).font('Helvetica-Bold').text('DESTINATAIRE:', 50, 170);
      doc.fontSize(11).font('Helvetica');
      doc.text(`${colis.client_nom || ''} ${colis.client_prenom || ''}`, 50, 190);
      doc.text(colis.adresse_expedition || colis.client_adresse || '', 50, 210, { width: 250 });
      doc.text(`${colis.code_postal_expedition || colis.client_code_postal || ''} ${colis.ville_expedition || colis.client_ville || ''}`, 50, 250);
      doc.text(colis.pays_expedition || colis.client_pays || 'France', 50, 270);

      // Informations colis
      doc.fontSize(12).font('Helvetica-Bold').text('INFORMATIONS COLIS:', 350, 170);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Statut: ${colis.statut}`, 350, 190);
      doc.text(`Poids: ${colis.poids || 'N/A'} kg`, 350, 210);
      doc.text(`Dimensions: ${colis.dimensions || 'N/A'}`, 350, 230);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 350, 250);

      // Notes
      if (colis.notes) {
        doc.fontSize(10).font('Helvetica-Bold').text('Notes:', 50, 310);
        doc.fontSize(9).font('Helvetica').text(colis.notes, 50, 330, { width: 500 });
      }
    });

    doc.end();
  });
});

// ============= STATISTIQUES =============

app.get('/api/stats', (req, res) => {
  const stats = {};

  db.get('SELECT COUNT(*) as count FROM clients', [], (err, row) => {
    stats.clients = row ? row.count : 0;

    db.get('SELECT COUNT(*) as count FROM produits', [], (err, row) => {
      stats.produits = row ? row.count : 0;

      db.get('SELECT COUNT(*) as count FROM colis', [], (err, row) => {
        stats.colis = row ? row.count : 0;

        db.get("SELECT COUNT(*) as count FROM colis WHERE statut='En préparation'", [], (err, row) => {
          stats.colisEnPreparation = row ? row.count : 0;

          db.get("SELECT COUNT(*) as count FROM colis WHERE statut='Expédié'", [], (err, row) => {
            stats.colisExpedies = row ? row.count : 0;

            db.get("SELECT COUNT(*) as count FROM colis WHERE statut='Livré'", [], (err, row) => {
              stats.colisLivres = row ? row.count : 0;
              res.json(stats);
            });
          });
        });
      });
    });
  });
});

// ============= DÉMARRAGE SERVEUR =============

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
