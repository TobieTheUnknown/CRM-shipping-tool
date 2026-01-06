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
const PORT = process.env.PORT || 6389;

// Chemin des données (partagé avec database.js)
const dataPath = db.dataPath || __dirname;
const uploadsPath = path.join(dataPath, 'uploads');

// Configuration Multer pour l'upload de fichiers
const upload = multer({ dest: uploadsPath });

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ============= IMPORT CSV =============

// Fonction pour parser l'adresse
function parseAdresse(adresseComplete) {
  const parts = adresseComplete.split(',').map(p => p.trim());

  let adresse = '';
  let ville = '';
  let code_postal = '';
  let pays = 'France';

  if (parts.length >= 1) {
    adresse = parts[0];
  }

  if (parts.length >= 2) {
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
  let successCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      fs.unlinkSync(req.file.path);

      if (results.length === 0) {
        return res.status(400).json({ error: 'Le fichier CSV est vide' });
      }

      const insertClient = db.prepare(
        `INSERT INTO clients (nom, prenom, adresse, ville, code_postal, pays)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      const insertColis = db.prepare(
        `INSERT INTO colis (numero_suivi, client_id, statut, poids,
                            adresse_expedition, ville_expedition, code_postal_expedition, pays_expedition,
                            notes, date_creation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      results.forEach((row, index) => {
        try {
          const adresseData = parseAdresse(row["Adresse d'envoi"] || '');
          const nomClient = `Client CSV ${index + 1}`;

          const clientResult = insertClient.run(
            nomClient, '', adresseData.adresse, adresseData.ville, adresseData.code_postal, adresseData.pays
          );
          const clientId = clientResult.lastInsertRowid;

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

          let notesComplete = note;
          if (item) notesComplete += `\nItem: ${item}`;
          if (lien) notesComplete += `\nLien: ${lien}`;
          if (prix) notesComplete += `\nPrix: ${prix}€`;
          if (photos) notesComplete += `\nPhotos/Vidéos: ${photos}`;
          if (numeroColisMois) notesComplete += `\nN° Colis/mois: ${numeroColisMois}`;

          insertColis.run(
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
          );

          successCount++;
        } catch (err) {
          errors.push({ row: index + 1, error: err.message });
        }
      });

      res.json({
        message: 'Import terminé',
        total: results.length,
        success: successCount,
        errors: errors.length,
        errorDetails: errors
      });
    })
    .on('error', (error) => {
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: 'Erreur lors de la lecture du CSV: ' + error.message });
    });
});

// ============= ROUTES CLIENTS =============

app.get('/api/clients', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM clients ORDER BY date_creation DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', (req, res) => {
  const { nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien } = req.body;

  try {
    const result = db.prepare(
      `INSERT INTO clients (nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(nom, prenom, email, telephone, adresse, ville, code_postal, pays || 'France', wallet, lien);

    res.json({ id: result.lastInsertRowid, message: 'Client créé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', (req, res) => {
  const { nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien } = req.body;

  try {
    const result = db.prepare(
      `UPDATE clients
       SET nom=?, prenom=?, email=?, telephone=?, adresse=?, ville=?, code_postal=?, pays=?, wallet=?, lien=?
       WHERE id=?`
    ).run(nom, prenom, email, telephone, adresse, ville, code_postal, pays, wallet, lien, req.params.id);

    res.json({ message: 'Client mis à jour', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    res.json({ message: 'Client supprimé', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= ROUTES PRODUITS =============

app.get('/api/produits', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM produits ORDER BY nom').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/produits', (req, res) => {
  const { nom, description, prix, poids, stock, dimension_id } = req.body;

  try {
    const result = db.prepare(
      `INSERT INTO produits (nom, description, prix, poids, stock, dimension_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(nom, description, prix, poids, stock || 0, dimension_id || null);

    res.json({ id: result.lastInsertRowid, message: 'Produit créé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/produits/:id', (req, res) => {
  const { nom, description, prix, poids, stock, dimension_id } = req.body;

  try {
    const result = db.prepare(
      `UPDATE produits
       SET nom=?, description=?, prix=?, poids=?, stock=?, dimension_id=?
       WHERE id=?`
    ).run(nom, description, prix, poids, stock, dimension_id || null, req.params.id);

    res.json({ message: 'Produit mis à jour', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/produits/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM produits WHERE id = ?').run(req.params.id);
    res.json({ message: 'Produit supprimé', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= ROUTES COLIS =============

app.get('/api/colis', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*,
             cl.nom as client_nom,
             cl.prenom as client_prenom,
             cl.email as client_email
      FROM colis c
      LEFT JOIN clients cl ON c.client_id = cl.id
      ORDER BY c.date_creation DESC
    `).all();

    // Récupérer TOUS les produits de TOUS les colis en UNE SEULE requête (fix N+1)
    const allProduits = db.prepare(`
      SELECT cp.colis_id, cp.produit_id, cp.quantite, cp.lien, p.nom, p.poids, p.dimension_id
      FROM colis_produits cp
      LEFT JOIN produits p ON cp.produit_id = p.id
    `).all();

    // Grouper les produits par colis_id
    const produitsParColis = {};
    allProduits.forEach(p => {
      if (!produitsParColis[p.colis_id]) {
        produitsParColis[p.colis_id] = [];
      }
      produitsParColis[p.colis_id].push(p);
    });

    // Assigner les produits à chaque colis
    rows.forEach(colis => {
      colis.produits = produitsParColis[colis.id] || [];
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/colis/:id', (req, res) => {
  try {
    const colis = db.prepare(`
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
    `).get(req.params.id);

    const produits = db.prepare(
      `SELECT cp.*, p.nom, p.description, p.prix, p.poids, p.dimension_id
       FROM colis_produits cp
       LEFT JOIN produits p ON cp.produit_id = p.id
       WHERE cp.colis_id = ?`
    ).all(req.params.id);

    colis.produits = produits;
    res.json(colis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/colis', (req, res) => {
  const {
    numero_suivi, client_id, statut, poids, dimensions, reference,
    adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition, pays_expedition,
    notes, produits
  } = req.body;

  const tracking = numero_suivi || `COL${Date.now()}`;

  try {
    const result = db.prepare(
      `INSERT INTO colis (numero_suivi, client_id, statut, poids, dimensions, reference,
                          adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition,
                          pays_expedition, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(tracking, client_id, statut || 'En préparation', poids, dimensions, reference,
          adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition,
          pays_expedition || 'France', notes);

    const colisId = result.lastInsertRowid;

    const produitsNegatifs = [];

    if (produits && produits.length > 0) {
      const stmtInsert = db.prepare('INSERT INTO colis_produits (colis_id, produit_id, quantite, lien) VALUES (?, ?, ?, ?)');
      const stmtUpdateStock = db.prepare('UPDATE produits SET stock = stock - ? WHERE id = ?');
      const stmtGetStock = db.prepare('SELECT nom, stock FROM produits WHERE id = ?');

      produits.forEach(p => {
        const quantite = p.quantite || 1;
        // Insérer la relation colis-produit avec lien
        stmtInsert.run(colisId, p.produit_id, quantite, p.lien || null);
        // Décrémenter le stock (peut devenir négatif)
        stmtUpdateStock.run(quantite, p.produit_id);
        // Vérifier si le stock est devenu négatif
        const produit = stmtGetStock.get(p.produit_id);
        if (produit && produit.stock < 0) {
          produitsNegatifs.push({ nom: produit.nom, stock: produit.stock });
        }
      });
    }

    res.json({ id: colisId, numero_suivi: tracking, message: 'Colis créé avec succès', produitsNegatifs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/colis/:id', (req, res) => {
  const {
    client_id, numero_suivi, statut, poids, dimensions, reference,
    adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition, pays_expedition,
    date_expedition, date_livraison, notes, produits
  } = req.body;

  const produitsNegatifs = [];

  try {
    // Si des produits sont fournis, gérer le stock
    if (produits !== undefined) {
      // Récupérer les anciens produits pour restaurer le stock
      const anciensProduits = db.prepare(
        'SELECT produit_id, quantite FROM colis_produits WHERE colis_id = ?'
      ).all(req.params.id);

      // Restaurer le stock des anciens produits
      const stmtRestore = db.prepare('UPDATE produits SET stock = stock + ? WHERE id = ?');
      anciensProduits.forEach(p => {
        stmtRestore.run(p.quantite, p.produit_id);
      });

      // Supprimer les anciennes relations
      db.prepare('DELETE FROM colis_produits WHERE colis_id = ?').run(req.params.id);

      // Ajouter les nouveaux produits et décrémenter le stock
      if (produits && produits.length > 0) {
        const stmtInsert = db.prepare('INSERT INTO colis_produits (colis_id, produit_id, quantite, lien) VALUES (?, ?, ?, ?)');
        const stmtUpdateStock = db.prepare('UPDATE produits SET stock = stock - ? WHERE id = ?');
        const stmtGetStock = db.prepare('SELECT nom, stock FROM produits WHERE id = ?');

        produits.forEach(p => {
          const quantite = p.quantite || 1;
          stmtInsert.run(req.params.id, p.produit_id, quantite, p.lien || null);
          stmtUpdateStock.run(quantite, p.produit_id);
          // Vérifier si le stock est devenu négatif
          const produit = stmtGetStock.get(p.produit_id);
          if (produit && produit.stock < 0) {
            produitsNegatifs.push({ nom: produit.nom, stock: produit.stock });
          }
        });
      }
    }

    const result = db.prepare(
      `UPDATE colis
       SET client_id=?, numero_suivi=?, statut=?, poids=?, dimensions=?, reference=?,
           adresse_expedition=?, adresse_ligne2=?, ville_expedition=?, code_postal_expedition=?, pays_expedition=?,
           date_expedition=?, date_livraison=?, notes=?
       WHERE id=?`
    ).run(client_id, numero_suivi || null, statut, poids, dimensions, reference,
          adresse_expedition, adresse_ligne2, ville_expedition, code_postal_expedition, pays_expedition,
          date_expedition, date_livraison, notes, req.params.id);

    res.json({ message: 'Colis mis à jour', changes: result.changes, produitsNegatifs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/colis/:id', (req, res) => {
  try {
    // Restaurer le stock des produits avant de supprimer le colis
    const produitsAColis = db.prepare(
      'SELECT produit_id, quantite FROM colis_produits WHERE colis_id = ?'
    ).all(req.params.id);

    const stmtRestore = db.prepare('UPDATE produits SET stock = stock + ? WHERE id = ?');
    produitsAColis.forEach(p => {
      stmtRestore.run(p.quantite, p.produit_id);
    });

    // Les relations colis_produits seront supprimées automatiquement grâce à ON DELETE CASCADE
    const result = db.prepare('DELETE FROM colis WHERE id = ?').run(req.params.id);
    res.json({ message: 'Colis supprimé', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= GÉNÉRATION D'ÉTIQUETTES PDF =============

app.post('/api/etiquettes/pdf', (req, res) => {
  const { colisIds, logoData } = req.body;

  if (!colisIds || colisIds.length === 0) {
    return res.status(400).json({ error: 'Aucun colis sélectionné' });
  }

  try {
    const placeholders = colisIds.map(() => '?').join(',');
    const colisList = db.prepare(`
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
    `).all(...colisIds);

    const doc = new PDFDocument({ size: 'A4', margin: 0 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=etiquettes.pdf');

    doc.pipe(res);

    const pageWidth = 595;
    const pageHeight = 842;
    const labelWidth = pageWidth / 2;
    const labelHeight = pageHeight / 3;
    const margin = 10;

    colisList.forEach((colis, index) => {
      const positionOnPage = index % 6;
      const col = positionOnPage % 2;
      const row = Math.floor(positionOnPage / 2);

      if (index > 0 && positionOnPage === 0) {
        doc.addPage();
      }

      const startX = col * labelWidth;
      const startY = row * labelHeight;

      let currentY = startY + margin + 8;

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

      doc.fontSize(9)
         .font('Courier-Bold')
         .text(`|||  ${colis.numero_suivi || 'N/A'}  |||`, startX + margin, currentY, {
           width: labelWidth - 2 * margin,
           align: 'center'
         });
      currentY += 15;

      doc.strokeColor('#000000')
         .lineWidth(2)
         .moveTo(startX + margin, currentY)
         .lineTo(startX + labelWidth - margin, currentY)
         .stroke()
         .lineWidth(1);
      currentY += 8;

      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#2563eb')
         .text('DESTINATAIRE', startX + margin, currentY, {
           width: labelWidth - 2 * margin
         });

      const destTitleWidth = doc.widthOfString('DESTINATAIRE');
      doc.strokeColor('#2563eb')
         .lineWidth(1.5)
         .moveTo(startX + margin, currentY + 11)
         .lineTo(startX + margin + destTitleWidth, currentY + 11)
         .stroke()
         .lineWidth(1)
         .strokeColor('#000000');
      currentY += 18;

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text(
           `${colis.client_nom || ''} ${colis.client_prenom || ''}`.trim().toUpperCase(),
           startX + margin,
           currentY,
           { width: labelWidth - 2 * margin }
         );
      currentY += 16;

      doc.fontSize(10)
         .font('Helvetica')
         .text(
           colis.adresse_expedition || colis.client_adresse || '',
           startX + margin,
           currentY,
           { width: labelWidth - 2 * margin }
         );
      currentY += 13;

      if (colis.adresse_ligne2) {
        doc.text(
          colis.adresse_ligne2,
          startX + margin,
          currentY,
          { width: labelWidth - 2 * margin }
        );
        currentY += 13;
      }

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .text(
           `${colis.code_postal_expedition || colis.client_code_postal || ''} ${colis.ville_expedition || colis.client_ville || ''}`.trim(),
           startX + margin,
           currentY,
           { width: labelWidth - 2 * margin }
         );
      currentY += 14;

      const pays = colis.pays_expedition || colis.client_pays || 'France';
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#000000')
         .text(pays, startX + margin, currentY, { width: labelWidth - 2 * margin });
      currentY += 18;

      doc.strokeColor('#cccccc')
         .lineWidth(0.5)
         .moveTo(startX + margin, currentY)
         .lineTo(startX + labelWidth - margin, currentY)
         .stroke()
         .strokeColor('#000000')
         .lineWidth(1);
      currentY += 8;

      const leftCol = startX + margin;
      const rightCol = startX + margin + (labelWidth - 2 * margin) / 2 + 5;

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

      if (colis.reference) {
        doc.fontSize(10)
           .fillColor('#059669')
           .font('Helvetica-Bold')
           .text(`Ref: ${colis.reference}`, startX + margin, currentY, {
             width: labelWidth - 2 * margin,
             underline: true
           })
           .fillColor('#000000');
      }
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= ROUTES DIMENSIONS =============

app.get('/api/dimensions', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM dimensions ORDER BY longueur ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dimensions', (req, res) => {
  const { nom, longueur, largeur, hauteur, poids_carton, is_default } = req.body;

  try {
    const result = db.prepare(
      `INSERT INTO dimensions (nom, longueur, largeur, hauteur, poids_carton, is_default)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(nom, longueur, largeur, hauteur, poids_carton || 0, is_default ? 1 : 0);

    res.json({ id: result.lastInsertRowid, message: 'Dimension créée avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/dimensions/:id', (req, res) => {
  const { nom, longueur, largeur, hauteur, poids_carton, is_default } = req.body;

  try {
    const result = db.prepare(
      `UPDATE dimensions
       SET nom=?, longueur=?, largeur=?, hauteur=?, poids_carton=?, is_default=?
       WHERE id=?`
    ).run(nom, longueur, largeur, hauteur, poids_carton || 0, is_default ? 1 : 0, req.params.id);

    res.json({ message: 'Dimension mise à jour', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/dimensions/:id', (req, res) => {
  try {
    db.prepare('UPDATE produits SET dimension_id = NULL WHERE dimension_id = ?').run(req.params.id);
    const result = db.prepare('DELETE FROM dimensions WHERE id = ?').run(req.params.id);
    res.json({ message: 'Dimension supprimée', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= ROUTES TIMBRES =============

// Get all stamps
app.get('/api/timbres', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT t.*, c.numero_suivi as colis_numero_suivi
      FROM timbres t
      LEFT JOIN colis c ON t.colis_id = c.id
      ORDER BY t.poids_min ASC, t.date_creation DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get available stamp for a specific weight (in kg)
app.get('/api/timbres/disponible/:poids', (req, res) => {
  try {
    const poidsKg = parseFloat(req.params.poids);
    const poidsG = poidsKg * 1000; // Convert to grams

    const timbre = db.prepare(`
      SELECT * FROM timbres
      WHERE utilise = 0 AND poids_min <= ? AND poids_max >= ?
      ORDER BY poids_min ASC
      LIMIT 1
    `).get(poidsG, poidsG);

    res.json(timbre || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add stamps (bulk import from text)
app.post('/api/timbres/import', (req, res) => {
  const { numeros, poids_categorie, poids_min, poids_max } = req.body;

  if (!numeros || !Array.isArray(numeros) || numeros.length === 0) {
    return res.status(400).json({ error: 'Aucun numéro fourni' });
  }

  try {
    const stmt = db.prepare(
      `INSERT OR IGNORE INTO timbres (numero_suivi, poids_categorie, poids_min, poids_max)
       VALUES (?, ?, ?, ?)`
    );

    let inserted = 0;
    numeros.forEach(numero => {
      const result = stmt.run(numero.trim(), poids_categorie, poids_min, poids_max);
      if (result.changes > 0) inserted++;
    });

    res.json({ message: `${inserted} timbres ajoutés`, inserted, total: numeros.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark stamp as used (assign to colis)
app.put('/api/timbres/:id/utiliser', (req, res) => {
  const { colis_id } = req.body;

  try {
    const result = db.prepare(
      `UPDATE timbres SET utilise = 1, colis_id = ? WHERE id = ?`
    ).run(colis_id, req.params.id);

    res.json({ message: 'Timbre marqué comme utilisé', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Release stamp (unassign from colis)
app.put('/api/timbres/:id/liberer', (req, res) => {
  try {
    const result = db.prepare(
      `UPDATE timbres SET utilise = 0, colis_id = NULL WHERE id = ?`
    ).run(req.params.id);

    res.json({ message: 'Timbre libéré', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle stamp status (used/not used)
app.put('/api/timbres/:id/toggle', (req, res) => {
  try {
    // Get current status
    const timbre = db.prepare('SELECT utilise FROM timbres WHERE id = ?').get(req.params.id);
    if (!timbre) {
      return res.status(404).json({ error: 'Timbre non trouvé' });
    }

    const newStatus = timbre.utilise ? 0 : 1;
    const result = db.prepare(
      `UPDATE timbres SET utilise = ?, colis_id = NULL WHERE id = ?`
    ).run(newStatus, req.params.id);

    res.json({ message: newStatus ? 'Timbre marqué comme utilisé' : 'Timbre marqué comme disponible', utilise: newStatus, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stamps by weight category
app.get('/api/timbres/categorie/:categorie', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT * FROM timbres
      WHERE poids_categorie = ?
      ORDER BY utilise ASC, date_creation DESC
    `).all(req.params.categorie);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete stamp
app.delete('/api/timbres/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM timbres WHERE id = ?').run(req.params.id);
    res.json({ message: 'Timbre supprimé', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete all stamps in a category
app.delete('/api/timbres/categorie/:categorie', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM timbres WHERE poids_categorie = ? AND utilise = 0')
      .run(req.params.categorie);
    res.json({ message: `${result.changes} timbres supprimés`, changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a single stamp
app.put('/api/timbres/:id', (req, res) => {
  const { numero_suivi, poids_categorie, poids_min, poids_max } = req.body;

  try {
    const result = db.prepare(
      `UPDATE timbres SET numero_suivi = ?, poids_categorie = ?, poids_min = ?, poids_max = ? WHERE id = ?`
    ).run(numero_suivi, poids_categorie, poids_min, poids_max, req.params.id);

    res.json({ message: 'Timbre mis à jour', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= ROUTES CATÉGORIES DE TIMBRES =============

// Get all stamp categories
app.get('/api/timbre-categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM timbre_categories ORDER BY type, poids_min ASC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new stamp category
app.post('/api/timbre-categories', (req, res) => {
  const { nom, poids_min, poids_max, type } = req.body;

  try {
    const result = db.prepare(
      `INSERT INTO timbre_categories (nom, poids_min, poids_max, type) VALUES (?, ?, ?, ?)`
    ).run(nom, poids_min, poids_max, type || 'national');

    res.json({ id: result.lastInsertRowid, message: 'Catégorie créée avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a stamp category
app.put('/api/timbre-categories/:id', (req, res) => {
  const { nom, poids_min, poids_max, type } = req.body;

  try {
    const result = db.prepare(
      `UPDATE timbre_categories SET nom = ?, poids_min = ?, poids_max = ?, type = ? WHERE id = ?`
    ).run(nom, poids_min, poids_max, type, req.params.id);

    res.json({ message: 'Catégorie mise à jour', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a stamp category
app.delete('/api/timbre-categories/:id', (req, res) => {
  try {
    // Check if any stamps use this category
    const category = db.prepare('SELECT nom FROM timbre_categories WHERE id = ?').get(req.params.id);
    if (category) {
      const timbresCount = db.prepare('SELECT COUNT(*) as count FROM timbres WHERE poids_categorie = ?').get(category.nom);
      if (timbresCount && timbresCount.count > 0) {
        return res.status(400).json({ error: `Impossible de supprimer: ${timbresCount.count} timbre(s) utilisent cette catégorie` });
      }
    }

    const result = db.prepare('DELETE FROM timbre_categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Catégorie supprimée', changes: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= STATISTIQUES =============

app.get('/api/stats', (req, res) => {
  try {
    const stats = {};
    stats.clients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
    stats.produits = db.prepare('SELECT COUNT(*) as count FROM produits').get().count;
    stats.colis = db.prepare('SELECT COUNT(*) as count FROM colis').get().count;
    stats.colisEnPreparation = db.prepare("SELECT COUNT(*) as count FROM colis WHERE statut IN ('En préparation', 'Out of stock', 'Incomplet')").get().count;
    stats.colisEnvoyes = db.prepare("SELECT COUNT(*) as count FROM colis WHERE statut='Envoyé'").get().count;
    stats.colisOutOfStock = db.prepare("SELECT COUNT(*) as count FROM colis WHERE statut='Out of stock'").get().count;
    stats.timbresDisponibles = db.prepare("SELECT COUNT(*) as count FROM timbres WHERE utilise = 0").get().count;
    stats.timbresUtilises = db.prepare("SELECT COUNT(*) as count FROM timbres WHERE utilise = 1").get().count;
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= EXPORT / RESET DATABASE =============

app.get('/api/database/export', (req, res) => {
  const dbPath = path.join(dataPath, 'crm.db');

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

app.post('/api/database/import', upload.single('dbFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier uploadé' });
  }

  const uploadedPath = req.file.path;
  const dbPath = path.join(dataPath, 'crm.db');

  try {
    // Fermer la connexion actuelle
    db.close();

    // Copier le fichier uploadé
    fs.copyFileSync(uploadedPath, dbPath);
    fs.unlinkSync(uploadedPath);

    res.json({ message: 'Base de données importée avec succès. Veuillez redémarrer l\'application.' });
  } catch (error) {
    console.error('Erreur import base de données:', error);

    if (fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }

    res.status(500).json({ error: 'Erreur lors de l\'import: ' + error.message });
  }
});

app.post('/api/database/reset', (req, res) => {
  try {
    const tables = ['colis_produits', 'colis', 'produits', 'clients'];
    tables.forEach(table => {
      db.prepare(`DELETE FROM ${table}`).run();
    });
    res.json({ message: 'Base de données réinitialisée avec succès' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la réinitialisation: ' + err.message });
  }
});

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
