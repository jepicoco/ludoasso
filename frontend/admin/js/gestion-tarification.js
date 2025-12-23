/**
 * Gestion Tarification - Interface unifiee
 * Version liste triable et filtrable
 */

// ============================================================
// Variables globales
// ============================================================

let tarifsCache = [];
let prestationsCache = [];
let arbresCache = {}; // Cache des arbres de decision par tarif_id
let communesCache = [];
let utilisateursCache = [];
let operationsComptablesCache = [];

// Etat du tri
let currentSort = { column: 'libelle', direction: 'asc' };

// ============================================================
// Initialisation
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Tarification] Initialisation...');

  // Initialiser le template admin
  if (typeof initTemplate === 'function') {
    await initTemplate('parametres');
  }

  // Charger les referentiels en parallele
  await Promise.all([
    chargerCommunes(),
    chargerOperationsComptables()
  ]);

  // Charger et afficher les tarifs
  await Promise.all([
    chargerTarifs(),
    chargerPrestations()
  ]);

  // Charger utilisateurs en arriere-plan pour le simulateur
  chargerUtilisateurs();

  // Initialiser les event listeners pour le tri
  initTableSort();

  console.log('[Tarification] Initialisation terminee');
});

// ============================================================
// Chargement des donnees
// ============================================================

async function chargerTarifs() {
  try {
    const response = await apiAdmin.get('/tarifs-cotisation');
    tarifsCache = Array.isArray(response) ? response : (response?.data || []);
    // Filtrer pour ne garder que les cotisations
    tarifsCache = tarifsCache.filter(t => t.type !== 'prestation');

    // Charger les arbres de decision pour chaque tarif
    await chargerArbres();

    afficherCotisations(tarifsCache);
  } catch (error) {
    console.error('[Tarification] Erreur chargement tarifs:', error);
    document.getElementById('tbody-tarifs').innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="alert alert-danger mb-0">
            <i class="bi bi-exclamation-triangle"></i>
            Erreur lors du chargement des tarifs
          </div>
        </td>
      </tr>
    `;
  }
}

async function chargerArbres() {
  // Charger les statuts des arbres pour tous les tarifs
  for (const tarif of tarifsCache) {
    try {
      const response = await apiAdmin.get(`/arbres-decision/tarif/${tarif.id}`);
      if (response && response.id) {
        arbresCache[tarif.id] = response;
      }
    } catch (error) {
      // Pas d'arbre pour ce tarif - c'est normal
      arbresCache[tarif.id] = null;
    }
  }
}

async function chargerPrestations() {
  try {
    const response = await apiAdmin.get('/tarifs-cotisation?type=prestation');
    prestationsCache = Array.isArray(response) ? response : (response?.data || []);
    afficherPrestations(prestationsCache);
  } catch (error) {
    console.error('[Tarification] Erreur chargement prestations:', error);
    prestationsCache = [];
  }
}

async function chargerCommunes() {
  try {
    const response = await apiAdmin.get('/communes/all');
    communesCache = response?.communes || response?.data || response || [];
    if (!Array.isArray(communesCache)) communesCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement communes:', error);
    communesCache = [];
  }
}

async function chargerOperationsComptables() {
  try {
    const response = await apiAdmin.get('/parametres/operations-comptables');
    operationsComptablesCache = response?.data || response || [];
    if (!Array.isArray(operationsComptablesCache)) operationsComptablesCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement operations comptables:', error);
    operationsComptablesCache = [];
  }
}

async function chargerUtilisateurs() {
  try {
    const response = await apiAdmin.get('/utilisateurs?limit=100&statut=actif');
    utilisateursCache = response?.utilisateurs || response?.data || response || [];
    if (!Array.isArray(utilisateursCache)) utilisateursCache = [];
  } catch (error) {
    console.error('[Tarification] Erreur chargement utilisateurs:', error);
    utilisateursCache = [];
  }
}

// ============================================================
// Affichage des cotisations (tableau)
// ============================================================

function afficherCotisations(tarifs) {
  const tbody = document.getElementById('tbody-tarifs');
  const countEl = document.getElementById('count-tarifs');

  if (!tarifs || tarifs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <div class="empty-state">
            <i class="bi bi-card-checklist"></i>
            <h5>Aucune cotisation configuree</h5>
            <p class="text-muted">Creez votre premiere cotisation pour commencer</p>
            <button class="btn btn-primary" onclick="ouvrirModalNouveauTarif()">
              <i class="bi bi-plus"></i> Nouvelle cotisation
            </button>
          </div>
        </td>
      </tr>
    `;
    countEl.textContent = '0 tarif(s)';
    return;
  }

  // Appliquer le tri
  const tarifsTries = trierTarifs([...tarifs]);

  let html = '';
  tarifsTries.forEach(tarif => {
    const isActive = tarif.actif !== false;
    const isDefault = tarif.par_defaut === true;

    // Periode
    const periodeLabels = {
      'annee_civile': 'Annee civile',
      'annee_scolaire': 'Annee scolaire',
      'date_a_date': 'Date a date'
    };
    const periodeLabel = periodeLabels[tarif.type_periode] || tarif.type_periode || '-';

    // Mode calcul
    const calculLabel = tarif.type_montant === 'prorata' ? 'Prorata' : 'Fixe';

    // Statut arbre
    const arbre = arbresCache[tarif.id];
    let arbreHtml = '';
    if (arbre) {
      const nbNoeuds = arbre.arbre_json?.noeuds?.length || 0;
      const verrouille = arbre.verrouille;
      arbreHtml = `
        <a href="parametres-arbre-tarif.html?tarif_id=${tarif.id}" class="btn btn-sm btn-outline-info">
          <i class="bi bi-diagram-3"></i>
          ${nbNoeuds} condition${nbNoeuds > 1 ? 's' : ''}
          ${verrouille ? '<i class="bi bi-lock-fill text-warning ms-1"></i>' : ''}
        </a>
      `;
    } else {
      arbreHtml = `
        <a href="parametres-arbre-tarif.html?tarif_id=${tarif.id}" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-plus"></i> Configurer
        </a>
      `;
    }

    // Badges
    let badges = '';
    if (isDefault) badges += '<span class="badge bg-primary ms-1" title="Tarif par defaut"><i class="bi bi-star-fill"></i></span>';

    html += `
      <tr class="tarif-row ${isActive ? '' : 'inactive'}" data-id="${tarif.id}">
        <td>
          <strong>${escapeHtml(tarif.libelle)}</strong>${badges}
          ${tarif.description ? `<br><small class="text-muted">${escapeHtml(tarif.description)}</small>` : ''}
        </td>
        <td class="montant-cell">${formatMontant(tarif.montant_base)}</td>
        <td><span class="badge bg-light text-dark info-badge">${periodeLabel}</span></td>
        <td><span class="badge bg-light text-dark info-badge">${calculLabel}</span></td>
        <td>${arbreHtml}</td>
        <td>
          ${isActive
            ? '<span class="badge bg-success">Actif</span>'
            : '<span class="badge bg-secondary">Inactif</span>'}
        </td>
        <td class="btn-actions text-end">
          <button class="btn btn-sm btn-outline-warning" onclick="ouvrirSimulateur(${tarif.id})" title="Simuler">
            <i class="bi bi-calculator"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="ouvrirModalTarif(${tarif.id})" title="Modifier">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-${isActive ? 'secondary' : 'success'}" onclick="toggleTarifActif(${tarif.id})" title="${isActive ? 'Desactiver' : 'Activer'}">
            <i class="bi bi-${isActive ? 'eye-slash' : 'eye'}"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="confirmerSuppression(${tarif.id})" title="Supprimer">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  countEl.textContent = `${tarifs.length} tarif(s)`;
}

function afficherPrestations(prestations) {
  const container = document.getElementById('tab-prestations');

  if (!prestations || prestations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-receipt-cutoff"></i>
        <h5>Prestations</h5>
        <p class="text-muted">
          Gerez ici les tarifs pour les activites ponctuelles<br>
          (animations, ateliers, locations exceptionnelles...)
        </p>
        <button class="btn btn-outline-primary" onclick="ouvrirModalNouveauTarif('prestation')">
          <i class="bi bi-plus"></i> Ajouter une prestation
        </button>
      </div>
    `;
    return;
  }

  let html = '<div class="row">';
  prestations.forEach(prestation => {
    const statusClass = prestation.actif ? '' : 'opacity-50';
    const statusBadge = prestation.actif
      ? '<span class="badge bg-success">Actif</span>'
      : '<span class="badge bg-secondary">Inactif</span>';

    html += `
      <div class="col-md-4 mb-3">
        <div class="card h-100 ${statusClass}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="card-title mb-0">${escapeHtml(prestation.libelle)}</h6>
              ${statusBadge}
            </div>
            ${prestation.description ? `<p class="card-text text-muted small">${escapeHtml(prestation.description)}</p>` : ''}
            <p class="card-text fs-4 fw-bold text-success mb-0">${formatMontant(prestation.montant_base || prestation.montant)}</p>
          </div>
          <div class="card-footer bg-transparent d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary flex-fill" onclick="ouvrirModalTarif(${prestation.id}, 'prestation')">
              <i class="bi bi-pencil"></i> Modifier
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="confirmerSuppression(${prestation.id}, 'prestation')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';

  html += `
    <div class="text-center mt-3">
      <button class="btn btn-primary" onclick="ouvrirModalNouveauTarif('prestation')">
        <i class="bi bi-plus-lg"></i> Nouvelle prestation
      </button>
    </div>
  `;

  container.innerHTML = html;
}

// ============================================================
// Filtrage et tri
// ============================================================

function filtrerTarifs() {
  const search = document.getElementById('filter-search').value.toLowerCase().trim();
  const periode = document.getElementById('filter-periode').value;
  const statut = document.getElementById('filter-statut').value;

  let tarifsFiltres = tarifsCache.filter(tarif => {
    // Filtre recherche
    if (search) {
      const libelle = (tarif.libelle || '').toLowerCase();
      const description = (tarif.description || '').toLowerCase();
      if (!libelle.includes(search) && !description.includes(search)) {
        return false;
      }
    }

    // Filtre periode
    if (periode && tarif.type_periode !== periode) {
      return false;
    }

    // Filtre statut
    if (statut === 'actif' && !tarif.actif) {
      return false;
    }
    if (statut === 'inactif' && tarif.actif !== false) {
      return false;
    }

    return true;
  });

  afficherCotisations(tarifsFiltres);
}

function initTableSort() {
  const headers = document.querySelectorAll('.tarif-table th[data-sort]');
  headers.forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.sort;

      // Toggle direction si meme colonne
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
      }

      // Mettre a jour les classes visuelles
      headers.forEach(h => h.classList.remove('sorted-asc', 'sorted-desc'));
      th.classList.add(`sorted-${currentSort.direction}`);

      // Re-afficher avec le nouveau tri
      filtrerTarifs();
    });
  });
}

function trierTarifs(tarifs) {
  const { column, direction } = currentSort;
  const multiplier = direction === 'asc' ? 1 : -1;

  return tarifs.sort((a, b) => {
    let valA, valB;

    switch (column) {
      case 'libelle':
        valA = (a.libelle || '').toLowerCase();
        valB = (b.libelle || '').toLowerCase();
        return multiplier * valA.localeCompare(valB, 'fr');

      case 'montant_base':
        valA = a.montant_base || 0;
        valB = b.montant_base || 0;
        return multiplier * (valA - valB);

      case 'type_periode':
        valA = a.type_periode || '';
        valB = b.type_periode || '';
        return multiplier * valA.localeCompare(valB, 'fr');

      case 'mode_calcul':
        valA = a.type_montant || '';
        valB = b.type_montant || '';
        return multiplier * valA.localeCompare(valB, 'fr');

      case 'actif':
        valA = a.actif ? 1 : 0;
        valB = b.actif ? 1 : 0;
        return multiplier * (valB - valA); // Actifs en premier par defaut

      default:
        return 0;
    }
  });
}

// ============================================================
// Modal Tarif (Nouveau / Modifier)
// ============================================================

function ouvrirModalNouveauTarif(type = 'cotisation') {
  ouvrirModalTarif(null, type);
}

function toggleTarifType(type) {
  const sectionCotisation = document.getElementById('section_cotisation');
  const tarifTypeHidden = document.getElementById('tarif_type');
  const inputLibelle = document.getElementById('tarif_libelle');

  tarifTypeHidden.value = type;

  if (type === 'prestation') {
    sectionCotisation.style.display = 'none';
    inputLibelle.placeholder = 'Ex: Atelier creation jeux, Location salle...';
    document.getElementById('modalTarifTitle').innerHTML = '<i class="bi bi-receipt text-success"></i> Prestation';
  } else {
    sectionCotisation.style.display = 'block';
    inputLibelle.placeholder = 'Ex: Cotisation annuelle 2025';
    const id = document.getElementById('tarif_id').value;
    document.getElementById('modalTarifTitle').innerHTML = id
      ? '<i class="bi bi-pencil"></i> Modifier la cotisation'
      : '<i class="bi bi-plus-circle"></i> Nouvelle cotisation';
  }
}

function ouvrirModalTarif(id = null, type = 'cotisation') {
  const modal = new bootstrap.Modal(document.getElementById('modalTarif'));
  const form = document.getElementById('formTarif');
  form.reset();

  // Initialiser le select des operations comptables
  initOperationsComptablesSelect();

  // Configurer le type
  document.getElementById('tarif_type').value = type;
  document.getElementById(`tarif_type_${type}`).checked = true;
  toggleTarifType(type);

  const typeSelector = document.getElementById('tarif_type_selector');

  if (id) {
    // Mode edition
    let tarif;
    if (type === 'prestation') {
      tarif = prestationsCache.find(t => t.id === id);
    } else {
      tarif = tarifsCache.find(t => t.id === id);
    }

    if (!tarif) {
      showToast('Tarif non trouve', 'error');
      return;
    }

    typeSelector.style.display = 'none';

    if (type === 'prestation') {
      document.getElementById('modalTarifTitle').innerHTML = '<i class="bi bi-pencil"></i> Modifier la prestation';
    } else {
      document.getElementById('modalTarifTitle').innerHTML = '<i class="bi bi-pencil"></i> Modifier la cotisation';
    }

    document.getElementById('tarif_id').value = tarif.id;
    document.getElementById('tarif_libelle').value = tarif.libelle || '';
    document.getElementById('tarif_montant').value = tarif.montant_base || tarif.montant || 0;
    document.getElementById('tarif_description').value = tarif.description || '';
    document.getElementById('tarif_actif').checked = tarif.actif !== false;
    document.getElementById('tarif_defaut').checked = tarif.par_defaut === true;
    document.getElementById('tarif_operation_comptable').value = tarif.operation_comptable_id || '';

    if (type === 'cotisation') {
      document.getElementById('tarif_periode').value = tarif.type_periode || 'annee_civile';
      document.getElementById('tarif_calcul').value = tarif.type_montant || 'fixe';
    }
  } else {
    typeSelector.style.display = 'block';
    document.getElementById('tarif_id').value = '';
    document.getElementById('tarif_actif').checked = true;
  }

  modal.show();
}

function initOperationsComptablesSelect() {
  const select = document.getElementById('tarif_operation_comptable');
  if (!select) return;

  select.innerHTML = '<option value="">-- Aucune (pas d\'ecritures auto) --</option>';

  operationsComptablesCache.forEach(op => {
    const label = `${op.libelle} (${op.compte_produit})`;
    select.innerHTML += `<option value="${op.id}">${escapeHtml(label)}</option>`;
  });
}

async function sauvegarderTarif() {
  const id = document.getElementById('tarif_id').value;
  const type = document.getElementById('tarif_type').value;
  const isPrestation = type === 'prestation';

  const opComptableValue = document.getElementById('tarif_operation_comptable').value;
  const operationComptableId = opComptableValue ? parseInt(opComptableValue) : null;

  const data = {
    libelle: document.getElementById('tarif_libelle').value.trim(),
    montant_base: parseFloat(document.getElementById('tarif_montant').value),
    description: document.getElementById('tarif_description').value.trim() || null,
    actif: document.getElementById('tarif_actif').checked,
    par_defaut: document.getElementById('tarif_defaut').checked,
    type: type,
    operation_comptable_id: operationComptableId
  };

  if (!isPrestation) {
    data.type_periode = document.getElementById('tarif_periode').value;
    data.type_montant = document.getElementById('tarif_calcul').value;
  } else {
    data.type_periode = null;
    data.type_montant = 'fixe';
  }

  if (!data.libelle) {
    showToast('Le libelle est obligatoire', 'error');
    return;
  }

  try {
    const successMsg = isPrestation ? 'Prestation' : 'Cotisation';

    if (id) {
      await apiAdmin.put(`/tarifs-cotisation/${id}`, data);
      showToast(`${successMsg} modifiee`, 'success');
    } else {
      await apiAdmin.post('/tarifs-cotisation', data);
      showToast(`${successMsg} creee`, 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalTarif')).hide();

    if (isPrestation) {
      await chargerPrestations();
    } else {
      await chargerTarifs();
    }
  } catch (error) {
    console.error('[Tarification] Erreur sauvegarde:', error);
    showToast('Erreur: ' + (error.message || 'Erreur inconnue'), 'error');
  }
}

// ============================================================
// Actions sur les tarifs
// ============================================================

function confirmerSuppression(id, type = 'cotisation') {
  const isPrestation = type === 'prestation';
  const tarif = isPrestation
    ? prestationsCache.find(t => t.id === id)
    : tarifsCache.find(t => t.id === id);

  if (!tarif) return;

  document.getElementById('delete-tarif-name').textContent = tarif.libelle;

  const modal = new bootstrap.Modal(document.getElementById('modalConfirmDelete'));
  const btnConfirm = document.getElementById('btn-confirm-delete');

  // Supprimer les anciens handlers
  const newBtn = btnConfirm.cloneNode(true);
  btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);

  newBtn.addEventListener('click', async () => {
    await supprimerTarif(id, type);
    bootstrap.Modal.getInstance(document.getElementById('modalConfirmDelete')).hide();
  });

  modal.show();
}

async function supprimerTarif(id, type = 'cotisation') {
  const isPrestation = type === 'prestation';

  try {
    await apiAdmin.delete(`/tarifs-cotisation/${id}`);
    showToast(isPrestation ? 'Prestation supprimee' : 'Cotisation supprimee', 'success');

    if (isPrestation) {
      await chargerPrestations();
    } else {
      await chargerTarifs();
    }
  } catch (error) {
    console.error('[Tarification] Erreur suppression:', error);
    showToast('Erreur: ' + (error.message || 'Impossible de supprimer'), 'error');
  }
}

async function toggleTarifActif(id) {
  try {
    await apiAdmin.patch(`/tarifs-cotisation/${id}/toggle-actif`);
    await chargerTarifs();
    showToast('Statut mis a jour', 'success');
  } catch (error) {
    console.error('[Tarification] Erreur:', error);
    showToast('Erreur', 'error');
  }
}

// ============================================================
// Simulateur
// ============================================================

function ouvrirSimulateur(tarifId) {
  const tarif = tarifsCache.find(t => t.id === tarifId);
  if (!tarif) return;

  document.getElementById('sim_tarif_id').value = tarifId;
  populerSelectSimulateur();
  document.getElementById('simulation-result').style.display = 'none';

  const modal = new bootstrap.Modal(document.getElementById('modalSimulateur'));
  modal.show();
}

function populerSelectSimulateur() {
  // Communes
  const selectCommune = document.getElementById('sim_commune');
  selectCommune.innerHTML = '<option value="">-- Aucune --</option>';
  communesCache.forEach(c => {
    selectCommune.innerHTML += `<option value="${c.id}">${escapeHtml(c.nom)}</option>`;
  });

  // Utilisateurs
  const selectUser = document.getElementById('sim_utilisateur');
  selectUser.innerHTML = '<option value="">-- Saisie manuelle --</option>';
  utilisateursCache.forEach(u => {
    const nom = `${u.nom || ''} ${u.prenom || ''}`.trim();
    selectUser.innerHTML += `<option value="${u.id}">${escapeHtml(nom)}</option>`;
  });

  selectUser.onchange = () => {
    const userId = selectUser.value;
    if (!userId) return;

    const user = utilisateursCache.find(u => u.id == userId);
    if (user) {
      if (user.date_naissance) {
        const age = Math.floor((Date.now() - new Date(user.date_naissance)) / (365.25 * 24 * 60 * 60 * 1000));
        document.getElementById('sim_age').value = age;
      }
      if (user.quotient_familial) {
        document.getElementById('sim_qf').value = user.quotient_familial;
      }
      if (user.commune_id) {
        document.getElementById('sim_commune').value = user.commune_id;
      }
    }
  };

  document.getElementById('sim_date').value = new Date().toISOString().split('T')[0];
}

async function lancerSimulation() {
  const tarifId = document.getElementById('sim_tarif_id').value;
  const resultContainer = document.getElementById('simulation-result');
  const detailContainer = document.getElementById('simulation-detail');

  resultContainer.style.display = 'block';
  detailContainer.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-warning"></div></div>';

  try {
    const params = {
      tarif_cotisation_id: parseInt(tarifId),
      age: parseInt(document.getElementById('sim_age').value) || null,
      quotient_familial: parseInt(document.getElementById('sim_qf').value) || null,
      commune_id: parseInt(document.getElementById('sim_commune').value) || null,
      date_debut: document.getElementById('sim_date').value || null
    };

    const result = await apiAdmin.post('/tarification/simuler', params);
    afficherResultatSimulation(result);
  } catch (error) {
    console.error('[Tarification] Erreur simulation:', error);
    detailContainer.innerHTML = `<div class="alert alert-danger mb-0">${error.message || 'Erreur'}</div>`;
  }
}

function afficherResultatSimulation(result) {
  const container = document.getElementById('simulation-detail');

  let html = '<div class="simulation-result">';

  // Montant de base
  html += `
    <div class="d-flex justify-content-between py-2 border-bottom">
      <span>Tarif de base</span>
      <span>${formatMontant(result.montant_base || result.montantBase)}</span>
    </div>
  `;

  // Reductions
  if (result.reductions && result.reductions.length > 0) {
    result.reductions.forEach(red => {
      html += `
        <div class="d-flex justify-content-between py-2 border-bottom text-danger">
          <span>${escapeHtml(red.libelle)}</span>
          <span>-${formatMontant(red.montant)}</span>
        </div>
      `;
    });
  }

  // Montant final
  const final = result.montant_final || result.montantFinal || 0;
  html += `
    <div class="d-flex justify-content-between py-2 fw-bold fs-5 text-success">
      <span>Montant a payer</span>
      <span>${formatMontant(final)}</span>
    </div>
  `;

  html += '</div>';
  container.innerHTML = html;
}

// ============================================================
// Utilitaires
// ============================================================

function formatMontant(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant || 0);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  } else {
    showToast(message, 'info')
  }
}
