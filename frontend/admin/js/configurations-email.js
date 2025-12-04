// ============================================
// Gestion des configurations email
// ============================================

let sortableConfigEmailInstance = null;
let modalConfigEmail = null;
let currentConfigEmailId = null;

// Charger toutes les configurations email
async function loadConfigurationsEmail() {
  try {
    console.log('Chargement des configurations email...');
    const configs = await apiRequest('/parametres/configurations-email');
    console.log('Configurations reçues:', configs);
    renderConfigurationsEmail(configs);
  } catch (error) {
    console.error('Erreur chargement configurations email:', error);
    document.getElementById('liste-configurations-email').innerHTML =
      '<p class="text-center text-danger">Erreur de chargement</p>';
  }
}

// Afficher les configurations email
function renderConfigurationsEmail(configs) {
  const container = document.getElementById('liste-configurations-email');

  if (!configs || configs.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucune configuration email</p>';
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover" id="table-configurations-email">
        <thead>
          <tr>
            <th style="width: 30px;"><i class="bi bi-grip-vertical"></i></th>
            <th>Configuration</th>
            <th>Expéditeur</th>
            <th>SMTP</th>
            <th>Rôle</th>
            <th>Statut</th>
            <th style="width: 200px;">Actions</th>
          </tr>
        </thead>
        <tbody id="sortable-config-email">
          ${configs.map(config => {
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
                  ${config.nom_expediteur || ''}<br>
                  <small class="text-muted">${config.email_expediteur}</small>
                </td>
                <td>
                  <small>${config.smtp_host}:${config.smtp_port}</small><br>
                  <small class="text-muted">${config.smtp_user}</small>
                </td>
                <td>
                  <span class="badge bg-secondary">${config.role_minimum}</span>
                </td>
                <td>
                  <span class="badge bg-${config.actif ? 'success' : 'secondary'}">
                    ${config.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" onclick="editConfigEmail(${config.id})" title="Modifier">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-${config.actif ? 'warning' : 'success'}"
                          onclick="toggleConfigEmail(${config.id})" title="${config.actif ? 'Désactiver' : 'Activer'}">
                    <i class="bi bi-${config.actif ? 'eye-slash' : 'eye'}"></i>
                  </button>
                  ${!config.par_defaut ? `
                    <button class="btn btn-sm btn-outline-warning" onclick="setDefaultConfigEmail(${config.id})" title="Définir par défaut">
                      <i class="bi bi-star"></i>
                    </button>
                  ` : ''}
                  <button class="btn btn-sm btn-outline-info" onclick="testConfigEmail(${config.id})" title="Tester la connexion">
                    <i class="bi bi-send-check"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteConfigEmail(${config.id})" title="Supprimer">
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
  if (sortableConfigEmailInstance) {
    sortableConfigEmailInstance.destroy();
  }

  const tbody = document.getElementById('sortable-config-email');
  if (tbody) {
    sortableConfigEmailInstance = new Sortable(tbody, {
      animation: 150,
      handle: '.handle',
      onEnd: function() {
        saveConfigEmailOrder();
      }
    });
  }
}

// Sauvegarder l'ordre des configurations
async function saveConfigEmailOrder() {
  const rows = document.querySelectorAll('#sortable-config-email tr');
  const ordre = Array.from(rows).map((row, index) => ({
    id: parseInt(row.dataset.id),
    ordre_affichage: index
  }));

  try {
    await apiRequest('/parametres/configurations-email-reorder', {
      method: 'PUT',
      body: JSON.stringify({ ordre })
    });
    showSuccessToast('Ordre des configurations mis à jour');
  } catch (error) {
    console.error('Erreur sauvegarde ordre:', error);
    showErrorToast('Erreur lors de la sauvegarde de l\'ordre');
    loadConfigurationsEmail(); // Recharger pour restaurer l'ordre
  }
}

// Afficher le modal pour créer/éditer une configuration
function showModalConfigEmail(id = null) {
  currentConfigEmailId = id;

  if (!modalConfigEmail) {
    modalConfigEmail = new bootstrap.Modal(document.getElementById('modalConfigEmail'));
  }

  const form = document.getElementById('form-config-email');
  form.reset();
  document.getElementById('config_email_id').value = '';
  document.getElementById('modalConfigEmailTitle').textContent =
    id ? 'Modifier la configuration email' : 'Nouvelle configuration email';

  if (id) {
    loadConfigEmailData(id);
  }

  modalConfigEmail.show();
}

// Charger les données d'une configuration pour édition
async function loadConfigEmailData(id) {
  try {
    const config = await apiRequest(`/parametres/configurations-email/${id}`);

    document.getElementById('config_email_id').value = config.id;
    document.getElementById('config_email_libelle').value = config.libelle;
    document.getElementById('config_email_expediteur').value = config.email_expediteur;
    document.getElementById('config_email_nom_expediteur').value = config.nom_expediteur || '';
    document.getElementById('config_email_smtp_host').value = config.smtp_host;
    document.getElementById('config_email_smtp_port').value = config.smtp_port;
    document.getElementById('config_email_smtp_user').value = config.smtp_user;
    document.getElementById('config_email_smtp_password').value = ''; // Ne pas afficher le mot de passe
    document.getElementById('config_email_smtp_timeout').value = config.smtp_timeout || 10000;
    document.getElementById('config_email_smtp_secure').checked = config.smtp_secure;
    document.getElementById('config_email_smtp_require_tls').checked = config.smtp_require_tls;
    document.getElementById('config_email_role_minimum').value = config.role_minimum;
    document.getElementById('config_email_icone').value = config.icone;
    document.getElementById('config_email_couleur').value = config.couleur;
    document.getElementById('config_email_notes').value = config.notes || '';
    document.getElementById('config_email_actif').checked = config.actif;
    document.getElementById('config_email_par_defaut').checked = config.par_defaut;
  } catch (error) {
    console.error('Erreur chargement configuration:', error);
    showErrorToast('Erreur lors du chargement de la configuration');
  }
}

// Sauvegarder une configuration (création ou modification)
async function saveConfigEmail(event) {
  event.preventDefault();

  const id = document.getElementById('config_email_id').value;
  console.log('saveConfigEmail appelé, id:', id);
  const data = {
    libelle: document.getElementById('config_email_libelle').value,
    email_expediteur: document.getElementById('config_email_expediteur').value,
    nom_expediteur: document.getElementById('config_email_nom_expediteur').value,
    smtp_host: document.getElementById('config_email_smtp_host').value,
    smtp_port: parseInt(document.getElementById('config_email_smtp_port').value),
    smtp_user: document.getElementById('config_email_smtp_user').value,
    smtp_timeout: parseInt(document.getElementById('config_email_smtp_timeout').value),
    smtp_secure: document.getElementById('config_email_smtp_secure').checked,
    smtp_require_tls: document.getElementById('config_email_smtp_require_tls').checked,
    role_minimum: document.getElementById('config_email_role_minimum').value,
    icone: document.getElementById('config_email_icone').value,
    couleur: document.getElementById('config_email_couleur').value,
    notes: document.getElementById('config_email_notes').value,
    actif: document.getElementById('config_email_actif').checked,
    par_defaut: document.getElementById('config_email_par_defaut').checked
  };

  // Ajouter le mot de passe seulement s'il est renseigné
  const password = document.getElementById('config_email_smtp_password').value;
  if (password) {
    data.smtp_password = password;
  }

  try {
    if (id) {
      // Modification
      console.log('Modification config', id, data);
      await apiRequest(`/parametres/configurations-email/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showSuccessToast('Configuration email modifiée avec succès');
    } else {
      // Création - mot de passe obligatoire
      if (!password) {
        console.error('Mot de passe manquant');
        showErrorToast('Le mot de passe SMTP est obligatoire');
        return;
      }
      data.smtp_password = password;
      console.log('Création config', data);
      const result = await apiRequest('/parametres/configurations-email', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      console.log('Résultat création:', result);
      showSuccessToast('Configuration email créée avec succès');
    }

    modalConfigEmail.hide();
    console.log('Rechargement des configurations...');
    loadConfigurationsEmail();
  } catch (error) {
    console.error('Erreur sauvegarde configuration:', error);
    showErrorToast(error.message || 'Erreur lors de la sauvegarde');
  }
}

// Éditer une configuration
function editConfigEmail(id) {
  showModalConfigEmail(id);
}

// Activer/désactiver une configuration
async function toggleConfigEmail(id) {
  try {
    await apiRequest(`/parametres/configurations-email/${id}/toggle`, {
      method: 'PATCH'
    });
    showSuccessToast('Statut de la configuration mis à jour');
    loadConfigurationsEmail();
  } catch (error) {
    console.error('Erreur toggle configuration:', error);
    showErrorToast('Erreur lors du changement de statut');
  }
}

// Définir une configuration par défaut
async function setDefaultConfigEmail(id) {
  try {
    await apiRequest(`/parametres/configurations-email/${id}/set-default`, {
      method: 'PATCH'
    });
    showSuccessToast('Configuration définie par défaut');
    loadConfigurationsEmail();
  } catch (error) {
    console.error('Erreur définition par défaut:', error);
    showErrorToast('Erreur lors de la définition par défaut');
  }
}

// Tester une configuration
async function testConfigEmail(id) {
  try {
    const result = await Swal.fire({
      title: 'Tester la configuration',
      text: 'Entrez une adresse email pour recevoir un email de test',
      input: 'email',
      inputPlaceholder: 'email@exemple.com',
      showCancelButton: true,
      confirmButtonText: 'Envoyer',
      cancelButtonText: 'Annuler',
      showLoaderOnConfirm: true,
      preConfirm: async (email) => {
        try {
          await apiRequest(`/parametres/configurations-email/${id}/send-test`, {
            method: 'POST',
            body: JSON.stringify({ destinataire: email })
          });
          return { success: true };
        } catch (error) {
          Swal.showValidationMessage(`Erreur: ${error.message}`);
        }
      }
    });

    if (result.isConfirmed && result.value.success) {
      showSuccessToast('Email de test envoyé avec succès');
    }
  } catch (error) {
    console.error('Erreur test configuration:', error);
    showErrorToast('Erreur lors du test de la configuration');
  }
}

// Tester la connexion depuis le modal (sans sauvegarder)
async function testConnectionInModal() {
  try {
    // Récupérer les données du formulaire
    const data = {
      libelle: document.getElementById('config_email_libelle').value,
      email_expediteur: document.getElementById('config_email_expediteur').value,
      nom_expediteur: document.getElementById('config_email_nom_expediteur').value,
      smtp_host: document.getElementById('config_email_smtp_host').value,
      smtp_port: parseInt(document.getElementById('config_email_smtp_port').value),
      smtp_user: document.getElementById('config_email_smtp_user').value,
      smtp_password: document.getElementById('config_email_smtp_password').value,
      smtp_timeout: parseInt(document.getElementById('config_email_smtp_timeout').value),
      smtp_secure: document.getElementById('config_email_smtp_secure').checked,
      smtp_require_tls: document.getElementById('config_email_smtp_require_tls').checked
    };

    // Validation
    if (!data.libelle || !data.email_expediteur || !data.smtp_host || !data.smtp_port || !data.smtp_user) {
      showErrorToast('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Si c'est une modification et pas de nouveau mot de passe, demander confirmation
    const id = document.getElementById('config_email_id').value;
    if (id && !data.smtp_password) {
      const confirmResult = await Swal.fire({
        title: 'Mot de passe manquant',
        text: 'Vous n\'avez pas renseigné de mot de passe. Le test utilisera le mot de passe existant en base.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Continuer le test',
        cancelButtonText: 'Annuler'
      });

      if (!confirmResult.isConfirmed) {
        return;
      }

      // Utiliser l'ID pour tester avec les données existantes
      await testConfigEmail(id);
      return;
    }

    // Pour une nouvelle configuration, le mot de passe est obligatoire
    if (!id && !data.smtp_password) {
      showErrorToast('Le mot de passe SMTP est obligatoire pour une nouvelle configuration');
      return;
    }

    // Afficher le loader
    Swal.fire({
      title: 'Test de connexion...',
      text: 'Vérification de la configuration SMTP',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Tester la connexion sans sauvegarder
    const response = await apiRequest('/parametres/configurations-email/test-connection', {
      method: 'POST',
      body: JSON.stringify(data)
    });

    Swal.close();

    if (response.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Connexion réussie !',
        html: `
          <p>La connexion SMTP a été établie avec succès.</p>
          <p class="text-muted small">Serveur: ${data.smtp_host}:${data.smtp_port}</p>
        `,
        confirmButtonText: 'OK'
      });
    } else {
      throw new Error(response.message || 'Échec de la connexion');
    }
  } catch (error) {
    Swal.close();
    console.error('Erreur test connexion:', error);

    await Swal.fire({
      icon: 'error',
      title: 'Échec de la connexion',
      html: `
        <p>Impossible de se connecter au serveur SMTP.</p>
        <p class="text-danger small">${error.message}</p>
        <p class="text-muted small mt-2">Vérifiez vos paramètres SMTP et réessayez.</p>
      `,
      confirmButtonText: 'OK'
    });
  }
}

// Supprimer une configuration
async function deleteConfigEmail(id) {
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
      await apiRequest(`/parametres/configurations-email/${id}`, {
        method: 'DELETE'
      });
      showSuccessToast('Configuration supprimée');
      loadConfigurationsEmail();
    } catch (error) {
      console.error('Erreur suppression configuration:', error);
      showErrorToast(error.message || 'Erreur lors de la suppression');
    }
  }
}

// Afficher une section de communication
function showCommunicationSection(section) {
  // Masquer toutes les sections
  document.getElementById('section-configurations-email').style.display = 'none';
  document.getElementById('section-configurations-sms').style.display = 'none';
  document.getElementById('section-templates-messages').style.display = 'none';
  document.getElementById('section-declencheurs').style.display = 'none';

  // Afficher la section demandée
  document.getElementById(`section-${section}`).style.display = 'block';

  // Mettre à jour les boutons actifs
  document.querySelectorAll('#communications-pills .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  event.target.classList.add('active');

  // Charger les données de la section
  if (section === 'configurations-email') {
    loadConfigurationsEmail();
  } else if (section === 'configurations-sms') {
    loadConfigurationsSMS();
  } else if (section === 'templates-messages') {
    loadTemplatesMessages();
  } else if (section === 'declencheurs') {
    loadDeclencheurs();
  }
}

// Initialiser le formulaire
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-config-email');
  if (form) {
    form.addEventListener('submit', saveConfigEmail);
  }

  // Charger les configurations au chargement de l'onglet Communications
  const communicationsTab = document.getElementById('communications-tab');
  if (communicationsTab) {
    communicationsTab.addEventListener('shown.bs.tab', () => {
      loadConfigurationsEmail();
    });
  }
});

// Toast helpers
function showSuccessToast(message) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: message,
    showConfirmButton: false,
    timer: 3000
  });
}

function showErrorToast(message) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'error',
    title: message,
    showConfirmButton: false,
    timer: 3000
  });
}
