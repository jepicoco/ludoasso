// ============================================
// Gestion de la page Paramètres
// ============================================

let sortableInstance = null;
let modalModePaiement = null;
let currentModeId = null;

// ============================================
// SECTION: Structure
// ============================================

async function loadStructure() {
  try {
    const parametres = await apiRequest('/parametres/structure');

    // Remplir le formulaire
    document.getElementById('nom_structure').value = parametres.nom_structure || '';
    document.getElementById('logo').value = parametres.logo || '';
    document.getElementById('description').value = parametres.description || '';
    document.getElementById('adresse').value = parametres.adresse || '';
    document.getElementById('code_postal').value = parametres.code_postal || '';
    document.getElementById('ville').value = parametres.ville || '';
    document.getElementById('pays').value = parametres.pays || 'France';
    document.getElementById('telephone').value = parametres.telephone || '';
    document.getElementById('email').value = parametres.email || '';
    document.getElementById('site_web').value = parametres.site_web || '';
    document.getElementById('siret').value = parametres.siret || '';
    document.getElementById('numero_rna').value = parametres.numero_rna || '';
    document.getElementById('numero_tva').value = parametres.numero_tva || '';
    document.getElementById('iban').value = parametres.iban || '';
    document.getElementById('bic').value = parametres.bic || '';
    document.getElementById('mentions_legales').value = parametres.mentions_legales || '';

    // Horaires
    const horaires = parametres.horaires_ouverture || {};
    document.getElementById('horaires_lundi').value = horaires.lundi || '';
    document.getElementById('horaires_mardi').value = horaires.mardi || '';
    document.getElementById('horaires_mercredi').value = horaires.mercredi || '';
    document.getElementById('horaires_jeudi').value = horaires.jeudi || '';
    document.getElementById('horaires_vendredi').value = horaires.vendredi || '';
    document.getElementById('horaires_samedi').value = horaires.samedi || '';
    document.getElementById('horaires_dimanche').value = horaires.dimanche || '';

  } catch (error) {
    console.error('Erreur chargement structure:', error);
    showToast('Erreur lors du chargement des paramètres: ' + error.message, 'error')
  }
}

async function saveStructure(event) {
  event.preventDefault();

  const formData = {
    nom_structure: document.getElementById('nom_structure').value,
    logo: document.getElementById('logo').value,
    description: document.getElementById('description').value,
    adresse: document.getElementById('adresse').value,
    code_postal: document.getElementById('code_postal').value,
    ville: document.getElementById('ville').value,
    pays: document.getElementById('pays').value,
    telephone: document.getElementById('telephone').value,
    email: document.getElementById('email').value,
    site_web: document.getElementById('site_web').value,
    siret: document.getElementById('siret').value,
    numero_rna: document.getElementById('numero_rna').value,
    numero_tva: document.getElementById('numero_tva').value,
    iban: document.getElementById('iban').value,
    bic: document.getElementById('bic').value,
    mentions_legales: document.getElementById('mentions_legales').value,
    horaires_ouverture: {
      lundi: document.getElementById('horaires_lundi').value,
      mardi: document.getElementById('horaires_mardi').value,
      mercredi: document.getElementById('horaires_mercredi').value,
      jeudi: document.getElementById('horaires_jeudi').value,
      vendredi: document.getElementById('horaires_vendredi').value,
      samedi: document.getElementById('horaires_samedi').value,
      dimanche: document.getElementById('horaires_dimanche').value
    }
  };

  try {
    await apiRequest('/parametres/structure', {
      method: 'PUT',
      body: JSON.stringify(formData)
    });

    showToast('Paramètres enregistrés avec succès', 'success')
  } catch (error) {
    console.error('Erreur sauvegarde structure:', error);
    showToast('Erreur lors de l\'enregistrement: ' + error.message, 'success')
  }
}

// ============================================
// SECTION: Modes de paiement
// ============================================

function showListeSection(section) {
  // Masquer toutes les sections
  document.getElementById('section-modes-paiement').style.display = 'none';
  document.getElementById('section-codes-reduction').style.display = 'none';

  // Afficher la section sélectionnée
  document.getElementById(`section-${section}`).style.display = 'block';

  // Mettre à jour les pills actifs
  document.querySelectorAll('#listes-pills .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');

  // Charger les données de la section
  if (section === 'modes-paiement') {
    loadModesPaiement();
  } else if (section === 'codes-reduction') {
    loadCodesReduction();
  }
}

async function loadModesPaiement() {
  try {
    const modes = await apiRequest('/parametres/modes-paiement');
    renderModesPaiement(modes);
  } catch (error) {
    console.error('Erreur chargement modes paiement:', error);
    document.getElementById('liste-modes-paiement').innerHTML =
      '<p class="text-center text-danger">Erreur de chargement</p>';
  }
}

function renderModesPaiement(modes) {
  const container = document.getElementById('liste-modes-paiement');

  if (!modes || modes.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucun mode de paiement</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover" id="table-modes-paiement">
        <thead>
          <tr>
            <th style="width: 30px;"><i class="bi bi-grip-vertical"></i></th>
            <th>Libellé</th>
            <th>Journal</th>
            <th>Type</th>
            <th>Code</th>
            <th>Statut</th>
            <th style="width: 150px;">Actions</th>
          </tr>
        </thead>
        <tbody id="sortable-modes">
          ${modes.map(mode => `
            <tr data-id="${mode.id}">
              <td class="handle" style="cursor: move;">
                <i class="bi bi-grip-vertical"></i>
              </td>
              <td>
                <i class="bi ${mode.icone} text-${mode.couleur}"></i>
                <strong>${mode.libelle}</strong>
              </td>
              <td>${mode.journal_comptable || '-'}</td>
              <td>
                <span class="badge bg-${mode.type_operation === 'debit' ? 'success' : 'warning'}">
                  ${mode.type_operation}
                </span>
              </td>
              <td>${mode.code_comptable || '-'}</td>
              <td>
                <span class="badge bg-${mode.actif ? 'success' : 'secondary'}">
                  ${mode.actif ? 'Actif' : 'Inactif'}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary" onclick="editModePaiement(${mode.id})" title="Modifier">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-${mode.actif ? 'warning' : 'success'}"
                        onclick="toggleModePaiement(${mode.id})" title="${mode.actif ? 'Désactiver' : 'Activer'}">
                  <i class="bi bi-${mode.actif ? 'eye-slash' : 'eye'}"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteModePaiement(${mode.id})" title="Supprimer">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Initialiser SortableJS
  initSortable();
}

function initSortable() {
  const el = document.getElementById('sortable-modes');
  if (!el) return;

  // Détruire l'instance précédente si elle existe
  if (sortableInstance) {
    sortableInstance.destroy();
  }

  sortableInstance = new Sortable(el, {
    handle: '.handle',
    animation: 150,
    ghostClass: 'table-active',
    onEnd: async function(evt) {
      // Récupérer le nouvel ordre
      const rows = el.querySelectorAll('tr');
      const ordres = Array.from(rows).map((row, index) => ({
        id: parseInt(row.dataset.id),
        ordre_affichage: index + 1
      }));

      try {
        await apiRequest('/parametres/modes-paiement-reorder', {
          method: 'PUT',
          body: JSON.stringify({ ordres })
        });
      } catch (error) {
        console.error('Erreur réorganisation:', error);
        showToast('Erreur lors de la réorganisation', 'error')
        loadModesPaiement(); // Recharger en cas d'erreur
      }
    }
  });
}

function showModalModePaiement(id = null) {
  currentModeId = id;

  if (!modalModePaiement) {
    modalModePaiement = new bootstrap.Modal(document.getElementById('modalModePaiement'));
  }

  // Reset form
  document.getElementById('form-mode-paiement').reset();
  document.getElementById('mode_id').value = '';

  if (id) {
    // Mode édition
    document.getElementById('modalModePaiementTitle').textContent = 'Modifier le mode de paiement';
    loadModePaiementForEdit(id);
  } else {
    // Mode création
    document.getElementById('modalModePaiementTitle').textContent = 'Nouveau mode de paiement';
    document.getElementById('mode_actif').checked = true;
  }

  modalModePaiement.show();
}

async function loadModePaiementForEdit(id) {
  try {
    const mode = await apiRequest(`/parametres/modes-paiement/${id}`);

    document.getElementById('mode_id').value = mode.id;
    document.getElementById('mode_libelle').value = mode.libelle;
    document.getElementById('mode_icone').value = mode.icone || 'bi-wallet2';
    document.getElementById('mode_couleur').value = mode.couleur || 'primary';
    document.getElementById('mode_journal').value = mode.journal_comptable || '';
    document.getElementById('mode_type_operation').value = mode.type_operation;
    document.getElementById('mode_code_comptable').value = mode.code_comptable || '';
    document.getElementById('mode_libelle_export').value = mode.libelle_export_comptable || '';
    document.getElementById('mode_actif').checked = mode.actif;

  } catch (error) {
    console.error('Erreur chargement mode:', error);
    showToast('Erreur lors du chargement du mode de paiement', 'error')
  }
}

async function saveModePaiement(event) {
  event.preventDefault();

  const modeId = document.getElementById('mode_id').value;
  const formData = {
    libelle: document.getElementById('mode_libelle').value,
    icone: document.getElementById('mode_icone').value,
    couleur: document.getElementById('mode_couleur').value,
    journal_comptable: document.getElementById('mode_journal').value,
    type_operation: document.getElementById('mode_type_operation').value,
    code_comptable: document.getElementById('mode_code_comptable').value,
    libelle_export_comptable: document.getElementById('mode_libelle_export').value,
    actif: document.getElementById('mode_actif').checked
  };

  try {
    if (modeId) {
      // Modification
      await apiRequest(`/parametres/modes-paiement/${modeId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
    } else {
      // Création
      await apiRequest('/parametres/modes-paiement', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
    }

    modalModePaiement.hide();
    loadModesPaiement();
  } catch (error) {
    console.error('Erreur sauvegarde mode:', error);
    showToast('Erreur lors de l\'enregistrement: ' + error.message, 'success')
  }
}

function editModePaiement(id) {
  showModalModePaiement(id);
}

async function toggleModePaiement(id) {
  if (!confirm('Voulez-vous changer le statut de ce mode de paiement ?')) {
    return;
  }

  try {
    await apiRequest(`/parametres/modes-paiement/${id}/toggle`, {
      method: 'PATCH'
    });
    loadModesPaiement();
  } catch (error) {
    console.error('Erreur toggle mode:', error);
    showToast('Erreur: ' + error.message, 'error')
  }
}

async function deleteModePaiement(id) {
  if (!confirm('Voulez-vous vraiment supprimer ce mode de paiement ? Cette action est irréversible.')) {
    return;
  }

  try {
    await apiRequest(`/parametres/modes-paiement/${id}`, {
      method: 'DELETE'
    });
    loadModesPaiement();
  } catch (error) {
    console.error('Erreur suppression mode:', error);
    showToast('Erreur: ' + error.message, 'error')
  }
}

// ============================================
// SECTION: Utilisateurs
// ============================================

async function loadUtilisateurs() {
  try {
    const roleFilter = document.getElementById('filter-role').value;
    const statutFilter = document.getElementById('filter-statut').value;

    let url = '/parametres/utilisateurs?';
    if (roleFilter) url += `role=${roleFilter}&`;
    if (statutFilter) url += `statut=${statutFilter}&`;

    const utilisateurs = await apiRequest(url);
    renderUtilisateurs(utilisateurs);
  } catch (error) {
    console.error('Erreur chargement utilisateurs:', error);
    document.getElementById('liste-utilisateurs').innerHTML =
      '<p class="text-center text-danger">Erreur de chargement</p>';
  }
}

function renderUtilisateurs(utilisateurs) {
  const container = document.getElementById('liste-utilisateurs');

  if (!utilisateurs || utilisateurs.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucun utilisateur trouvé</p>';
    return;
  }

  const roleColors = {
    'administrateur': 'danger',
    'comptable': 'warning',
    'gestionnaire': 'primary',
    'benevole': 'info',
    'usager': 'secondary'
  };

  const roleLabels = {
    'administrateur': 'Administrateur',
    'comptable': 'Comptable',
    'gestionnaire': 'Gestionnaire',
    'benevole': 'Bénévole',
    'usager': 'Usager'
  };

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${utilisateurs.map(user => `
            <tr>
              <td>
                <strong>${user.prenom} ${user.nom}</strong><br>
                <small class="text-muted">${user.code_barre || '-'}</small>
              </td>
              <td>${user.email}</td>
              <td>
                <span class="badge bg-${roleColors[user.role] || 'secondary'}">
                  ${roleLabels[user.role] || user.role}
                </span>
              </td>
              <td>
                <span class="badge bg-${user.statut === 'actif' ? 'success' : 'secondary'}">
                  ${user.statut}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary"
                        onclick="changerRoleUtilisateur(${user.id}, '${user.role}')"
                        title="Changer le rôle">
                  <i class="bi bi-key"></i> Rôle
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function changerRoleUtilisateur(userId, currentRole) {
  const roles = [
    { value: 'usager', label: 'Usager' },
    { value: 'benevole', label: 'Bénévole' },
    { value: 'gestionnaire', label: 'Gestionnaire' },
    { value: 'comptable', label: 'Comptable' },
    { value: 'administrateur', label: 'Administrateur' }
  ];

  const options = roles.map(r =>
    `<option value="${r.value}" ${r.value === currentRole ? 'selected' : ''}>${r.label}</option>`
  ).join('');

  const result = await Swal.fire({
    title: 'Changer le rôle',
    html: `
      <select id="swal-role" class="form-select">
        ${options}
      </select>
    `,
    showCancelButton: true,
    confirmButtonText: 'Enregistrer',
    cancelButtonText: 'Annuler',
    preConfirm: () => {
      return document.getElementById('swal-role').value;
    }
  });

  if (result.isConfirmed && result.value !== currentRole) {
    try {
      await apiRequest(`/parametres/utilisateurs/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: result.value })
      });

      Swal.fire('Succès', 'Rôle modifié avec succès', 'success');
      loadUtilisateurs();
    } catch (error) {
      console.error('Erreur changement rôle:', error);
      Swal.fire('Erreur', error.message, 'error');
    }
  }
}

// ============================================
// Initialisation
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialiser le template
  initTemplate('parametres');

  // Event listeners
  document.getElementById('form-structure').addEventListener('submit', saveStructure);
  document.getElementById('form-mode-paiement').addEventListener('submit', saveModePaiement);

  // Charger les données selon l'onglet actif
  const structureTab = document.getElementById('structure-tab');
  const listesTab = document.getElementById('listes-tab');
  const utilisateursTab = document.getElementById('utilisateurs-tab');

  structureTab.addEventListener('shown.bs.tab', loadStructure);
  listesTab.addEventListener('shown.bs.tab', loadModesPaiement);
  utilisateursTab.addEventListener('shown.bs.tab', loadUtilisateurs);

  // Charger la structure au démarrage (onglet actif par défaut)
  setTimeout(loadStructure, 500);
});
