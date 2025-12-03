// ============================================
// Gestion des templates de messages
// ============================================

let sortableTemplatesInstance = null;
let modalTemplate = null;
let modalPreviewTemplate = null;
let currentTemplateId = null;

// Charger tous les templates
async function loadTemplatesMessages() {
  try {
    // Récupérer les filtres
    const typeFilter = document.getElementById('filter-type-message')?.value || '';
    const categorieFilter = document.getElementById('filter-categorie')?.value || '';
    const actifFilter = document.getElementById('filter-actif-template')?.value || '';

    let url = '/parametres/templates-messages?';
    if (typeFilter) url += `type=${typeFilter}&`;
    if (categorieFilter) url += `categorie=${categorieFilter}&`;
    if (actifFilter) url += `actif=${actifFilter}`;

    const templates = await apiRequest(url);
    renderTemplatesMessages(templates);
  } catch (error) {
    console.error('Erreur chargement templates:', error);
    document.getElementById('liste-templates-messages').innerHTML =
      '<p class="text-center text-danger">Erreur de chargement</p>';
  }
}

// Afficher les templates
function renderTemplatesMessages(templates) {
  const container = document.getElementById('liste-templates-messages');

  if (!templates || templates.length === 0) {
    container.innerHTML = '<p class="text-center text-muted">Aucun template de message</p>';
    return;
  }

  const typeLabels = {
    'email': '<span class="badge bg-primary">Email</span>',
    'sms': '<span class="badge bg-success">SMS</span>',
    'both': '<span class="badge bg-info">Email + SMS</span>'
  };

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover" id="table-templates-messages">
        <thead>
          <tr>
            <th style="width: 30px;"><i class="bi bi-grip-vertical"></i></th>
            <th>Template</th>
            <th>Type</th>
            <th>Catégorie</th>
            <th>Variables</th>
            <th>Statut</th>
            <th style="width: 200px;">Actions</th>
          </tr>
        </thead>
        <tbody id="sortable-templates">
          ${templates.map(template => {
            // variables_disponibles est déjà parsé par Sequelize (DataTypes.JSON)
            const varsArray = Array.isArray(template.variables_disponibles)
              ? template.variables_disponibles
              : (typeof template.variables_disponibles === 'string' ? JSON.parse(template.variables_disponibles) : []);

            const variables = varsArray.length > 0
              ? varsArray.slice(0, 3).join(', ')
              : '';
            const moreVars = varsArray.length > 3
              ? ` +${varsArray.length - 3}`
              : '';

            return `
              <tr data-id="${template.id}">
                <td class="handle" style="cursor: move;">
                  <i class="bi bi-grip-vertical"></i>
                </td>
                <td>
                  <i class="bi ${template.icone} text-${template.couleur}"></i>
                  <strong>${template.libelle}</strong>
                  <br>
                  <small class="text-muted">Code: ${template.code}</small>
                  ${template.description ? `<br><small class="text-muted">${template.description}</small>` : ''}
                </td>
                <td>${typeLabels[template.type_message]}</td>
                <td>
                  <span class="badge bg-secondary">${template.categorie || 'N/A'}</span>
                </td>
                <td>
                  <small class="text-muted">${variables}${moreVars}</small>
                </td>
                <td>
                  <span class="badge bg-${template.actif ? 'success' : 'secondary'}">
                    ${template.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  <button class="btn btn-sm btn-outline-primary" onclick="editTemplate(${template.id})" title="Modifier">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-${template.actif ? 'warning' : 'success'}"
                          onclick="toggleTemplate(${template.id})" title="${template.actif ? 'Désactiver' : 'Activer'}">
                    <i class="bi bi-${template.actif ? 'eye-slash' : 'eye'}"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-info" onclick="previewTemplate(${template.id})" title="Aperçu">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" onclick="duplicateTemplate(${template.id})" title="Dupliquer">
                    <i class="bi bi-files"></i>
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="deleteTemplate(${template.id})" title="Supprimer">
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
  if (sortableTemplatesInstance) {
    sortableTemplatesInstance.destroy();
  }

  const tbody = document.getElementById('sortable-templates');
  if (tbody) {
    sortableTemplatesInstance = new Sortable(tbody, {
      animation: 150,
      handle: '.handle',
      onEnd: function() {
        saveTemplatesOrder();
      }
    });
  }
}

// Sauvegarder l'ordre des templates
async function saveTemplatesOrder() {
  const rows = document.querySelectorAll('#sortable-templates tr');
  const ordre = Array.from(rows).map((row, index) => ({
    id: parseInt(row.dataset.id),
    ordre_affichage: index
  }));

  try {
    await apiRequest('/parametres/templates-messages-reorder', {
      method: 'PUT',
      body: JSON.stringify({ ordre })
    });
    showSuccessToast('Ordre des templates mis à jour');
  } catch (error) {
    console.error('Erreur sauvegarde ordre:', error);
    showErrorToast('Erreur lors de la sauvegarde de l\'ordre');
    loadTemplatesMessages(); // Recharger pour restaurer l'ordre
  }
}

// Afficher le modal pour créer/éditer un template
function showModalTemplate(id = null) {
  currentTemplateId = id;

  if (!modalTemplate) {
    modalTemplate = new bootstrap.Modal(document.getElementById('modalTemplate'));
  }

  const form = document.getElementById('form-template');
  form.reset();
  document.getElementById('template_id').value = '';
  document.getElementById('modalTemplateTitle').textContent =
    id ? 'Modifier le template' : 'Nouveau template';

  // Réinitialiser la visibilité des sections
  updateTemplateFields();

  if (id) {
    loadTemplateData(id);
  }

  modalTemplate.show();
}

// Mettre à jour les champs selon le type de message
function updateTemplateFields() {
  const typeMessage = document.getElementById('template_type_message').value;
  const emailSection = document.getElementById('email-section');
  const smsSection = document.getElementById('sms-section');

  if (typeMessage === 'email') {
    emailSection.style.display = 'block';
    smsSection.style.display = 'none';
  } else if (typeMessage === 'sms') {
    emailSection.style.display = 'none';
    smsSection.style.display = 'block';
  } else {
    emailSection.style.display = 'block';
    smsSection.style.display = 'block';
  }
}

// Charger les données d'un template pour édition
async function loadTemplateData(id) {
  try {
    const template = await apiRequest(`/parametres/templates-messages/${id}`);

    document.getElementById('template_id').value = template.id;
    document.getElementById('template_code').value = template.code;
    document.getElementById('template_libelle').value = template.libelle;
    document.getElementById('template_description').value = template.description || '';
    document.getElementById('template_type_message').value = template.type_message;
    document.getElementById('template_categorie').value = template.categorie || 'Adhérent';
    document.getElementById('template_icone').value = template.icone;
    document.getElementById('template_email_objet').value = template.email_objet || '';
    document.getElementById('template_email_corps').value = template.email_corps || '';
    document.getElementById('template_sms_corps').value = template.sms_corps || '';
    document.getElementById('template_couleur').value = template.couleur || 'info';
    document.getElementById('template_actif').checked = template.actif;

    // Variables (déjà parsé par Sequelize)
    if (template.variables_disponibles) {
      const vars = Array.isArray(template.variables_disponibles)
        ? template.variables_disponibles
        : JSON.parse(template.variables_disponibles);
      document.getElementById('template_variables').value = vars.join(', ');
    }

    // Mettre à jour la visibilité des sections
    updateTemplateFields();

    // Code non modifiable en édition
    document.getElementById('template_code').readOnly = true;
  } catch (error) {
    console.error('Erreur chargement template:', error);
    showErrorToast('Erreur lors du chargement du template');
  }
}

// Sauvegarder un template (création ou modification)
async function saveTemplate(event) {
  event.preventDefault();

  const id = document.getElementById('template_id').value;
  const typeMessage = document.getElementById('template_type_message').value;

  const data = {
    code: document.getElementById('template_code').value.toUpperCase(),
    libelle: document.getElementById('template_libelle').value,
    description: document.getElementById('template_description').value,
    type_message: typeMessage,
    categorie: document.getElementById('template_categorie').value,
    icone: document.getElementById('template_icone').value,
    couleur: document.getElementById('template_couleur').value,
    actif: document.getElementById('template_actif').checked
  };

  // Email
  if (typeMessage === 'email' || typeMessage === 'both') {
    data.email_objet = document.getElementById('template_email_objet').value;
    data.email_corps = document.getElementById('template_email_corps').value;
  }

  // SMS
  if (typeMessage === 'sms' || typeMessage === 'both') {
    data.sms_corps = document.getElementById('template_sms_corps').value;
  }

  // Variables
  const variablesInput = document.getElementById('template_variables').value;
  if (variablesInput) {
    data.variables_disponibles = variablesInput.split(',').map(v => v.trim());
  } else {
    data.variables_disponibles = [];
  }

  try {
    if (id) {
      // Modification
      await apiRequest(`/parametres/templates-messages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showSuccessToast('Template modifié avec succès');
    } else {
      // Création
      await apiRequest('/parametres/templates-messages', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showSuccessToast('Template créé avec succès');
    }

    modalTemplate.hide();
    loadTemplatesMessages();
  } catch (error) {
    console.error('Erreur sauvegarde template:', error);
    showErrorToast(error.message || 'Erreur lors de la sauvegarde');
  }
}

// Éditer un template
function editTemplate(id) {
  showModalTemplate(id);
}

// Activer/désactiver un template
async function toggleTemplate(id) {
  try {
    await apiRequest(`/parametres/templates-messages/${id}/toggle`, {
      method: 'PATCH'
    });
    showSuccessToast('Statut du template mis à jour');
    loadTemplatesMessages();
  } catch (error) {
    console.error('Erreur toggle template:', error);
    showErrorToast('Erreur lors du changement de statut');
  }
}

// Prévisualiser un template
async function previewTemplate(id) {
  try {
    // Demander les données de test
    const result = await Swal.fire({
      title: 'Données pour l\'aperçu',
      html: `
        <div class="text-start">
          <p class="text-muted small">Entrez des données de test au format JSON</p>
          <textarea id="preview-data" class="form-control" rows="8" placeholder='{
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean@example.com"
}'></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aperçu',
      cancelButtonText: 'Annuler',
      preConfirm: () => {
        const dataText = document.getElementById('preview-data').value;
        try {
          return dataText ? JSON.parse(dataText) : {};
        } catch (e) {
          Swal.showValidationMessage('JSON invalide');
        }
      }
    });

    if (result.isConfirmed) {
      const preview = await apiRequest(`/parametres/templates-messages/${id}/preview`, {
        method: 'POST',
        body: JSON.stringify({ data: result.value })
      });

      // Afficher l'aperçu dans une modal
      if (!modalPreviewTemplate) {
        modalPreviewTemplate = new bootstrap.Modal(document.getElementById('modalPreviewTemplate'));
      }

      let previewHtml = '';

      if (preview.email) {
        previewHtml += `
          <div class="mb-4">
            <h6><i class="bi bi-envelope"></i> Email</h6>
            <div class="card">
              <div class="card-header bg-light">
                <strong>Objet:</strong> ${preview.email.objet}
              </div>
              <div class="card-body">
                ${preview.email.corps}
              </div>
            </div>
          </div>
        `;
      }

      if (preview.sms) {
        previewHtml += `
          <div class="mb-4">
            <h6><i class="bi bi-phone"></i> SMS</h6>
            <div class="card">
              <div class="card-body">
                <pre class="mb-0">${preview.sms}</pre>
              </div>
              <div class="card-footer text-muted small">
                ${preview.sms.length} caractères
              </div>
            </div>
          </div>
        `;
      }

      document.getElementById('preview-content').innerHTML = previewHtml;
      modalPreviewTemplate.show();
    }
  } catch (error) {
    console.error('Erreur aperçu template:', error);
    showErrorToast(error.message || 'Erreur lors de l\'aperçu');
  }
}

// Dupliquer un template
async function duplicateTemplate(id) {
  const result = await Swal.fire({
    title: 'Dupliquer le template',
    text: 'Entrez un nouveau code pour la copie',
    input: 'text',
    inputPlaceholder: 'NOUVEAU_CODE',
    showCancelButton: true,
    confirmButtonText: 'Dupliquer',
    cancelButtonText: 'Annuler',
    inputValidator: (value) => {
      if (!value) {
        return 'Le code est obligatoire';
      }
    }
  });

  if (result.isConfirmed) {
    try {
      await apiRequest(`/parametres/templates-messages/${id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ nouveau_code: result.value.toUpperCase() })
      });
      showSuccessToast('Template dupliqué avec succès');
      loadTemplatesMessages();
    } catch (error) {
      console.error('Erreur duplication template:', error);
      showErrorToast(error.message || 'Erreur lors de la duplication');
    }
  }
}

// Supprimer un template
async function deleteTemplate(id) {
  const result = await Swal.fire({
    title: 'Supprimer le template ?',
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
      await apiRequest(`/parametres/templates-messages/${id}`, {
        method: 'DELETE'
      });
      showSuccessToast('Template supprimé');
      loadTemplatesMessages();
    } catch (error) {
      console.error('Erreur suppression template:', error);
      showErrorToast(error.message || 'Erreur lors de la suppression');
    }
  }
}

// Initialiser le formulaire et les événements
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-template');
  if (form) {
    form.addEventListener('submit', saveTemplate);
  }

  // Compteur de caractères SMS
  const smsCorps = document.getElementById('template_sms_corps');
  if (smsCorps) {
    smsCorps.addEventListener('input', () => {
      const count = smsCorps.value.length;
      document.getElementById('sms-count').textContent = count;
    });
  }

  // Conversion automatique du code en majuscules
  const templateCode = document.getElementById('template_code');
  if (templateCode) {
    templateCode.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/\s/g, '_');
    });
  }
});
