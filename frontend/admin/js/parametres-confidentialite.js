/**
 * parametres-confidentialite.js
 * Gestion de la matrice d'acces aux donnees personnelles par role
 */

// Champs PII configurables
const PII_FIELDS = [
  { code: 'nom', label: 'Nom', category: 'identite', required: true },
  { code: 'prenom', label: 'Prenom', category: 'identite', required: true },
  { code: 'email', label: 'Email', category: 'contact' },
  { code: 'telephone', label: 'Telephone', category: 'contact' },
  { code: 'adresse', label: 'Adresse', category: 'adresse' },
  { code: 'ville', label: 'Ville', category: 'adresse' },
  { code: 'code_postal', label: 'Code postal', category: 'adresse' },
  { code: 'date_naissance', label: 'Date de naissance', category: 'identite' },
  { code: 'photo', label: 'Photo', category: 'identite' },
  { code: 'notes', label: 'Notes administratives', category: 'autre' }
];

// Roles (hors usager)
const ROLES = ['benevole', 'agent', 'gestionnaire', 'comptable', 'administrateur'];

const ROLE_LABELS = {
  benevole: 'Benevole',
  agent: 'Agent',
  gestionnaire: 'Gestionnaire',
  comptable: 'Comptable',
  administrateur: 'Administrateur'
};

const CATEGORY_ICONS = {
  identite: 'bi-person',
  contact: 'bi-telephone',
  adresse: 'bi-geo-alt',
  autre: 'bi-card-text'
};

let currentConfig = null;

/**
 * Charge la configuration depuis l'API
 */
async function loadConfiguration() {
  try {
    const response = await apiRequest('/parametres/acces-donnees');
    if (response.success) {
      currentConfig = response.data;
      renderMatrix();
      renderAccessCheckboxes();
    } else {
      showToast('Erreur', response.error || 'Erreur de chargement', 'error');
    }
  } catch (error) {
    console.error('Erreur chargement configuration:', error);
    showToast('Erreur', 'Impossible de charger la configuration', 'error');
  }
}

/**
 * Affiche la matrice des champs
 */
function renderMatrix() {
  const tbody = document.getElementById('fields-matrix');
  const config = currentConfig?.champs_visibles_par_role || {};

  tbody.innerHTML = PII_FIELDS.map(field => {
    const categoryIcon = CATEGORY_ICONS[field.category] || 'bi-dot';

    const cells = ROLES.map(role => {
      const isAdmin = role === 'administrateur';
      const roleChamps = config[role] || [];
      const isChecked = isAdmin || roleChamps.includes(field.code);
      const isDisabled = isAdmin || field.required;

      return `
        <td>
          <input type="checkbox"
                 class="form-check-input field-checkbox"
                 data-field="${field.code}"
                 data-role="${role}"
                 ${isChecked ? 'checked' : ''}
                 ${isDisabled ? 'disabled' : ''}
                 title="${isDisabled ? (isAdmin ? 'Admin a toujours acces' : 'Champ obligatoire') : ''}">
        </td>
      `;
    }).join('');

    return `
      <tr>
        <td class="field-name ${field.required ? 'field-required' : ''}">
          <i class="bi ${categoryIcon} text-muted me-2"></i>
          ${field.label}
          ${field.required ? '<span class="badge bg-secondary ms-2">Requis</span>' : ''}
        </td>
        ${cells}
      </tr>
    `;
  }).join('');
}

/**
 * Affiche les checkboxes des permissions fonctionnelles
 */
function renderAccessCheckboxes() {
  const empruntsConfig = currentConfig?.acces_historique_emprunts || {};
  const cotisationsConfig = currentConfig?.acces_cotisations || {};

  // Emprunts (hors admin qui a toujours acces)
  const empruntsHtml = ROLES.slice(0, -1).map(role => {
    const checked = empruntsConfig[role] !== false;
    return `
      <div class="form-check mb-2">
        <input type="checkbox" class="form-check-input"
               id="emprunts-${role}"
               data-permission="emprunts" data-role="${role}"
               ${checked ? 'checked' : ''}>
        <label class="form-check-label" for="emprunts-${role}">
          ${ROLE_LABELS[role]}
        </label>
      </div>
    `;
  }).join('');

  document.getElementById('emprunts-checkboxes').innerHTML = empruntsHtml;

  // Cotisations (hors admin)
  const cotisationsHtml = ROLES.slice(0, -1).map(role => {
    const checked = cotisationsConfig[role] === true;
    return `
      <div class="form-check mb-2">
        <input type="checkbox" class="form-check-input"
               id="cotisations-${role}"
               data-permission="cotisations" data-role="${role}"
               ${checked ? 'checked' : ''}>
        <label class="form-check-label" for="cotisations-${role}">
          ${ROLE_LABELS[role]}
        </label>
      </div>
    `;
  }).join('');

  document.getElementById('cotisations-checkboxes').innerHTML = cotisationsHtml;
}

/**
 * Sauvegarde la configuration
 */
async function saveConfiguration() {
  const champs_visibles_par_role = {};
  const acces_historique_emprunts = {};
  const acces_cotisations = {};

  // Collecter les champs visibles par role
  ROLES.forEach(role => {
    if (role === 'administrateur') return;
    champs_visibles_par_role[role] = [];
  });

  document.querySelectorAll('.field-checkbox:checked').forEach(cb => {
    const role = cb.dataset.role;
    const field = cb.dataset.field;
    if (role !== 'administrateur' && champs_visibles_par_role[role]) {
      if (!champs_visibles_par_role[role].includes(field)) {
        champs_visibles_par_role[role].push(field);
      }
    }
  });

  // Collecter les permissions emprunts
  ROLES.slice(0, -1).forEach(role => {
    const checkbox = document.getElementById(`emprunts-${role}`);
    acces_historique_emprunts[role] = checkbox ? checkbox.checked : false;
  });

  // Collecter les permissions cotisations
  ROLES.slice(0, -1).forEach(role => {
    const checkbox = document.getElementById(`cotisations-${role}`);
    acces_cotisations[role] = checkbox ? checkbox.checked : false;
  });

  try {
    const response = await apiRequest('/parametres/acces-donnees', {
      method: 'PUT',
      body: JSON.stringify({
        champs_visibles_par_role,
        acces_historique_emprunts,
        acces_cotisations
      })
    });

    if (response.success) {
      currentConfig = response.data;
      showToast('Succes', 'Configuration enregistree', 'success');
    } else {
      showToast('Erreur', response.error || 'Erreur lors de la sauvegarde', 'error');
    }
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    showToast('Erreur', 'Impossible de sauvegarder la configuration', 'error');
  }
}

/**
 * Reinitialise aux valeurs par defaut
 */
async function resetConfiguration() {
  if (!confirm('Reinitialiser la configuration aux valeurs par defaut ?')) {
    return;
  }

  try {
    const response = await apiRequest('/parametres/acces-donnees/reset', {
      method: 'POST'
    });

    if (response.success) {
      currentConfig = response.data;
      renderMatrix();
      renderAccessCheckboxes();
      showToast('Succes', 'Configuration reinitialisee', 'success');
    } else {
      showToast('Erreur', response.error || 'Erreur lors de la reinitialisation', 'error');
    }
  } catch (error) {
    console.error('Erreur reset:', error);
    showToast('Erreur', 'Impossible de reinitialiser', 'error');
  }
}

/**
 * Affiche un toast de notification
 */
function showToast(title, message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toast-title');
  const toastMessage = document.getElementById('toast-message');

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  // Couleur selon le type
  toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
  if (type === 'success') {
    toast.classList.add('bg-success', 'text-white');
  } else if (type === 'error') {
    toast.classList.add('bg-danger', 'text-white');
  }

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
  // Charger la sous-navigation
  if (typeof renderSubNav === 'function') {
    renderSubNav('configuration', 'confidentialite');
  }

  // Charger la configuration
  loadConfiguration();
});
