const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const PDFDocument = require('pdfkit');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Multer pour l'upload de fichiers
const upload = multer({ dest: 'uploads/' });

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ============= IMPORT CSV =============

// Fonction pour parser l'adresse
function parseAdresse(adresseComplete) {
  // Essayer de parser une adresse du type: "123 Rue de la Paix, 75001 Paris, France"
  const parts = adresseComplete.split(',').map(p => p.trim());

  let adresse = '';
  let ville = '';
  let code_postal = '';
  let pays = 'France';

  if (parts.length >= 1) {
    adresse = parts[0];
  }

  if (parts.length >= 2) {
    // Extraire code postal et ville depuis "75001 Paris"
    const villeMatch = parts[1].match(/(\d{5})\s+(.+)/);
    if (villeMatch) {
      code_postal = villeMatch[1];
      ville = villeMatch[2];
    } else {
      ville = parts[1];
    }
  }

  if (parts.length >= 3) {
    pays = parts[2];
  }

  return { adresse, ville, code_postal, pays };
}

// Route pour importer un CSV
app.post('/api/import/csv', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier uploadé' });
  }

  const results = [];
  const errors = [];
  let processedCount = 0;
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      // Supprimer le fichier temporaire
      fs.unlinkSync(req.file.path);

      if (results.length === 0) {
        return res.status(400).json({ error: 'Le fichier CSV est vide' });
      }

      // Traiter chaque ligne du CSV
      results.forEach((row, index) => {
        // Parser l'adresse
        const adresseData = parseAdresse(row["Adresse d'envoi"] || '');

        // Extraire le nom du client depuis l'adresse ou créer un client par défaut
        const nomClient = `Client CSV ${index + 1}`;

        // D'abord créer ou récupérer le client
        db.run(
          `INSERT INTO clients (nom, prenom, adresse, ville, code_postal, pays)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [nomClient, '', adresseData.adresse, adresseData.ville, adresseData.code_postal, adresseData.pays],
          function(err) {
            if (err) {
              errors.push({ row: index + 1, error: err.message });
              processedCount++;
              checkIfComplete();
              return;
            }

            const clientId = this.lastID;

            // Extraire les données du CSV
            const item = row['Item'] || '';
            const lien = row['Lien'] || '';
            const prix = parseFloat(row['Prix Objet (€)'] || row['Prix Objet'] || 0);
            const poids = parseFloat(row['Poids (kg)'] || row['Poids'] || 0);
            const lienSuivi = row['Lien de suivi colis'] || '';
            const photos = row['Photos/Vidéos associées'] || '';
            const statut = row['Statut'] || 'En préparation';
            const timestamp = row['Timestamp'] || null;
            const numeroColisMois = row['N° Colis/mois'] || '';
            const note = row['Note'] || '';

            // Construire les notes avec toutes les infos supplémentaires
            let notesComplete = note;
            if (item) notesComplete += `\nItem: ${item}`;
            if (lien) notesComplete += `\nLien: ${lien}`;
            if (prix) notesComplete += `\nPrix: ${prix}€`;
            if (photos) notesComplete += `\nPhotos/Vidéos: ${photos}`;
            if (numeroColisMois) notesComplete += `\nN° Colis/mois: ${numeroColisMois}`;

            // Créer le colis
            db.run(
              `INSERT INTO colis (numero_suivi, client_id, statut, poids,
                                  adresse_expedition, ville_expedition, code_postal_expedition, pays_expedition,
                                  notes, date_creation)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                lienSuivi || `COL${Date.now()}-${index}`,
                clientId,
                statut,
                poids || null,
                adresseData.adresse,
                adresseData.ville,
                adresseData.code_postal,
                adresseData.pays,
                notesComplete.trim(),
                timestamp || new Date().toISOString()
              ],
              function(err) {
                if (err) {
                  errors.push({ row: index + 1, error: err.message });
                } else {
                  successCount++;
                }
                processedCount++;
                checkIfComplete();
              }
            );
          }
        );
      });

      function checkIfComplete() {
        if (processedCount === results.length) {
          res.json({
            message: 'Import terminé',
            total: results.length,
            success: successCount,
            errors: errors.length,
            errorDetails: errors
          });
        }
      }
    })
    .on('error', (error) => {
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Erreur lors de la lecture du CSV: ' + error.message });
    });
});

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
  const { nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien } = req.body;

  db.run(
    `INSERT INTO clients (nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nom, prenom, email, telephone, adresse, ville, code_postal, pays || 'France', wallet, lien],
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
  const { nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien } = req.body;

  db.run(
    `UPDATE clients
     SET nom=?, prenom=?, email=?, telephone=?, adresse=?, ville=?, code_postal=?, pays=?, wallet=?, lien=?
     WHERE id=?`,
    [nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien, req.params.id],
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
    numero_suivi, client_id, statut, poids, dimensions, reference,
    adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition, pays_expedition,
    notes, produits
  } = req.body;

  // Générer un numéro de suivi si non fourni
  const tracking = numero_suivi || `COL${Date.now()}`;

  db.run(
    `INSERT INTO colis (numero_suivi, client_id, statut, poids, dimensions, reference,
                        adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition,
                        pays_expedition, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tracking, client_id, statut || 'En préparation', poids, dimensions, reference,
     adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition,
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
    numero_suivi, statut, poids, dimensions, reference,
    adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition, pays_expedition,
    date_expedition, date_livraison, notes
  } = req.body;

  db.run(
    `UPDATE colis
     SET numero_suivi=?, statut=?, poids=?, dimensions=?, reference=?,
         adresse_expedition=?, adresse_ligne2=?, ville_expedition=?, code_postal_expedition=?, pays_expedition=?,
         date_expedition=?, date_livraison=?, notes=?
     WHERE id=?`,
    [numero_suivi, statut, poids, dimensions, reference,
     adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition, pays_expedition,
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
  const { colisIds, logoData } = req.body;

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

    // Créer le PDF en format A4 sans marge
    const doc = new PDFDocument({ size: 'A4', margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=etiquettes.pdf');

    doc.pipe(res);

    // Dimensions pour 6 étiquettes par page (2 colonnes x 3 lignes)
    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    const labelWidth = pageWidth / 2; // 297.5 points
    const labelHeight = pageHeight / 3; // ~280.67 points
    const margin = 10; // Marge interne de chaque étiquette

    colisList.forEach((colis, index) => {
      // Calculer la position sur la page
      const pageIndex = Math.floor(index / 6);
      const positionOnPage = index % 6;
      const col = positionOnPage % 2;
      const row = Math.floor(positionOnPage / 2);

      // Créer une nouvelle page tous les 6 colis
      if (index > 0 && positionOnPage === 0) {
        doc.addPage();
      }

      // Calculer les coordonnées de départ de l'étiquette
      const startX = col * labelWidth;
      const startY = row * labelHeight;

      // Bordure simple en pointillés discrets
      doc.strokeColor('#cccccc')
         .lineWidth(0.5)
         .dash(4, 4)
         .rect(startX + 3, startY + 3, labelWidth - 6, labelHeight - 6)
         .stroke()
         .undash()
         .strokeColor('#000000')
         .lineWidth(1);

      let currentY = startY + margin + 8;

      // Logo (si disponible)
      if (logoData) {
        try {
          const logoBuffer = Buffer.from(logoData.split(',')[1], 'base64');
          doc.image(logoBuffer, startX + margin + 5, currentY, {
            width: labelWidth - 2 * margin - 10,
            height: 35,
            fit: [labelWidth - 2 * margin - 10, 35]
          });
          currentY += 42;
        } catch (e) {
          console.error('Erreur chargement logo:', e.message);
        }
      }

      // ===== NUMÉRO DE SUIVI =====
      doc.fontSize(8)
         .font('Helvetica')
         .text('NUMÉRO DE SUIVI', startX + margin, currentY, {
           width: labelWidth - 2 * margin,
           align: 'center'
         });
      currentY += 11;

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(colis.numero_suivi || 'N/A', startX + margin, currentY, {
           width: labelWidth - 2 * margin,
           align: 'center'
         });
      currentY += 15;

      // Code-barres stylisé
      doc.fontSize(9)
         .font('Courier-Bold')
         .text(`|||  ${colis.numero_suivi || 'N/A'}  |||`, startX + margin, currentY, {
           width: labelWidth - 2 * margin,
           align: 'center'
         });
      currentY += 15;

      // Ligne de séparation épaisse
      doc.strokeColor('#000000')
         .lineWidth(2)
         .moveTo(startX + margin, currentY)
         .lineTo(startX + labelWidth - margin, currentY)
         .stroke()
         .lineWidth(1);
      currentY += 8;

      // ===== DESTINATAIRE =====
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .text('DESTINATAIRE', startX + margin, currentY, {
           width: labelWidth - 2 * margin
         });

      // Soulignement du titre
      const destTitleWidth = doc.widthOfString('DESTINATAIRE');
      doc.strokeColor('#000000')
         .lineWidth(1.5)
         .moveTo(startX + margin, currentY + 11)
         .lineTo(startX + margin + destTitleWidth, currentY + 11)
         .stroke()
         .lineWidth(1);
      currentY += 18;

      // Nom + Prénom (en gros et gras)
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text(
           `${colis.client_nom || ''} ${colis.client_prenom || ''}`.trim().toUpperCase(),
           startX + margin,
           currentY,
           { width: labelWidth - 2 * margin }
         );
      currentY += 16;

      // Adresse ligne 1
      doc.fontSize(10)
         .font('Helvetica')
         .text(
           colis.adresse_expedition || colis.client_adresse || '',
           startX + margin,
           currentY,
           { width: labelWidth - 2 * margin }
         );
      currentY += 13;

      // Adresse ligne 2 (si présente)
      if (colis.adresse_ligne2) {
        doc.text(
          colis.adresse_ligne2,
          startX + margin,
          currentY,
          { width: labelWidth - 2 * margin }
        );
        currentY += 13;
      }

      // Code postal + Ville (en gras)
      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text(
           `${colis.code_postal_expedition || colis.client_code_postal || ''} ${colis.ville_expedition || colis.client_ville || ''}`.trim(),
           startX + margin,
           currentY,
           { width: labelWidth - 2 * margin }
         );
      currentY += 14;

      // Pays (souligné si différent de France)
      const pays = colis.pays_expedition || colis.client_pays || 'France';
      if (pays.toLowerCase() !== 'france') {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(pays, startX + margin, currentY, {
             width: labelWidth - 2 * margin,
             underline: true
           });
      } else {
        doc.fontSize(9)
           .font('Helvetica')
           .text(pays, startX + margin, currentY, { width: labelWidth - 2 * margin });
      }
      currentY += 18;

      // Ligne de séparation
      doc.strokeColor('#cccccc')
         .lineWidth(0.5)
         .moveTo(startX + margin, currentY)
         .lineTo(startX + labelWidth - margin, currentY)
         .stroke()
         .strokeColor('#000000')
         .lineWidth(1);
      currentY += 8;

      // ===== INFORMATIONS COLIS =====
      const leftCol = startX + margin;
      const rightCol = startX + margin + (labelWidth - 2 * margin) / 2 + 5;

      // Poids
      doc.fontSize(7)
         .font('Helvetica')
         .fillColor('#666666')
         .text('POIDS', leftCol, currentY, { width: (labelWidth - 2 * margin) / 2 - 5 });

      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text(`${colis.poids || 'N/A'} kg`, leftCol, currentY + 10, {
           width: (labelWidth - 2 * margin) / 2 - 5
         });

      // Dimensions
      doc.fontSize(7)
         .fillColor('#666666')
         .font('Helvetica')
         .text('DIMENSIONS', rightCol, currentY, { width: (labelWidth - 2 * margin) / 2 - 5 });

      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text(colis.dimensions || 'N/A', rightCol, currentY + 10, {
           width: (labelWidth - 2 * margin) / 2 - 5
         });

      currentY += 30;

      // Référence (soulignée)
      if (colis.reference) {
        doc.fontSize(10)
           .fillColor('#000000')
           .font('Helvetica-Bold')
           .text(`Ref: ${colis.reference}`, startX + margin, currentY, {
             width: labelWidth - 2 * margin,
             underline: true
           });
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

// ============= EXPORT / RESET DATABASE =============

// Exporter la base de données
app.get('/api/database/export', (req, res) => {
  const dbPath = path.join(__dirname, 'crm.db');

  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: 'Base de données non trouvée' });
  }

  res.download(dbPath, `crm-backup-${Date.now()}.db`, (err) => {
    if (err) {
      console.error('Erreur export base de données:', err);
      res.status(500).json({ error: 'Erreur lors de l\'export' });
    }
  });
});

// Réinitialiser la base de données
app.post('/api/database/reset', (req, res) => {
  const tables = ['colis_produits', 'colis', 'produits', 'clients'];

  let completedCount = 0;
  const errors = [];

  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, [], function(err) {
      if (err) {
        errors.push({ table, error: err.message });
      }
      completedCount++;

      if (completedCount === tables.length) {
        if (errors.length > 0) {
          res.status(500).json({ error: 'Erreur lors de la réinitialisation', details: errors });
        } else {
          res.json({ message: 'Base de données réinitialisée avec succès' });
        }
      }
    });
  });
});

// Initialiser avec des données de test
app.post('/api/database/init-test-data', (req, res) => {
  const { exec } = require('child_process');

  exec('node init-test-data.js', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error('Erreur init données de test:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'initialisation', details: stderr });
    }

    res.json({ message: 'Données de test créées avec succès', output: stdout });
  });
});

// ============= DÉMARRAGE SERVEUR =============

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
