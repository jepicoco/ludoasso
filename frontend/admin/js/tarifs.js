/**
 * Gestion des Tarifs de Cotisation
 */

let tarifsSortable = null;
let tarifsCache = [];

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  // Vérifier si on est sur la page des paramètres
  if (document.getElementById('parametresTabs')) {
    // Charger les tarifs quand on clique sur l'onglet
    document.getElementById('tarifs-tab')?.addEventListener('shown.bs.tab', () => {
      loadTarifs();
    });

    // Formulaire de création/modification
    const formTarif = document.getElementById('form-tarif');
    if (formTarif) {
      formTarif.addEventListener('submit', handleSubmitTarif);
    }
  }
});

/**
 * Chargement des tarifs
 */
async function loadTarifs() {
  try {
    const tarifs = await apiRequest('/parametres/tarifs');
    tarifsCache = tarifs;
    renderTarifsList(tarifs);
    initTarifsSortable();
  } catch (error) {
    console.error('Erreur chargement tarifs:', error);
    document.getElementById('liste-tarifs').innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i>
        Erreur lors du chargement des tarifs : ${error.message}
      </div>
    `;
  }
}

/**
 * Affichage de la liste des tarifs
 */
function renderTarifsList(tarifs) {
  const container = document.getElementById('liste-tarifs');

  if (!tarifs || tarifs.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i>
        Aucun tarif configuré. Créez-en un pour commencer.
      </div>
    `;
    return;
  }

  // Tri par ordre d'affichage
  tarifs.sort((a, b) => (a.ordre_affichage || 0) - (b.ordre_affichage || 0));

  let html = '<div class="list-group" id="tarifs-sortable">';

  tarifs.forEach(tarif => {
    const badgeStatut = tarif.actif
      ? '<span class="badge bg-success">Actif</span>'
      : '<span class="badge bg-secondary">Inactif</span>';

    const badgePeriode = {
      'annee_civile': '<span class="badge bg-primary">Année civile</span>',
      'annee_scolaire': '<span class="badge bg-info">Année scolaire</span>',
      'date_a_date': '<span class="badge bg-warning">Date à date</span>'
    }[tarif.type_periode] || '';

    const badgeMontant = tarif.type_montant === 'prorata'
      ? '<span class="badge bg-secondary">Prorata</span>'
      : '<span class="badge bg-success">Fixe</span>';

    const reductionInfo = tarif.reduction_association_valeur > 0
      ? `<small class="text-muted">Réduction adhérent: ${tarif.reduction_association_type === 'pourcentage' ? tarif.reduction_association_valeur + '%' : formatMontant(tarif.reduction_association_valeur)}</small>`
      : '';

    const badgeDefaut = tarif.par_defaut
      ? '<span class="badge bg-info"><i class="bi bi-star-fill"></i> Par défaut</span>'
      : '';

    const cotisationsEnCours = parseInt(tarif.cotisations_en_cours) || 0;
    const totalCotisations = parseInt(tarif.total_cotisations) || 0;
    const cotisationsInfo = totalCotisations > 0
      ? `<small class="text-muted"><i class="bi bi-people"></i> ${cotisationsEnCours} en cours / ${totalCotisations} total</small>`
      : '<small class="text-muted"><i class="bi bi-people"></i> Aucune cotisation</small>';

    const canDelete = totalCotisations === 0;

    html += `
      <div class="list-group-item" data-tarif-id="${tarif.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i class="bi bi-grip-vertical text-muted" style="cursor: grab;"></i>
              <h5 class="mb-0">${tarif.libelle}</h5>
              ${badgeStatut}
              ${badgePeriode}
              ${badgeMontant}
              ${badgeDefaut}
            </div>

            ${tarif.description ? `<p class="mb-1 text-muted">${tarif.description}</p>` : ''}

            <div class="d-flex gap-3 align-items-center">
              <strong class="text-success fs-5">${formatMontant(tarif.montant_base)}</strong>
              ${reductionInfo}
              ${cotisationsInfo}
            </div>
          </div>

          <div class="btn-group" role="group">
            ${!tarif.par_defaut ? `
              <button class="btn btn-sm btn-outline-info" onclick="setAsDefault(${tarif.id})" title="Définir par défaut">
                <i class="bi bi-star"></i>
              </button>
            ` : ''}
            <button class="btn btn-sm btn-outline-secondary" onclick="duplicateTarif(${tarif.id})" title="Dupliquer">
              <i class="bi bi-files"></i>
            </button>
            <button class="btn btn-sm btn-outline-success" onclick="showCalculatorModal(${tarif.id})" title="Calculer">
              <i class="bi bi-calculator"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary" onclick="editTarif(${tarif.id})" title="Modifier">
              <i class="bi bi-pencil"></i>
            </button>
            ${canDelete ? `
              <button class="btn btn-sm btn-outline-danger" onclick="deleteTarif(${tarif.id})" title="Supprimer">
                <i class="bi bi-trash"></i>
              </button>
            ` : `
              <button class="btn btn-sm btn-outline-warning" onclick="toggleActifTarif(${tarif.id}, ${tarif.actif})" title="${tarif.actif ? 'Désactiver' : 'Activer'}">
                <i class="bi bi-${tarif.actif ? 'eye-slash' : 'eye'}"></i>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * Initialiser le drag & drop
 */
function initTarifsSortable() {
  const listElement = document.getElementById('tarifs-sortable');
  if (!listElement) return;

  if (tarifsSortable) {
    tarifsSortable.destroy();
  }

  tarifsSortable = Sortable.create(listElement, {
    handle: '.bi-grip-vertical',
    animation: 150,
    onEnd: async (evt) => {
      const orderedIds = Array.from(listElement.children).map((el, index) => ({
        id: parseInt(el.dataset.tarifId),
        ordre: index
      }));

      try {
        await apiRequest('/parametres/tarifs/ordre', {
          method: 'PUT',
          body: JSON.stringify({ ordres: orderedIds })
        });
        showToast('Ordre des tarifs mis à jour', 'success');
      } catch (error) {
        console.error('Erreur mise à jour ordre:', error);
        showToast('Erreur lors de la mise à jour de l\'ordre', 'error');
        loadTarifs(); // Recharger pour annuler le changement
      }
    }
  });
}

/**
 * Afficher le modal de création
 */
function showModalTarif() {
  document.getElementById('tarif_id').value = '';
  document.getElementById('form-tarif').reset();
  document.getElementById('modalTarifTitle').textContent = 'Nouveau tarif de cotisation';

  // Valeurs par défaut
  document.getElementById('tarif_actif').checked = true;
  document.getElementById('tarif_par_defaut').checked = false;
  document.getElementById('tarif_type_periode').value = 'annee_civile';
  document.getElementById('tarif_type_montant').value = 'fixe';
  document.getElementById('tarif_reduction_type').value = 'pourcentage';
  document.getElementById('tarif_reduction_valeur').value = '0';

  const modal = new bootstrap.Modal(document.getElementById('modalTarif'));
  modal.show();
}

/**
 * Éditer un tarif
 */
async function editTarif(id) {
  try {
    const tarif = tarifsCache.find(t => t.id === id);
    if (!tarif) {
      throw new Error('Tarif non trouvé');
    }

    document.getElementById('tarif_id').value = tarif.id;
    document.getElementById('tarif_libelle').value = tarif.libelle || '';
    document.getElementById('tarif_description').value = tarif.description || '';
    document.getElementById('tarif_montant_base').value = tarif.montant_base || 0;
    document.getElementById('tarif_type_periode').value = tarif.type_periode || 'annee_civile';
    document.getElementById('tarif_type_montant').value = tarif.type_montant || 'fixe';
    document.getElementById('tarif_reduction_type').value = tarif.reduction_association_type || 'pourcentage';
    document.getElementById('tarif_reduction_valeur').value = tarif.reduction_association_valeur || 0;
    document.getElementById('tarif_actif').checked = tarif.actif !== false;
    document.getElementById('tarif_par_defaut').checked = tarif.par_defaut === true;

    document.getElementById('modalTarifTitle').textContent = 'Modifier le tarif';

    const modal = new bootstrap.Modal(document.getElementById('modalTarif'));
    modal.show();
  } catch (error) {
    console.error('Erreur édition tarif:', error);
    showToast('Erreur lors du chargement du tarif', 'error');
  }
}

/**
 * Soumettre le formulaire
 */
async function handleSubmitTarif(e) {
  e.preventDefault();

  const id = document.getElementById('tarif_id').value;
  const data = {
    libelle: document.getElementById('tarif_libelle').value.trim(),
    description: document.getElementById('tarif_description').value.trim() || null,
    montant_base: parseFloat(document.getElementById('tarif_montant_base').value),
    type_periode: document.getElementById('tarif_type_periode').value,
    type_montant: document.getElementById('tarif_type_montant').value,
    reduction_association_type: document.getElementById('tarif_reduction_type').value,
    reduction_association_valeur: parseFloat(document.getElementById('tarif_reduction_valeur').value) || 0,
    actif: document.getElementById('tarif_actif').checked,
    par_defaut: document.getElementById('tarif_par_defaut').checked
  };

  try {
    if (id) {
      // Modification
      await apiRequest(`/parametres/tarifs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showToast('Tarif modifié avec succès', 'success');
    } else {
      // Création
      await apiRequest('/parametres/tarifs', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showToast('Tarif créé avec succès', 'success');
    }

    bootstrap.Modal.getInstance(document.getElementById('modalTarif')).hide();
    loadTarifs();
  } catch (error) {
    console.error('Erreur sauvegarde tarif:', error);
    showToast('Erreur : ' + error.message, 'error');
  }
}

/**
 * Supprimer un tarif
 */
async function deleteTarif(id) {
  const tarif = tarifsCache.find(t => t.id === id);
  if (!tarif) return;

  const result = await Swal.fire({
    title: 'Confirmer la suppression',
    html: `Êtes-vous sûr de vouloir supprimer le tarif <strong>${tarif.libelle}</strong> ?<br><small class="text-muted">Cette action est irréversible.</small>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    await apiRequest(`/parametres/tarifs/${id}`, {
      method: 'DELETE'
    });
    showToast('Tarif supprimé avec succès', 'success');
    loadTarifs();
  } catch (error) {
    console.error('Erreur suppression tarif:', error);

    // Si le tarif est utilisé, proposer de le désactiver
    if (error.message && error.message.includes('utilisé')) {
      const resultDesactiver = await Swal.fire({
        title: 'Impossible de supprimer',
        html: `Ce tarif ne peut pas être supprimé car il est utilisé dans des cotisations.<br><br>Voulez-vous le <strong>désactiver</strong> à la place ?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#fd7e14',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Oui, désactiver',
        cancelButtonText: 'Annuler'
      });

      if (resultDesactiver.isConfirmed) {
        toggleActifTarif(id, true);
      }
    } else {
      showToast('Erreur : ' + error.message, 'error');
    }
  }
}

/**
 * Dupliquer un tarif
 */
async function duplicateTarif(id) {
  const tarif = tarifsCache.find(t => t.id === id);
  if (!tarif) return;

  const result = await Swal.fire({
    title: 'Dupliquer le tarif',
    html: `Voulez-vous créer une copie du tarif <strong>${tarif.libelle}</strong> ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#0d6efd',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Oui, dupliquer',
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    const tarifDuplique = await apiRequest(`/parametres/tarifs/${id}/duplicate`, {
      method: 'POST'
    });
    showToast('Tarif dupliqué avec succès', 'success');
    loadTarifs();
  } catch (error) {
    console.error('Erreur duplication tarif:', error);
    showToast('Erreur : ' + error.message, 'error');
  }
}

/**
 * Définir un tarif comme par défaut
 */
async function setAsDefault(id) {
  const tarif = tarifsCache.find(t => t.id === id);
  if (!tarif) return;

  try {
    await apiRequest(`/parametres/tarifs/${id}/set-default`, {
      method: 'PATCH'
    });
    showToast(`"${tarif.libelle}" défini comme tarif par défaut`, 'success');
    loadTarifs();
  } catch (error) {
    console.error('Erreur définition par défaut:', error);
    showToast('Erreur : ' + error.message, 'error');
  }
}

/**
 * Activer/désactiver un tarif
 */
async function toggleActifTarif(id, currentStatut) {
  const tarif = tarifsCache.find(t => t.id === id);
  if (!tarif) return;

  const action = currentStatut ? 'désactiver' : 'activer';

  const result = await Swal.fire({
    title: `${action.charAt(0).toUpperCase() + action.slice(1)} le tarif`,
    html: `Voulez-vous ${action} le tarif <strong>${tarif.libelle}</strong> ?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: currentStatut ? '#fd7e14' : '#198754',
    cancelButtonColor: '#6c757d',
    confirmButtonText: `Oui, ${action}`,
    cancelButtonText: 'Annuler'
  });

  if (!result.isConfirmed) return;

  try {
    await apiRequest(`/parametres/tarifs/${id}/toggle`, {
      method: 'PATCH'
    });
    showToast(`Tarif ${currentStatut ? 'désactivé' : 'activé'} avec succès`, 'success');
    loadTarifs();
  } catch (error) {
    console.error('Erreur toggle actif:', error);
    showToast('Erreur : ' + error.message, 'error');
  }
}

/**
 * Formater un montant en euros
 */
function formatMontant(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
}

/**
 * Afficher un toast de notification
 */
function showToast(message, type = 'info') {
  const icon = {
    'success': 'check-circle-fill',
    'error': 'exclamation-triangle-fill',
    'warning': 'exclamation-circle-fill',
    'info': 'info-circle-fill'
  }[type] || 'info-circle-fill';

  const bgColor = {
    'success': 'bg-success',
    'error': 'bg-danger',
    'warning': 'bg-warning',
    'info': 'bg-info'
  }[type] || 'bg-info';

  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: type,
    title: message,
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
  });
}

/**
 * Afficher le modal calculateur
 */
let currentCalculatorTarifId = null;

function showCalculatorModal(id) {
  currentCalculatorTarifId = id;
  document.getElementById('calcResult').innerHTML = '';
  document.getElementById('calc_date_debut').value = '';
  document.getElementById('calc_adhesion_non').checked = true;

  const modal = new bootstrap.Modal(document.getElementById('calculatorModal'));
  modal.show();
}

/**
 * Calculer le montant d'une cotisation
 */
async function calculerMontantTarif() {
  if (!currentCalculatorTarifId) return;

  const adhesion = document.querySelector('input[name="calc_adhesion"]:checked').value === 'true';
  const dateDebut = document.getElementById('calc_date_debut').value || undefined;

  try {
    const result = await apiRequest(`/tarifs-cotisation/${currentCalculatorTarifId}/calculer`, {
      method: 'POST',
      body: JSON.stringify({
        date_debut: dateDebut,
        adhesion_association: adhesion
      })
    });

    document.getElementById('calcResult').innerHTML = `
      <div class="card">
        <div class="card-body">
          <h6>Résultat du calcul</h6>
          <table class="table table-sm">
            <tr>
              <td>Période:</td>
              <td><strong>${result.periode.debut} → ${result.periode.fin}</strong></td>
            </tr>
            <tr>
              <td>Montant de base:</td>
              <td>${result.calcul.montant_base.toFixed(2)} €</td>
            </tr>
            ${result.calcul.prorata ? `
            <tr class="table-info">
              <td>Prorata (${result.calcul.prorata.mois_effectifs}/${result.calcul.prorata.mois_total} mois):</td>
              <td>${result.calcul.montant_apres_prorata.toFixed(2)} €</td>
            </tr>
            ` : ''}
            ${result.calcul.reduction_appliquee > 0 ? `
            <tr class="table-warning">
              <td>Réduction ${result.adhesion_association ? 'adhérent association' : ''}:</td>
              <td>-${result.calcul.reduction_appliquee.toFixed(2)} €</td>
            </tr>
            ` : ''}
            <tr class="table-success">
              <td><strong>Montant final:</strong></td>
              <td><strong>${result.calcul.montant_final.toFixed(2)} €</strong></td>
            </tr>
          </table>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Erreur calcul:', error);
    document.getElementById('calcResult').innerHTML = `
      <div class="alert alert-danger">
        Erreur lors du calcul : ${error.message}
      </div>
    `;
  }
}
