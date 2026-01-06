const API_URL = '';

let clients = [];
let produits = [];
let colis = [];
let dimensions = [];
let timbres = [];
let selectedColis = new Set();
let colisProduitsSelection = []; // Produits sélectionnés pour le colis en cours
let selectedTimbreId = null; // Timbre sélectionné pour le colis en cours

// ============= INITIALISATION =============

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadStats();
    loadClients();
    loadProduits();
    loadColis();
    loadDimensions();
    loadTimbres();
});

function initTabs() {
    // Include nav items from both main nav and nav-bottom
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Désactiver tous les nav items et tabs
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activer le nav item et tab sélectionnés
    document.querySelector(`.nav-item[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

// ============= STATISTIQUES =============

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        const stats = await response.json();

        // Update sidebar stats
        document.getElementById('statClientsSidebar').textContent = stats.clients || 0;
        document.getElementById('statPrepSidebar').textContent = stats.colisEnPreparation || 0;
        document.getElementById('statTimbresSidebar').textContent = stats.timbresDisponibles || 0;
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// ============= CLIENTS =============

async function loadClients() {
    try {
        const response = await fetch(`${API_URL}/api/clients`);
        clients = await response.json();
        displayClients();
        updateClientSelect();
    } catch (error) {
        console.error('Erreur chargement clients:', error);
    }
}

function displayClients(filteredList = null) {
    const tbody = document.getElementById('clientsTableBody');
    const listToDisplay = filteredList || clients;

    if (listToDisplay.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucun client</td></tr>';
        return;
    }

    tbody.innerHTML = listToDisplay.map(client => `
        <tr>
            <td>${client.nom}</td>
            <td>${client.prenom || ''}</td>
            <td>${client.email || ''}</td>
            <td>${client.telephone || ''}</td>
            <td>${client.ville || ''}</td>
            <td class="actions">
                <button class="btn btn-edit btn-small" onclick="editClient(${client.id})">✏️ Éditer</button>
                <button class="btn btn-danger btn-small" onclick="deleteClient(${client.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function filterClients() {
    const searchTerm = document.getElementById('searchClients').value.toLowerCase().trim();

    if (!searchTerm) {
        displayClients();
        return;
    }

    const filtered = clients.filter(client => {
        const searchStr = `${client.nom} ${client.prenom || ''} ${client.email || ''} ${client.telephone || ''} ${client.ville || ''}`.toLowerCase();
        return searchStr.includes(searchTerm);
    });

    displayClients(filtered);
}

function updateClientSelect() {
    const select = document.getElementById('colisClientId');
    select.innerHTML = '<option value="">Sélectionner un client</option>' +
        clients.map(c => `<option value="${c.id}">${c.nom} ${c.prenom || ''}</option>`).join('');
}

function showAddClientModal() {
    document.getElementById('formClient').reset();
    document.getElementById('clientId').value = '';
    clearWalletsAndLiens();
    // Ajouter au moins un champ vide pour chaque
    addWalletField();
    addLienField();
    document.getElementById('modalClient').classList.add('active');
}

function editClient(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    document.getElementById('clientId').value = client.id;
    document.getElementById('clientNom').value = client.nom;
    document.getElementById('clientPrenom').value = client.prenom || '';
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientTelephone').value = client.telephone || '';
    document.getElementById('clientAdresse').value = client.adresse || '';
    document.getElementById('clientVille').value = client.ville || '';
    document.getElementById('clientCodePostal').value = client.code_postal || '';
    document.getElementById('clientPays').value = client.pays || 'France';

    // Charger les wallets et liens multiples
    clearWalletsAndLiens();

    // Parser les wallets (stockés en JSON)
    let wallets = [];
    try {
        if (client.wallet) {
            wallets = JSON.parse(client.wallet);
            if (!Array.isArray(wallets)) wallets = [client.wallet];
        }
    } catch (e) {
        if (client.wallet) wallets = [client.wallet];
    }

    // Parser les liens (stockés en JSON)
    let liens = [];
    try {
        if (client.lien) {
            liens = JSON.parse(client.lien);
            if (!Array.isArray(liens)) liens = [client.lien];
        }
    } catch (e) {
        if (client.lien) liens = [client.lien];
    }

    // Ajouter les champs
    if (wallets.length > 0) {
        wallets.forEach(w => addWalletField(w));
    } else {
        addWalletField();
    }

    if (liens.length > 0) {
        liens.forEach(l => addLienField(l));
    } else {
        addLienField();
    }

    document.getElementById('modalClient').classList.add('active');
}

async function saveClient(event) {
    event.preventDefault();

    const id = document.getElementById('clientId').value;

    // Récupérer les wallets et liens multiples
    const wallets = getWalletsFromForm();
    const liens = getLiensFromForm();

    const data = {
        nom: document.getElementById('clientNom').value,
        prenom: document.getElementById('clientPrenom').value,
        email: document.getElementById('clientEmail').value,
        telephone: document.getElementById('clientTelephone').value,
        adresse: document.getElementById('clientAdresse').value,
        ville: document.getElementById('clientVille').value,
        code_postal: document.getElementById('clientCodePostal').value,
        pays: document.getElementById('clientPays').value,
        wallet: JSON.stringify(wallets),
        lien: JSON.stringify(liens)
    };

    try {
        const url = id ? `${API_URL}/api/clients/${id}` : `${API_URL}/api/clients`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal('modalClient');
            loadClients();
            loadStats();
            alert('Client enregistré avec succès!');
        }
    } catch (error) {
        console.error('Erreur sauvegarde client:', error);
        alert('Erreur lors de la sauvegarde');
    }
}

async function deleteClient(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client?')) return;

    try {
        const response = await fetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadClients();
            loadStats();
            alert('Client supprimé');
        }
    } catch (error) {
        console.error('Erreur suppression client:', error);
    }
}

async function viewClientDetails(clientId) {
    try {
        const response = await fetch(`${API_URL}/api/clients/${clientId}`);
        const client = await response.json();

        if (!client) {
            alert('Client introuvable');
            return;
        }

        // Parser les wallets et liens
        let wallets = [];
        try {
            if (client.wallet) {
                wallets = JSON.parse(client.wallet);
                if (!Array.isArray(wallets)) wallets = [client.wallet];
            }
        } catch (e) {
            if (client.wallet) wallets = [client.wallet];
        }

        let liens = [];
        try {
            if (client.lien) {
                liens = JSON.parse(client.lien);
                if (!Array.isArray(liens)) liens = [client.lien];
            }
        } catch (e) {
            if (client.lien) liens = [client.lien];
        }

        // Générer le HTML pour les wallets
        const walletsHtml = wallets.length > 0 ? `
            <div>
                <strong>Wallets:</strong><br>
                ${wallets.map(w => `<code style="background: #f0f0f0; padding: 5px; border-radius: 3px; display: block; margin-top: 5px; word-break: break-all;">${w}</code>`).join('')}
            </div>
        ` : '';

        // Générer le HTML pour les liens
        const liensHtml = liens.length > 0 ? `
            <div>
                <strong>Profils externes:</strong><br>
                ${liens.map(l => `<a href="${l}" target="_blank" class="product-link" style="display: block; margin-top: 5px;">${l}</a>`).join('')}
            </div>
        ` : '';

        const detailsHtml = `
            <div style="display: grid; gap: 15px;">
                <div>
                    <strong>Nom complet:</strong><br>
                    ${client.nom} ${client.prenom || ''}
                </div>
                <div>
                    <strong>Email:</strong><br>
                    ${client.email ? `<a href="mailto:${client.email}">${client.email}</a>` : '-'}
                </div>
                <div>
                    <strong>Téléphone:</strong><br>
                    ${client.telephone ? `<a href="tel:${client.telephone}">${client.telephone}</a>` : '-'}
                </div>
                <div>
                    <strong>Adresse:</strong><br>
                    ${client.adresse || '-'}<br>
                    ${client.code_postal || ''} ${client.ville || ''}<br>
                    ${client.pays || 'France'}
                </div>
                ${walletsHtml}
                ${liensHtml}
            </div>
        `;

        document.getElementById('clientDetailsContent').innerHTML = detailsHtml;

        // Store the client ID for editing
        window.currentClientDetailsId = clientId;

        document.getElementById('modalClientDetails').classList.add('active');
    } catch (error) {
        console.error('Erreur chargement détails client:', error);
        alert('Erreur lors du chargement des détails');
    }
}

function editClientFromDetails() {
    if (window.currentClientDetailsId) {
        closeModal('modalClientDetails');
        editClient(window.currentClientDetailsId);
    }
}

// ============= CRÉATION RAPIDE CLIENT =============

let parsedClientData = null;

function showQuickClientModal() {
    document.getElementById('quickClientInput').value = '';
    document.getElementById('parsedClientPreview').style.display = 'none';
    parsedClientData = null;
    document.getElementById('modalQuickClient').classList.add('active');
}

function parseQuickClient() {
    const input = document.getElementById('quickClientInput').value.trim();

    if (!input) {
        alert('Veuillez entrer des informations');
        return;
    }

    // Parser intelligent
    const data = smartParseClientInfo(input);
    parsedClientData = data;

    // Afficher l'aperçu
    const previewHtml = `
        <div style="display: grid; gap: 8px;">
            <div><strong>Nom:</strong> ${data.nom || '<em style="color: #999;">Non détecté</em>'}</div>
            <div><strong>Prénom:</strong> ${data.prenom || '<em style="color: #999;">Non détecté</em>'}</div>
            <div><strong>Email:</strong> ${data.email || '<em style="color: #999;">Non détecté</em>'}</div>
            <div><strong>Téléphone:</strong> ${data.telephone || '<em style="color: #999;">Non détecté</em>'}</div>
            <div><strong>Adresse:</strong> ${data.adresse || '<em style="color: #999;">Non détectée</em>'}</div>
            <div><strong>Code Postal:</strong> ${data.code_postal || '<em style="color: #999;">Non détecté</em>'}</div>
            <div><strong>Ville:</strong> ${data.ville || '<em style="color: #999;">Non détectée</em>'}</div>
            <div><strong>Pays:</strong> ${data.pays || '<em style="color: #999;">France</em>'}</div>
        </div>
    `;

    document.getElementById('parsedClientData').innerHTML = previewHtml;
    document.getElementById('parsedClientPreview').style.display = 'block';
}

function smartParseClientInfo(text) {
    // Nettoyer le texte : retirer les guillemets
    text = text.replace(/["«»""]/g, '');

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const data = {
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        adresse: '',
        code_postal: '',
        ville: '',
        pays: 'France'
    };

    // Regex patterns
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/;
    const phoneRegex = /(?:(?:\+|00)\d{1,3}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?)?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/;

    // Postal code patterns - FR, CA, US, UK, etc.
    const postalCodeRegex = /\b([A-Z]\d[A-Z]\s?\d[A-Z]\d|\d{5}(?:[-\s]\d{4})?|[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}|[A-Z]\d{5})\b/i;

    let usedLines = new Set();
    let addressLines = [];

    // 1. Extraire email
    for (let i = 0; i < lines.length; i++) {
        const emailMatch = lines[i].match(emailRegex);
        if (emailMatch) {
            data.email = emailMatch[1];
            usedLines.add(i);
            break;
        }
    }

    // 2. Extraire téléphone
    for (let i = 0; i < lines.length; i++) {
        if (usedLines.has(i)) continue;

        // Chercher des patterns de téléphone
        const line = lines[i].toLowerCase();
        if (line.includes('téléphone') || line.includes('telephone') || line.includes('tel') || line.includes('phone')) {
            const phoneMatch = lines[i].match(phoneRegex);
            if (phoneMatch) {
                data.telephone = phoneMatch[0].replace(/[-.\s]/g, '');
                usedLines.add(i);
                continue;
            }
        }

        // Téléphone standalone
        if (!data.telephone) {
            const phoneMatch = lines[i].match(phoneRegex);
            if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10) {
                data.telephone = phoneMatch[0].replace(/[-.\s]/g, '');
                usedLines.add(i);
            }
        }
    }

    // 3. Détecter la ligne avec code postal + ville + pays
    let postalLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (usedLines.has(i)) continue;

        const postalMatch = lines[i].match(postalCodeRegex);
        if (postalMatch) {
            postalLineIndex = i;
            data.code_postal = postalMatch[1];

            // Extraire ville et pays
            let remaining = lines[i].replace(postalMatch[0], '').trim();

            // Chercher le pays
            const commonCountries = ['France', 'Canada', 'Belgique', 'Suisse', 'USA', 'United States', 'UK', 'England', 'Germany', 'Spain', 'Italy'];
            for (const country of commonCountries) {
                const countryRegex = new RegExp(country, 'i');
                if (countryRegex.test(remaining)) {
                    data.pays = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
                    remaining = remaining.replace(countryRegex, '').trim();
                    break;
                }
            }

            // Ce qui reste est la ville
            data.ville = remaining.replace(/^[,\s]+|[,\s]+$/g, '').replace(/\s+/g, ' ');
            usedLines.add(i);
            break;
        }
    }

    // 4. Nom et prénom (généralement la première ligne non utilisée)
    let nameLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (usedLines.has(i)) continue;

        const line = lines[i].toLowerCase();
        // Éviter les lignes qui contiennent des mots-clés d'adresse
        if (line.includes('adresse') || line.includes('mail') || line.includes('rue') ||
            line.includes('avenue') || line.includes('boulevard')) {
            continue;
        }

        // Prendre cette ligne comme nom
        const nameParts = lines[i].split(/\s+/);
        if (nameParts.length >= 2) {
            data.prenom = nameParts[0];
            data.nom = nameParts.slice(1).join(' ');
        } else {
            data.nom = lines[i];
        }

        nameLineIndex = i;
        usedLines.add(i);
        break;
    }

    // 5. Les lignes restantes sont l'adresse
    for (let i = 0; i < lines.length; i++) {
        if (usedLines.has(i)) continue;

        const line = lines[i].toLowerCase();
        // Ignorer les lignes de labels
        if (line.startsWith('adresse postale') || line.startsWith('adresse mail') ||
            line.startsWith('téléphone') || line.startsWith('telephone') ||
            line.startsWith('email') || line.startsWith('mail')) {
            continue;
        }

        addressLines.push(lines[i]);
    }

    data.adresse = addressLines.join(', ');

    return data;
}

async function confirmQuickClient() {
    if (!parsedClientData) {
        alert('Veuillez d\'abord analyser les informations');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nom: parsedClientData.nom,
                prenom: parsedClientData.prenom,
                email: parsedClientData.email,
                telephone: parsedClientData.telephone,
                adresse: parsedClientData.adresse,
                ville: parsedClientData.ville,
                code_postal: parsedClientData.code_postal,
                pays: parsedClientData.pays,
                wallet: JSON.stringify([]),
                lien: JSON.stringify([])
            })
        });

        if (response.ok) {
            const result = await response.json();

            // Recharger la liste des clients
            await loadClients();

            // Sélectionner le nouveau client dans le formulaire de colis
            document.getElementById('colisClientId').value = result.id;

            // Remplir l'adresse automatiquement
            fillClientAddress();

            closeModal('modalQuickClient');
            alert('Client créé avec succès!');
        } else {
            alert('Erreur lors de la création du client');
        }
    } catch (error) {
        console.error('Erreur création client:', error);
        alert('Erreur lors de la création du client');
    }
}

function toggleQuickFillClient() {
    const section = document.getElementById('quickFillClientSection');
    if (section.style.display === 'none') {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function parseAndFillClientForm() {
    const input = document.getElementById('quickFillClientInput').value.trim();

    if (!input) {
        alert('Veuillez entrer des informations');
        return;
    }

    // Parser les infos
    const data = smartParseClientInfo(input);

    // Remplir le formulaire
    document.getElementById('clientNom').value = data.nom || '';
    document.getElementById('clientPrenom').value = data.prenom || '';
    document.getElementById('clientEmail').value = data.email || '';
    document.getElementById('clientTelephone').value = data.telephone || '';
    document.getElementById('clientAdresse').value = data.adresse || '';
    document.getElementById('clientVille').value = data.ville || '';
    document.getElementById('clientCodePostal').value = data.code_postal || '';
    document.getElementById('clientPays').value = data.pays || 'France';

    // Vider le textarea et cacher la section
    document.getElementById('quickFillClientInput').value = '';
    document.getElementById('quickFillClientSection').style.display = 'none';

    alert('✅ Champs remplis automatiquement ! Vérifiez et complétez si nécessaire.');
}

// ============= GESTION WALLETS/LIENS MULTIPLES =============

let walletCounter = 0;
let lienCounter = 0;

function addWalletField(value = '') {
    const container = document.getElementById('walletsContainer');
    const id = `wallet_${walletCounter++}`;

    const div = document.createElement('div');
    div.className = 'form-group';
    div.id = `container_${id}`;
    div.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" class="wallet-input" id="${id}" placeholder="Adresse wallet" value="${value}" style="flex: 1;">
            <button type="button" class="btn btn-danger btn-small" onclick="removeField('container_${id}')">🗑️</button>
        </div>
    `;
    container.appendChild(div);
}

function addLienField(value = '') {
    const container = document.getElementById('liensContainer');
    const id = `lien_${lienCounter++}`;

    const div = document.createElement('div');
    div.className = 'form-group';
    div.id = `container_${id}`;
    div.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="url" class="lien-input" id="${id}" placeholder="https://..." value="${value}" style="flex: 1;">
            <button type="button" class="btn btn-danger btn-small" onclick="removeField('container_${id}')">🗑️</button>
        </div>
    `;
    container.appendChild(div);
}

function removeField(containerId) {
    const element = document.getElementById(containerId);
    if (element) {
        element.remove();
    }
}

function clearWalletsAndLiens() {
    document.getElementById('walletsContainer').innerHTML = '';
    document.getElementById('liensContainer').innerHTML = '';
    walletCounter = 0;
    lienCounter = 0;
}

function getWalletsFromForm() {
    const wallets = [];
    document.querySelectorAll('.wallet-input').forEach(input => {
        const value = input.value.trim();
        if (value) wallets.push(value);
    });
    return wallets;
}

function getLiensFromForm() {
    const liens = [];
    document.querySelectorAll('.lien-input').forEach(input => {
        const value = input.value.trim();
        if (value) liens.push(value);
    });
    return liens;
}

// ============= PRODUITS =============

async function loadProduits() {
    try {
        const response = await fetch(`${API_URL}/api/produits`);
        produits = await response.json();
        displayProduits();
    } catch (error) {
        console.error('Erreur chargement produits:', error);
    }
}

function displayProduits(filteredList = null) {
    const tbody = document.getElementById('produitsTableBody');
    const listToDisplay = filteredList || produits;

    if (listToDisplay.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucun produit</td></tr>';
        return;
    }

    tbody.innerHTML = listToDisplay.map(produit => `
        <tr>
            <td>${produit.nom}</td>
            <td>${produit.description || ''}</td>
            <td>${produit.prix ? produit.prix.toFixed(2) + ' €' : ''}</td>
            <td>${produit.poids ? produit.poids + ' kg' : ''}</td>
            <td>${produit.stock || 0}</td>
            <td class="actions">
                <button class="btn btn-edit btn-small" onclick="editProduit(${produit.id})">✏️ Éditer</button>
                <button class="btn btn-danger btn-small" onclick="deleteProduit(${produit.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function filterProduits() {
    const searchTerm = document.getElementById('searchProduits').value.toLowerCase().trim();

    if (!searchTerm) {
        displayProduits();
        return;
    }

    const filtered = produits.filter(produit => {
        const searchStr = `${produit.nom} ${produit.description || ''}`.toLowerCase();
        return searchStr.includes(searchTerm);
    });

    displayProduits(filtered);
}

function showAddProduitModal() {
    document.getElementById('formProduit').reset();
    document.getElementById('produitId').value = '';
    document.getElementById('modalProduit').classList.add('active');
}

function editProduit(id) {
    const produit = produits.find(p => p.id === id);
    if (!produit) return;

    document.getElementById('produitId').value = produit.id;
    document.getElementById('produitNom').value = produit.nom;
    document.getElementById('produitDescription').value = produit.description || '';
    document.getElementById('produitPrix').value = produit.prix || '';
    document.getElementById('produitPoids').value = produit.poids || '';
    document.getElementById('produitStock').value = produit.stock || 0;
    document.getElementById('produitDimensionId').value = produit.dimension_id || '';

    document.getElementById('modalProduit').classList.add('active');
}

async function saveProduit(event) {
    event.preventDefault();

    const id = document.getElementById('produitId').value;
    const dimensionId = document.getElementById('produitDimensionId').value;
    const data = {
        nom: document.getElementById('produitNom').value,
        description: document.getElementById('produitDescription').value,
        prix: parseFloat(document.getElementById('produitPrix').value) || null,
        poids: parseFloat(document.getElementById('produitPoids').value) || null,
        stock: parseInt(document.getElementById('produitStock').value) || 0,
        dimension_id: dimensionId ? parseInt(dimensionId) : null
    };

    try {
        const url = id ? `${API_URL}/api/produits/${id}` : `${API_URL}/api/produits`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal('modalProduit');
            loadProduits();
            loadStats();
            alert('Produit enregistré avec succès!');
        }
    } catch (error) {
        console.error('Erreur sauvegarde produit:', error);
        alert('Erreur lors de la sauvegarde');
    }
}

async function deleteProduit(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) return;

    try {
        const response = await fetch(`${API_URL}/api/produits/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadProduits();
            loadStats();
            alert('Produit supprimé');
        }
    } catch (error) {
        console.error('Erreur suppression produit:', error);
    }
}

// ============= COLIS =============

async function loadColis() {
    try {
        const response = await fetch(`${API_URL}/api/colis`);
        colis = await response.json();
        displayColis();
    } catch (error) {
        console.error('Erreur chargement colis:', error);
    }
}

function displayColis() {
    // Séparer les colis en deux catégories
    const colisEnAttente = colis.filter(c =>
        c.statut === 'En préparation' || c.statut === 'Out of stock' || c.statut === 'Incomplet'
    );
    const colisExpedies = colis.filter(c =>
        c.statut === 'Envoyé'
    );

    // Afficher les compteurs
    document.getElementById('countEnAttente').textContent = colisEnAttente.length;
    document.getElementById('countExpedies').textContent = colisExpedies.length;

    // Afficher colis en attente
    const tbodyAttente = document.getElementById('colisEnAttenteBody');
    if (colisEnAttente.length === 0) {
        tbodyAttente.innerHTML = '<tr><td colspan="8" class="empty">Aucun colis en attente</td></tr>';
    } else {
        tbodyAttente.innerHTML = colisEnAttente.map(c => renderColisRow(c, 'attente')).join('');
    }

    // Afficher colis expédiés
    const tbodyExpedies = document.getElementById('colisExpediesBody');
    if (colisExpedies.length === 0) {
        tbodyExpedies.innerHTML = '<tr><td colspan="8" class="empty">Aucun colis envoyé</td></tr>';
    } else {
        tbodyExpedies.innerHTML = colisExpedies.map(c => renderColisRow(c, 'expedies')).join('');
    }
}

function parseNotesData(notes) {
    const data = { item: '', lien: '' };
    if (!notes) return data;

    const lines = notes.split('\n');
    lines.forEach(line => {
        if (line.startsWith('Item: ')) {
            data.item = line.replace('Item: ', '').trim();
        } else if (line.startsWith('Lien: ')) {
            data.lien = line.replace('Lien: ', '').trim();
        }
    });
    return data;
}

function renderColisRow(c, section) {
    const notesData = parseNotesData(c.notes);
    const isNonFrance = (c.pays_expedition && c.pays_expedition.toLowerCase() !== 'france');
    const rowClass = isNonFrance ? 'non-france' : '';

    // Formater la date
    const date = new Date(c.date_creation);
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Produit avec lien cliquable - nouveau système avec produits multiples
    let produitHtml = '';
    if (c.produits && c.produits.length > 0) {
        // Afficher les noms des produits
        const nomsProduitsArr = c.produits.map(p => p.nom || 'Produit');
        const nomsProduits = nomsProduitsArr.length > 2
            ? nomsProduitsArr.slice(0, 2).join(', ') + ` (+${nomsProduitsArr.length - 2})`
            : nomsProduitsArr.join(', ');

        const hasAnyLink = c.produits.some(p => p.lien);
        if (hasAnyLink || c.produits.length > 1) {
            produitHtml = `<span class="product-name produit-clickable" onclick="handleProduitClick(${c.id})" title="Cliquez pour voir les détails">${nomsProduits}</span>`;
        } else if (c.produits.length === 1) {
            produitHtml = `<span class="product-name">${nomsProduits}</span>`;
        }
    } else if (notesData.item && notesData.lien) {
        // Fallback ancien système
        produitHtml = `<a href="${notesData.lien}" target="_blank" class="product-link">${notesData.item}</a>`;
    } else if (notesData.item) {
        produitHtml = `<span class="product-name">${notesData.item}</span>`;
    } else {
        produitHtml = '<span style="color: #999;">-</span>';
    }

    // Client et adresse
    const clientNom = `${c.client_nom || ''} ${c.client_prenom || ''}`.trim();
    const adresse = c.ville_expedition || c.adresse_expedition || '';
    const pays = c.pays_expedition || 'France';
    const clientHtml = `
        <span class="client-name" style="cursor: pointer; color: #667eea;" onclick="viewClientDetails(${c.client_id})">${clientNom}</span>
        <span class="client-address">${adresse}${pays !== 'France' ? ` - ${pays}` : ''}</span>
    `;

    return `
        <tr class="${rowClass}">
            <td><input type="checkbox" class="colis-checkbox colis-checkbox-${section}" value="${c.id}" onchange="updateSelection()"></td>
            <td>${dateStr}</td>
            <td>${produitHtml}</td>
            <td>${clientHtml}</td>
            <td><span class="badge badge-${getStatutClass(c.statut)}">${c.statut}</span></td>
            <td>${c.poids ? c.poids + ' kg' : '-'}</td>
            <td><strong>${c.numero_suivi || 'N/A'}</strong></td>
            <td class="actions">
                <button class="btn btn-edit btn-small" onclick="editColis(${c.id})">✏️</button>
                <button class="btn btn-danger btn-small" onclick="deleteColis(${c.id})">🗑️</button>
            </td>
        </tr>
    `;
}

function getStatutClass(statut) {
    const mapping = {
        'En préparation': 'preparation',
        'Out of stock': 'outofstock',
        'Envoyé': 'envoye',
        'Incomplet': 'incomplet'
    };
    return mapping[statut] || 'preparation';
}

function showAddColisModal() {
    document.getElementById('formColis').reset();
    document.getElementById('colisId').value = '';
    // Réinitialiser les produits sélectionnés
    colisProduitsSelection = [];
    displayColisProduitsSelection();
    updateProduitSelect();
    // Réinitialiser la sélection de timbre
    selectedTimbreId = null;
    document.getElementById('selectedTimbreId').value = '';
    document.getElementById('timbreInfo').textContent = '';
    document.getElementById('timbreInfo').style.color = 'var(--accent-green)';
    document.getElementById('lienSuiviBtn').style.display = 'none';
    document.getElementById('modalColis').classList.add('active');
}

function fillClientAddress() {
    const clientId = document.getElementById('colisClientId').value;
    const client = clients.find(c => c.id == clientId);

    if (client) {
        document.getElementById('colisAdresse').value = client.adresse || '';
        document.getElementById('colisVille').value = client.ville || '';
        document.getElementById('colisCodePostal').value = client.code_postal || '';
        document.getElementById('colisPays').value = client.pays || 'France';
    }
}

function editColis(id) {
    const c = colis.find(col => col.id === id);
    if (!c) return;

    document.getElementById('colisId').value = c.id;
    document.getElementById('colisClientId').value = c.client_id;
    document.getElementById('colisNumeroSuivi').value = c.numero_suivi || '';
    document.getElementById('colisStatut').value = c.statut;
    document.getElementById('colisPoids').value = c.poids || '';
    document.getElementById('colisDimensions').value = c.dimensions || '';
    document.getElementById('colisReference').value = c.reference || '';
    document.getElementById('colisAdresse').value = c.adresse_expedition || '';
    document.getElementById('colisAdresseLigne2').value = c.adresse_ligne2 || '';
    document.getElementById('colisVille').value = c.ville_expedition || '';
    document.getElementById('colisCodePostal').value = c.code_postal_expedition || '';
    document.getElementById('colisPays').value = c.pays_expedition || 'France';
    document.getElementById('colisNotes').value = c.notes || '';

    // Charger les produits existants du colis
    colisProduitsSelection = [];
    if (c.produits && c.produits.length > 0) {
        c.produits.forEach(p => {
            const produit = produits.find(pr => pr.id === p.produit_id);
            colisProduitsSelection.push({
                produit_id: p.produit_id,
                nom: p.nom || (produit ? produit.nom : 'Produit'),
                poids: p.poids || (produit ? produit.poids : 0) || 0,
                dimension_id: p.dimension_id || (produit ? produit.dimension_id : null),
                stock: produit ? produit.stock + p.quantite : p.quantite, // Le stock actuel + la quantité déjà réservée
                quantite: p.quantite || 1,
                lien: p.lien || ''
            });
        });
    }
    displayColisProduitsSelection();
    updateProduitSelect();

    // Pour édition, pas de timbre auto-sélectionné mais on affiche le lien si existe
    selectedTimbreId = null;
    document.getElementById('selectedTimbreId').value = '';
    document.getElementById('timbreInfo').textContent = '';
    updateLienSuiviPreview();

    document.getElementById('modalColis').classList.add('active');
}

async function saveColis(event) {
    event.preventDefault();

    const id = document.getElementById('colisId').value;

    // Préparer les produits à envoyer
    const produitsToSend = colisProduitsSelection.map(p => ({
        produit_id: p.produit_id,
        quantite: p.quantite,
        lien: p.lien || null
    }));

    const data = {
        client_id: parseInt(document.getElementById('colisClientId').value),
        numero_suivi: document.getElementById('colisNumeroSuivi').value,
        statut: document.getElementById('colisStatut').value,
        poids: parseFloat(document.getElementById('colisPoids').value) || null,
        dimensions: document.getElementById('colisDimensions').value,
        reference: document.getElementById('colisReference').value,
        adresse_expedition: document.getElementById('colisAdresse').value,
        adresse_ligne2: document.getElementById('colisAdresseLigne2').value,
        ville_expedition: document.getElementById('colisVille').value,
        code_postal_expedition: document.getElementById('colisCodePostal').value,
        pays_expedition: document.getElementById('colisPays').value,
        notes: document.getElementById('colisNotes').value,
        produits: produitsToSend
    };

    try {
        const url = id ? `${API_URL}/api/colis/${id}` : `${API_URL}/api/colis`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();

            // Si nouveau colis et timbre sélectionné, le marquer comme utilisé
            const timbreId = document.getElementById('selectedTimbreId').value;
            if (!id && timbreId && result.id) {
                await markTimbreAsUsed(timbreId, result.id);
            }

            closeModal('modalColis');
            loadColis();
            loadProduits(); // Recharger les produits pour mettre à jour le stock
            loadStats();

            // Vérifier si des produits sont en stock négatif
            if (result.produitsNegatifs && result.produitsNegatifs.length > 0) {
                let message = 'Colis enregistré avec succès!\n\n';
                message += '⚠️ ATTENTION - Stocks négatifs:\n\n';
                result.produitsNegatifs.forEach(p => {
                    const quantiteManquante = Math.abs(p.stock);
                    message += `A demander a Martin: Je suis a court de ${p.nom} je dois en envoyer ${quantiteManquante} si tu peux me rajouter ça sur une commande 🙏\n\n`;
                });
                alert(message);
            } else {
                alert('Colis enregistré avec succès!');
            }
        }
    } catch (error) {
        console.error('Erreur sauvegarde colis:', error);
        alert('Erreur lors de la sauvegarde');
    }
}

async function deleteColis(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce colis?')) return;

    try {
        const response = await fetch(`${API_URL}/api/colis/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadColis();
            loadStats();
            alert('Colis supprimé');
        }
    } catch (error) {
        console.error('Erreur suppression colis:', error);
    }
}

// ============= SÉLECTION MULTIPLE =============

function toggleSelectAll(section) {
    const selectAll = event.target;
    const checkboxes = document.querySelectorAll(`.colis-checkbox-${section}`);

    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });

    updateSelection();
}

// Toggle section collapsible
function toggleSection(sectionId) {
    const section = document.getElementById(`section${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`);
    const icon = document.getElementById(`toggle${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`);

    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        icon.classList.remove('rotated');
        icon.textContent = '▼';
    } else {
        section.classList.add('collapsed');
        icon.classList.add('rotated');
        icon.textContent = '►';
    }
}

function updateSelection() {
    selectedColis.clear();
    document.querySelectorAll('.colis-checkbox:checked').forEach(cb => {
        selectedColis.add(parseInt(cb.value));
    });

    document.getElementById('selectedCount').textContent = selectedColis.size;
    document.getElementById('btnImprimerSelection').disabled = selectedColis.size === 0;
}

// ============= IMPRESSION ÉTIQUETTES PDF =============

function validateColisForLabel(colisData) {
    const errors = [];

    // Vérifier le nom du client
    if (!colisData.client_nom && !colisData.client_prenom) {
        errors.push('Nom du destinataire manquant');
    }

    // Vérifier l'adresse
    const adresse = colisData.adresse_expedition || colisData.client_adresse;
    if (!adresse) {
        errors.push('Adresse manquante');
    }

    // Vérifier la ville
    const ville = colisData.ville_expedition || colisData.client_ville;
    if (!ville) {
        errors.push('Ville manquante');
    }

    // Vérifier le code postal
    const codePostal = colisData.code_postal_expedition || colisData.client_code_postal;
    if (!codePostal) {
        errors.push('Code postal manquant');
    }

    return errors;
}

async function imprimerEtiquettesSelection() {
    if (selectedColis.size === 0) {
        alert('Veuillez sélectionner au moins un colis');
        return;
    }

    // Valider tous les colis sélectionnés AVANT toute action
    const colisInvalides = [];
    for (const colisId of selectedColis) {
        const colisData = colis.find(c => c.id === colisId);
        if (colisData) {
            const errors = validateColisForLabel(colisData);
            if (errors.length > 0) {
                colisInvalides.push({
                    numero: colisData.numero_suivi || `ID: ${colisId}`,
                    errors: errors
                });
            }
        }
    }

    // Si des colis ont des infos manquantes, alerter et arrêter
    if (colisInvalides.length > 0) {
        let message = '⚠️ Impossible de générer les étiquettes.\n\nInformations manquantes:\n\n';
        colisInvalides.forEach(c => {
            message += `📦 ${c.numero}:\n`;
            c.errors.forEach(e => {
                message += `   • ${e}\n`;
            });
            message += '\n';
        });
        message += 'Veuillez compléter ces informations avant de réessayer.';
        alert(message);
        return;
    }

    // Générer le PDF d'abord
    try {
        const logoData = localStorage.getItem('shippingLogo');

        const response = await fetch(`${API_URL}/api/etiquettes/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                colisIds: Array.from(selectedColis),
                logoData: logoData
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `etiquettes_${new Date().getTime()}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Seulement APRÈS succès du PDF, demander si on marque comme envoyés
            const nombreColis = selectedColis.size;
            const messageConfirm = nombreColis === 1
                ? 'Étiquette générée! Voulez-vous passer ce colis en "Envoyé" ?'
                : `Étiquettes générées! Voulez-vous passer ces ${nombreColis} colis en "Envoyé" ?`;

            if (confirm(messageConfirm)) {
                await marquerColisExpedies(Array.from(selectedColis));
            }
        } else {
            alert('Erreur lors de la génération du PDF');
        }
    } catch (error) {
        console.error('Erreur impression étiquettes:', error);
        alert('Erreur lors de l\'impression');
    }
}

async function marquerColisExpedies(colisIds) {
    try {
        // Mettre à jour chaque colis
        for (const colisId of colisIds) {
            // Trouver le colis dans le tableau
            const colisData = colis.find(c => c.id === colisId);
            if (!colisData) continue;

            // Préparer les données de mise à jour avec le nouveau statut
            const updateData = {
                client_id: colisData.client_id,
                numero_suivi: colisData.numero_suivi,
                statut: 'Envoyé',
                poids: colisData.poids,
                dimensions: colisData.dimensions,
                reference: colisData.reference,
                adresse_expedition: colisData.adresse_expedition,
                adresse_ligne2: colisData.adresse_ligne2,
                ville_expedition: colisData.ville_expedition,
                code_postal_expedition: colisData.code_postal_expedition,
                pays_expedition: colisData.pays_expedition,
                date_expedition: new Date().toISOString().split('T')[0],
                date_livraison: colisData.date_livraison,
                notes: colisData.notes
            };

            // Mettre à jour le colis
            await fetch(`${API_URL}/api/colis/${colisId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
        }

        // Recharger la liste des colis et les stats
        await loadColis();
        await loadStats();

        // Désélectionner tous les colis
        selectedColis.clear();
        updateSelection();
    } catch (error) {
        console.error('Erreur lors de la mise à jour des statuts:', error);
        alert('Erreur lors de la mise à jour du statut des colis');
    }
}

// ============= MODAL =============

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Fermer modal en cliquant à l'extérieur
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// ============= PLANNING & CSV IMPORT =============

// Afficher le nom du fichier sélectionné
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('csvFile');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || 'Choisir un fichier CSV...';
            document.getElementById('fileNameDisplay').textContent = fileName;
        });
    }
});

// Upload et import du CSV
async function uploadCSV(event) {
    event.preventDefault();

    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Veuillez sélectionner un fichier CSV');
        return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);

    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<span class="loading"></span> Import en cours...';
    uploadBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/api/import/csv`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        // Afficher le résultat
        const resultDiv = document.getElementById('importResult');
        const contentDiv = document.getElementById('importResultContent');

        if (response.ok) {
            contentDiv.innerHTML = `
                <p class="import-success">✅ Import réussi!</p>
                <p>Total de lignes: <strong>${result.total}</strong></p>
                <p>Colis créés avec succès: <strong>${result.success}</strong></p>
                ${result.errors > 0 ? `<p class="import-error">Erreurs: <strong>${result.errors}</strong></p>` : ''}
                ${result.errorDetails && result.errorDetails.length > 0 ? `
                    <details style="margin-top: 10px;">
                        <summary style="cursor: pointer;">Voir les erreurs</summary>
                        <ul style="margin-top: 10px;">
                            ${result.errorDetails.map(err => `<li>Ligne ${err.row}: ${err.error}</li>`).join('')}
                        </ul>
                    </details>
                ` : ''}
            `;
            resultDiv.style.display = 'block';

            // Rafraîchir les données
            loadStats();
            loadClients();
            loadColis();

            // Réinitialiser le formulaire
            document.getElementById('csvUploadForm').reset();
            document.getElementById('fileNameDisplay').textContent = 'Choisir un fichier CSV...';
        } else {
            contentDiv.innerHTML = `
                <p class="import-error">❌ Erreur lors de l'import</p>
                <p>${result.error || 'Une erreur est survenue'}</p>
            `;
            resultDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur upload CSV:', error);
        const resultDiv = document.getElementById('importResult');
        const contentDiv = document.getElementById('importResultContent');
        contentDiv.innerHTML = `
            <p class="import-error">❌ Erreur réseau</p>
            <p>${error.message}</p>
        `;
        resultDiv.style.display = 'block';
    } finally {
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
    }
}

// Télécharger un modèle CSV
function downloadExampleCSV() {
    const csvContent = `Item,Lien,Prix Objet (€),Poids (kg),Adresse d'envoi,Lien de suivi colis,Photos/Vidéos associées,Statut,Timestamp,N° Colis/mois,Note
Smartphone XYZ,https://example.com/product/123,299.99,0.5,"123 Rue de la Paix, 75001 Paris, France",COL2024010001,https://photos.example.com/1,En préparation,2024-01-05T10:00:00,COL-01-2024,Fragile - Manipuler avec soin
Ordinateur Portable ABC,https://example.com/product/456,899.00,2.3,"456 Avenue des Champs, 69001 Lyon, France",COL2024010002,https://photos.example.com/2,Expédié,2024-01-04T15:30:00,COL-02-2024,Garantie 2 ans incluse
Casque Audio,https://example.com/product/789,149.50,0.3,"789 Boulevard Victor Hugo, 33000 Bordeaux, France",,https://photos.example.com/3,Livré,2024-01-03T09:15:00,COL-03-2024,Client VIP`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'modele_import_colis.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============= DATABASE TOOLS =============

// Charger des données de test
async function initTestData() {
    if (!confirm('Voulez-vous charger des données de test?\n\nCela créera:\n- 5 clients (France, Belgique, Italie, Espagne)\n- 6 produits (téléphones, ordinateurs, etc.)\n- 6 colis de test\n\nNote: Si des données existent déjà, elles seront conservées.')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/database/init-test-data`, {
            method: 'POST'
        });

        const result = await response.json();
        const resultDiv = document.getElementById('dbToolsResult');
        const contentDiv = document.getElementById('dbToolsResultContent');

        if (response.ok) {
            contentDiv.innerHTML = `
                <p class="import-success">✅ ${result.message}</p>
                <pre style="margin-top: 10px; font-size: 0.9em;">${result.output}</pre>
            `;
            resultDiv.style.display = 'block';

            // Rafraîchir les données
            setTimeout(() => {
                loadStats();
                loadClients();
                loadProduits();
                loadColis();
            }, 500);
        } else {
            contentDiv.innerHTML = `
                <p class="import-error">❌ Erreur</p>
                <p>${result.error}</p>
            `;
            resultDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur init données test:', error);
        alert('Erreur lors du chargement des données de test');
    }
}

// Exporter la base de données
function exportDatabase() {
    window.location.href = `${API_URL}/api/database/export`;

    const resultDiv = document.getElementById('dbToolsResult');
    const contentDiv = document.getElementById('dbToolsResultContent');
    contentDiv.innerHTML = `
        <p class="import-success">✅ Export en cours...</p>
        <p>Le téléchargement devrait commencer automatiquement.</p>
    `;
    resultDiv.style.display = 'block';

    setTimeout(() => {
        resultDiv.style.display = 'none';
    }, 3000);
}

// Importer la base de données
async function importDatabase() {
    const fileInput = document.getElementById('dbImportFile');
    const file = fileInput.files[0];

    if (!file) return;

    if (!confirm('⚠️ ATTENTION ⚠️\n\nL\'import va REMPLACER toutes vos données actuelles par celles du fichier.\n\nVoulez-vous continuer?')) {
        fileInput.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('dbFile', file);

    const resultDiv = document.getElementById('dbToolsResult');
    const contentDiv = document.getElementById('dbToolsResultContent');
    contentDiv.innerHTML = `<p>⏳ Import en cours...</p>`;
    resultDiv.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}/api/database/import`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            contentDiv.innerHTML = `
                <p class="import-success">✅ ${result.message}</p>
                <p>Rechargement de la page...</p>
            `;

            // Recharger la page pour réinitialiser toutes les connexions
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            contentDiv.innerHTML = `
                <p class="import-error">❌ Erreur lors de l'import</p>
                <p>${result.error || 'Une erreur est survenue'}</p>
            `;
        }
    } catch (error) {
        console.error('Erreur import base de données:', error);
        contentDiv.innerHTML = `
            <p class="import-error">❌ Erreur réseau</p>
            <p>${error.message}</p>
        `;
    } finally {
        fileInput.value = '';
    }
}

// Réinitialiser la base de données
async function resetDatabase() {
    if (!confirm('⚠️ ATTENTION ⚠️\n\nÊtes-vous sûr de vouloir réinitialiser la base de données?\n\nCette action supprimera TOUTES les données:\n- Tous les clients\n- Tous les produits\n- Tous les colis\n\nCette action est IRRÉVERSIBLE!')) {
        return;
    }

    if (!confirm('Dernière confirmation:\n\nToutes les données seront perdues.\n\nContinuer?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/database/reset`, {
            method: 'POST'
        });

        const result = await response.json();
        const resultDiv = document.getElementById('dbToolsResult');
        const contentDiv = document.getElementById('dbToolsResultContent');

        if (response.ok) {
            contentDiv.innerHTML = `
                <p class="import-success">✅ ${result.message}</p>
                <p>La base de données a été vidée.</p>
            `;
            resultDiv.style.display = 'block';

            // Rafraîchir les données
            setTimeout(() => {
                loadStats();
                loadClients();
                loadProduits();
                loadColis();
            }, 500);
        } else {
            contentDiv.innerHTML = `
                <p class="import-error">❌ Erreur</p>
                <p>${result.error}</p>
            `;
            resultDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur reset base de données:', error);
        alert('Erreur lors de la réinitialisation');
    }
}

// ============= DIMENSIONS DE CARTONS =============

async function loadDimensions() {
    try {
        const response = await fetch(`${API_URL}/api/dimensions`);
        dimensions = await response.json();
        displayDimensions();
        updateDimensionButtons();
        updateDimensionSelect();
    } catch (error) {
        console.error('Erreur chargement dimensions:', error);
    }
}

function displayDimensions() {
    const container = document.getElementById('dimensionsList');
    if (!container) return;

    if (dimensions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">Aucune dimension configurée</p>';
        return;
    }

    container.innerHTML = `
        <table class="dimensions-table">
            <thead>
                <tr>
                    <th>Nom</th>
                    <th>Dimensions (L×l×H)</th>
                    <th>Poids carton</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${dimensions.map(d => `
                    <tr>
                        <td><strong>${d.nom}</strong></td>
                        <td><code>${d.longueur}×${d.largeur}×${d.hauteur} cm</code></td>
                        <td><code>${d.poids_carton || 0} kg</code></td>
                        <td class="actions">
                            <button class="btn btn-edit btn-small" onclick="editDimension(${d.id})">✏️</button>
                            <button class="btn btn-danger btn-small" onclick="deleteDimension(${d.id})">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateDimensionButtons() {
    const container = document.getElementById('dimensionButtons');
    if (!container) return;

    if (dimensions.length === 0) {
        container.innerHTML = '<span style="color: #666; font-size: 12px;">Configurez vos dimensions dans Paramètres</span>';
        return;
    }

    container.innerHTML = dimensions.map(d =>
        `<button type="button" class="btn-dimension" onclick="setDimension('${d.longueur}x${d.largeur}x${d.hauteur}')" title="${d.nom}">${d.longueur}x${d.largeur}x${d.hauteur}</button>`
    ).join('');
}

function updateDimensionSelect() {
    const select = document.getElementById('produitDimensionId');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Aucune dimension par défaut</option>' +
        dimensions.map(d => `<option value="${d.id}">${d.nom} (${d.longueur}×${d.largeur}×${d.hauteur} cm)</option>`).join('');
    select.value = currentValue;
}

function editDimension(id) {
    const dimension = dimensions.find(d => d.id === id);
    if (!dimension) return;

    document.getElementById('dimensionId').value = dimension.id;
    document.getElementById('dimensionNom').value = dimension.nom;
    document.getElementById('dimensionLongueur').value = dimension.longueur;
    document.getElementById('dimensionLargeur').value = dimension.largeur;
    document.getElementById('dimensionHauteur').value = dimension.hauteur;
    document.getElementById('dimensionPoidsCarton').value = dimension.poids_carton || 0;
    document.getElementById('dimensionFormTitle').textContent = 'Modifier la dimension';
    document.getElementById('btnCancelDimension').style.display = 'inline-flex';
}

function cancelDimensionEdit() {
    document.getElementById('dimensionId').value = '';
    document.getElementById('dimensionNom').value = '';
    document.getElementById('dimensionLongueur').value = '';
    document.getElementById('dimensionLargeur').value = '';
    document.getElementById('dimensionHauteur').value = '';
    document.getElementById('dimensionPoidsCarton').value = '';
    document.getElementById('dimensionFormTitle').textContent = 'Ajouter une dimension';
    document.getElementById('btnCancelDimension').style.display = 'none';
}

async function saveDimension() {
    const id = document.getElementById('dimensionId').value;
    const nom = document.getElementById('dimensionNom').value.trim();
    const longueur = parseFloat(document.getElementById('dimensionLongueur').value);
    const largeur = parseFloat(document.getElementById('dimensionLargeur').value);
    const hauteur = parseFloat(document.getElementById('dimensionHauteur').value);
    const poids_carton = parseFloat(document.getElementById('dimensionPoidsCarton').value) || 0;

    if (!nom || !longueur || !largeur || !hauteur) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    const data = { nom, longueur, largeur, hauteur, poids_carton, is_default: false };

    try {
        const url = id ? `${API_URL}/api/dimensions/${id}` : `${API_URL}/api/dimensions`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            cancelDimensionEdit();
            loadDimensions();
            alert(id ? 'Dimension modifiée!' : 'Dimension créée!');
        } else {
            alert('Erreur lors de la sauvegarde');
        }
    } catch (error) {
        console.error('Erreur sauvegarde dimension:', error);
        alert('Erreur lors de la sauvegarde');
    }
}

async function deleteDimension(id) {
    if (!confirm('Supprimer cette dimension?')) return;

    try {
        const response = await fetch(`${API_URL}/api/dimensions/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadDimensions();
            alert('Dimension supprimée');
        }
    } catch (error) {
        console.error('Erreur suppression dimension:', error);
    }
}

// ============= LOGO MANAGEMENT =============

// Charger le logo au démarrage
document.addEventListener('DOMContentLoaded', () => {
    loadLogo();
});

function loadLogo() {
    const logoData = localStorage.getItem('shippingLogo');
    if (logoData) {
        document.getElementById('logoImage').src = logoData;
        document.getElementById('logoImage').style.display = 'block';
        document.getElementById('logoPlaceholder').style.display = 'none';
        document.getElementById('btnRemoveLogo').style.display = 'inline-block';
    }
}

function uploadLogo() {
    const fileInput = document.getElementById('logoFileInput');
    const file = fileInput.files[0];

    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.match('image/(png|jpeg|jpg)')) {
        alert('Format de fichier non supporté. Utilisez PNG, JPG ou JPEG.');
        return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Le fichier est trop volumineux. Taille maximum: 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const logoData = e.target.result;

        // Sauvegarder dans localStorage
        localStorage.setItem('shippingLogo', logoData);

        // Afficher le logo
        document.getElementById('logoImage').src = logoData;
        document.getElementById('logoImage').style.display = 'block';
        document.getElementById('logoPlaceholder').style.display = 'none';
        document.getElementById('btnRemoveLogo').style.display = 'inline-block';

        alert('Logo uploadé avec succès!');
    };

    reader.readAsDataURL(file);
}

function removeLogo() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer le logo?')) return;

    localStorage.removeItem('shippingLogo');
    document.getElementById('logoImage').src = '';
    document.getElementById('logoImage').style.display = 'none';
    document.getElementById('logoPlaceholder').style.display = 'block';
    document.getElementById('btnRemoveLogo').style.display = 'none';
    document.getElementById('logoFileInput').value = '';

    alert('Logo supprimé');
}

// ============= GESTION DES PRODUITS DANS LE COLIS =============

// Filtrer et afficher les produits pour la recherche dans le modal colis
function filterProduitsForColis() {
    const searchInput = document.getElementById('searchProduitsColis');
    const resultsContainer = document.getElementById('produitSearchResults');
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (!searchTerm) {
        resultsContainer.style.display = 'none';
        return;
    }

    // Filtrer les produits (on autorise les stocks négatifs)
    const selectedIds = colisProduitsSelection.map(p => p.produit_id);
    const filtered = produits.filter(p => {
        const searchStr = `${p.nom} ${p.description || ''}`.toLowerCase();
        return searchStr.includes(searchTerm);
    });

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="produit-search-empty">Aucun produit trouvé</div>';
        resultsContainer.style.display = 'block';
        return;
    }

    resultsContainer.innerHTML = filtered.map(p => {
        const dim = dimensions.find(d => d.id === p.dimension_id);
        const dimInfo = dim ? dim.nom : '';
        const stockClass = p.stock > 5 ? 'in-stock' : (p.stock > 0 ? 'low-stock' : 'no-stock');
        const alreadySelected = selectedIds.includes(p.id);

        return `
            <div class="produit-search-item ${alreadySelected ? 'already-selected' : ''}" onclick="addProduitFromSearch(${p.id})">
                <div class="produit-search-item-info">
                    <div class="produit-search-item-name">${p.nom}</div>
                    <div class="produit-search-item-meta">
                        ${p.poids ? p.poids + ' kg' : ''} ${dimInfo ? '· ' + dimInfo : ''} ${p.prix ? '· ' + p.prix.toFixed(2) + '€' : ''}
                    </div>
                </div>
                <span class="produit-search-item-stock ${stockClass}">${alreadySelected ? '✓ Ajouté' : 'Stock: ' + p.stock}</span>
            </div>
        `;
    }).join('');

    resultsContainer.style.display = 'block';
}

// Ajouter un produit depuis la recherche
function addProduitFromSearch(produitId) {
    const produit = produits.find(p => p.id === produitId);
    if (!produit) return;

    // Vérifier si le produit est déjà dans la liste
    const existing = colisProduitsSelection.find(p => p.produit_id === produitId);
    if (existing) {
        // Incrémenter la quantité (on autorise les stocks négatifs)
        existing.quantite++;
    } else {
        // Ajouter le produit
        colisProduitsSelection.push({
            produit_id: produitId,
            nom: produit.nom,
            poids: produit.poids || 0,
            prix: produit.prix || 0,
            description: produit.description || '',
            dimension_id: produit.dimension_id,
            stock: produit.stock,
            quantite: 1,
            lien: ''
        });
    }

    displayColisProduitsSelection();
    calculatePoidsAndDimension();

    // Vider et cacher la recherche
    document.getElementById('searchProduitsColis').value = '';
    document.getElementById('produitSearchResults').style.display = 'none';
}

// Fermer les résultats de recherche quand on clique ailleurs
document.addEventListener('click', function(e) {
    const searchContainer = document.querySelector('.produit-search-container');
    const resultsContainer = document.getElementById('produitSearchResults');
    if (searchContainer && resultsContainer && !searchContainer.contains(e.target)) {
        resultsContainer.style.display = 'none';
    }
});

// Ancienne fonction conservée pour compatibilité
function updateProduitSelect() {
    // Cette fonction n'est plus utilisée mais conservée pour la compatibilité
}

// Afficher les produits sélectionnés
function displayColisProduitsSelection() {
    const container = document.getElementById('colisProduitsContainer');
    if (!container) return;

    if (colisProduitsSelection.length === 0) {
        container.innerHTML = '<div class="colis-produits-empty">Aucun produit sélectionné</div>';
        return;
    }

    container.innerHTML = colisProduitsSelection.map((p, index) => {
        const stockApres = p.stock - p.quantite;
        const stockInfo = stockApres >= 0
            ? `<span class="stock-ok">Stock: ${p.stock} → ${stockApres}</span>`
            : `<span class="stock-warning">⚠️ Stock négatif: ${p.stock} → ${stockApres}</span>`;

        return `
            <div class="colis-produit-item" data-index="${index}">
                <div class="colis-produit-info">
                    <div class="colis-produit-nom">${p.nom}</div>
                    <div class="colis-produit-meta">
                        ${p.poids ? p.poids + ' kg' : 'Poids non défini'} · ${stockInfo}
                    </div>
                </div>
                <div class="colis-produit-lien">
                    <input type="url" placeholder="https://..." value="${p.lien || ''}"
                           onchange="updateProduitLien(${index}, this.value)">
                </div>
                <div class="colis-produit-quantite">
                    <input type="number" min="1" value="${p.quantite}"
                           onchange="updateProduitQuantite(${index}, this.value)">
                </div>
                <button type="button" class="colis-produit-remove" onclick="removeProduitFromColis(${index})">✕</button>
            </div>
        `;
    }).join('');
}

// Mettre à jour le lien d'un produit
function updateProduitLien(index, lien) {
    if (colisProduitsSelection[index]) {
        colisProduitsSelection[index].lien = lien;
    }
}

// Mettre à jour la quantité d'un produit
function updateProduitQuantite(index, quantite) {
    if (colisProduitsSelection[index]) {
        const newQty = parseInt(quantite) || 1;
        colisProduitsSelection[index].quantite = newQty;
        displayColisProduitsSelection();
        calculatePoidsAndDimension();
    }
}

// Supprimer un produit de la sélection
function removeProduitFromColis(index) {
    colisProduitsSelection.splice(index, 1);
    displayColisProduitsSelection();
    calculatePoidsAndDimension();
}

// Calculer le poids total et sélectionner la bonne dimension
function calculatePoidsAndDimension() {
    // Trouver la plus grande dimension parmi les produits
    let maxDimensionId = null;
    let maxVolume = 0;

    colisProduitsSelection.forEach(p => {
        if (p.dimension_id) {
            const dim = dimensions.find(d => d.id === p.dimension_id);
            if (dim) {
                const volume = dim.longueur * dim.largeur * dim.hauteur;
                if (volume > maxVolume) {
                    maxVolume = volume;
                    maxDimensionId = p.dimension_id;
                }
            }
        }
    });

    // Si on a trouvé une dimension, l'utiliser
    if (maxDimensionId) {
        const selectedDim = dimensions.find(d => d.id === maxDimensionId);
        if (selectedDim) {
            document.getElementById('colisDimensions').value = `${selectedDim.longueur}x${selectedDim.largeur}x${selectedDim.hauteur}cm`;
        }
    }

    // Calculer et mettre à jour le poids
    updatePoidsTotal();
}

// Calculer le poids total (produits + carton actuel)
function updatePoidsTotal() {
    // Calculer le poids des produits
    let poidsProduits = 0;
    colisProduitsSelection.forEach(p => {
        poidsProduits += (p.poids || 0) * p.quantite;
    });

    // Récupérer le poids du carton actuel depuis les dimensions sélectionnées
    let poidsCarton = 0;
    const dimensionsValue = document.getElementById('colisDimensions').value;
    if (dimensionsValue) {
        const dimMatch = dimensionsValue.replace('cm', '').split('x').map(parseFloat);
        if (dimMatch.length === 3) {
            const matchingDim = dimensions.find(d =>
                d.longueur === dimMatch[0] && d.largeur === dimMatch[1] && d.hauteur === dimMatch[2]
            );
            if (matchingDim) {
                poidsCarton = matchingDim.poids_carton || 0;
            }
        }
    }

    const poidsTotal = poidsProduits + poidsCarton;
    document.getElementById('colisPoids').value = poidsTotal > 0 ? poidsTotal.toFixed(2) : '';

    // Auto-sélectionner un timbre si disponible (seulement pour nouveau colis)
    const colisId = document.getElementById('colisId').value;
    if (!colisId && poidsTotal > 0) {
        autoSelectTimbre();
    }
}

// Sélection manuelle d'une dimension (boutons)
function setDimension(dimension) {
    document.getElementById('colisDimensions').value = dimension + 'cm';
    // Recalculer le poids avec le nouveau carton
    updatePoidsTotal();
}

// ============= MODAL PRODUITS DU COLIS =============

// Afficher le modal avec les produits d'un colis (avec fiche détaillée)
function showColisProduitsModal(colisId) {
    const c = colis.find(col => col.id === colisId);
    if (!c) return;

    const container = document.getElementById('colisProduitsListModal');

    // Gérer le cas où il n'y a pas de produits
    if (!c.produits || c.produits.length === 0) {
        // Fallback sur l'ancien système (notes)
        const notesData = parseNotesData(c.notes);
        if (notesData.item) {
            container.innerHTML = `
                <div class="produit-modal-item">
                    <div class="produit-modal-info">
                        <div class="produit-modal-nom">${notesData.item}</div>
                        <div class="produit-modal-quantite">Quantité: 1</div>
                    </div>
                    ${notesData.lien
                        ? `<div class="produit-modal-lien"><a href="${notesData.lien}" target="_blank">🔗 Ouvrir le lien</a></div>`
                        : '<div class="produit-modal-no-link">Pas de lien assigné</div>'}
                </div>
            `;
        } else {
            container.innerHTML = '<div class="produit-search-empty">Aucun produit dans ce colis</div>';
        }
        document.getElementById('modalColisProduits').classList.add('active');
        return;
    }

    container.innerHTML = c.produits.map(p => {
        // Récupérer les infos complètes du produit depuis le catalogue
        const produitComplet = produits.find(pr => pr.id === p.produit_id) || {};

        const lienHtml = p.lien
            ? `<div class="produit-modal-lien"><a href="${p.lien}" target="_blank">🔗 Ouvrir le lien</a></div>`
            : '<div class="produit-modal-no-link">Pas de lien assigné</div>';

        // Fiche détaillée du produit
        const detailsHtml = `
            <div class="produit-modal-detail">
                <div class="produit-modal-detail-item">
                    <span class="produit-modal-detail-label">Poids:</span>
                    <span class="produit-modal-detail-value">${p.poids || produitComplet.poids || '-'} kg</span>
                </div>
                <div class="produit-modal-detail-item">
                    <span class="produit-modal-detail-label">Prix:</span>
                    <span class="produit-modal-detail-value">${produitComplet.prix ? produitComplet.prix.toFixed(2) + ' €' : '-'}</span>
                </div>
                ${produitComplet.description ? `
                <div class="produit-modal-detail-item" style="grid-column: span 2;">
                    <span class="produit-modal-detail-label">Description:</span>
                    <span class="produit-modal-detail-value">${produitComplet.description}</span>
                </div>` : ''}
            </div>
        `;

        return `
            <div class="produit-modal-item">
                <div class="produit-modal-info" style="flex: 1;">
                    <div class="produit-modal-nom">${p.nom || 'Produit'}</div>
                    <div class="produit-modal-quantite">Quantité: ${p.quantite || 1}</div>
                    ${detailsHtml}
                </div>
                ${lienHtml}
            </div>
        `;
    }).join('');

    document.getElementById('modalColisProduits').classList.add('active');
}

// Gérer le clic sur le produit dans la liste des colis
// TOUJOURS ouvrir le modal (même avec un seul produit)
function handleProduitClick(colisId) {
    const c = colis.find(col => col.id === colisId);
    if (!c) return;

    // Toujours ouvrir le modal pour afficher les détails
    showColisProduitsModal(colisId);
}

// ============= TIMBRES =============

const POIDS_CATEGORIES = [
    { id: '0-20', label: 'Moins de 20g', min: 0, max: 20 },
    { id: '21-100', label: '21g - 100g', min: 21, max: 100 },
    { id: '101-250', label: '101g - 250g', min: 101, max: 250 },
    { id: '251-500', label: '251g - 500g', min: 251, max: 500 },
    { id: '501-1000', label: '501g - 1kg', min: 501, max: 1000 },
    { id: '1001-2000', label: '1kg - 2kg', min: 1001, max: 2000 }
];

async function loadTimbres() {
    try {
        const response = await fetch(`${API_URL}/api/timbres`);
        timbres = await response.json();
        displayTimbres();
    } catch (error) {
        console.error('Erreur chargement timbres:', error);
    }
}

function displayTimbres() {
    const container = document.getElementById('timbresListContainer');
    if (!container) return;

    // Grouper les timbres par catégorie
    const grouped = {};
    POIDS_CATEGORIES.forEach(cat => {
        grouped[cat.id] = {
            label: cat.label,
            disponibles: [],
            utilises: []
        };
    });

    timbres.forEach(t => {
        const catId = t.poids_categorie;
        if (grouped[catId]) {
            if (t.utilise) {
                grouped[catId].utilises.push(t);
            } else {
                grouped[catId].disponibles.push(t);
            }
        }
    });

    let html = '';
    POIDS_CATEGORIES.forEach(cat => {
        const data = grouped[cat.id];
        const total = data.disponibles.length + data.utilises.length;

        if (total === 0) {
            html += `
                <div class="colis-section">
                    <div class="section-title">
                        <span>🎫 ${cat.label}</span>
                        <span style="color: var(--text-muted);">Aucun timbre</span>
                    </div>
                </div>
            `;
            return;
        }

        html += `
            <div class="colis-section">
                <div class="section-title collapsible" onclick="toggleSection(this)">
                    <span>🎫 ${cat.label} - ${data.disponibles.length} disponible(s) / ${total} total</span>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>N° Suivi</th>
                                <th>Lien de suivi</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        // D'abord les disponibles
        data.disponibles.forEach(t => {
            const lien = `https://www.laposte.fr/outils/suivre-vos-envois?code=${t.numero_suivi}`;
            html += `
                <tr>
                    <td><code style="font-family: 'JetBrains Mono', monospace; color: var(--accent-cyan);">${t.numero_suivi}</code></td>
                    <td><a href="${lien}" target="_blank" class="product-link">🔗 Suivre</a></td>
                    <td><span class="badge badge-envoye">Disponible</span></td>
                    <td class="actions">
                        <button class="btn btn-danger btn-small" onclick="deleteTimbre(${t.id})">🗑️</button>
                    </td>
                </tr>
            `;
        });

        // Puis les utilisés
        data.utilises.forEach(t => {
            const lien = `https://www.laposte.fr/outils/suivre-vos-envois?code=${t.numero_suivi}`;
            html += `
                <tr style="opacity: 0.6;">
                    <td><code style="font-family: 'JetBrains Mono', monospace;">${t.numero_suivi}</code></td>
                    <td><a href="${lien}" target="_blank" class="product-link">🔗 Suivre</a></td>
                    <td><span class="badge badge-preparation">Utilisé${t.colis_numero_suivi ? ' - ' + t.colis_numero_suivi : ''}</span></td>
                    <td class="actions">
                        <button class="btn btn-secondary btn-small" onclick="libererTimbre(${t.id})">↩️ Libérer</button>
                    </td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 10px;">
                    <button class="btn btn-danger btn-small" onclick="deleteTimbreCategorie('${cat.id}')">
                        🗑️ Supprimer tous les disponibles (${data.disponibles.length})
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

async function importTimbres() {
    const text = document.getElementById('timbresImportText').value;
    const select = document.getElementById('timbrePoidsCategorie');
    const selectedOption = select.options[select.selectedIndex];

    const poids_categorie = select.value;
    const poids_min = parseFloat(selectedOption.dataset.min);
    const poids_max = parseFloat(selectedOption.dataset.max);

    // Extraire les numéros après "SD:" et ignorer les doublons
    const regex = /SD:\s*([A-Za-z0-9]+)/gi;
    const matches = text.matchAll(regex);
    const numerosSet = new Set();

    for (const match of matches) {
        numerosSet.add(match[1].trim());
    }

    const numeros = Array.from(numerosSet);

    if (numeros.length === 0) {
        alert('Aucun numéro de suivi trouvé dans le texte. Format attendu: "SD: XXXXX"');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/timbres/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numeros, poids_categorie, poids_min, poids_max })
        });

        const result = await response.json();
        if (response.ok) {
            alert(`${result.inserted} timbre(s) importé(s) sur ${result.total} trouvé(s)`);
            document.getElementById('timbresImportText').value = '';
            loadTimbres();
            loadStats();
        } else {
            alert('Erreur: ' + result.error);
        }
    } catch (error) {
        console.error('Erreur import timbres:', error);
        alert('Erreur lors de l\'import');
    }
}

async function deleteTimbre(id) {
    if (!confirm('Supprimer ce timbre ?')) return;

    try {
        const response = await fetch(`${API_URL}/api/timbres/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadTimbres();
            loadStats();
        }
    } catch (error) {
        console.error('Erreur suppression timbre:', error);
    }
}

async function deleteTimbreCategorie(categorie) {
    if (!confirm('Supprimer tous les timbres disponibles de cette catégorie ?')) return;

    try {
        const response = await fetch(`${API_URL}/api/timbres/categorie/${encodeURIComponent(categorie)}`, { method: 'DELETE' });
        if (response.ok) {
            const result = await response.json();
            alert(`${result.changes} timbre(s) supprimé(s)`);
            loadTimbres();
            loadStats();
        }
    } catch (error) {
        console.error('Erreur suppression timbres:', error);
    }
}

async function libererTimbre(id) {
    if (!confirm('Libérer ce timbre ? Il sera de nouveau disponible.')) return;

    try {
        const response = await fetch(`${API_URL}/api/timbres/${id}/liberer`, { method: 'PUT' });
        if (response.ok) {
            loadTimbres();
            loadStats();
        }
    } catch (error) {
        console.error('Erreur libération timbre:', error);
    }
}

// Rechercher un timbre disponible pour un poids donné (en kg)
async function findTimbreForPoids(poidsKg) {
    if (!poidsKg || poidsKg <= 0) return null;

    try {
        const response = await fetch(`${API_URL}/api/timbres/disponible/${poidsKg}`);
        const timbre = await response.json();
        return timbre;
    } catch (error) {
        console.error('Erreur recherche timbre:', error);
        return null;
    }
}

// Générer le lien de suivi La Poste
function getLienSuivi(numeroSuivi) {
    if (!numeroSuivi) return '';
    return `https://www.laposte.fr/outils/suivre-vos-envois?code=${numeroSuivi}`;
}

// Mettre à jour l'aperçu du lien de suivi
function updateLienSuiviPreview() {
    const numero = document.getElementById('colisNumeroSuivi').value.trim();
    const btn = document.getElementById('lienSuiviBtn');

    if (numero) {
        const lien = getLienSuivi(numero);
        btn.href = lien;
        btn.style.display = 'inline-flex';
    } else {
        btn.style.display = 'none';
    }
}

// Sélectionner automatiquement un timbre basé sur le poids
async function autoSelectTimbre() {
    const poidsValue = document.getElementById('colisPoids').value;
    const poids = parseFloat(poidsValue);

    // Reset
    document.getElementById('selectedTimbreId').value = '';
    document.getElementById('timbreInfo').textContent = '';
    selectedTimbreId = null;

    if (!poids || poids <= 0) return;

    const timbre = await findTimbreForPoids(poids);

    if (timbre) {
        selectedTimbreId = timbre.id;
        document.getElementById('selectedTimbreId').value = timbre.id;
        document.getElementById('colisNumeroSuivi').value = timbre.numero_suivi;
        document.getElementById('timbreInfo').textContent = '(timbre auto-sélectionné)';
        updateLienSuiviPreview();
    } else {
        // Pas de timbre disponible, on garde le champ vide pour saisie manuelle
        document.getElementById('timbreInfo').textContent = '(aucun timbre disponible)';
        document.getElementById('timbreInfo').style.color = 'var(--accent-orange)';
    }
}

// Marquer le timbre comme utilisé après sauvegarde du colis
async function markTimbreAsUsed(timbreId, colisId) {
    if (!timbreId) return;

    try {
        await fetch(`${API_URL}/api/timbres/${timbreId}/utiliser`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ colis_id: colisId })
        });
        loadTimbres();
        loadStats();
    } catch (error) {
        console.error('Erreur marquage timbre:', error);
    }
}
