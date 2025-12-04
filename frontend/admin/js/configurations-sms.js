// ============================================
// Gestion des configurations SMS
// ============================================

let sortableConfigSMSInstance = null;
let modalConfigSMS = null;
let currentConfigSMSId = null;

// Charger toutes les configurations SMS
async function loadConfigurationsSMS() {
  try {
    const configs = await apiRequest('/parametres/configurations-sms');
    renderConfigurationsSMS(configs);

    // Actualiser les crédits de chaque configuration active en arrière-plan
    for (const config of configs) {
      if (config.actif) {
        refreshCreditsBackground(config.id);
      }
    }
  } catch (error) {
    console.error('Erreur chargement configurations SMS:', error);
    document.getElementById('liste-configurations-sms').innerHTML =
      '<p class="text-center text-danger">Erreur de chargement</p>';
  }
}

// Actualiser les crédits en arrière-plan (sans notification)
async function refreshCreditsBackground(id) {
  try {
    const response = await apiRequest(`/parametres/configurations-sms/${id}/credits`, 'GET');
    // Mettre à jour l'affichage dans le tableau
    const row = document.querySelector(`#sortable-config-sms tr[data-id="${id}"]`);
    if (row) {
      const creditsCell = row.querySelectorAll('td')[4]; // 5ème colonne (Crédits)
      if (creditsCell) {
        const credits = parseInt(response.credits) || 0;
        const limitInfo = response.unlimited ? 'illimité' : 'limité';
        const creditsText = `${credits.toLocaleString()} SMS <span class="badge bg-${response.unlimited ? 'success' : 'warning'} ms-1">${limitInfo}</span>`;
        const smsEnvoyes = creditsCell.querySelector('small');
        const smsEnvoyesText = smsEnvoyes ? smsEnvoyes.outerHTML : '';
        creditsCell.innerHTML = `${creditsText}<br>${smsEnvoyesText}`;
      }
    }
  } catch (error) {
    console.error('Erreur actualisation crédits background:', error);
  }
}

// Afficher les configurations SMS
function renderConfigurationsSMS(configs) {
  const container = document.getElementById('liste-configurations-sms');

  if (!configs || configs.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucune configuration SMS</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover" id="table-configurations-sms">
        <thead>
          <tr>
            <th style="width: 30px;"><i class="bi bi-grip-vertical"></i></th>
            <th>Configuration</th>
            <th>Provider</th>
            <th>Expéditeur</th>
            <th>Crédits</th>
            <th>Options</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th style="width: 220px;">Actions</th>
          </tr>
        </thead>
        <tbody id="sortable-config-sms">
          ${configs.map(config => {
            const credits = parseFloat(config.credits_restants) || 0;
            const creditsText = config.credits_restants !== null
              ? `${credits.toFixed(0)} SMS`
              : '<span class="text-muted">N/A</span>';

            const options = [];
            if (config.gsm7) options.push('<span class="badge bg-info">GSM7</span>');
            if (config.sandbox) options.push('<span class="badge bg-warning">Sandbox</span>');
            const optionsHtml = options.length > 0 ? options.join(' ') : '-';

            return `
              <tr data-id="${config.id}">
                <td class="handle" style="cursor: move;">
                  <i class="bi bi-grip-vertical"></i>
                </td>
                <td>
                  <i class="bi ${config.icone} text-${config.couleur}"></i>
                  <strong>${config.libelle}</strong>
                  ${config.par_defaut ? '<i class="bi bi-star-fill text-warning ms-2" title="Par défaut"></i>' : ''}
                  ${config.notes ? `<br><small class="text-muted">${config.notes}</small>` : ''}
                </td>
                <td>
                  <span class="badge bg-primary">${config.provider}</span>
                </td>
                <td>
                  <small>${config.sender_name || '<span class="text-muted">Non défini</span>'}</small>
                </td>
                <td>
                  ${creditsText}<br>
                  <small class="text-muted">${config.sms_envoyes} SMS envoyés</small>
                </td>
                <td>${optionsHtml}</td>
                <td>
                  <span class="badge bg-secondary">${config.role_minimum}</span>
                </td>
                <td>
                  <span class="badge bg-${config.actif ? 'success' : 'secondary'}">
                    ${config.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" onclick="editConfigSMS(${config.id})" title="Modifier">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-${config.actif ? 'warning' : 'success'}"
                          onclick="toggleConfigSMS(${config.id})" title="${config.actif ? 'Désactiver' : 'Activer'}">
                    <i class="bi bi-${config.actif ? 'eye-slash' : 'eye'}"></i>
                  </button>
                  ${!config.par_defaut ? `
                    <button class="btn btn-sm btn-outline-warning" onclick="setDefaultConfigSMS(${config.id})" title="Définir par défaut">
                      <i class="bi bi-star"></i>
                    </button>
                  ` : ''}
                  <button class="btn btn-sm btn-outline-info" onclick="refreshCredits(${config.id})" title="Actualiser les crédits">
                    <i class="bi bi-arrow-clockwise"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-success" onclick="testConfigSMS(${config.id})" title="Envoyer un SMS test">
                    <i class="bi bi-send-check"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteConfigSMS(${config.id})" title="Supprimer">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Initialiser Sortable.js pour le drag & drop
  if (sortableConfigSMSInstance) {
    sortableConfigSMSInstance.destroy();
  }

  const tbody = document.getElementById('sortable-config-sms');
  if (tbody) {
    sortableConfigSMSInstance = new Sortable(tbody, {
      animation: 150,
      handle: '.handle',
      onEnd: function() {
        saveConfigSMSOrder();
      }
    });
  }
}

// Sauvegarder l'ordre des configurations
async function saveConfigSMSOrder() {
  const rows = document.querySelectorAll('#sortable-config-sms tr');
  const ordre = Array.from(rows).map((row, index) => ({
    id: parseInt(row.dataset.id),
    ordre_affichage: index
  }));

  try {
    await apiRequest('/parametres/configurations-sms-reorder', {
      method: 'PUT',
      body: JSON.stringify({ ordre })
    });
    showSuccessToast('Ordre des configurations mis à jour');
  } catch (error) {
    console.error('Erreur sauvegarde ordre:', error);
    showErrorToast('Erreur lors de la sauvegarde de l\'ordre');
    loadConfigurationsSMS(); // Recharger pour restaurer l'ordre
  }
}

// Afficher le modal pour créer/éditer une configuration
function showModalConfigSMS(id = null) {
  currentConfigSMSId = id;

  if (!modalConfigSMS) {
    modalConfigSMS = new bootstrap.Modal(document.getElementById('modalConfigSMS'));
  }

  const form = document.getElementById('form-config-sms');
  form.reset();
  document.getElementById('config_sms_id').value = '';
  document.getElementById('modalConfigSMSTitle').textContent =
    id ? 'Modifier la configuration SMS' : 'Nouvelle configuration SMS';

  if (id) {
    loadConfigSMSData(id);
  }

  modalConfigSMS.show();
}

// Charger les données d'une configuration pour édition
async function loadConfigSMSData(id) {
  try {
    const config = await apiRequest(`/parametres/configurations-sms/${id}`);

    document.getElementById('config_sms_id').value = config.id;
    document.getElementById('config_sms_libelle').value = config.libelle;
    document.getElementById('config_sms_provider').value = config.provider || 'smsfactor';
    document.getElementById('config_sms_api_url').value = config.api_url || '';
    document.getElementById('config_sms_api_token').value = ''; // Ne pas afficher le token
    document.getElementById('config_sms_sender_name').value = config.sender_name || '';
    document.getElementById('config_sms_gsm7').checked = config.gsm7;
    document.getElementById('config_sms_sandbox').checked = config.sandbox;
    document.getElementById('config_sms_role_minimum').value = config.role_minimum;
    document.getElementById('config_sms_icone').value = config.icone;
    document.getElementById('config_sms_couleur').value = config.couleur;
    document.getElementById('config_sms_notes').value = config.notes || '';
    document.getElementById('config_sms_actif').checked = config.actif;
    document.getElementById('config_sms_par_defaut').checked = config.par_defaut;
  } catch (error) {
    console.error('Erreur chargement configuration:', error);
    showErrorToast('Erreur lors du chargement de la configuration');
  }
}

// Sauvegarder une configuration (création ou modification)
async function saveConfigSMS(event) {
  event.preventDefault();

  const id = document.getElementById('config_sms_id').value;
  const data = {
    libelle: document.getElementById('config_sms_libelle').value,
    provider: document.getElementById('config_sms_provider').value,
    api_url: document.getElementById('config_sms_api_url').value || null,
    sender_name: document.getElementById('config_sms_sender_name').value,
    gsm7: document.getElementById('config_sms_gsm7').checked,
    sandbox: document.getElementById('config_sms_sandbox').checked,
    role_minimum: document.getElementById('config_sms_role_minimum').value,
    icone: document.getElementById('config_sms_icone').value,
    couleur: document.getElementById('config_sms_couleur').value,
    notes: document.getElementById('config_sms_notes').value,
    actif: document.getElementById('config_sms_actif').checked,
    par_defaut: document.getElementById('config_sms_par_defaut').checked
  };

  // Ajouter le token API seulement s'il est renseigné
  const apiToken = document.getElementById('config_sms_api_token').value;
  if (apiToken) {
    data.api_token = apiToken;
  }

  try {
    if (id) {
      // Modification
      await apiRequest(`/parametres/configurations-sms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showSuccessToast('Configuration SMS modifiée avec succès');
    } else {
      // Création - token obligatoire
      if (!apiToken) {
        showErrorToast('Le token API est obligatoire');
        return;
      }
      data.api_token = apiToken;
      await apiRequest('/parametres/configurations-sms', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showSuccessToast('Configuration SMS créée avec succès');
    }

    modalConfigSMS.hide();
    loadConfigurationsSMS();
  } catch (error) {
    console.error('Erreur sauvegarde configuration:', error);
    showErrorToast(error.message || 'Erreur lors de la sauvegarde');
  }
}

// Éditer une configuration
function editConfigSMS(id) {
  showModalConfigSMS(id);
}

// Activer/désactiver une configuration
async function toggleConfigSMS(id) {
  try {
    await apiRequest(`/parametres/configurations-sms/${id}/toggle`, {
      method: 'PATCH'
    });
    showSuccessToast('Statut de la configuration mis à jour');
    loadConfigurationsSMS();
  } catch (error) {
    console.error('Erreur toggle configuration:', error);
    showErrorToast('Erreur lors du changement de statut');
  }
}

// Définir une configuration par défaut
async function setDefaultConfigSMS(id) {
  try {
    await apiRequest(`/parametres/configurations-sms/${id}/set-default`, {
      method: 'PATCH'
    });
    showSuccessToast('Configuration définie par défaut');
    loadConfigurationsSMS();
  } catch (error) {
    console.error('Erreur définition par défaut:', error);
    showErrorToast('Erreur lors de la définition par défaut');
  }
}

// Actualiser les crédits
async function refreshCredits(id) {
  try {
    const response = await apiRequest(`/parametres/configurations-sms/${id}/credits`, 'GET');
    const credits = parseInt(response.credits) || 0;
    const limitInfo = response.unlimited ? 'illimité' : 'limité';
    const message = `Crédits: ${credits.toLocaleString()} SMS (${limitInfo})`;
    showSuccessToast(message);
    loadConfigurationsSMS();
  } catch (error) {
    console.error('Erreur actualisation crédits:', error);
    showErrorToast('Erreur lors de l\'actualisation des crédits');
  }
}

// Tester une configuration
async function testConfigSMS(id) {
  try {
    const result = await Swal.fire({
      title: 'Envoyer un SMS test',
      text: 'Entrez un numéro de téléphone (format international)',
      input: 'text',
      inputPlaceholder: '+33612345678',
      showCancelButton: true,
      confirmButtonText: 'Envoyer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      preConfirm: async (numero) => {
        if (!numero.startsWith('+')) {
          Swal.showValidationMessage('Le numéro doit commencer par + (format international)');
          return;
        }
        try {
          await apiRequest(`/parametres/configurations-sms/${id}/send-test`, {
            method: 'POST',
            body: JSON.stringify({ numero })
          });
          return { success: true };
        } catch (error) {
          Swal.showValidationMessage(`Erreur: ${error.message}`);
        }
      }
    });

    if (result.isConfirmed && result.value.success) {
      showSuccessToast('SMS de test envoyé avec succès');
      loadConfigurationsSMS(); // Recharger pour mettre à jour le compteur
    }
  } catch (error) {
    console.error('Erreur test configuration:', error);
    showErrorToast('Erreur lors du test de la configuration');
  }
}

// Supprimer une configuration
async function deleteConfigSMS(id) {
  const result = await Swal.fire({
    title: 'Supprimer la configuration ?',
    text: 'Cette action est irréversible',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler'
  });

  if (result.isConfirmed) {
    try {
      await apiRequest(`/parametres/configurations-sms/${id}`, {
        method: 'DELETE'
      });
      showSuccessToast('Configuration supprimée');
      loadConfigurationsSMS();
    } catch (error) {
      console.error('Erreur suppression configuration:', error);
      showErrorToast(error.message || 'Erreur lors de la suppression');
    }
  }
}

// Initialiser le formulaire
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-config-sms');
  if (form) {
    form.addEventListener('submit', saveConfigSMS);
  }
});
