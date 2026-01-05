const API_URL = '';

let clients = [];
let produits = [];
let colis = [];
let selectedColis = new Set();

// ============= INITIALISATION =============

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadStats();
    loadClients();
    loadProduits();
    loadColis();
});

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    // Désactiver tous les tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activer le tab sélectionné
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`tab-${tabId}`).classList.add('active');
}

// ============= STATISTIQUES =============

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/stats`);
        const stats = await response.json();

        document.getElementById('statClients').textContent = stats.clients || 0;
        document.getElementById('statProduits').textContent = stats.produits || 0;
        document.getElementById('statColis').textContent = stats.colis || 0;
        document.getElementById('statEnPreparation').textContent = stats.colisEnPreparation || 0;
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

function displayClients() {
    const tbody = document.getElementById('clientsTableBody');

    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucun client</td></tr>';
        return;
    }

    tbody.innerHTML = clients.map(client => `
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

function updateClientSelect() {
    const select = document.getElementById('colisClientId');
    select.innerHTML = '<option value="">Sélectionner un client</option>' +
        clients.map(c => `<option value="${c.id}">${c.nom} ${c.prenom || ''}</option>`).join('');
}

function showAddClientModal() {
    document.getElementById('formClient').reset();
    document.getElementById('clientId').value = '';
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

    document.getElementById('modalClient').classList.add('active');
}

async function saveClient(event) {
    event.preventDefault();

    const id = document.getElementById('clientId').value;
    const data = {
        nom: document.getElementById('clientNom').value,
        prenom: document.getElementById('clientPrenom').value,
        email: document.getElementById('clientEmail').value,
        telephone: document.getElementById('clientTelephone').value,
        adresse: document.getElementById('clientAdresse').value,
        ville: document.getElementById('clientVille').value,
        code_postal: document.getElementById('clientCodePostal').value,
        pays: document.getElementById('clientPays').value
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

function displayProduits() {
    const tbody = document.getElementById('produitsTableBody');

    if (produits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucun produit</td></tr>';
        return;
    }

    tbody.innerHTML = produits.map(produit => `
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

    document.getElementById('modalProduit').classList.add('active');
}

async function saveProduit(event) {
    event.preventDefault();

    const id = document.getElementById('produitId').value;
    const data = {
        nom: document.getElementById('produitNom').value,
        description: document.getElementById('produitDescription').value,
        prix: parseFloat(document.getElementById('produitPrix').value) || null,
        poids: parseFloat(document.getElementById('produitPoids').value) || null,
        stock: parseInt(document.getElementById('produitStock').value) || 0
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
    const tbody = document.getElementById('colisTableBody');

    if (colis.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty">Aucun colis</td></tr>';
        return;
    }

    tbody.innerHTML = colis.map(c => `
        <tr>
            <td><input type="checkbox" class="colis-checkbox" value="${c.id}" onchange="updateSelection()"></td>
            <td><strong>${c.numero_suivi || 'N/A'}</strong></td>
            <td>${c.client_nom} ${c.client_prenom || ''}</td>
            <td><span class="badge badge-${getStatutClass(c.statut)}">${c.statut}</span></td>
            <td>${c.poids ? c.poids + ' kg' : ''}</td>
            <td>${c.ville_expedition || ''} ${c.code_postal_expedition || ''}</td>
            <td>${new Date(c.date_creation).toLocaleDateString('fr-FR')}</td>
            <td class="actions">
                <button class="btn btn-edit btn-small" onclick="editColis(${c.id})">✏️</button>
                <button class="btn btn-danger btn-small" onclick="deleteColis(${c.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function getStatutClass(statut) {
    const mapping = {
        'En préparation': 'preparation',
        'Prêt à expédier': 'pret',
        'Expédié': 'expedie',
        'En transit': 'transit',
        'Livré': 'livre'
    };
    return mapping[statut] || 'preparation';
}

function showAddColisModal() {
    document.getElementById('formColis').reset();
    document.getElementById('colisId').value = '';
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
    document.getElementById('colisAdresse').value = c.adresse_expedition || '';
    document.getElementById('colisVille').value = c.ville_expedition || '';
    document.getElementById('colisCodePostal').value = c.code_postal_expedition || '';
    document.getElementById('colisPays').value = c.pays_expedition || 'France';
    document.getElementById('colisNotes').value = c.notes || '';

    document.getElementById('modalColis').classList.add('active');
}

async function saveColis(event) {
    event.preventDefault();

    const id = document.getElementById('colisId').value;
    const data = {
        client_id: parseInt(document.getElementById('colisClientId').value),
        numero_suivi: document.getElementById('colisNumeroSuivi').value,
        statut: document.getElementById('colisStatut').value,
        poids: parseFloat(document.getElementById('colisPoids').value) || null,
        dimensions: document.getElementById('colisDimensions').value,
        adresse_expedition: document.getElementById('colisAdresse').value,
        ville_expedition: document.getElementById('colisVille').value,
        code_postal_expedition: document.getElementById('colisCodePostal').value,
        pays_expedition: document.getElementById('colisPays').value,
        notes: document.getElementById('colisNotes').value
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
            closeModal('modalColis');
            loadColis();
            loadStats();
            alert('Colis enregistré avec succès!');
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

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAllColis');
    const checkboxes = document.querySelectorAll('.colis-checkbox');

    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });

    updateSelection();
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

async function imprimerEtiquettesSelection() {
    if (selectedColis.size === 0) {
        alert('Veuillez sélectionner au moins un colis');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/etiquettes/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ colisIds: Array.from(selectedColis) })
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

            alert(`${selectedColis.size} étiquette(s) générée(s) avec succès!`);
        } else {
            alert('Erreur lors de la génération du PDF');
        }
    } catch (error) {
        console.error('Erreur impression étiquettes:', error);
        alert('Erreur lors de l\'impression');
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
